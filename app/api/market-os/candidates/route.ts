import { NextRequest, NextResponse } from "next/server";
import { MARKET_FEEDS, scoreMarketSource, type MarketCategory, type MarketSource } from "@/lib/market-os";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function unescapeXml(s: string) { return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/<[^>]*>/g, "").trim(); }
function tag(xml: string, name: string) { return unescapeXml(xml.match(new RegExp("<" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + name + ">", "i"))?.[1] ?? ""); }
export async function POST(req: NextRequest) {
 if (!process.env.ADMIN_SECRET || req.headers.get("x-admin-secret") !== process.env.ADMIN_SECRET) return NextResponse.json({error:"Unauthorized"},{status:401});
 let body: {categories?:MarketCategory[]};
 try { body = await req.json(); } catch { return NextResponse.json({error:"Invalid JSON"},{status:400}); }
 const categories = body.categories?.filter(c=>["investment","fx","crypto"].includes(c)) ?? [];
 if (!categories.length) return NextResponse.json({error:"Select at least one category"},{status:400});
 const sources: MarketSource[] = [];
 const errors: string[] = [];
 for (const feed of MARKET_FEEDS) {
  try {
   const response = await fetch(feed.url, {signal:AbortSignal.timeout(9000), headers:{"User-Agent":"AutPostXResearch/1.0 (news research)","Accept":"application/rss+xml, application/xml, text/xml"}});
   if (!response.ok) throw new Error("HTTP " + response.status);
   const xml = (await response.text()).slice(0, 500000);
   for (const item of xml.match(/<item\b[\s\S]*?<\/item>/gi)?.slice(0,30) ?? []) {
    const title=tag(item,"title"), url=tag(item,"link"), publishedAt=tag(item,"pubDate");
    if (title && url && publishedAt) for(const category of categories) sources.push({title,url,publishedAt,publisher:feed.publisher,category});
   }
  } catch { errors.push(feed.publisher + ": feed unavailable"); }
 }
 const candidates=sources.map(s=>scoreMarketSource(s,[])).filter((x):x is NonNullable<typeof x>=>Boolean(x)).filter(c=>c.score>=60).sort((a,b)=>b.score-a.score).slice(0,20);
 return NextResponse.json({candidates,errors,mode:"REVIEW_ONLY",publishingEnabled:false,notice:"Headlines are leads, not verified article facts. No automatic publishing."});
}
