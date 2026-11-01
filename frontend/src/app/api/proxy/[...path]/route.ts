import { NextRequest, NextResponse } from "next/server";

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const base = process.env.API_INTERNAL_BASE_URL || "http://127.0.0.1:8000/api/v1";
  const target = new URL(`${base.replace(/\/$/, "")}/${path.join("/")}`);
  target.search = request.nextUrl.search;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  if (request.method !== "GET" && request.method !== "HEAD") {
    headers.set("X-API-Key", process.env.WEATHERIQ_API_KEY || "");
  }
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  try {
    const isGet = request.method === "GET" || request.method === "HEAD";
    const isLocations = path.length === 1 && path[0] === "locations";
    const revalidateSeconds = isLocations ? 3600 : 60;
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.text() : undefined,
      next: isGet ? { revalidate: revalidateSeconds } : undefined,
      cache: isGet ? undefined : "no-store",
    });
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") || "application/json",
        "cache-control": isGet
          ? `public, s-maxage=${revalidateSeconds}, stale-while-revalidate=300`
          : "no-store",
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
