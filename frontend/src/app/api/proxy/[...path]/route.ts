import { NextRequest, NextResponse } from "next/server";

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const base = process.env.API_INTERNAL_BASE_URL;
  const apiKey = process.env.WEATHERIQ_API_KEY;
  if (!base) {
    return NextResponse.json(
      { error: { code: "backend_not_configured", message: "API_INTERNAL_BASE_URL is not configured for this deployment.", details: null } },
      { status: 503 },
    );
  }
  const isWrite = request.method !== "GET" && request.method !== "HEAD";
  if (isWrite && !apiKey) {
    return NextResponse.json(
      { error: { code: "backend_not_configured", message: "WEATHERIQ_API_KEY is not configured for this deployment.", details: null } },
      { status: 503 },
    );
  }
  let target: URL;
  try {
    const backend = new URL(base);
    if (process.env.VERCEL && ["localhost", "127.0.0.1", "::1"].includes(backend.hostname)) {
      return NextResponse.json(
        { error: { code: "backend_not_configured", message: "API_INTERNAL_BASE_URL must point to a deployed API, not localhost.", details: null } },
        { status: 503 },
      );
    }
    target = new URL(`${backend.toString().replace(/\/$/, "")}/${path.join("/")}`);
  } catch {
    return NextResponse.json(
      { error: { code: "backend_not_configured", message: "API_INTERNAL_BASE_URL must be an absolute backend URL.", details: null } },
      { status: 503 },
    );
  }
  target.search = request.nextUrl.search;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  if (isWrite && apiKey) headers.set("X-API-Key", apiKey);
  const hasBody = isWrite;
  try {
    const isGet = request.method === "GET" || request.method === "HEAD";
    const isLocations = path.length === 1 && path[0] === "locations";
    const isAlertData = path[0] === "alerts";
    const cacheable = isGet && !isAlertData;
    const revalidateSeconds = isLocations ? 86400 : 300;
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.text() : undefined,
      next: cacheable ? { revalidate: revalidateSeconds } : undefined,
      cache: cacheable ? undefined : "no-store",
    });
    const body = await response.text();
    const cacheControl = `public, max-age=${revalidateSeconds}, s-maxage=${revalidateSeconds}, stale-while-revalidate=86400`;
    return new NextResponse(body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") || "application/json",
        "cache-control": cacheable ? cacheControl : "no-store",
        "cdn-cache-control": cacheable ? cacheControl : "no-store",
        "vercel-cdn-cache-control": cacheable ? cacheControl : "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backend unavailable";
    return NextResponse.json(
      { error: { code: "backend_unavailable", message, details: null } },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
