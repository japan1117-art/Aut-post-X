import { TwitterApi } from "twitter-api-v2";
import { getEnv, requireXEnv } from "@/lib/env";

export async function publishToX(text: string, image: Buffer) {
  const env = getEnv();
  if (env.DRY_RUN === "true") return { id: `dry-run-${Date.now()}`, text, mediaId: "dry-run" };
  const client = new TwitterApi(requireXEnv());
  const mediaId = await client.v1.uploadMedia(image, { mimeType: "image/png" });
  const result = await client.v2.tweet({ text, media: { media_ids: [mediaId] } });
  return { id: result.data.id, text: result.data.text, mediaId };
}
