"use client";
import {useState} from "react";
import type {DailyStory,DailyStoryDraft} from "@/lib/daily-story";

const initial:DailyStory={
 date:new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Tokyo"}),
 theme:"充電環境を快適にする",
 product:{name:"Anker PowerLine III Flow USB-Cケーブル 1.8m",asin:"B093L5CMMT",affiliateUrl:"",verifiedFeatures:["最大240W対応（対応機器と充電器が必要）","折り曲げ試験約25,000回（メーカー公表値、要再確認）","柔軟な構造"],sourceUrls:[]},
 slots:[{kind:"knowledge",angle:"USB-Cの給電規格と充電速度の関係"},{kind:"practical",angle:"スマホとPCでケーブルを共用する条件"},{kind:"affiliate",angle:"技術的特徴、生活での利便性、価格対機能"}]
};
export default function Page(){
 const [story,setStory]=useState<DailyStory>(initial);
 const [secret,setSecret]=useState("");
 const [result,setResult]=useState<{draft:DailyStoryDraft;reasons:string[]}|null>(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(false);
 const product=story.product;
 const updateProduct=(patch:Partial<DailyStory["product"]>)=>setStory(s=>({...s,product:{...s.product,...patch}}));
 async function run(){
  setLoading(true);setError("");setResult(null);
  try{
   const res=await fetch("/api/daily-story/preview",{method:"POST",headers:{"Content-Type":"application/json","x-admin-secret":secret},body:JSON.stringify(story)});
   const data=await res.json();
   if(!res.ok) throw new Error(data.errors?.join("、")||data.error||"生成エラー");
   setResult(data);
  }catch(e){setError(e instanceof Error?e.message:String(e));}
  finally{setLoading(false);setSecret("");}
 }
 const inputStyle={display:"block",width:"100%",padding:9,marginTop:4,marginBottom:12};
 return <main style={{maxWidth:780,margin:"auto",padding:24}}>
  <h1>1日3投稿・ストーリー生成テスト</h1>
  <p>雑学 → 生活の知恵 → 商品紹介（PR）。AIが3本を一括生成します。保存・予約・X公開は行いません。</p>
  <label>日付<input type="date" value={story.date} onChange={e=>setStory(s=>({...s,date:e.target.value}))} style={inputStyle}/></label>
  <label>QOLテーマ<input value={story.theme} onChange={e=>setStory(s=>({...s,theme:e.target.value}))} style={inputStyle}/></label>
  <label>商品名<input value={product.name} onChange={e=>updateProduct({name:e.target.value})} style={inputStyle}/></label>
  <label>ASIN<input value={product.asin} onChange={e=>updateProduct({asin:e.target.value})} style={inputStyle}/></label>
  <label>確認済みアフィリエイトURL<input value={product.affiliateUrl} onChange={e=>updateProduct({affiliateUrl:e.target.value})} placeholder="https://link.amazon/..." style={inputStyle}/></label>
  <label>確認済みの機能（1行に1つ）<textarea rows={4} value={product.verifiedFeatures.join("\n")} onChange={e=>updateProduct({verifiedFeatures:e.target.value.split("\n").map(x=>x.trim()).filter(Boolean)})} style={inputStyle}/></label>
  <label>機能の根拠URL（1行に1つ）<textarea rows={3} value={product.sourceUrls.join("\n")} onChange={e=>updateProduct({sourceUrls:e.target.value.split("\n").map(x=>x.trim()).filter(Boolean)})} style={inputStyle}/></label>
  <label>管理者シークレット<input type="password" autoComplete="off" value={secret} onChange={e=>setSecret(e.target.value)} style={inputStyle}/></label>
  <button disabled={!secret||loading} onClick={()=>void run()} style={{padding:12}}>{loading?"生成中…":"3本をAIで生成（公開なし）"}</button>
  {error&&<p role="alert">{error}</p>}
  {result&&<section><h2>生成結果：レビュー待ち・未公開</h2>{result.draft.posts.map((p,i)=><article key={i} style={{border:"1px solid #888",padding:14,marginBottom:12,borderRadius:8}}><h3>{i+1}本目：{p.kind}</h3><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{p.text}</pre></article>)}<h3>検査結果</h3><p>{result.reasons.length?result.reasons.join("、"):"構成チェック通過（事実・リンクの外部検証は別途必要）"}</p></section>}
 </main>;
}
