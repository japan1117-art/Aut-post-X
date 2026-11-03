import {NextRequest,NextResponse} from "next/server";
import {MARKET_FEEDS,scoreMarketSource,type MarketSource} from "@/lib/market-os";
import {processMarketSource,marketEnabled} from "@/lib/market-os-pipeline";
import {db} from "@/lib/db";
export const runtime="nodejs";
export const maxDuration=60;
export async function GET(req:NextRequest){
 if(!process.env.CRON_SECRET||req.headers.get("authorization")!=="Bearer "+process.env.CRON_SECRET)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!marketEnabled())return NextResponse.json({status:"LOCKED",published:false});
 const client=db();
 const dayStart=new Date();dayStart.setUTCHours(0,0,0,0);
 const {count,error:countError}=await client.from("market_os_posts").select("id",{count:"exact",head:true}).eq("publication_state","POSTED").gte("posted_at",dayStart.toISOString());
 if(countError)return NextResponse.json({error:"Daily limit check unavailable"},{status:503});
 if((count||0)>=3)return NextResponse.json({status:"LIMIT_REACHED",dailyLimit:3});
 const decode=(s:string)=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim();
 const tag=(s:string,n:string)=>decode(s.match(new RegExp("<"+n+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/"+n+">","i"))?.[1]||"");
 const candidates:MarketSource[]=[];
 for(const feed of MARKET_FEEDS){
  try{
   const r=await fetch(feed.url,{signal:AbortSignal.timeout(9000),cache:"no-store"});
   if(!r.ok)continue;
   const xml=(await r.text()).slice(0,500000);
   for(const item of (xml.match(/<item\b[\s\S]*?<\/item>/gi)||[]).slice(0,25)){
    const title=tag(item,"title"),url=tag(item,"link"),publishedAt=tag(item,"pubDate");
    if(!title||!url||!publishedAt)continue;
    const categories=feed.publisher==="Federal Reserve"?["fx" as const]:["investment" as const,"crypto" as const];
    for(const category of categories)candidates.push({title,url,publishedAt,publisher:feed.publisher,category});
   }
  }catch{}
 }
 const ranked=candidates.map(c=>({source:c,rank:scoreMarketSource(c,[])})).filter(x=>x.rank&&x.rank.score>=80).sort((a,b)=>(b.rank?.score||0)-(a.rank?.score||0));
 for(const item of ranked.slice(0,15)){
  const result=await processMarketSource(item.source,true);
  if(result.status==="POSTED"||result.status==="FAILED_UNKNOWN")return NextResponse.json(result);
 }
 return NextResponse.json({status:"SKIPPED",reason:"No eligible verified new sources"});
}
