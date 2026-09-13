import { daytona } from "@/lib/daytona/client";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Sandbox } from "@daytona/sdk";

export async function createGameSandbox(gameId: string): Promise<{ sandbox: Sandbox }> {
  const [existingGame] = await db
    .select({ sandboxId: games.sandboxId })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);

  if (existingGame?.sandboxId) {
    const sandbox = await daytona.get(existingGame.sandboxId);
    if (sandbox.state && sandbox.state !== "started") {
      if (sandbox.state === "stopped" || sandbox.state === "paused" || sandbox.state === "archived") {
        await sandbox.start(60);
      } else {
        await sandbox.waitUntilStarted(60);
      }
    }
    return { sandbox };
  }

  const sandbox = await daytona.create();

  if (sandbox.state && sandbox.state !== "started") {
    await sandbox.waitUntilStarted(60);
  }

  const b64 = Buffer.from("New game").toString("base64");
  
  await sandbox.process.executeCommand(
    `mkdir -p /home/daytona/game && echo "${b64}" | base64 -d > /home/daytona/game/index.html`
  );

  await db
    .update(games)
    .set({ sandboxId: sandbox.id })
    .where(eq(games.id, gameId));

  return { sandbox };
}

/**
 * Provides a guaranteed, running Sandbox instance for a given game.
 * - Resolves gameId or direct sandboxId.
 * - If no sandbox exists yet or the existing sandbox was deleted, automatically provisions & seeds one.
 * - Guarantees the returned sandbox is in the "started" state and ready for tool operations.
 */
export async function getGameSandbox(gameIdOrSandboxId: string): Promise<{ sandbox: Sandbox }> {
  let sandboxId = gameIdOrSandboxId;
  let matchedGameId: string | null = null;

  const [game] = await db
    .select({ id: games.id, sandboxId: games.sandboxId })
    .from(games)
    .where(eq(games.id, gameIdOrSandboxId))
    .limit(1);

  if (game) {
    matchedGameId = game.id;
    if (game.sandboxId) {
      sandboxId = game.sandboxId;
    } else {
      // Game exists but has no sandbox yet -> create one
      return await createGameSandbox(game.id);
    }
  }

  if (!sandboxId) {
    throw new Error(`Invalid game or sandbox ID: ${gameIdOrSandboxId}`);
  }

  let sandbox: Sandbox;
  try {
    sandbox = await daytona.get(sandboxId);
  } catch (err) {
    // If retrieval failed (e.g. sandbox deleted or expired) and we have a gameId, recreate it
    if (matchedGameId) {
      console.warn(`Sandbox ${sandboxId} not found, provisioning replacement for game ${matchedGameId}:`, err);
      return await createGameSandbox(matchedGameId);
    }
    throw err;
  }

  // Ensure the sandbox is running
  if (sandbox.state && sandbox.state !== "started") {
    if (sandbox.state === "stopped" || sandbox.state === "paused" || sandbox.state === "archived") {
      await sandbox.start(60);
    } else {
      await sandbox.waitUntilStarted(60);
    }
  }

  return { sandbox };
}

export async function startGameServer(gameIdOrSandboxId: string, port = 3000): Promise<{ sandbox: Sandbox }> {
  const { sandbox } = await getGameSandbox(gameIdOrSandboxId);

  // 1. Health-check for an existing running server on port
  let isHealthy = false;
  try {
    const healthCheck = await sandbox.process.executeCommand(
      `curl -s -o /dev/null -w "%{http_code}" http://localhost:${port} || true`
    );
    const code = healthCheck.result?.trim();
    if (code === "200" || code === "301" || code === "302" || code === "304") {
      isHealthy = true;
    }
  } catch {
    isHealthy = false;
  }

  // 2. Only start a new server if not already healthy
  if (!isHealthy) {
    // Ensure game directory and index.html exist
    const checkFile = await sandbox.process.executeCommand(
      `[ -f /home/daytona/game/index.html ] && echo "exists" || echo "missing"`
    );
    if (checkFile.result?.trim() !== "exists") {
      const b64 = Buffer.from("New game").toString("base64");
      await sandbox.process.executeCommand(
        `mkdir -p /home/daytona/game && echo "${b64}" | base64 -d > /home/daytona/game/index.html`
      );
    }

    // Start background HTTP server serving /home/daytona/game
    await sandbox.process.executeCommand(
      `nohup python3 -m http.server ${port} --directory /home/daytona/game > /tmp/game-server.log 2>&1 &`
    );

    // Wait for the server to spin up
    for (let i = 0; i < 6; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        const verify = await sandbox.process.executeCommand(
          `curl -s -o /dev/null -w "%{http_code}" http://localhost:${port} || true`
        );
        const code = verify.result?.trim();
        if (code === "200" || code === "301" || code === "302" || code === "304") {
          isHealthy = true;
          break;
        }
      } catch {}
    }
  }

  return {
    sandbox,
  };
}