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

  const b64 = Buffer.from("New game").toString("base64");
  
  await sandbox.process.executeCommand(
    `mkdir -p /home/daytona/game && echo "${b64}" | base64 -d > /home/daytona/game/index.html`
  );

  await db
    .update(games)
    .set({ sandboxId: sandbox.id })
    .where(eq(games.id, gameId));

  return sandbox;
}

export async function startGameServer(gameIdOrSandboxId: string, port = 3000) {
  let sandboxId = gameIdOrSandboxId;

  // Check if passed string is a gameId in database
  const [game] = await db
    .select({ sandboxId: games.sandboxId })
    .from(games)
    .where(eq(games.id, gameIdOrSandboxId))
    .limit(1);

  if (game?.sandboxId) {
    sandboxId = game.sandboxId;
  }

  if (!sandboxId) {
    throw new Error(`Sandbox ID not found for game: ${gameIdOrSandboxId}`);
  }

  const sandbox = await daytona.get(sandboxId);

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

  // 3. Obtain preview link credentials from Daytona
  const previewInfo = await sandbox.getPreviewLink(port);

  let signedUrl: string | undefined;
  try {
    const signed = await sandbox.getSignedPreviewUrl(port, 3600);
    signedUrl = signed.url;
  } catch {}

  return {
    sandbox,
    sandboxId,
    port,
    url: previewInfo.url,
    token: previewInfo.token,
    signedUrl,
  };
}