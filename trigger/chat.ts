import { chat, upsertIncomingMessage } from "@trigger.dev/sdk/ai";
import { createGoogle } from "@ai-sdk/google";
import { createUIMessageStream, streamText, toUIMessageStream, stepCountIs } from "ai";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createGameSandbox } from "@/lib/daytona/utils";
import { gameSystemPrompt } from "@/lib/games/instructions";
import { createGameTools } from "@/lib/games/tools";

const google = createGoogle({
  apiKey: process.env.GEMINI_API_KEY,
});

function extractPuterText(parsed: any): string {
  if (!parsed) return "";
  if (typeof parsed === "string") return parsed;

  // 1. OpenAI chat completion streaming format (choices[0].delta.content)
  const choice = parsed.choices?.[0];
  if (choice) {
    if (typeof choice.delta?.content === "string") {
      return choice.delta.content;
    }
    if (typeof choice.text === "string") {
      return choice.text;
    }
    if (typeof choice.delta?.text === "string") {
      return choice.delta.text;
    }
    if (Array.isArray(choice.delta?.content)) {
      return choice.delta.content
        .map((p: any) => (typeof p === "string" ? p : p?.text || ""))
        .join("");
    }
  }

  // 2. Puter native streaming format (text / delta / chunk)
  if (typeof parsed.text === "string") return parsed.text;
  if (typeof parsed.delta === "string") return parsed.delta;
  if (typeof parsed.chunk === "string") return parsed.chunk;

  // 3. Puter result envelope format
  if (typeof parsed.result?.message?.content === "string") {
    return parsed.result.message.content;
  }
  if (typeof parsed.result?.text === "string") {
    return parsed.result.text;
  }
  if (typeof parsed.message?.content === "string") {
    return parsed.message.content;
  }

  return "";
}

async function runPuterFallback(
  messages: any[],
  writer: { write: (part: any) => void },
  signal?: AbortSignal,
  systemPrompt?: string
) {
  const authToken = process.env.PUTER_AUTH_TOKEN;
  const formattedMessages = messages.map((m: any) => {
    let textContent = "";
    if (typeof m.content === "string") {
      textContent = m.content;
    } else if (Array.isArray(m.content)) {
      textContent = m.content
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("");
    } else if (Array.isArray(m.parts)) {
      textContent = m.parts
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("");
    }

    return { role: m.role || "user", content: textContent };
  });

  if (systemPrompt) {
    formattedMessages.unshift({ role: "system", content: systemPrompt });
  }

  const textPartId = `text-puter-${Date.now()}`;
  let hasStartedStream = false;

  const startStreamIfNeeded = () => {
    if (!hasStartedStream) {
      hasStartedStream = true;
      writer.write({ type: "start" });
      writer.write({ type: "start-step" });
      writer.write({ type: "text-start", id: textPartId });
    }
  };

  const handleTextChunk = (text: string) => {
    if (!text) return;
    startStreamIfNeeded();
    writer.write({ type: "text-delta", id: textPartId, delta: text });
  };

  const processLine = (rawLine: string) => {
    let line = rawLine.trim();
    if (!line) return;
    if (line.startsWith("data:")) {
      line = line.slice(5).trim();
    }
    if (line === "[DONE]") return;

    try {
      const parsed = JSON.parse(line);
      const text = extractPuterText(parsed);
      if (text) {
        handleTextChunk(text);
      }
    } catch {
      if (
        !line.startsWith("event:") &&
        !line.startsWith("id:") &&
        !line.startsWith("retry:") &&
        !line.startsWith(":")
      ) {
        handleTextChunk(line);
      }
    }
  };

  try {
    const streamBody = JSON.stringify({
      interface: "puter-chat-completion",
      driver: "ai-chat",
      test_mode: false,
      method: "complete",
      args: {
        messages: formattedMessages,
        stream: true,
        model: "gemini-2.5-flash",
      },
      auth_token: authToken,
    });

    const response = await fetch("https://api.puter.com/drivers/call", {
      method: "POST",
      headers: { "Content-Type": "text/plain;actually=json" },
      body: streamBody,
      signal,
    });

    if (response.ok && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        if (signal?.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (signal?.aborted) break;
          processLine(line);
        }
      }

      if (!signal?.aborted && buffer.trim()) {
        processLine(buffer);
      }
    } else {
      throw new Error(`Puter streaming returned HTTP ${response.status}`);
    }
  } catch (streamError: any) {
    if (signal?.aborted || streamError?.name === "AbortError") return;
    console.warn(
      "Puter live streaming failed, attempting non-streaming fallback:",
      streamError?.message || streamError
    );

    const nonStreamBody = JSON.stringify({
      interface: "puter-chat-completion",
      driver: "ai-chat",
      test_mode: false,
      method: "complete",
      args: {
        messages: formattedMessages,
        stream: false,
        model: "gemini-2.5-flash",
      },
      auth_token: authToken,
    });

    const nonStreamResponse = await fetch("https://api.puter.com/drivers/call", {
      method: "POST",
      headers: { "Content-Type": "text/plain;actually=json" },
      body: nonStreamBody,
      signal,
    });

    if (!nonStreamResponse.ok) {
      throw new Error(`Puter API error: HTTP ${nonStreamResponse.status}`);
    }

    const data = await nonStreamResponse.json();
    const content =
      data?.result?.message?.content ||
      data?.result?.text ||
      data?.message?.content ||
      "";
    if (content) {
      handleTextChunk(content);
    }
  }

  if (hasStartedStream) {
    writer.write({ type: "text-end", id: textPartId });
    writer.write({ type: "finish-step" });
    writer.write({ type: "finish", finishReason: "stop" });
    writer.write({
      type: "data-turn-complete",
      data: { timestamp: Date.now() },
      transient: true,
    });
  }
}

