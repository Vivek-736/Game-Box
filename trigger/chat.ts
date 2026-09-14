import { chat, upsertIncomingMessage } from "@trigger.dev/sdk/ai";
import { createGoogle } from "@ai-sdk/google";
import { createUIMessageStream, streamText, toUIMessageStream, stepCountIs } from "ai";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createGameSandbox, getGameSandbox } from "@/lib/daytona/utils";
import { gameSystemPrompt } from "@/lib/games/instructions";
import { createGameTools, resolveSafeGamePath } from "@/lib/games/tools";

const google = createGoogle({
  apiKey: process.env.GEMINI_API_KEY || "",
});

function extractFilesFromResponse(text: string): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];

  // Pattern 1: ```lang (file="filename" | path="filename" | filename)
  const codeBlockRegex =
    /```(?:[a-zA-Z0-9_-]+)?(?:\s+(?:file|path)=["']?([^\s"'\n]+)["']?|\s+([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+))?\n([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const filename = match[1] || match[2];
    const content = match[3];
    if (filename && content && content.trim()) {
      files.push({ path: filename.trim(), content });
    }
  }

  // Pattern 2: Full HTML code block if no named files matched
  if (files.length === 0) {
    const htmlBlock = text.match(/```html\n([\s\S]*?)```/i);
    if (htmlBlock && htmlBlock[1] && htmlBlock[1].trim()) {
      files.push({ path: "index.html", content: htmlBlock[1] });
    }
  }

  // Pattern 3: Raw HTML containing <!DOCTYPE html or <html
  if (files.length === 0 && (text.includes("<!DOCTYPE html") || text.includes("<html"))) {
    const startIdx =
      text.indexOf("<!DOCTYPE html") !== -1
        ? text.indexOf("<!DOCTYPE html")
        : text.indexOf("<html");
    const endIdx = text.lastIndexOf("</html>");
    if (startIdx !== -1 && endIdx !== -1) {
      files.push({ path: "index.html", content: text.slice(startIdx, endIdx + 7) });
    }
  }

  return files;
}

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
  systemPrompt?: string,
  chatId?: string
) {
  const authToken = process.env.PUTER_AUTH_TOKEN;
  const formattedMessages: any[] = [];

  for (const m of messages) {
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

    if (textContent.trim()) {
      formattedMessages.push({ role: m.role || "user", content: textContent.trim() });
    }
  }

  const puterInstruction = `${systemPrompt || ""}\n\nIMPORTANT: Output the complete, fully functional HTML5 game directly inside a single code block labeled file="index.html":
