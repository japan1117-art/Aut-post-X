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
 return <main style={{maxWidth:920,margin:"auto",padding:24}}>
  <h1>Market Content OS — 検証版</h1>
  <p>投資・FX・暗号資産の一次情報候補を収集して採点します。現在は安全のため投稿・予約・自動公開を無効化しています。</p>
  <section style={{display:"flex",gap:20,flexWrap:"wrap",margin:"20px 0"}}>{choices.map(c=><label key={c.key}><input type="checkbox" checked={categories.includes(c.key)} onChange={e=>setCategories(v=>e.target.checked?[...v,c.key]:v.filter(x=>x!==c.key))}/>{c.label}</label>)}</section>
  <label>管理用シークレット（サーバーには保存しません）<input type="password" autoComplete="off" value={secret} onChange={e=>setSecret(e.target.value)} style={{display:"block",padding:10,width:"100%",maxWidth:450}}/></label>
  <button onClick={scan} disabled={loading||!secret||!categories.length} style={{margin:"16px 0",padding:12}}>{loading?"取得中...":"公式情報を収集してスコアリング"}</button>
  <p role="status">{message}</p>
  {errors.length>0&&<p>取得できなかったソース: {errors.join(", ")}</p>}
  {candidates.map((c,i)=><article key={c.url+":"+c.category+":"+i} style={{border:"1px solid #777",borderRadius:10,padding:16,margin:"12px 0"}}>
   <strong>{c.score}/100 — {c.title}</strong>
   <p>{c.publisher} / {c.category} / {new Date(c.publishedAt).toLocaleString("ja-JP")}</p>
   <p>需要 {c.breakdown.demand}・信頼性 {c.breakdown.credibility}・独自性 {c.breakdown.novelty}・鮮度 {c.breakdown.recency}</p>
   <a href={c.url} target="_blank" rel="noopener noreferrer">一次情報を確認</a>
  </article>)}
 </main>;
}
