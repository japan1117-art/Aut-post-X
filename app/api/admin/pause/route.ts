import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";

export async function POST(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${getEnv().ADMIN_SECRET}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await request.json() as { paused?: boolean };
  const paused = payload.paused !== false;
  const { error } = await db().from("settings").update({ posting_enabled: !paused }).eq("id", true);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ paused });
}
