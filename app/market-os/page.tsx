"use client";
import {useState} from "react";
import type {MarketCandidate,MarketCategory} from "@/lib/market-os";
const choices: {key:MarketCategory;label:string}[]=[{key:"investment",label:"投資"},{key:"fx",label:"FX・金融政策"},{key:"crypto",label:"暗号資産"}];
export default function MarketOS() {
 const [categories,setCategories]=useState<MarketCategory[]>(["investment","fx","crypto"]);
 const [secret,setSecret]=useState("");
 const [candidates,setCandidates]=useState<MarketCandidate[]>([]);
 const [errors,setErrors]=useState<string[]>([]);
 const [loading,setLoading]=useState(false);
 const [message,setMessage]=useState("");
 const [posts,setPosts]=useState<{id:string;body:string;publication_state:string;x_post_id:string|null}[]>([]);
 const [live,setLive]=useState(false);
 const [test,setTest]=useState<{state:string;claimed_count:number;max_posts:number;enabled:boolean}|null>(null);
 async function scan(){
  setLoading(true);setMessage("");setCandidates([]);
  try {
   const r=await fetch("/api/market-os/candidates",{method:"POST",headers:{"Content-Type":"application/json","x-admin-secret":secret},body:JSON.stringify({categories})});
   const data=await r.json();
   if(!r.ok) throw new Error(data.error||"取得に失敗しました");
   setCandidates(data.candidates||[]);setErrors(data.errors||[]);
   setMessage("候補取得完了。投稿は行っていません。");
  }catch(e){setMessage(e instanceof Error?e.message:"エラー");}finally{setLoading(false);}
 }
 async function refresh(){
  try{const r=await fetch("/api/market-os/status",{headers:{"x-admin-secret":secret}});const data=await r.json();if(!r.ok)throw Error(data.error||"取得失敗");setPosts(data.posts||[]);setLive(data.publishingEnabled);setTest(data.test||null);}catch(e){setMessage(String(e));}
 }
 async function draft(c:MarketCandidate){
  try{const r=await fetch("/api/market-os/draft",{method:"POST",headers:{"Content-Type":"application/json","x-admin-secret":secret},body:JSON.stringify({title:c.title,url:c.url,publisher:c.publisher,publishedAt:c.publishedAt,category:c.category})});const data=await r.json();if(!r.ok)throw Error(data.error||"保存失敗");setMessage("結果: "+data.status);await refresh();}catch(e){setMessage(String(e));}
 }
 async function generate(id:string){
  try{const r=await fetch("/api/market-os/generate",{method:"POST",headers:{"Content-Type":"application/json","x-admin-secret":secret},body:JSON.stringify({postId:id})});const data=await r.json();if(!r.ok)throw Error(data.error||"生成失敗");setMessage("下書き生成: "+data.mode);await refresh();}catch(e){setMessage(String(e));}
 }
 async function metrics(){
  try{const r=await fetch("/api/market-os/metrics",{method:"POST",headers:{"Content-Type":"application/json","x-admin-secret":secret}});const data=await r.json();if(!r.ok)throw Error(data.error||"取得失敗");setMessage("反応データ更新: "+data.updated+"件 / 失敗: "+data.failed+"件");}catch(e){setMessage(String(e));}
 }
 async function publish(id:string){
  if(!window.confirm("この投稿をXに実際に公開しますか？"))return;
  try{const r=await fetch("/api/market-os/publish",{method:"POST",headers:{"Content-Type":"application/json","x-admin-secret":secret},body:JSON.stringify({postId:id})});const data=await r.json();setMessage("公開結果: "+data.status+(data.xPostId?" X ID "+data.xPostId:""));await refresh();}catch(e){setMessage(String(e));}
 }
 return <main style={{maxWidth:920,margin:"auto",padding:24}}>
  <h1>Market Content OS — 検証版</h1>
  <p>投資・FX・暗号資産の一次情報候補を収集して採点します。AI下書き生成・安全審査・公開履歴確認が可能です。自動公開は専用フラグが無効の間ロックされます。</p>
  <section style={{display:"flex",gap:20,flexWrap:"wrap",margin:"20px 0"}}>{choices.map(c=><label key={c.key}><input type="checkbox" checked={categories.includes(c.key)} onChange={e=>setCategories(v=>e.target.checked?[...v,c.key]:v.filter(x=>x!==c.key))}/>{c.label}</label>)}</section>
  <label>管理用シークレット（サーバーには保存しません）<input type="password" autoComplete="off" value={secret} onChange={e=>setSecret(e.target.value)} style={{display:"block",padding:10,width:"100%",maxWidth:450}}/></label>
  <button onClick={scan} disabled={loading||!secret||!categories.length} style={{margin:"16px 0",padding:12}}>{loading?"取得中...":"公式情報を収集してスコアリング"}</button>
  <p role="status">{message}</p>
  {errors.length>0&&<p>取得できなかったソース: {errors.join(", ")}</p>}
  <p><button disabled={!secret} onClick={()=>void refresh()}>保存済み下書き・公開履歴を確認</button> <button disabled={!secret} onClick={()=>void metrics()}>X公開反応を取得</button> テスト: {test?`${test.state} / ${test.claimed_count}件確保（上限${test.max_posts}件）`:"未取得"} 公開機能: {live?"有効":"ロック中"}</p>
  {posts.map(p=><article key={p.id} style={{border:"1px solid #777",padding:12,margin:"10px 0"}}><p style={{whiteSpace:"pre-wrap"}}>{p.body}</p><p>{p.publication_state} {p.x_post_id||""}</p><button disabled={!secret||p.publication_state!=="DRAFT"} onClick={()=>void generate(p.id)}>AI下書き生成・安全審査</button> <button disabled={!live||p.publication_state!=="DRAFT"} onClick={()=>void publish(p.id)}>Xに個別公開</button></article>)}
  {candidates.map((c,i)=><article key={c.url+":"+c.category+":"+i} style={{border:"1px solid #777",borderRadius:10,padding:16,margin:"12px 0"}}>
   <strong>{c.score}/100 — {c.title}</strong>
   <p>{c.publisher} / {c.category} / {new Date(c.publishedAt).toLocaleString("ja-JP")}</p>
   <p>需要 {c.breakdown.demand}・信頼性 {c.breakdown.credibility}・独自性 {c.breakdown.novelty}・鮮度 {c.breakdown.recency}</p>
   <a href={c.url} target="_blank" rel="noopener noreferrer">一次情報を確認</a> <button disabled={!secret} onClick={()=>void draft(c)}>引用付き下書きを保存</button>
  </article>)}
 </main>;
}
