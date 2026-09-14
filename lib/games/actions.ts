"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath, updateTag } from "next/cache"
import { createGoogle } from "@ai-sdk/google"
import { generateText } from "ai"
import { db } from "@/lib/db"
import { games, type Game } from "@/lib/db/schema"

const google = createGoogle({
  apiKey: process.env.GEMINI_API_KEY,
})

async function generateGameTitle(prompt: string): Promise<string> {
  const systemInstruction =
    "You are a creative game title generator. Generate a short, catchy, 2 to 4 word title for the game idea provided. Respond ONLY with the title itself. Do not include quotes, punctuation, or markdown formatting."

  // 1. Try Gemini 3.6 Flash
  try {
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      instructions: systemInstruction,
      prompt,
    })

    const cleaned = text.replace(/["'*#_]/g, "").trim()
    if (cleaned) {
      return cleaned
    }
  } catch (err: any) {
    console.warn(
      "Gemini 3.6 Flash title generation failed, falling back to Puter:",
      err?.message || err
    )
  }

  // 2. Fallback to Puter with gemini-2.5-flash
  try {
    const authToken = process.env.PUTER_AUTH_TOKEN
    const body = JSON.stringify({
      interface: "puter-chat-completion",
      driver: "ai-chat",
      test_mode: false,
      method: "complete",
      args: {
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt },
        ],
        stream: false,
        model: "gemini-2.5-flash",
      },
      auth_token: authToken,
    })

    const response = await fetch("https://api.puter.com/drivers/call", {
      method: "POST",
      headers: { "Content-Type": "text/plain;actually=json" },
      body,
    })

    if (response.ok) {
      const data = await response.json()
      const content = data?.result?.message?.content
      if (typeof content === "string") {
        const cleaned = content.replace(/["'*#_]/g, "").trim()
        if (cleaned) {
          return cleaned
        }
      }
    }
  } catch (puterErr: any) {
    console.warn("Puter title fallback failed:", puterErr?.message || puterErr)
  }

  // 3. Fallback to clean prompt if both models fail
  return prompt.slice(0, 40).trim()
}

export async function createGame(input: string | { title: string } | FormData): Promise<Game> {
  const { orgId, userId } = await auth()
  const currentOrgId = orgId ?? userId

  if (!currentOrgId) {
    throw new Error("Unauthorized: Please sign in to create a game")
  }

  let prompt = ""
  if (typeof input === "string") {
    prompt = input
  } else if (input instanceof FormData) {
    prompt = (input.get("title") as string) || (input.get("prompt") as string) || ""
  } else if (input && typeof input.title === "string") {
    prompt = input.title
  }

  const cleanPrompt = prompt.trim()
  if (!cleanPrompt) {
    throw new Error("Game title or description is required")
  }

  const title = await generateGameTitle(cleanPrompt)

  const [newGame] = await db
    .insert(games)
    .values({
      orgId: currentOrgId,
      title,
      messages: [],
    })
    .returning()

  revalidatePath("/(app)", "layout")
  revalidatePath("/", "layout")
  updateTag("games")

  return newGame
}