import {NextRequest,NextResponse} from "next/server";
import OpenAI from "openai";
export const runtime="nodejs";
export const maxDuration=60;
export async function POST(req:NextRequest){
 if(!process.env.ADMIN_SECRET || req.headers.get("x-admin-secret")!==process.env.ADMIN_SECRET) return NextResponse.json({error:"Unauthorized"},{status:401});
 let input:{kind?:string;text?:string;theme?:string};
 try{input=await req.json();}catch{return NextResponse.json({error:"Invalid JSON"},{status:400});}
 if(!["knowledge","practical"].includes(input.kind||"") || typeof input.text!=="string" || !input.text.trim() || input.text.length>1000 || typeof input.theme!=="string" || input.theme.length>200 || /https?:\/\/|【PR】/.test(input.text)) return NextResponse.json({error:"非PR記事のみ画像生成できます"},{status:400});
 try{
  const openai=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const response=await openai.images.generate({model:"gpt-image-1",size:"1024x1024",n:1,quality:"medium",prompt:`Create one original polished Japanese social-media editorial illustration for an educational X post. Theme: ${input.theme}. Post: ${input.text}. Show a clear concrete visual explanation of the mechanism or daily-life solution. Editorial infographic style with realistic everyday objects, professional layout, legible minimal Japanese captions only when essential. Do not invent statistics, technical labels, certifications, brand logos, endorsements, product specifications, or news scenes. No price labels, no watermarks, no text screenshots. No advertisements. The image must be appropriate to the specific post and visually understandable on a phone.`});
  const b64=response.data?.[0]?.b64_json;
  if(!b64) return NextResponse.json({error:"画像が返されませんでした"},{status:502});
  return NextResponse.json({imageDataUrl:`data:image/png;base64,${b64}`,published:false,reviewRequired:true},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"画像生成に失敗しました"},{status:502});}
}
