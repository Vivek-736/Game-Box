import { NextRequest, NextResponse } from "next/server";
import { startGameServer } from "@/lib/daytona/utils";
import { getGame } from "@/lib/games/queries";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const game = await getGame(id);
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    if (!game.sandboxId) {
      return NextResponse.json(
        { error: "Sandbox not created yet" },
        { status: 400 }
      );
    }

    const serverInfo = await startGameServer(game.id);

    const accept = req.headers.get("accept") || "";
    if (accept.includes("text/html") && !accept.includes("application/json")) {
      return NextResponse.redirect(new URL(`/api/games/${id}/preview/proxy`, req.url));
    }

    return NextResponse.json({
      url: `/api/games/${id}/preview/proxy`,
      sandboxId: game.sandboxId,
      directUrl: serverInfo.signedUrl || serverInfo.url,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to start game server" },
      { status: 500 }
    );
  }
}