const UPSTREAM = "https://api.open-meteo.com/v1/forecast";
const AUTH_HEADER = "X-WeatherIQ-Proxy-Key";

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/v1/forecast") {
      return new Response("Not found", { status: 404 });
    }
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }
    if (!env.WEATHERIQ_PROXY_KEY) {
      return new Response("Proxy secret is not configured", { status: 503 });
    }

    const providedKey = request.headers.get(AUTH_HEADER) ?? "";
    if (!constantTimeEqual(providedKey, env.WEATHERIQ_PROXY_KEY)) {
      return new Response("Unauthorized", { status: 401 });
    }

    const upstreamUrl = new URL(UPSTREAM);
    upstreamUrl.search = url.search;
    return fetch(upstreamUrl, {
      headers: { Accept: "application/json" },
      cf: { cacheTtl: 0 },
    });
  },
};