\`\`\`html file="index.html"
<!DOCTYPE html>
<html>
<head>
  <style>/* CSS */</style>
</head>
<body>
  <canvas id="gameCanvas"></canvas>
  <script>/* JavaScript game loop & controls */</script>
</body>
</html>
\`\`\`
Ensure all styles, canvas loops, controls, sound effects (Web Audio API synthesizers), and mechanics are fully implemented inside index.html so the game is immediately playable in the browser!`;

  formattedMessages.unshift({ role: "system", content: puterInstruction });

  const textPartId = `text-puter-${Date.now()}`;
  let hasStartedStream = false;
  let accumulatedText = "";

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
    accumulatedText += text;
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

  const puterModels = ["gpt-4o-mini", "gemini-2.5-flash"];
  let puterSuccess = false;

  for (const pModel of puterModels) {
    if (signal?.aborted) break;
    try {
      const streamBody = JSON.stringify({
        interface: "puter-chat-completion",
        driver: "ai-chat",
        test_mode: false,
        method: "complete",
        args: {
          messages: formattedMessages,
          stream: true,
          model: pModel,
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

        puterSuccess = true;
        break;
      }
    } catch (streamError: any) {
      if (signal?.aborted || streamError?.name === "AbortError") return;
      console.warn(
        `Puter live streaming with ${pModel} failed, trying non-streaming:`,
        streamError?.message || streamError
      );

      try {
        const nonStreamBody = JSON.stringify({
          interface: "puter-chat-completion",
          driver: "ai-chat",
          test_mode: false,
          method: "complete",
          args: {
            messages: formattedMessages,
            stream: false,
            model: pModel,
          },
          auth_token: authToken,
        });

        const nonStreamResponse = await fetch("https://api.puter.com/drivers/call", {
          method: "POST",
          headers: { "Content-Type": "text/plain;actually=json" },
          body: nonStreamBody,
          signal,
        });

        if (nonStreamResponse.ok) {
          const data = await nonStreamResponse.json();
          const content =
            data?.result?.message?.content ||
            data?.result?.text ||
            data?.message?.content ||
            "";
          if (content) {
            handleTextChunk(content);
            puterSuccess = true;
            break;
          }
        }
      } catch (nonStreamErr: any) {
        console.warn(`Puter non-streaming with ${pModel} failed:`, nonStreamErr?.message || nonStreamErr);
      }
    }
  }

  if (hasStartedStream) {
    writer.write({ type: "text-end", id: textPartId });
  }

  // Save any generated files directly to the Daytona sandbox!
  if (chatId && accumulatedText.trim()) {
    const files = extractFilesFromResponse(accumulatedText);
    if (files.length > 0) {
      try {
        const { sandbox } = await getGameSandbox(chatId);
        for (const file of files) {
          const fullPath = resolveSafeGamePath(file.path, false);
          const b64 = Buffer.from(file.content, "utf-8").toString("base64");
          const writeCmd = `mkdir -p "$(dirname "${fullPath}")" && echo "${b64}" | base64 -d > "${fullPath}"`;
          await sandbox.process.executeCommand(writeCmd);

          writer.write({
            type: "tool-write_file",
            toolName: "write_file",
            state: "output-available",
            input: { path: file.path },
            output: {
              success: true,
              path: file.path,
              bytesWritten: Buffer.byteLength(file.content, "utf-8"),
              message: `Successfully wrote ${file.path}`,
            },
          });
        }
      } catch (saveErr: any) {
        console.error("Error saving Puter files to Daytona sandbox:", saveErr);
      }
    }
  }

  writer.write({ type: "finish-step" });
  writer.write({ type: "finish", finishReason: "stop" });
  writer.write({
    type: "data-turn-complete",
    data: { timestamp: Date.now() },
    transient: true,
  });
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
  run: async ({ messages, tools, signal, chatId }: any) => {
    return {
      toUIMessageStream(options: any = {}) {
        return createUIMessageStream({
          ...options,
          async execute({ writer }) {
            const googleModels = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash"];
            let googleSuccess = false;
            let hasWrittenChunks = false;

            for (const modelName of googleModels) {
              if (signal?.aborted) return;
              try {
                const result = streamText({
                  ...chat.toStreamTextOptions({ tools }),
                  model: google(modelName),
                  system: gameSystemPrompt,
                  messages,
                  abortSignal: signal,
                  stopWhen: stepCountIs(15),
                  maxRetries: 0,
                });

                const uiStream = toUIMessageStream({ stream: result.stream });
                const reader = uiStream.getReader();
                let modelEmittedChunks = false;
                let hasStreamError = false;
                const buffer: any[] = [];

                while (true) {
                  if (signal?.aborted) break;
                  const { done, value } = await reader.read();
                  if (done) break;

                  if (value?.type === "error") {
                    console.warn(`Google ${modelName} stream error:`, value?.errorText);
                    hasStreamError = true;
                    break;
                  }

                  if (!hasWrittenChunks) {
                    if (value?.type === "start" || value?.type === "start-step") {
                      buffer.push(value);
                      continue;
                    }
                    for (const b of buffer) {
                      writer.write(b);
                    }
                    buffer.length = 0;
                    hasWrittenChunks = true;
                  }

                  modelEmittedChunks = true;
                  writer.write(value);
                }

                if (hasStreamError && !hasWrittenChunks) {
                  continue;
                }

                if (modelEmittedChunks && !hasStreamError) {
                  writer.write({
                    type: "data-turn-complete",
                    data: { timestamp: Date.now() },
                    transient: true,
                  });
                  googleSuccess = true;
                  break;
                }
              } catch (err: any) {
                if (signal?.aborted || err?.name === "AbortError") {
                  return;
                }
                console.warn(
                  `Google ${modelName} failed, trying next candidate:`,
                  err?.message || err
                );
                if (hasWrittenChunks) {
                  break;
                }
              }
            }

            if (googleSuccess || signal?.aborted) {
              return;
            }

            // Fallback to Puter if all Google models fail
            try {
              console.log("Google models exhausted, falling back to Puter AI driver...");
              await runPuterFallback(messages, writer, signal, gameSystemPrompt, chatId);
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