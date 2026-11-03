import {NextRequest,NextResponse} from "next/server";
import {publishMarketPost,marketEnabled} from "@/lib/market-os-pipeline";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 if(!process.env.ADMIN_SECRET||req.headers.get("x-admin-secret")!==process.env.ADMIN_SECRET)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!marketEnabled())return NextResponse.json({error:"Market OS publishing disabled"},{status:423});
 let input:{postId?:string};
 try{input=await req.json();}catch{return NextResponse.json({error:"Invalid JSON"},{status:400});}
 if(!input.postId||!/^[0-9a-f-]{36}$/i.test(input.postId))return NextResponse.json({error:"Invalid post ID"},{status:400});
 const result=await publishMarketPost(input.postId);
 return NextResponse.json(result,{status:result.status==="POSTED"?200:409});
}
