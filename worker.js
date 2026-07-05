// Toth Construction Job Board — Worker entry point
// Handles the crew-sync API at /api/state and serves the static site for everything else.
//
// WHERE THIS GOES:
//   Workers & Pages → tothconstructionlimited → Edit code (or your wrangler project's
//   main entry file, e.g. src/index.js). Deploy after pasting.
//
// REQUIRES (Bindings tab):
//   - KV namespace binding:  variable name JOBBOARD  → namespace "jobboard"
//   - Secret:                APP_KEY  (same value as the APP_KEY constant in the app HTML)
//   - ASSETS binding: created automatically for Workers deployed with static assets.
//
// VERIFY AFTER DEPLOY:
//   yourdomain.com/api/state in a browser should say "Forbidden" (the key check working).
//   Then add a worker in the app — the tc:data:v2 key appears in KV within seconds.

const KEY = "tc:data:v2";
const MAX_BYTES = 4_000_000; // stay well under KV's 25MB value limit

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-App-Key",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ---- sync API ----
    if (url.pathname === "/api/state") {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors });
      }
      if (request.headers.get("X-App-Key") !== env.APP_KEY) {
        return new Response("Forbidden", { status: 403, headers: cors });
      }
      if (request.method === "GET") {
        const value = await env.JOBBOARD.get(KEY);
        return new Response(value || "null", {
          headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      }
      if (request.method === "PUT") {
        const body = await request.text();
        if (!body || body.length > MAX_BYTES) {
          return new Response("Bad payload", { status: 413, headers: cors });
        }
        try { JSON.parse(body); } catch { return new Response("Not JSON", { status: 400, headers: cors }); }
        await env.JOBBOARD.put(KEY, body);
        return new Response("ok", { headers: cors });
      }
      return new Response("Method not allowed", { status: 405, headers: cors });
    }

    // ---- everything else: serve the static site ----
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response("Not found", { status: 404 });
  },
};
