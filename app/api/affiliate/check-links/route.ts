import { NextRequest, NextResponse } from "next/server";
import { inspectAffiliateRedirect } from "@/lib/affiliate-link-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Explicit, admin-only verification. Never authorizes publishing. */
export async function POST(request: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  const provided = request.headers.get("x-admin-secret");
  if (!secret || !provided || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body || typeof body !== "object" || !("items" in body) || !Array.isArray(body.items) || body.items.length > 20) {
    return NextResponse.json({ error: "items must be an array of at most 20" }, { status: 400 });
  }
  const items = body.items as unknown[];
  if (!items.every(x => x && typeof x === "object" && "url" in x && typeof x.url === "string" && x.url.length <= 2048 && "asin" in x && typeof x.asin === "string" && x.asin.length <= 20)) {
    return NextResponse.json({ error: "Invalid item" }, { status: 400 });
  }
  const results = [];
  for (const item of items) {
    const { url, asin } = item as { url: string; asin: string };
    results.push(await inspectAffiliateRedirect(url, asin));
  }
  return NextResponse.json({ results, approvedForPosting: false }, { headers: { "Cache-Control": "no-store" } });
}
