"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath, updateTag } from "next/cache"
import { db } from "@/lib/db"
import { games, type Game } from "@/lib/db/schema"

export async function createGame(input: string | { title: string } | FormData): Promise<Game> {
  const { orgId, userId } = await auth()
  const currentOrgId = orgId ?? userId

  if (!currentOrgId) {
    throw new Error("Unauthorized: Please sign in to create a game")
  }

  let title = ""
  if (typeof input === "string") {
    title = input
  } else if (input instanceof FormData) {
    title = (input.get("title") as string) || ""
  } else if (input && typeof input.title === "string") {
    title = input.title
  }

  const cleanTitle = title.trim()
  if (!cleanTitle) {
    throw new Error("Game title or description is required")
  }

  const [newGame] = await db
    .insert(games)
    .values({
      orgId: currentOrgId,
      title: cleanTitle,
    })
    .returning()

  // Refresh server component layout & tags
  revalidatePath("/(app)", "layout")
  revalidatePath("/", "layout")
  updateTag("games")

  return newGame
}