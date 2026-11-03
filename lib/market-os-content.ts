import OpenAI from "openai";
import {marketDraftSafety,type MarketSource} from "@/lib/market-os";
import {makeSourcePost} from "@/lib/market-os-pipeline";
export type DraftResult={body:string;mode:"AI"|"SOURCE_ONLY";pass:boolean;reasons:string[]};
const unsupported=/必ず|絶対|確実|買い推奨|売り推奨|急騰する|暴落する|儲かる|利益保証|投資すべき|価格目標|年率\d+%/i;
export function validateGroundedDraft(body:string,source:MarketSource):{pass:boolean;reasons:string[]} {
 const base=marketDraftSafety(body,source.url,[]);
 const reasons=[...base.reasons];
 if(!body.includes(source.title))reasons.push("missing_exact_headline");
 if(!body.includes(source.publisher))reasons.push("missing_publisher");
 if(unsupported.test(body))reasons.push("unsupported_financial_prediction");
 if(/https?:\/\//g.test(body)&&[...body.matchAll(/https?:\/\/\S+/g)].some(m=>m[0]!==source.url))reasons.push("unverified_link");
 return {pass:reasons.length===0,reasons};
}
export async function generateGroundedDraft(source:MarketSource):Promise<DraftResult>{
 const fallback=makeSourcePost(source);
 if(!process.env.OPENAI_API_KEY)return {...validateGroundedDraft(fallback,source),body:fallback,mode:"SOURCE_ONLY"};
 try{
  const openai=new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:12000,maxRetries:0});
  const response=await openai.chat.completions.create({model:process.env.OPENAI_MODEL||"gpt-5-mini",temperature:0.2,max_completion_tokens:350,messages:[
   {role:"system",content:"日本語の金融情報編集者。事実の捏造禁止。見出しだけが確認済みで本文は未確認。見出しから市場の影響、値動き、具体的数値、背景を推測して書かない。煽り、売買推奨、ハッシュタグ、PR禁止。140〜240文字程度。原文見出し・発行元・出典URLを正確に含める。出力は投稿文のみ。"},
   {role:"user",content:JSON.stringify({headline:source.title,publisher:source.publisher,url:source.url,category:source.category})}
  ]});
  const body=(response.choices[0]?.message?.content||"").trim();
  const check=validateGroundedDraft(body,source);
  if(check.pass)return {body,mode:"AI",...check};
 }catch{}
 const check=validateGroundedDraft(fallback,source);
 return {body:fallback,mode:"SOURCE_ONLY",...check};
}
