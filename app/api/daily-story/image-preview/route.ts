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
  const response=await openai.images.generate({model:process.env.OPENAI_IMAGE_MODEL||"gpt-image-1.5",size:"1024x1024",n:1,quality:"high",prompt:`Create a PREMIUM original 3D-anime-inspired illustration for a Japanese X post. Visual reference style: adorable super-deformed chibi anime heroes with oversized expressive eyes, rounded helmets or accessories when appropriate, glossy dimensional shading, vivid purple/cyan/blue neon lighting, dynamic cinematic composition, polished high-budget Japanese mobile-game key art. This is a style direction, not a request to depict any existing character, franchise or logo. Theme: ${input.theme}. Post concept: ${input.text}. Tell ONE clear visual story from the post using a cute character, a recognisable everyday object, expressive gestures, and a clean focal point. For a relatable frustration show the character struggling with the problem; for practical knowledge show a visually clear solution or contrast. Compose for a mobile social feed, generous negative space, sophisticated lighting, beautiful detail, appealing depth, no multi-panel infographic grids. CRITICAL: ABSOLUTELY NO TEXT OF ANY KIND anywhere in the image: no Japanese or English letters, no words, numbers, symbols resembling writing, labels, captions, UI text, badges, typography, signatures or watermarks. Do not show fake technical features or unverified product properties. No brand logos, no advertisements, no fabricated claims. The visual must be understandable without reading any text.`});
  const b64=response.data?.[0]?.b64_json;
  if(!b64) return NextResponse.json({error:"画像が返されませんでした"},{status:502});
  return NextResponse.json({imageDataUrl:`data:image/png;base64,${b64}`,published:false,reviewRequired:true},{headers:{"Cache-Control":"no-store"}});
 }catch(e){
  const err=e as {status?:number;code?:string;message?:string};
  console.error("daily-story image generation failed",{status:err.status,code:err.code,message:err.message});
  const status=err.status;
  const hint=status===401?"OpenAI APIキーを確認してください":status===403?"画像モデルの利用権限・組織認証を確認してください":status===429?"API利用上限または残高を確認してください":status===400?"画像モデル名・APIパラメータを確認してください":"VercelのFunctionログで詳細を確認してください";
  return NextResponse.json({error:`画像生成に失敗しました。${hint}`,code:err.code||"image_generation_error",upstreamStatus:status||null},{status:502});
 }
}
