import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { eq, desc, and } from "drizzle-orm"
import { games, type Game } from "@/lib/db/schema"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function listGames(): Promise<Game[]> {
  const { orgId, userId } = await auth()
  const currentOrgId = orgId ?? userId

  if (!currentOrgId) {
    return []
  }

  return await db
    .select()
    .from(games)
    .where(eq(games.orgId, currentOrgId))
    .orderBy(desc(games.createdAt))
}

export async function getGame(id: string): Promise<Game | null> {
  const { orgId, userId } = await auth()
  const currentOrgId = orgId ?? userId

  if (!currentOrgId || !id || !UUID_REGEX.test(id)) {
    return null
  }

  const [game] = await db
    .select()
    .from(games)
    .where(and(eq(games.id, id), eq(games.orgId, currentOrgId)))
    .limit(1)

  return game ?? null
}