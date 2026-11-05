import {reviewEditorialSafety} from "@/lib/market-os-editorial-policy";
import {testWindowOpen} from "@/lib/market-os-test-window";
import { db } from "@/lib/db";
import { TwitterApi } from "twitter-api-v2";
import { requireXEnv } from "@/lib/env";
import { marketDraftSafety, scoreMarketSource, type MarketCategory, type MarketSource } from "@/lib/market-os";
import { createHash } from "node:crypto";

export const marketEnabled = () => testWindowOpen() && process.env.MARKET_OS_LIVE_PUBLISH === "enabled";
export function makeSourcePost(source:MarketSource):string {
 // Deliberately avoid unverified claims: a neutral announcement, exact source headline, and source URL.
 const prefix = source.category === "crypto" ? "暗号資産の一次情報" : source.category === "fx" ? "為替・金融政策の一次情報" : "投資・金融市場の一次情報";
 const title = [...source.title].slice(0,100).join("");
 return `${prefix}：${title}\n出典：${source.publisher}\n${source.url}`;
}
export async function processMarketSource(source:MarketSource, publish=false) {
 const client=db();
 const candidate=scoreMarketSource(source,[]);
 if(!candidate || candidate.score<60 || !["Federal Reserve","SEC"].includes(source.publisher)) return {status:"BLOCKED",reason:"source/score"};
 const {data:existing,error:readError}=await client.from("market_os_topics").select("id").eq("category",source.category).eq("source_url",source.url).limit(1);
 if(readError) throw readError;
 if(existing?.length) return {status:"SKIPPED",reason:"already processed"};
 const body=makeSourcePost(source);
 const safety=marketDraftSafety(body,source.url,[]);
 if(!safety.pass) return {status:"BLOCKED",reason:safety.reasons};
 const {data:topic,error:topicError}=await client.from("market_os_topics").insert({category:source.category,title:source.title,source_url:source.url,source_publisher:source.publisher,published_at:source.publishedAt,score:candidate.score,review_status:"PASS"}).select("id").single();
 if(topicError){if(topicError.code==="23505")return {status:"SKIPPED",reason:"duplicate"};throw topicError;}
 const {data:post,error:postError}=await client.from("market_os_posts").insert({topic_id:topic.id,body,safety_status:"PASS",publication_state:"DRAFT"}).select("id").single();
 if(postError)throw postError;
 if(!publish || !marketEnabled())return {status:"DRAFT",postId:post.id,body};
 return publishMarketPost(post.id);
}
export async function publishMarketPost(postId:string) {
 if(!marketEnabled())return {status:"LOCKED"};
 const client=db();
 const {data:post,error}=await client.from("market_os_posts").select("id,body,safety_status,publication_state,topic_id").eq("id",postId).single();
 if(error||!post||post.safety_status!=="PASS"||post.publication_state!=="DRAFT")return {status:"BLOCKED",reason:"not eligible"};
 const {data:topic,error:topicError}=await client.from("market_os_topics").select("source_url,source_publisher").eq("id",post.topic_id).single();
 if(topicError||!topic||!["Federal Reserve","SEC"].includes(topic.source_publisher))return {status:"BLOCKED",reason:"source"};
 const safety=marketDraftSafety(post.body,topic.source_url,[]);
 const editorial=reviewEditorialSafety(post.body);
 if(!safety.pass||!editorial.pass)return {status:"BLOCKED",reason:[...safety.reasons,...editorial.reasons]};
 const claim=await client.rpc("market_os_claim_test_slot",{p_post_id:post.id});
 if(claim.error||claim.data!==true)return {status:"SKIPPED",reason:"outside test window, quota reached, or already claimed"};
 try {
  const twitter=new TwitterApi(requireXEnv());
  const published=await twitter.v2.tweet(post.body);
  const saved=await client.from("market_os_posts").update({publication_state:"POSTED",x_post_id:published.data.id,posted_at:new Date().toISOString()}).eq("id",post.id);
  if(saved.error)throw saved.error;
  return {status:"POSTED",postId:post.id,xPostId:published.data.id};
 }catch(e){
  // Unknown X result must never be automatically retried.
  await client.from("market_os_posts").update({publication_state:"FAILED_UNKNOWN"}).eq("id",post.id);
  return {status:"FAILED_UNKNOWN",reason:"X request or persistence failed; inspect X before retry"};
 }
}
