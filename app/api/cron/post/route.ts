import { getEnv } from "@/lib/env";
import { runPostingCycle } from "@/lib/posting-cycle";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${getEnv().CRON_SECRET}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return Response.json(await runPostingCycle()); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 }); }
}

export const GET = POST;
