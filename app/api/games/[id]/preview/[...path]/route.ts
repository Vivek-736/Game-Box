import { NextRequest, NextResponse } from "next/server";
import { startGameServer } from "@/lib/daytona/utils";

interface RouteProps {
  params: Promise<{
    id: string;
    path: string[];
  }>;
}

function getMimeType(filePath: string): string | null {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html; charset=utf-8";
  if (lower.endsWith(".css")) return "text/css; charset=utf-8";
  if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript; charset=utf-8";
  if (lower.endsWith(".json")) return "application/json; charset=utf-8";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".ico")) return "image/x-icon";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  return null;
}

export async function GET(req: NextRequest, { params }: RouteProps) {
  const { id, path } = await params;

  try {
    const { sandbox } = await startGameServer(id);
    const previewInfo = await sandbox.getPreviewLink(3000);

    // Strip "proxy" segment if present so that both:
    // /preview/proxy/... AND /preview/... resolve to the exact same game files
    const cleanSegments = (path || []).filter((seg) => seg !== "proxy");
    const subpath = cleanSegments.length > 0 ? "/" + cleanSegments.map(encodeURIComponent).join("/") : "/";

    const baseUrl = previewInfo.url.endsWith("/")
      ? previewInfo.url.slice(0, -1)
      : previewInfo.url;

    const urlObj = new URL(baseUrl + subpath);
    req.nextUrl.searchParams.forEach((val, key) => {
      urlObj.searchParams.set(key, val);
    });

    const forwardHeaders = new Headers();
    forwardHeaders.set("x-daytona-preview-token", previewInfo.token);
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
    responseHeaders.delete("x-frame-options");
    responseHeaders.delete("content-security-policy");
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");

    // Force strict no-cache so browsers always fetch the latest edits to game assets
    responseHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    responseHeaders.set("Pragma", "no-cache");
    responseHeaders.set("Expires", "0");

    const mime = getMimeType(subpath);
    if (mime) {
      responseHeaders.set("content-type", mime);
    }

    const contentType = responseHeaders.get("content-type") || "";

    if (contentType.includes("text/html") || subpath === "/") {
      responseHeaders.set("content-type", "text/html; charset=utf-8");
      let html = await res.text();
      const baseTag = `<base href="/api/games/${id}/preview/proxy/">`;
      const noCacheMeta = `<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0">`;
      if (!html.includes("<base ")) {
        if (html.includes("<head>")) {
          html = html.replace("<head>", `<head>\n  ${baseTag}\n  ${noCacheMeta}`);
        } else if (html.includes("<HEAD>")) {
          html = html.replace("<HEAD>", `<HEAD>\n  ${baseTag}\n  ${noCacheMeta}`);
        } else {
          html = `${baseTag}\n${noCacheMeta}\n${html}`;
        }
      }

      return new NextResponse(html, {
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
      });
    }

    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return new NextResponse(
      `<html><body><h3>Preview unavailable</h3><p>${error.message || "Failed to proxy game preview"}</p></body></html>`,
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
}

export async function HEAD(req: NextRequest, { params }: RouteProps) {
  const { id, path } = await params;

  try {
    const { sandbox } = await startGameServer(id);
    const previewInfo = await sandbox.getPreviewLink(3000);
    const cleanSegments = (path || []).filter((seg) => seg !== "proxy");
    const subpath = cleanSegments.length > 0 ? "/" + cleanSegments.map(encodeURIComponent).join("/") : "/";
    const baseUrl = previewInfo.url.endsWith("/")
      ? previewInfo.url.slice(0, -1)
      : previewInfo.url;

    const targetUrl = baseUrl + subpath;

    const forwardHeaders = new Headers();
    forwardHeaders.set("x-daytona-preview-token", previewInfo.token);
    forwardHeaders.set("X-Daytona-Skip-Preview-Warning", "true");

    const res = await fetch(targetUrl, {
      method: "HEAD",
      headers: forwardHeaders,
    });

    const responseHeaders = new Headers(res.headers);
    responseHeaders.delete("x-frame-options");
    responseHeaders.delete("content-security-policy");
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");

    return new NextResponse(null, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return new NextResponse(null, { status: 500 });
  }
}