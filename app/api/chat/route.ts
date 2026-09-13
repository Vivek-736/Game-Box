import { auth } from "@clerk/nextjs/server"
import { createGoogle } from "@ai-sdk/google"
import {
  consumeStream,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai"
import { db } from "@/lib/db"
import { games } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"

export const maxDuration = 60

const google = createGoogle({
  apiKey: process.env.GEMINI_API_KEY,
})

async function runPuterFallback(
  messages: UIMessage[],
  writer: { write: (part: any) => void }
) {
  const authToken = process.env.PUTER_AUTH_TOKEN
  if (!authToken) {
    console.warn("PUTER_AUTH_TOKEN is missing in environment variables (.env).")
  }

  const formattedMessages = messages.map((m: any) => {
    const textContent = Array.isArray(m.parts)
      ? m.parts
          .filter((p: any) => p.type === "text")
          .map((p: any) => p.text)
          .join("")
      : typeof m.content === "string"
        ? m.content
        : ""
        
    return {
      role: m.role || "user",
      content: textContent,
    }
  })

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
  })

  const response = await fetch("https://api.puter.com/drivers/call", {
    method: "POST",
    headers: { "Content-Type": "text/plain;actually=json" },
    body,
  })

  if (!response.ok || !response.body) {
    throw new Error(`Puter API error: HTTP ${response.status}`)
  }

  const textPartId = "text-part-0"
  let hasStartedText = false

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  const handleTextChunk = (text: string) => {
    if (!text) return
    if (!hasStartedText) {
      writer.write({
        type: "text-start",
        id: textPartId,
      })
      hasStartedText = true
    }
    writer.write({
      type: "text-delta",
      id: textPartId,
      delta: text,
    })
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const parsed = JSON.parse(line)
        if (parsed.text) {
          handleTextChunk(parsed.text)
        }
      } catch {}
    }
  }

  if (buffer.trim()) {
    try {
      const parsed = JSON.parse(buffer)
      if (parsed.text) {
        handleTextChunk(parsed.text)
      }
    } catch {}
  }

  if (hasStartedText) {
    writer.write({
      type: "text-end",
      id: textPartId,
    })
  }
}

export async function POST(req: Request) {
  const { orgId, userId } = await auth()
  const currentOrgId = orgId ?? userId

  if (!currentOrgId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { messages = [], gameId }: { messages?: UIMessage[]; gameId?: string } = await req.json()

  if (gameId) {
    const [game] = await db
      .select({ id: games.id })
      .from(games)
      .where(and(eq(games.id, gameId), eq(games.orgId, currentOrgId)))
      .limit(1)

    if (!game) {
      return new Response("Game not found", { status: 404 })
    }
  }

  const normalizedMessages: UIMessage[] = messages.map((m: any, idx) => {
    if (Array.isArray(m.parts)) return m
    return {
      id: m.id || `msg-${idx}`,
      role: m.role || "user",
      parts: [{ type: "text", text: typeof m.content === "string" ? m.content : "" }],
    }
  })

  const stream = createUIMessageStream({
    originalMessages: normalizedMessages,
    onEnd: async ({ messages: updatedMessages }) => {
      if (gameId && currentOrgId) {
        try {
          await db
            .update(games)
            .set({ messages: updatedMessages })
            .where(and(eq(games.id, gameId), eq(games.orgId, currentOrgId)))
        } catch (dbError) {
          console.error("Failed to persist messages to game:", dbError)
        }
      }
    },
    async execute({ writer }) {
      let googleSucceeded = false
      const bufferedChunks: any[] = []

      try {
        const modelMessages = await convertToModelMessages(normalizedMessages)
        const result = streamText({
          model: google("gemini-3.6-flash"),
          messages: modelMessages,
        })

        const reader = result.stream.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          if (value.type === "error") {
            throw value.error
          }

          bufferedChunks.push(value)

          if (value.type === "text-start" || value.type === "text-delta") {
            googleSucceeded = true
            break
          }
        }

        if (googleSucceeded) {
          const googleStream = new ReadableStream({
            async start(ctrl) {
              for (const c of bufferedChunks) {
                ctrl.enqueue(c)
              }
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                ctrl.enqueue(value)
              }
              ctrl.close()
            },
          })
          writer.merge(toUIMessageStream({ stream: googleStream }))
          return
        }
      } catch (err: any) {
        console.warn(
          "Google gemini-3.6-flash failed, falling back to Puter:",
          err?.message || err
        )
      }

      try {
        await runPuterFallback(normalizedMessages, writer)
      } catch (fallbackError: any) {
        console.error("Puter fallback failed:", fallbackError)
        writer.write({
          type: "error",
          errorText: fallbackError?.message || "An error occurred while generating a response.",
        })
      }
    },
  })

  return createUIMessageStreamResponse({
    stream,
    consumeSseStream: consumeStream,
  })
}