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
 const [images,setImages]=useState<Record<number,string>>({});
 const [imageLoading,setImageLoading]=useState<number|null>(null);
 const [batchLoading,setBatchLoading]=useState(false);
 const [batchProgress,setBatchProgress]=useState("");
 const [confirmed,setConfirmed]=useState(false);
 const [publishBusy,setPublishBusy]=useState<number|null>(null);
 const [publishResults,setPublishResults]=useState<Record<number,string>>({});
 const product=story.product;
 const updateProduct=(patch:Partial<DailyStory["product"]>)=>setStory(s=>({...s,product:{...s.product,...patch}}));
 async function requestImage(post:DailyStoryDraft["posts"][number],theme:string){
  const res=await fetch("/api/daily-story/image-preview",{method:"POST",headers:{"Content-Type":"application/json","x-admin-secret":secret},body:JSON.stringify({kind:post.kind,text:post.text,theme})});
  const data=await res.json();
  if(!res.ok || typeof data.imageDataUrl!=="string") throw new Error(data.error||"画像生成エラー");
  return data.imageDataUrl as string;
 }
 async function run(withImages=false){
  if(loading||batchLoading) return;
  setLoading(true);setBatchLoading(withImages);setBatchProgress("文章3本を生成中");setError("");setResult(null);setImages({});setConfirmed(false);setPublishResults({});
  try{
   const res=await fetch("/api/daily-story/preview",{method:"POST",headers:{"Content-Type":"application/json","x-admin-secret":secret},body:JSON.stringify(story)});
   const data=await res.json();
   if(!res.ok) throw new Error(data.errors?.join("、")||data.error||"生成エラー");
   setResult(data);
   if(withImages){
    if(data.reasons?.length) throw new Error("文章チェックに問題があるため画像生成を中止しました: "+data.reasons.join("、"));
    const posts=data.draft?.posts as DailyStoryDraft["posts"];
    for(const i of [0,1]){
     if(posts[i]?.kind!==(i===0?"knowledge":"practical")) throw new Error("投稿の順序が不正です");
     setBatchProgress(`画像${i+1}/2を生成中`);
     try{
      const image=await requestImage(posts[i],story.theme);
      setImages(s=>({...s,[i]:image}));
     }catch(e){throw new Error(`画像${i+1}の生成に失敗しました。文章と生成済み画像は画面に残しています: ${e instanceof Error?e.message:String(e)}`);}
    }
    setBatchProgress("文章3本＋画像2枚の生成が完了（未公開）");
   }
  }catch(e){setError(e instanceof Error?e.message:String(e));}
  finally{setLoading(false);setBatchLoading(false);}
 }
 async function generateImage(index:number){
  const post=result?.draft.posts[index];
  if(!post || post.kind==="affiliate" || imageLoading!==null || batchLoading) return;
  setImageLoading(index);setError("");
  try{const image=await requestImage(post,story.theme);setImages(s=>({...s,[index]:image}));setConfirmed(false);}
  catch(e){setError(e instanceof Error?e.message:String(e));}
  finally{setImageLoading(null);}
 }
 async function publishApproved(index:number){
  if(!result||!confirmed||publishBusy!==null||publishResults[index]?.startsWith("公開成功")) return;
  if(index<2&&!images[index]){setError("非PR投稿には画像が必要です");return;}
  setPublishBusy(index);setError("");
  try{
   const res=await fetch("/api/daily-story/publish-approved",{method:"POST",headers:{"Content-Type":"application/json","x-admin-secret":secret},body:JSON.stringify({story,draft:result.draft,images:{[index]:images[index]},approved:true,index})});
   const data=await res.json();
   if(!res.ok) throw new Error(data.error||data.errors?.join("、")||"公開できませんでした");
   setPublishResults(s=>({...s,[index]:data.published?"公開成功 X ID: "+data.id:"DRY RUN: 実際の公開なし"}));
  }catch(e){setError(e instanceof Error?e.message:String(e));}
  finally{setPublishBusy(null);}
 }
 const inputStyle={display:"block",width:"100%",padding:9,marginTop:4,marginBottom:12};
 return <main style={{maxWidth:780,margin:"auto",padding:24}}>
  <h1>1日3投稿・ストーリー生成テスト</h1>
  <p>雑学 → 生活の知恵 → 商品紹介（PR）。AIが文章3本と非PR画像2枚を順次生成します。画像は画面内の一時プレビューのみで、サーバー保存・予約・X公開は行いません。</p>
  <label>日付<input type="date" value={story.date} onChange={e=>setStory(s=>({...s,date:e.target.value}))} style={inputStyle}/></label>
  <label>QOLテーマ<input value={story.theme} onChange={e=>setStory(s=>({...s,theme:e.target.value}))} style={inputStyle}/></label>
  <label>商品名<input value={product.name} onChange={e=>updateProduct({name:e.target.value})} style={inputStyle}/></label>
  <label>ASIN<input value={product.asin} onChange={e=>updateProduct({asin:e.target.value})} style={inputStyle}/></label>
  <label>確認済みアフィリエイトURL<input value={product.affiliateUrl} onChange={e=>updateProduct({affiliateUrl:e.target.value})} placeholder="https://link.amazon/..." style={inputStyle}/></label>
  <label>確認済みの機能（1行に1つ）<textarea rows={4} value={product.verifiedFeatures.join("\n")} onChange={e=>updateProduct({verifiedFeatures:e.target.value.split("\n").map(x=>x.trim()).filter(Boolean)})} style={inputStyle}/></label>
  <label>機能の根拠URL（1行に1つ）<textarea rows={3} value={product.sourceUrls.join("\n")} onChange={e=>updateProduct({sourceUrls:e.target.value.split("\n").map(x=>x.trim()).filter(Boolean)})} style={inputStyle}/></label>
  <label>管理者シークレット<input type="password" autoComplete="off" value={secret} onChange={e=>setSecret(e.target.value)} style={inputStyle}/></label>
  <button disabled={!secret||loading} onClick={()=>void run(false)} style={{padding:12}}>{loading?"生成中…":"文章3本のみ生成"}</button> <button disabled={!secret||loading} onClick={()=>void run(true)} style={{padding:12,marginLeft:8}}>{batchLoading?"一括生成中…":"文章3本＋画像2枚を一括生成"}</button>{batchProgress&&<p aria-live="polite">{batchProgress}</p>}
  {error&&<p role="alert">{error}</p>}
  {result&&<section><h2>生成結果：レビュー待ち・未公開</h2>{result.draft.posts.map((p,i)=><article key={i} style={{border:"1px solid #888",padding:14,marginBottom:12,borderRadius:8}}><h3>{i+1}本目：{p.kind}</h3><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{p.text}</pre>{p.kind!=="affiliate"&&<><button disabled={!secret||imageLoading!==null||loading} onClick={()=>void generateImage(i)}>{imageLoading===i?"画像生成中…":images[i]?"画像を再生成":"この記事に合うGPT画像を1枚生成"}</button>{images[i]&&<><p>画像プレビュー（未公開・未保存）</p><img src={images[i]} alt={`${p.kind}の記事用AI生成画像`} style={{width:"100%",maxWidth:420,height:"auto"}}/><p><a href={images[i]} download={`daily-story-${story.date}-${i+1}.png`}>PNGを保存</a></p></>}</>}</article>)}<h3>公開前の最終確認</h3><p>文章3本・画像2枚・PRリンク・根拠を目視確認してください。公開は1本ずつ明示操作が必要です。現在、サーバー側の本番公開ロックが有効です。</p><label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={result.reasons.length>0||!images[0]||!images[1]}/> 3投稿と画像2枚、商品情報・PR表記を確認しました</label>{result.draft.posts.map((p,i)=><div key={i} style={{marginTop:12}}><button disabled={!confirmed||!secret||publishBusy!==null||Boolean(publishResults[i]?.startsWith("公開成功"))} onClick={()=>void publishApproved(i)}>{publishBusy===i?"送信中…":`${i+1}本目を承認して公開`}</button> {publishResults[i]||""}</div>)}<h3>検査結果</h3><p>{result.reasons.length?result.reasons.join("、"):"構成チェック通過（事実・リンクの外部検証は別途必要）"}</p></section>}
 </main>;
}
