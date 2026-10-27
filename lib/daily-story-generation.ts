import OpenAI from "openai";
import type { DailyStory, DailyStoryDraft } from "./daily-story";
import { validateDailyStoryDraft } from "./daily-story";

export async function generateDailyStory(story: DailyStory) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-5-mini",
    messages: [
      { role: "system", content: "You edit a Japanese QOL knowledge account. Produce exactly 3 engaging Japanese X posts in JSON in this exact order: knowledge = empathy and problem framing, practical = useful discovery and buying know-how, affiliate = product recommendation. Post 1: begin with a relatable everyday frustration, give 2-3 concrete examples with natural emoji, explain why it matters, and end with a useful insight; no sales pitch. Post 2: a surprising accurate fact or comparison, explain mechanism and practical selection criteria, natural emoji. Post 3: start with 【PR】, give the exact verified product name and URL, 2-4 concise verified features and real-world benefits, gentle CTA. All three posts must be independently understandable but share one natural daily theme. Include at most two relevant hashtags each. Use readable short paragraphs and natural Japanese; no robotic lists of specifications. Use only supplied verified product facts, never invent wattage, durability tests, certifications, prices, anecdotes, or comparisons. Do not copy unsupported figures from the topic angles. No unverified personal experiences or absolute claims. First two posts contain no URLs or PR. Each post <= 240 Unicode characters. Do not publish." },
      { role: "user", content: JSON.stringify(story) }
    ],
    response_format: { type: "json_schema", json_schema: {
      name: "daily_story", strict: true, schema: {
        type: "object", additionalProperties: false,
        properties: {
          date: {type:"string"}, theme: {type:"string"},
          posts: {type:"array", items: {type:"object",additionalProperties:false,properties:{
            kind:{type:"string",enum:["knowledge","practical","affiliate"]},
            text:{type:"string"}, sourceUrls:{type:"array",items:{type:"string"}}
          },required:["kind","text","sourceUrls"]}}
        },required:["date","theme","posts"]
      }
    }}
  });
  const raw = completion.choices[0]?.message.content;
  if (!raw) throw new Error("No generated content");
  const parsed = JSON.parse(raw) as Pick<DailyStoryDraft,"date"|"theme"|"posts">;
  const draft: DailyStoryDraft = {...parsed,status:"REVIEW_REQUIRED",published:false};
  return { draft, reasons: validateDailyStoryDraft(story,draft), approvedForPosting:false };
}
