import OpenAI from "openai";
import { getEnv } from "@/lib/env";
import type { GeneratedPost } from "@/lib/types";

const themes = [
  "USB-C充電器とケーブルの出力の違い", "停電時に備えるモバイルバッテリーの選び方",
  "家電の待機電力と節電の基本", "クレジットカードのポイント還元と年会費の損益分岐点",
  "SDカードの容量と速度規格の違い", "季節の衣替えと収納の時短",
  "防災備蓄品のローリングストック", "充電規格とノートPCの互換性",
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
    messages: [
      { role: "system", content: `あなたは「コスパ投資研究所」の編集者です。実体験を装わず、買い物の判断軸を日本語で発信します。確認できない商品性能・価格・統計・ランキング・最新ニュースを事実として書かないでください。読者に役立つ雑学、生活の知恵、家計・クレジットカードの基礎知識、防災、季節の話題、技術と買い物の判断軸を幅広く扱ってください。技術的特徴は「何ができる→どんな不便を解決する→どんな人に向くか」の順で具体化し、外観デザインの感想は不要です。特定の他社商品を名指しした優劣比較は避け、根拠がある場合のみ一般的な選択肢との違いを説明してください。価格の具体額は書かず、価格と機能のバランスを判断する視点を示してください。話題を既存の商品紹介と自然につなげられる場合は、関連する知識を提供してください。ただし根拠なく商品を推薦したり、全投稿を宣伝に誘導しないでください。最新ニュースの具体的な事実は検索・確認済み資料が入力されていない限り生成しないでください。金融商品の還元率・条件・優位性も未検証なら断定しないでください。煽り、効果保証、No.1表現は禁止です。本文は240文字以内。ハッシュタグは最大2個。URLは付けません。画像用の3要点は各24文字以内にします。` },
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
