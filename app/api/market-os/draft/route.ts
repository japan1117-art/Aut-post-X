import {NextRequest,NextResponse} from "next/server";
import {processMarketSource} from "@/lib/market-os-pipeline";
import type {MarketSource} from "@/lib/market-os";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 if(!process.env.ADMIN_SECRET||req.headers.get("x-admin-secret")!==process.env.ADMIN_SECRET)return NextResponse.json({error:"Unauthorized"},{status:401});
 let source:MarketSource;
 try{source=await req.json();}catch{return NextResponse.json({error:"Invalid JSON"},{status:400});}
 if(!source||!["investment","fx","crypto"].includes(source.category)||!["Federal Reserve","SEC"].includes(source.publisher)||!source.title||source.title.length>250||!source.url||source.url.length>1000||!source.publishedAt)return NextResponse.json({error:"Invalid source"},{status:400});
 const allowedHosts=source.publisher==="Federal Reserve"?["www.federalreserve.gov","federalreserve.gov"]:["www.sec.gov","sec.gov"];
 try{if(!allowedHosts.includes(new URL(source.url).hostname))throw Error();}catch{return NextResponse.json({error:"Source domain not trusted"},{status:400});}
 try{return NextResponse.json(await processMarketSource(source,false));}catch{return NextResponse.json({error:"Draft creation failed"},{status:503});}
}
