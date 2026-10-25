import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { checkContent } from "@/lib/compliance";
import { validateProductDraft } from "@/lib/product-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Input = { name:string; asin:string; affiliateUrl:string; audience:string; benefit:string; evidenceUrl:string; verifiedAt:string; verifiedClaims:string[] };
export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers.get("x-admin-secret") !== secret) return NextResponse.json({error:"Unauthorized"},{status:401});
  let x: Input;
  try { x = await req.json() as Input; } catch { return NextResponse.json({error:"Invalid JSON"},{status:400}); }
  if (!x || !["name","asin","affiliateUrl","audience","benefit","evidenceUrl","verifiedAt"].every(k=>typeof x[k as keyof Input]==="string") || !Array.isArray(x.verifiedClaims) || x.verifiedClaims.some(v=>typeof v!=="string") || JSON.stringify(x).length>8000) return NextResponse.json({error:"Invalid input"},{status:400});
  const check=validateProductDraft(x);
  if (!x.audience.trim() || !x.benefit.trim() || !x.verifiedClaims.includes(x.benefit)) return NextResponse.json({error:"読者と根拠付きの紹介ポイントが必要です"},{status:400});
  // A short URL remains REVIEW even when its owner says it was verified. No auto publishing.
  if (check.status==="FAIL") return NextResponse.json({error:"商品データが不正",reasons:check.reasons},{status:400});
  try {
    const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    const response=await client.chat.completions.create({
      model:process.env.OPENAI_MODEL || "gpt-5-mini",
      messages:[
        {role:"system",content:"日本語のX向け商品紹介文を1件作成。出力は本文のみ。読者の具体的な悩みを冒頭で問いかけ、確認済みの特徴と読者にとっての選択理由を自然につなげる。過度な煽り、売上保証、最安・No.1・値段・在庫・割引・使用経験・口コミ・未確認の性能は一切書かない。確認済みの特徴以外を事実として断定しない。必ず冒頭に【PR】を入れ、最後に渡されたURLをそのまま記載。合計220文字以内。URLとPR表記は必須。"},
        {role:"user",content:JSON.stringify({name:x.name,audience:x.audience,verifiedBenefit:x.benefit,affiliateUrl:x.affiliateUrl})}
      ],temperature:0.6,
    });
    const text=response.choices[0]?.message.content?.trim()||"";
    const reasons:string[]=[...check.reasons];
    if (!text.startsWith("【PR】")) reasons.push("PR表記不足");
    if (!text.includes(x.affiliateUrl)) reasons.push("リンク不一致");
    if (Array.from(text).length>220) reasons.push("文字数超過");
    const content=checkContent(text,[]);
    if(content.status!=="PASS") reasons.push(...content.reasons);
    return NextResponse.json({text,status:reasons.length?"BLOCKED":"READY_FOR_REVIEW",reasons:[...new Set(reasons)],published:false},{headers:{"Cache-Control":"no-store"}});
  } catch { return NextResponse.json({error:"文章生成に失敗しました"},{status:502}); }
}
