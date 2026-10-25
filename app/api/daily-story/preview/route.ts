import { NextRequest, NextResponse } from "next/server";
import { checkDailyStory, type DailyStory } from "@/lib/daily-story";
import { generateDailyStory } from "@/lib/daily-story-generation";
export const runtime="nodejs";
export async function POST(req:NextRequest) {
 if(!process.env.ADMIN_SECRET || req.headers.get("x-admin-secret")!==process.env.ADMIN_SECRET) return NextResponse.json({error:"Unauthorized"},{status:401});
 let input:DailyStory;
 try {input=await req.json() as DailyStory;}catch{return NextResponse.json({error:"Invalid JSON"},{status:400});}
 if(JSON.stringify(input).length>12000) return NextResponse.json({error:"Input too large"},{status:400});
 const errors=checkDailyStory(input);
 if(errors.length) return NextResponse.json({errors},{status:400});
 try {const result=await generateDailyStory(input);return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});}
 catch{return NextResponse.json({error:"Generation failed"},{status:502});}
}
