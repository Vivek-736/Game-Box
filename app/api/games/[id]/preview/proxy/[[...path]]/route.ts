import { NextRequest, NextResponse } from "next/server";
import { startGameServer } from "@/lib/daytona/utils";

interface RouteProps {
  params: Promise<{
    id: string;
    path?: string[];
  }>;
}

export async function GET(req: NextRequest, { params }: RouteProps) {
  const { id, path } = await params;

  try {
    const serverInfo = await startGameServer(id);

    // Build the target destination URL inside Daytona sandbox preview
    const subpath = path && path.length > 0 ? "/" + path.map(encodeURIComponent).join("/") : "/";
    const baseUrl = serverInfo.url.endsWith("/")
      ? serverInfo.url.slice(0, -1)
      : serverInfo.url;

    const urlObj = new URL(baseUrl + subpath);
    // Forward search parameters (e.g. ?query=...)
    req.nextUrl.searchParams.forEach((val, key) => {
      urlObj.searchParams.set(key, val);
    });

    const forwardHeaders = new Headers();
    forwardHeaders.set("x-daytona-preview-token", serverInfo.token);
    forwardHeaders.set("X-Daytona-Skip-Preview-Warning", "true");

    const accept = req.headers.get("accept");
    if (accept) forwardHeaders.set("accept", accept);

    const range = req.headers.get("range");
    if (range) forwardHeaders.set("range", range);

    const res = await fetch(urlObj.toString(), {
      method: "GET",
      headers: forwardHeaders,
    });

    const responseHeaders = new Headers(res.headers);
    // Remove headers that prevent iframe display or embedding
    responseHeaders.delete("x-frame-options");
    responseHeaders.delete("content-security-policy");

    return new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return new NextResponse(
      `<html><body><h3>Preview unavailable</h3><p>${error.message || "Failed to proxy game preview"}</p></body></html>`,
      {
        status: 500,
        headers: { "Content-Type": "text/html" },
      }
    );
  }
}

export async function HEAD(req: NextRequest, { params }: RouteProps) {
  const { id, path } = await params;

  try {
    const serverInfo = await startGameServer(id);
    const subpath = path && path.length > 0 ? "/" + path.map(encodeURIComponent).join("/") : "/";
    const baseUrl = serverInfo.url.endsWith("/")
      ? serverInfo.url.slice(0, -1)
      : serverInfo.url;

    const targetUrl = baseUrl + subpath;

    const forwardHeaders = new Headers();
    forwardHeaders.set("x-daytona-preview-token", serverInfo.token);
    forwardHeaders.set("X-Daytona-Skip-Preview-Warning", "true");

    const res = await fetch(targetUrl, {
      method: "HEAD",
      headers: forwardHeaders,
    });

    const responseHeaders = new Headers(res.headers);
    responseHeaders.delete("x-frame-options");
    responseHeaders.delete("content-security-policy");

    return new NextResponse(null, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return new NextResponse(null, { status: 500 });
  }
}