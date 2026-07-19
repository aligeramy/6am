import { getStore } from "@netlify/blobs";

export default async (req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code || !/^[a-zA-Z0-9-]{6,64}$/.test(code)) {
    return Response.json({ error: "invalid code" }, { status: 400 });
  }

  const store = getStore("6am-os-sync");

  if (req.method === "GET") {
    const data = await store.get(code);
    return new Response(data ?? "null", {
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }

  if (req.method === "PUT" || req.method === "POST") {
    const body = await req.text();
    if (body.length > 900_000) {
      return Response.json({ error: "payload too large" }, { status: 413 });
    }
    try {
      JSON.parse(body);
    } catch {
      return Response.json({ error: "invalid json" }, { status: 400 });
    }
    await store.set(code, body);
    return Response.json({ ok: true });
  }

  return Response.json({ error: "method not allowed" }, { status: 405 });
};

export const config = { path: "/api/sync" };
