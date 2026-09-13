import { chat, upsertIncomingMessage } from "@trigger.dev/sdk/ai";
import { createGoogle } from "@ai-sdk/google";
import { createUIMessageStream, streamText, toUIMessageStream } from "ai";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createGameSandbox } from "@/lib/daytona/utils";

const google = createGoogle({
  apiKey: process.env.GEMINI_API_KEY,
});

async function runPuterFallback(
  messages: any[],
  writer: { write: (part: any) => void },
  signal?: AbortSignal
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

  const body = JSON.stringify({
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
    body,
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Puter API error: HTTP ${response.status}`);
  }

  const textPartId = "text-part-0";
  let hasStartedText = false;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const handleTextChunk = (text: string) => {
    if (!text) return;
    if (!hasStartedText) {
      writer.write({ type: "text-start", id: textPartId });
      hasStartedText = true;
    }
    writer.write({ type: "text-delta", id: textPartId, delta: text });
  };

  while (true) {
    if (signal?.aborted) break;
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (signal?.aborted) break;
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed.text) handleTextChunk(parsed.text);
      } catch {}
    }
  }

  if (!signal?.aborted && buffer.trim()) {
    try {
      const parsed = JSON.parse(buffer);
      if (parsed.text) handleTextChunk(parsed.text);
    } catch {}
  }

  if (hasStartedText) {
    writer.write({ type: "text-end", id: textPartId });
  }
}

export const gameChat = chat.agent({
  id: "game-chat",
  tools: {},
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
            let googleSucceeded = false;
            const bufferedChunks: any[] = [];

            try {
              const result = streamText({
                ...chat.toStreamTextOptions({ tools }),
                model: google("gemini-3.6-flash"),
                messages,
                abortSignal: signal,
              });

              const reader = result.stream.getReader();
              while (true) {
                if (signal?.aborted) break;
                const { done, value } = await reader.read();
                if (done) break;

                if (value.type === "error") {
                  throw value.error;
                }

                bufferedChunks.push(value);

                if (value.type === "text-start" || value.type === "text-delta") {
                  googleSucceeded = true;
                  break;
                }
              }

              if (signal?.aborted) {
                return;
              }

              if (googleSucceeded) {
                const googleStream = new ReadableStream({
                  async start(ctrl) {
                    try {
                      for (const c of bufferedChunks) {
                        ctrl.enqueue(c);
                      }
                      while (true) {
                        if (signal?.aborted) break;
                        const { done, value } = await reader.read();
                        if (done) break;
                        ctrl.enqueue(value);
                      }
                    } catch (streamErr: any) {
                      if (signal?.aborted || streamErr?.name === "AbortError") {
                        // Generation cancelled by user
                      } else {
                        throw streamErr;
                      }
                    } finally {
                      ctrl.close();
                    }
                  },
                });
                writer.merge(toUIMessageStream({ stream: googleStream }));
                return;
              }
            } catch (err: any) {
              if (signal?.aborted || err?.name === "AbortError") {
                return;
              }
              console.warn("Google gemini-3.6-flash failed, falling back to Puter:", err?.message || err);
            }

            if (signal?.aborted) {
              return;
            }

            try {
              await runPuterFallback(messages, writer, signal);
            } catch (fallbackError: any) {
              if (signal?.aborted || fallbackError?.name === "AbortError") {
                return;
              }
              console.error("Puter fallback failed:", fallbackError);
              writer.write({
                type: "error",
                errorText: fallbackError?.message || "An error occurred while generating a response.",
              });
            }
          },
        });
      },
    };
  },
});