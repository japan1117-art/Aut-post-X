import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/db";
import {TwitterApi} from "twitter-api-v2";
import {requireXEnv} from "@/lib/env";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 if(!process.env.ADMIN_SECRET||req.headers.get("x-admin-secret")!==process.env.ADMIN_SECRET)return NextResponse.json({error:"Unauthorized"},{status:401});
 const client=db();
 const {data:posts,error}=await client.from("market_os_posts").select("id,x_post_id").eq("publication_state","POSTED").not("x_post_id","is",null).order("posted_at",{ascending:false}).limit(20);
 if(error)return NextResponse.json({error:"DB read failed"},{status:503});
 const twitter=new TwitterApi(requireXEnv());
 let updated=0;const errors:string[]=[];
 for(const post of posts||[]){
  try{
   const tweet=await twitter.v2.singleTweet(post.x_post_id,{ "tweet.fields":["public_metrics","created_at"]});
   const metrics=tweet.data.public_metrics;
   if(!metrics)continue;
   const {error:writeError}=await client.from("market_os_metrics").insert({post_id:post.id,x_post_id:post.x_post_id,likes:metrics.like_count,reposts:metrics.retweet_count,replies:metrics.reply_count,quotes:metrics.quote_count,impressions:null});
   if(writeError)throw writeError;
   updated++;
  }catch{errors.push(post.id);}
 }
 return NextResponse.json({updated,failed:errors.length,notice:"Public engagement metrics only. Impressions and follower attribution require separate eligible API access."});
}
