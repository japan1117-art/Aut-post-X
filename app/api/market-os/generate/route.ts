import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/db";
import {generateGroundedDraft} from "@/lib/market-os-content";
import type {MarketSource} from "@/lib/market-os";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 if(!process.env.ADMIN_SECRET||req.headers.get("x-admin-secret")!==process.env.ADMIN_SECRET)return NextResponse.json({error:"Unauthorized"},{status:401});
 let input:{postId?:string};
 try{input=await req.json();}catch{return NextResponse.json({error:"Invalid JSON"},{status:400});}
 if(!input.postId||!/^[0-9a-f-]{36}$/i.test(input.postId))return NextResponse.json({error:"Invalid post ID"},{status:400});
 const client=db();
 const {data:post,error}=await client.from("market_os_posts").select("id,topic_id,publication_state").eq("id",input.postId).single();
 if(error||!post||post.publication_state!=="DRAFT")return NextResponse.json({error:"Not an editable draft"},{status:409});
 const {data:topic,error:topicError}=await client.from("market_os_topics").select("title,source_url,source_publisher,published_at,category").eq("id",post.topic_id).single();
 if(topicError||!topic||!["SEC","Federal Reserve"].includes(topic.source_publisher))return NextResponse.json({error:"Unverified source"},{status:422});
 const source:MarketSource={title:topic.title,url:topic.source_url,publisher:topic.source_publisher,publishedAt:topic.published_at,category:topic.category};
 const result=await generateGroundedDraft(source);
 if(!result.pass)return NextResponse.json({error:"Safety check failed",reasons:result.reasons},{status:422});
 const {data:updated,error:updateError}=await client.from("market_os_posts").update({body:result.body,safety_status:"PASS"}).eq("id",post.id).eq("publication_state","DRAFT").select("id").single();
 if(updateError||!updated)return NextResponse.json({error:"Draft changed concurrently"},{status:409});
 return NextResponse.json({status:"DRAFT",mode:result.mode,body:result.body,publicationEnabled:false});
}
