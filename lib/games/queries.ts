import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { eq, desc } from "drizzle-orm"
import { games, type Game } from "@/lib/db/schema"

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