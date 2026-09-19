import OpenAI from "openai";
import { getEnv } from "@/lib/env";
import type { GeneratedPost } from "@/lib/types";

const themes = [
  "買う前に考えるCost per Use", "時短商品の損益分岐点", "安い商品と長く使える商品の比較",
  "100円ショップで代用してよい条件", "サブスクと買い切りの判断", "衝動買いを24時間保留する効果",
  "収納用品を増やす前に物を減らす判断", "送料無料に合わせ買いしない考え方", "耐久性に払う価格差",
  "一人暮らしで多機能家電を避ける条件", "時間価値から家事用品を評価する", "返品しやすさも価格に含める考え方",
];

export function topicForNow(date = new Date()) {
  const day = Math.floor(date.getTime() / 86_400_000);
  const slot = Math.floor((date.getUTCHours() + 9) / 8);
  return themes[(day * 3 + slot) % themes.length];
}

export async function generatePost(topic = topicForNow()): Promise<GeneratedPost> {
  const env = getEnv();
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.8,
    messages: [
      { role: "system", content: `あなたは「コスパ投資研究所」の編集者です。実体験を装わず、買い物の判断軸を日本語で発信します。確認できない商品性能・価格・統計・ランキングは書かないでください。煽り、効果保証、No.1表現は禁止です。本文は240文字以内。ハッシュタグは最大2個。URLは付けません。画像用の3要点は各24文字以内にします。` },
      { role: "user", content: `テーマ: ${topic}\n読者が保存したくなる、具体的で再利用可能な判断ルールを1投稿作ってください。` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "commerce_post", strict: true,
        schema: {
          type: "object", additionalProperties: false,
          properties: {
            topic: { type: "string" },
            format: { type: "string", enum: ["knowledge", "dont_buy", "cost_per_use", "time_roi"] },
            hook: { type: "string" }, body: { type: "string" }, imageTitle: { type: "string" },
            imagePoints: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
          },
          required: ["topic", "format", "hook", "body", "imageTitle", "imagePoints"],
        },
      },
    },
  });
  const raw = response.choices[0]?.message.content;
  if (!raw) throw new Error("OpenAI returned an empty post");
  return JSON.parse(raw) as GeneratedPost;
}
