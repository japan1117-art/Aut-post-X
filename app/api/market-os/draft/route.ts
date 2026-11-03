import {NextRequest,NextResponse} from "next/server";
import {processMarketSource} from "@/lib/market-os-pipeline";
import {MARKET_FEEDS,type MarketSource} from "@/lib/market-os";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 if(!process.env.ADMIN_SECRET||req.headers.get("x-admin-secret")!==process.env.ADMIN_SECRET)return NextResponse.json({error:"Unauthorized"},{status:401});
 let source:MarketSource;
 try{source=await req.json();}catch{return NextResponse.json({error:"Invalid JSON"},{status:400});}
 if(!source||!["investment","fx","crypto"].includes(source.category)||!["Federal Reserve","SEC"].includes(source.publisher)||!source.title||source.title.length>250||!source.url||source.url.length>1000||!source.publishedAt)return NextResponse.json({error:"Invalid source"},{status:400});
 const allowedHosts=source.publisher==="Federal Reserve"?["www.federalreserve.gov","federalreserve.gov"]:["www.sec.gov","sec.gov"];
 try{if(!allowedHosts.includes(new URL(source.url).hostname))throw Error();}catch{return NextResponse.json({error:"Source domain not trusted"},{status:400});}
 // Fail closed: do not trust client-provided titles, publishers or URLs.
 const feed=MARKET_FEEDS.find(f=>f.publisher===source.publisher);
 if(!feed)return NextResponse.json({error:"Unsupported publisher"},{status:400});
 try{
  const response=await fetch(feed.url,{signal:AbortSignal.timeout(9000),cache:"no-store"});
  if(!response.ok)throw Error();
  const xml=(await response.text()).slice(0,500000);
  const canonical=(s:string)=>s.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim();
  const valid=(xml.match(/<item\\b[\\s\\S]*?<\\/item>/gi)||[]).some(item=>{
   const rawTitle=item.match(/<title(?:\\s[^>]*)?>([\\s\\S]*?)<\\/title>/i)?.[1]||"";
   const rawLink=item.match(/<link(?:\\s[^>]*)?>([\\s\\S]*?)<\\/link>/i)?.[1]||"";
   const title=canonical(rawTitle.replace(/<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>/g,"$1"));
   const link=canonical(rawLink.replace(/<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>/g,"$1"));
   return title===source.title && link===source.url;
  });
  if(!valid)return NextResponse.json({error:"Official feed did not confirm source title and URL"},{status:422});
 }catch{return NextResponse.json({error:"Source verification unavailable"},{status:503});}
 try{return NextResponse.json(await processMarketSource(source,false));}catch{return NextResponse.json({error:"Draft creation failed"},{status:503});}
}