export const gameChat = chat.agent({
  id: "game-chat",
  tools: ({ chatId }) => createGameTools(chatId),
  hydrateMessages: async ({ chatId, trigger, incomingMessages }) => {
    const [game] = await db
      .select({ messages: games.messages })
      .from(games)
      .where(eq(games.id, chatId))
      .limit(1);

    const stored = (game?.messages as any[]) ?? [];

    if (upsertIncomingMessage(stored, { trigger, incomingMessages })) {
      await db
        .update(games)
        .set({ messages: stored })
        .where(eq(games.id, chatId));
    }

    return stored;
  },
  onChatStart: async ({ chatId }) => {
    await createGameSandbox(chatId);
  },
  onTurnComplete: async ({ chatId, uiMessages, lastEventId }) => {
    await db
      .update(games)
      .set({ messages: uiMessages, lastEventId })
      .where(eq(games.id, chatId));
  },
  run: async ({ messages, tools, signal }) => {
    return {
      toUIMessageStream(options: any = {}) {
        return createUIMessageStream({
          ...options,
          async execute({ writer }) {
            try {
              const result = streamText({
                ...chat.toStreamTextOptions({ tools }),
                model: google("gemini-2.5-flash"),
                system: gameSystemPrompt,
                messages,
                abortSignal: signal,
                stopWhen: stepCountIs(15),
                maxRetries: 0,
              });

              const uiStream = toUIMessageStream({ stream: result.stream });
              const reader = uiStream.getReader();

              while (true) {
                if (signal?.aborted) break;
                const { done, value } = await reader.read();
                if (done) break;
                writer.write(value);
              }

              writer.write({
                type: "data-turn-complete",
                data: { timestamp: Date.now() },
                transient: true,
              });
              return;
            } catch (err: any) {
              if (signal?.aborted || err?.name === "AbortError") {
                return;
              }
              console.warn(
                "Google gemini-2.5-flash failed, falling back to Puter:",
                err?.message || err
              );
            }

            if (signal?.aborted) {
              return;
            }

            try {
              await runPuterFallback(messages, writer, signal, gameSystemPrompt);
            } catch (fallbackError: any) {
              if (signal?.aborted || fallbackError?.name === "AbortError") {
                return;
              }
              console.error("Puter fallback failed:", fallbackError);

              writer.write({
                type: "error",
                errorText:
                  fallbackError?.message ||
                  "An error occurred while generating a response.",
              });
            }
          },
        });
      },
    };
  },
});