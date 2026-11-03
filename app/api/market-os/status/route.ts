import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/db";
export const runtime="nodejs";
export async function GET(req:NextRequest){
 if(!process.env.ADMIN_SECRET||req.headers.get("x-admin-secret")!==process.env.ADMIN_SECRET)return NextResponse.json({error:"Unauthorized"},{status:401});
 const client=db();
 const {data,error}=await client.from("market_os_posts").select("id,body,publication_state,safety_status,x_post_id,posted_at,created_at").order("created_at",{ascending:false}).limit(30);
 if(error)return NextResponse.json({error:"DB unavailable"},{status:503});
 return NextResponse.json({publishingEnabled:process.env.MARKET_OS_LIVE_PUBLISH==="enabled",posts:data});
}
