import {NextRequest,NextResponse} from "next/server";
import {checkDailyStory,validateDailyStoryDraft,type DailyStory,type DailyStoryDraft} from "@/lib/daily-story";
import {checkContent} from "@/lib/compliance";
import {getEnv} from "@/lib/env";
import {publishToX} from "@/lib/x-client";
import {TwitterApi} from "twitter-api-v2";
import {db} from "@/lib/db";
import {createHash} from "node:crypto";
import {requireXEnv} from "@/lib/env";
export const runtime="nodejs";
export const maxDuration=60;
type Payload={story:DailyStory;draft:DailyStoryDraft;images:{0?:string;1?:string};approved:boolean;index:number};
export async function POST(req:NextRequest){
 if(!process.env.ADMIN_SECRET || req.headers.get("x-admin-secret")!==process.env.ADMIN_SECRET) return NextResponse.json({error:"Unauthorized"},{status:401});
 let input:Payload;
 try{input=await req.json();}catch{return NextResponse.json({error:"Invalid JSON"},{status:400});}
 if(!input || !input.approved || ![0,1,2].includes(input.index) || !input.story || !input.draft) return NextResponse.json({error:"Explicit approval and valid post index required"},{status:400});
 if(JSON.stringify(input).length>8_000_000) return NextResponse.json({error:"Payload too large"},{status:413});
 const errors=[...checkDailyStory(input.story),...validateDailyStoryDraft(input.story,input.draft)];
 if(errors.length) return NextResponse.json({errors},{status:400});
 const post=input.draft.posts[input.index];
 const compliance=checkContent(post.text,[]);
 if(compliance.status!=="PASS") return NextResponse.json({error:"Compliance check did not pass",compliance},{status:400});
 if(input.index<2 && (!input.images || typeof input.images[input.index as 0|1]!=="string" || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(input.images[input.index as 0|1]!))) return NextResponse.json({error:"GPT image required for non-PR post"},{status:400});
 if(input.index===2 && !post.text.startsWith("【PR】")) return NextResponse.json({error:"PR label required"},{status:400});
 // Fail closed until explicitly enabled. Prevent accidental live posts during review.
 if(process.env.DAILY_STORY_LIVE_PUBLISH!=="enabled") return NextResponse.json({error:"Live publishing is locked. Configure DAILY_STORY_LIVE_PUBLISH=enabled after testing.",dryRun:true},{status:423});
 try{
  if(getEnv().DRY_RUN==="true") return NextResponse.json({dryRun:true,text:post.text,index:input.index,published:false});
  const database=db();
  const key=`${input.story.date}:${input.index}`;
  const claim=await database.from("daily_story_publish_attempts").insert({publish_key:key,story_date:input.story.date,slot_index:input.index,content_hash:createHash("sha256").update(post.text).digest("hex"),state:"claimed"});
  if(claim.error) return NextResponse.json({error:claim.error.code==="23505"?"This slot was already submitted; check X before retrying.":"Publish history database unavailable. Apply migration before enabling live posting."},{status:claim.error.code==="23505"?409:503});
  if(input.index<2){
   const b64=input.images[input.index as 0|1]!.split(",")[1];
   const published=await publishToX(post.text,Buffer.from(b64,"base64"));
   await database.from("daily_story_publish_attempts").update({state:"posted",x_post_id:published.id}).eq("publish_key",key);
   return NextResponse.json({published:true,id:published.id,index:input.index});
  }
  const client=new TwitterApi(requireXEnv());
  const response=await client.v2.tweet(post.text);
  await database.from("daily_story_publish_attempts").update({state:"posted",x_post_id:response.data.id}).eq("publish_key",key);
  return NextResponse.json({published:true,id:response.data.id,index:input.index});
 }catch{return NextResponse.json({error:"X posting failed. Check X before retrying to avoid duplicates."},{status:502});}
}
