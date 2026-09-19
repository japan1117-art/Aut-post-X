import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { generatePost } from "@/lib/generation";
import { checkContent } from "@/lib/compliance";
import { createAnalysisCard } from "@/lib/image-card";
import { publishToX } from "@/lib/x-client";
import type { PostRow } from "@/lib/types";

export async function runPostingCycle() {
  const client = db();
  const { data: settings, error: settingsError } = await client.from("settings").select("*").eq("id", true).single();
  if (settingsError) throw settingsError;
  if (!settings.posting_enabled || settings.circuit_open) return { skipped: true, reason: "posting is paused" };

  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await client.from("posts").select("id", { count: "exact", head: true }).eq("status", "posted").gte("posted_at", since);
  if ((count ?? 0) >= settings.daily_limit) return { skipped: true, reason: "daily limit reached" };
  if (settings.last_posted_at && Date.now() - new Date(settings.last_posted_at).getTime() < settings.min_interval_minutes * 60_000) return { skipped: true, reason: "minimum interval not reached" };

  let { data: queued } = await client.from("posts").select("*").eq("status", "queued").lte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(1).maybeSingle<PostRow>();
  if (!queued) {
    const generated = await generatePost();
    const inserted = await client.from("posts").insert({
      topic: generated.topic, format: generated.format, hook: generated.hook, body: generated.body,
      image_title: generated.imageTitle, image_points: generated.imagePoints, status: "queued", scheduled_at: new Date().toISOString(),
    }).select("*").single<PostRow>();
    if (inserted.error) throw inserted.error;
    queued = inserted.data;
  }

  const { data: recent } = await client.from("posts").select("body").eq("status", "posted").order("posted_at", { ascending: false }).limit(100);
  const compliance = checkContent(queued.body, (recent ?? []).map((row) => row.body));
  if (compliance.status !== "PASS") {
    await client.from("posts").update({ status: compliance.status === "FAIL" ? "failed" : "warning", compliance }).eq("id", queued.id);
    return { skipped: true, reason: "compliance check", compliance };
  }

  const lock = await client.from("posts").update({ status: "posting", compliance }).eq("id", queued.id).eq("status", "queued").select("id");
  if (lock.error || !lock.data?.length) return { skipped: true, reason: "already claimed" };
  try {
    const image = await createAnalysisCard(queued.image_title, queued.image_points);
    const published = await publishToX(queued.body, image);
    const now = new Date().toISOString();
    await Promise.all([
      client.from("posts").update({ status: "posted", posted_at: now, x_post_id: published.id, media_id: published.mediaId, error_log: null }).eq("id", queued.id),
      client.from("settings").update({ last_posted_at: now, consecutive_failures: 0 }).eq("id", true),
      client.from("audit_logs").insert({ action: "POST_PUBLISHED", entity_id: queued.id, detail: published }),
    ]);
    return { posted: true, postId: queued.id, xPostId: published.id, dryRun: getEnv().DRY_RUN === "true" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failures = settings.consecutive_failures + 1;
    await Promise.all([
      client.from("posts").update({ status: failures >= 3 ? "failed" : "queued", attempts: queued.attempts + 1, error_log: message }).eq("id", queued.id),
      client.from("settings").update({ consecutive_failures: failures, circuit_open: failures >= 3 }).eq("id", true),
      client.from("audit_logs").insert({ action: "POST_FAILED", entity_id: queued.id, detail: { message, failures } }),
    ]);
    throw error;
  }
}
