import OpenAI from "openai";
import sharp from "sharp";
import {EDITORIAL_POLICY,reviewEditorialSafety} from "@/lib/market-os-editorial-policy";
import type {MarketSource} from "@/lib/market-os";

const escapeXml=(s:string)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const allowedHosts:Record<string,string[]>={
 "SEC":["sec.gov","www.sec.gov"],
 "Federal Reserve":["federalreserve.gov","www.federalreserve.gov"]
};
export function safeOfficialUrl(source:MarketSource):boolean {
 try{const u=new URL(source.url);return u.protocol==="https:"&&allowedHosts[source.publisher]?.includes(u.hostname)===true&&!u.username&&!u.password;}catch{return false;}
}
function extractText(html:string):string{
 const section=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]||"";
 return section.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g," ").trim().slice(0,9000);
}
export async function fetchOfficialArticle(source:MarketSource):Promise<string>{
 if(!safeOfficialUrl(source))throw new Error("Source URL is not on the official allowlist");
 const r=await fetch(source.url,{signal:AbortSignal.timeout(9000),redirect:"error",headers:{"User-Agent":"MarketContentOS/3.0 (editorial source verification)"}});
 if(!r.ok||!(r.headers.get("content-type")||"").includes("text/html"))throw new Error("Official article unavailable");
 const html=(await r.text()).slice(0,350000);
 const text=extractText(html);
 if(text.length<140)throw new Error("公式記事の本文が短すぎるか、抽出できませんでした。別のニュースを選んでください。");
 return text;
}
export type EditorialPreview={headline:string;article:string;summary:string;sourceUrl:string;imageBase64:string;mode:"PREVIEW_ONLY"};
export async function createEditorialPreview(source:MarketSource):Promise<EditorialPreview>{
 const original=await fetchOfficialArticle(source);
 const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:22000,maxRetries:0});
 const result=await client.chat.completions.create({
  model:process.env.OPENAI_MODEL||"gpt-5-mini",max_completion_tokens:1100,
  messages:[
   {role:"system",content:EDITORIAL_POLICY+"\n公式記事の本文に明示されている内容のみ事実として扱う。引用は短く、外部資料は未確認なので追加しない。日本語で400〜650字の独自考察記事を作成。見出しは日本語で読者の疑問や重要な論点を提示する（煽りや売買誘導は禁止）。冒頭2文でなぜ注目する価値があるかを具体的に説明。続けて「確認できる事実」「なぜ重要か」「考察」「反対シナリオ・リスク」「注目点」の順で読みやすく記述。市場への影響が小さい行政手続ニュースなら、影響を誇張せず、制度や仕組みを学べる教育記事にする。事実・考察・注目点・反対シナリオを明示。出力はJSONのみ: {\"headline\":\"...\",\"article\":\"...\",\"summary\":\"...\"}。summaryは画像用の短い要点（40文字以内）。"},
   {role:"user",content:JSON.stringify({sourceTitle:source.title,publisher:source.publisher,url:source.url,verifiedArticleText:original})}
  ]
 });
 const raw=(result.choices[0]?.message?.content||"").trim().replace(/^\x60\x60\x60(?:json)?\s*/,"").replace(/\s*\x60\x60\x60$/,"");
 const data=JSON.parse(raw) as {headline:string;article:string;summary:string};
 if(!data.headline||!data.article||!data.summary||[...data.article].length<250||[...data.article].length>1000||[...data.summary].length>40)throw new Error("Editorial length or format rejected");
 if(/[A-Za-z]{8,}(?:\\s+[A-Za-z]{4,}){3,}/.test(data.headline))throw new Error("Japanese headline required");
 const safety=reviewEditorialSafety(data.headline+"\n"+data.article+"\n"+data.summary);
 if(!safety.pass)throw new Error("Editorial safety rejected: "+safety.reasons.join(","));
 const title=[...data.headline].slice(0,34).join("");
 const summary=[...data.summary].slice(0,40).join("");
 // Deterministic vector design: no fabricated chart data, logos, or AI-drawn text.
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675">
 <rect width="1200" height="675" fill="#101728"/><rect x="55" y="48" width="1090" height="579" rx="24" fill="#19243c" stroke="#566a96" stroke-width="2"/>
 <rect x="90" y="90" width="190" height="42" rx="12" fill="#b7a173"/><text x="108" y="119" font-family="sans-serif" font-size="23" font-weight="bold" fill="#111827">MARKET INSIGHT</text>
 <text x="90" y="235" font-family="sans-serif" font-size="42" font-weight="bold" fill="#f6f1e8">${escapeXml([...title].slice(0,18).join(""))}</text>
 <text x="90" y="295" font-family="sans-serif" font-size="42" font-weight="bold" fill="#f6f1e8">${escapeXml([...title].slice(18).join(""))}</text>
 <line x1="90" y1="350" x2="1110" y2="350" stroke="#b7a173" stroke-width="3"/>
 <text x="90" y="430" font-family="sans-serif" font-size="30" fill="#d6deee">${escapeXml([...summary].slice(0,25).join(""))}</text>
 <text x="90" y="475" font-family="sans-serif" font-size="30" fill="#d6deee">${escapeXml([...summary].slice(25).join(""))}</text>
 <text x="90" y="570" font-family="sans-serif" font-size="24" fill="#aab6cb">SOURCE: ${escapeXml(source.publisher)} · Analysis / Education</text>
 </svg>`;
 const image=await sharp(Buffer.from(svg)).png().toBuffer();
 return {headline:data.headline,article:data.article,summary:data.summary,sourceUrl:source.url,imageBase64:image.toString("base64"),mode:"PREVIEW_ONLY"};
}
