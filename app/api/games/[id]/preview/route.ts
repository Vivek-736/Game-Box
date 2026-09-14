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

    const { sandbox } = await startGameServer(game.id);

    const previewInfo = await sandbox.getPreviewLink(3000);

    let signedUrl: string | undefined;
    try {
      const signed = await sandbox.getSignedPreviewUrl(3000, 3600);
      signedUrl = signed.url;
    } catch {}

    const accept = req.headers.get("accept") || "";
    if (accept.includes("text/html") && !accept.includes("application/json")) {
      return NextResponse.redirect(new URL(`/api/games/${id}/preview/proxy`, req.url));
    }

    return NextResponse.json({
      url: `/api/games/${id}/preview/proxy`,
      sandboxId: sandbox.id,
      previewUrl: previewInfo.url,
      token: previewInfo.token,
      directUrl: signedUrl || previewInfo.url,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to start game server" },
      { status: 500 }
    );
  }
}