import { daytona } from "@/lib/daytona/client";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function createGameSandbox(gameId: string) {
  const [existingGame] = await db
    .select({ sandboxId: games.sandboxId })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);

  if (existingGame?.sandboxId) {
    return existingGame.sandboxId;
  }

  const sandbox = await daytona.create();

  try {
    await sandbox.fs.createFolder("/home/daytona/game", "755");
  } catch {
    // folder might already exist
  }

  await sandbox.fs.uploadFile(
    Buffer.from("New game"),
    "/home/daytona/game/index.html"
  );

  await db
    .update(games)
    .set({ sandboxId: sandbox.id })
    .where(eq(games.id, gameId));

  return sandbox;
}