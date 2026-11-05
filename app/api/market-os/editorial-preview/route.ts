import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/db";
import {createEditorialPreview} from "@/lib/market-os-editorial-v3";
import type {MarketSource} from "@/lib/market-os";
export const runtime="nodejs";
export const maxDuration=60;
export async function POST(req:NextRequest){
 if(!process.env.ADMIN_SECRET||req.headers.get("x-admin-secret")!==process.env.ADMIN_SECRET)return NextResponse.json({error:"Unauthorized"},{status:401});
 let body:{postId?:string};
 try{body=await req.json();}catch{return NextResponse.json({error:"Invalid JSON"},{status:400});}
 if(!body.postId||!/^[0-9a-f-]{36}$/i.test(body.postId))return NextResponse.json({error:"Invalid post ID"},{status:400});
 const client=db();
 const {data:post,error}=await client.from("market_os_posts").select("topic_id,publication_state").eq("id",body.postId).single();
 if(error||!post||post.publication_state!=="DRAFT")return NextResponse.json({error:"Draft required"},{status:409});
 const {data:topic,error:topicError}=await client.from("market_os_topics").select("title,source_url,source_publisher,published_at,category").eq("id",post.topic_id).single();
 if(topicError||!topic)return NextResponse.json({error:"Source missing"},{status:422});
 const source:MarketSource={title:topic.title,url:topic.source_url,publisher:topic.source_publisher,publishedAt:topic.published_at,category:topic.category};
 try{
  const preview=await createEditorialPreview(source);
  return NextResponse.json({...preview,publicationEnabled:false},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Generation failed"},{status:422});}
}
