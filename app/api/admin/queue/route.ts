import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { checkContent } from "@/lib/compliance";

export async function POST(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${getEnv().ADMIN_SECRET}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { topic: string; format?: string; text: string; imageTitle: string; imagePoints: string[]; scheduledAt?: string };
  const compliance = checkContent(body.text, []);
  if (compliance.status === "FAIL") return Response.json({ error: "Compliance failed", compliance }, { status: 422 });
  const { data, error } = await db().from("posts").insert({
    topic: body.topic, format: body.format ?? "knowledge", hook: body.imageTitle, body: body.text,
    image_title: body.imageTitle, image_points: body.imagePoints.slice(0, 3), scheduled_at: body.scheduledAt ?? new Date().toISOString(),
    status: compliance.status === "PASS" ? "queued" : "warning", compliance,
  }).select("id,status").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
