import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/db";
import {createEditorialPreview} from "@/lib/market-os-editorial-v3";
import {reviewEditorialSafety} from "@/lib/market-os-editorial-policy";
import type {MarketSource} from "@/lib/market-os";
export const runtime="nodejs";
export const maxDuration=60;
export async function POST(req:NextRequest){
 if(!process.env.ADMIN_SECRET||req.headers.get("x-admin-secret")!==process.env.ADMIN_SECRET)return NextResponse.json({error:"Unauthorized"},{status:401});
 const client=db();
 const {data:posts,error}=await client.from("market_os_posts").select("id,topic_id,publication_state").eq("publication_state","DRAFT").order("created_at",{ascending:false}).limit(10);
 if(error)return NextResponse.json({error:"Draft lookup failed"},{status:503});
 if(!posts?.length)return NextResponse.json({status:"NO_DRAFT",published:false,message:"公式情報から下書きを作成してからテストしてください。"});
 const post=posts[0];
 const {data:topic,error:topicError}=await client.from("market_os_topics").select("title,source_url,source_publisher,published_at,category").eq("id",post.topic_id).single();
 if(topicError||!topic)return NextResponse.json({error:"Source missing"},{status:422});
 const source:MarketSource={title:topic.title,url:topic.source_url,publisher:topic.source_publisher,publishedAt:topic.published_at,category:topic.category};
 try{
  const preview=await createEditorialPreview(source);
  const image=Buffer.from(preview.imageBase64,"base64");
  const checks={
   officialSource:source.url.startsWith("https://"),
   articleLength:[...preview.article].length>=250&&[...preview.article].length<=1000,
   neutralAnalysis:reviewEditorialSafety(preview.headline+"\n"+preview.article+"\n"+preview.summary).pass,
   imagePng:image.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
   noXPublishing:true
  };
  return NextResponse.json({status:Object.values(checks).every(Boolean)?"PASS":"FAIL",checks,postId:post.id,preview,published:false},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return NextResponse.json({status:"FAIL",published:false,error:e instanceof Error?e.message:"Test generation failed"},{status:422});}
}
