import OpenAI from "openai";
import type { DailyStory, DailyStoryDraft } from "./daily-story";
import { validateDailyStoryDraft } from "./daily-story";

export async function generateDailyStory(story: DailyStory) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-5-mini",
    messages: [
      { role: "system", content: "You edit a Japanese QOL knowledge account. Produce exactly 3 short X posts in JSON: knowledge, practical, affiliate. Use only supplied verified product facts. Explain facts, mechanism, implication, and daily benefit. No unsupported news, personal experiences, absolute comparisons, design praise, or numeric prices. The first two posts are independent educational content with no links. The third begins with 【PR】 and includes the exact affiliate URL. Every post <= 240 characters. Do not publish." },
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
