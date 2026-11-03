import {testWindowState} from "@/lib/market-os-test-window";
import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/db";
export const runtime="nodejs";
export async function GET(req:NextRequest){
 if(!process.env.ADMIN_SECRET||req.headers.get("x-admin-secret")!==process.env.ADMIN_SECRET)return NextResponse.json({error:"Unauthorized"},{status:401});
 const client=db();
 const {data,error}=await client.from("market_os_posts").select("id,body,publication_state,safety_status,x_post_id,posted_at,created_at").order("created_at",{ascending:false}).limit(30);
 if(error)return NextResponse.json({error:"DB unavailable"},{status:503});
 const {data:test,error:testError}=await client.from("market_os_test_control").select("starts_at,ends_at,max_posts,claimed_count,enabled").eq("id",true).single();
 if(testError)return NextResponse.json({error:"Test safety state unavailable"},{status:503});
 return NextResponse.json({publishingEnabled:process.env.MARKET_OS_LIVE_PUBLISH==="enabled"&&testWindowState()==="OPEN"&&test.enabled&&test.claimed_count<test.max_posts,test:{...test,state:testWindowState()},posts:data});
}
