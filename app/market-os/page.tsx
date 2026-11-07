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
 const [generatingId,setGeneratingId]=useState<string|null>(null);
 const [previewStatus,setPreviewStatus]=useState<{postId:string;state:"running"|"success"|"error";message:string}|null>(null);
 const [testResult,setTestResult]=useState<{status:string;checks?:Record<string,boolean>}|null>(null);
 const [editorial,setEditorial]=useState<{headline:string;article:string;summary:string;sourceUrl:string;imageBase64:string}|null>(null);
 const [editorialPostId,setEditorialPostId]=useState<string|null>(null);
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
  try{const r=await fetch("/api/market-os/draft",{method:"POST",headers:{"Content-Type":"application/json","x-admin-secret":secret},body:JSON.stringify({title:c.title,url:c.url,publisher:c.publisher,publishedAt:c.publishedAt,category:c.category})});const data=await r.json();if(!r.ok)throw Error(data.error||"保存失敗");setMessage("ニュース候補を保存しました。次に「保存済み下書き・公開履歴を確認」から日本語記事＋画像を生成してください。");await refresh();}catch(e){setMessage(String(e));}
 }
 async function generate(id:string){
  try{const r=await fetch("/api/market-os/generate",{method:"POST",headers:{"Content-Type":"application/json","x-admin-secret":secret},body:JSON.stringify({postId:id})});const data=await r.json();if(!r.ok)throw Error(data.error||"生成失敗");setMessage("下書き生成: "+data.mode);await refresh();}catch(e){setMessage(String(e));}
 }
 async function testV3(){
  setMessage("v3の本文取得・記事・画像・安全審査をテスト中です（Xには投稿しません）");setTestResult(null);setEditorial(null);
  try{
   const r=await fetch("/api/market-os/test-v3",{method:"POST",headers:{"x-admin-secret":secret}});
   const data=await r.json();setTestResult({status:data.status,checks:data.checks});
   if(data.preview)setEditorial(data.preview);
   setMessage(data.message||data.error||("v3テスト結果: "+data.status+"（X投稿なし）"));
  }catch(e){setMessage(String(e));}
 }
 async function editorialPreview(id:string,imageOnly=false){
  if(imageOnly&&(!editorial||editorialPostId!==id)){setMessage("記事を先に生成してください");return;}
  setGeneratingId(id);setPreviewStatus({postId:id,state:"running",message:imageOnly?"画像のみ再生成中です。記事は再生成しません。":"第1段階：日本語記事を生成しています。"});setMessage("処理中です。ボタン直下に結果が表示されます。");
  try{
   let text:{headline:string;article:string;summary:string;sourceUrl:string};
   if(imageOnly){text=editorial!;}
   else{
    const r=await fetch("/api/market-os/editorial-text",{method:"POST",headers:{"Content-Type":"application/json","x-admin-secret":secret},body:JSON.stringify({postId:id})});
    const raw=await r.text();let data;
    try{data=JSON.parse(raw);}catch{throw Error("記事API応答が不正です（HTTP "+r.status+"）");}
    if(!r.ok)throw Error("記事生成: "+(data.error||r.status));
    if(!data.headline||!data.article||!data.sourceUrl)throw Error("記事生成結果が不足しています");
    text=data;setEditorialPostId(id);setEditorial({...text,imageBase64:""});
    setPreviewStatus({postId:id,state:"running",message:"第1段階完了：記事を表示しました。第2段階：画像を生成中です。"});
   }
   const r=await fetch("/api/market-os/editorial-image",{method:"POST",headers:{"Content-Type":"application/json","x-admin-secret":secret},body:JSON.stringify({postId:id,...text})});
   const raw=await r.text();let data;
   try{data=JSON.parse(raw);}catch{throw Error("画像API応答が不正です（HTTP "+r.status+"）");}
   if(!r.ok)throw Error("画像生成: "+(data.error||r.status));
   if(!data.imageBase64)throw Error("画像データがありません");
   setEditorial({...text,imageBase64:data.imageBase64});
   setPreviewStatus({postId:id,state:"success",message:"日本語記事＋画像を生成しました。Xには投稿していません。"});
  }catch(e){const detail=e instanceof Error?e.message:String(e);setPreviewStatus({postId:id,state:"error",message:detail+"。記事が表示されている場合は「画像のみ再生成」で再試行できます。"});setMessage(detail);}finally{setGeneratingId(null);}
 }
 async function metrics(){
  try{const r=await fetch("/api/market-os/metrics",{method:"POST",headers:{"Content-Type":"application/json","x-admin-secret":secret}});const data=await r.json();if(!r.ok)throw Error(data.error||"取得失敗");setMessage("反応データ更新: "+data.updated+"件 / 失敗: "+data.failed+"件");}catch(e){setMessage(String(e));}
 }
 async function publish(id:string){
  if(!window.confirm("この投稿をXに実際に公開しますか？"))return;
  try{const r=await fetch("/api/market-os/publish",{method:"POST",headers:{"Content-Type":"application/json","x-admin-secret":secret},body:JSON.stringify({postId:id})});const data=await r.json();setMessage("公開結果: "+data.status+(data.xPostId?" X ID "+data.xPostId:""));await refresh();}catch(e){setMessage(String(e));}
 }
 return <main style={{maxWidth:920,margin:"auto",padding:24}}>
  <h1>Market Content OS — 日本語考察記事・画像の検証</h1>
  <p>下の英語タイトルは公式ニュースの原文で、Xへの完成投稿文ではありません。ニュースを保存した後、v3の日本語考察記事と画像を生成・確認できます。テスト中はXに公開しません。</p>
  <section style={{display:"flex",gap:20,flexWrap:"wrap",margin:"20px 0"}}>{choices.map(c=><label key={c.key}><input type="checkbox" checked={categories.includes(c.key)} onChange={e=>setCategories(v=>e.target.checked?[...v,c.key]:v.filter(x=>x!==c.key))}/>{c.label}</label>)}</section>
  <label>管理用シークレット（サーバーには保存しません）<input type="password" autoComplete="off" value={secret} onChange={e=>setSecret(e.target.value)} style={{display:"block",padding:10,width:"100%",maxWidth:450}}/></label>
  <button onClick={scan} disabled={loading||!secret||!categories.length} style={{margin:"16px 0",padding:12}}>{loading?"取得中...":"公式情報を収集してスコアリング"}</button>
  <p role="status">{message}</p>
  {errors.length>0&&<p>取得できなかったソース: {errors.join(", ")}</p>}
  <p><button disabled={!secret} onClick={()=>void refresh()}>保存済み下書き・公開履歴を確認</button> <button disabled={!secret} onClick={()=>void metrics()}>X公開反応を取得</button> テスト: {test?`${test.state} / ${test.claimed_count}件確保（上限${test.max_posts}件）`:"未取得"} 公開機能: {live?"有効":"ロック中"}</p>
  <p><button disabled={!secret} onClick={()=>void testV3()}>v3 日本語記事＋画像の総合テスト（X投稿なし）</button> {testResult&&<strong>結果: {testResult.status} {testResult.checks&&Object.entries(testResult.checks).map(([k,v])=>k+":"+(v?"PASS":"FAIL")).join(" / ")}</strong>}</p>
  {editorial&&<section style={{border:"2px solid #b7a173",borderRadius:14,padding:18,margin:"18px 0"}}><h2>v3 記事＋画像プレビュー（未投稿）</h2><h3>{editorial.headline}</h3><p style={{whiteSpace:"pre-wrap",lineHeight:1.8}}>{editorial.article}</p><p><a href={editorial.sourceUrl} target="_blank" rel="noopener noreferrer">公式出典</a></p><img alt="記事の要点を示す解説画像" src={"data:image/png;base64,"+editorial.imageBase64} style={{width:"100%",maxWidth:650}}/></section>}
  <h2>保存済み下書き（記事生成前・未投稿）</h2>
  {posts.filter(p=>p.publication_state==="DRAFT").length===0&&<p role="status" style={{padding:16,border:"1px solid #b7a173",borderRadius:10}}>生成できる下書きがありません。下の「ニュース候補（英語の原文見出し・未投稿）」から「ニュース候補を保存（未投稿）」を押してください。保存できたらここに下書きが表示されます。すでに保存済み・投稿済みのニュースは重複保存できないため、別の候補を選んでください。</p>}
  {posts.map(p=><article key={p.id} style={{border:"1px solid #777",padding:12,margin:"10px 0"}}><p style={{whiteSpace:"pre-wrap"}}>{p.body}</p><p>{p.publication_state} {p.x_post_id||""}</p><button disabled={!secret||p.publication_state!=="DRAFT"} onClick={()=>void generate(p.id)}>AI下書き生成・安全審査</button> <button disabled={!secret||p.publication_state!=="DRAFT"||generatingId!==null} onClick={()=>void editorialPreview(p.id)}>{generatingId===p.id?"生成中…":"日本語記事→画像を順番に生成（未投稿）"}</button> {editorialPostId===p.id&&editorial&&<button disabled={generatingId!==null} onClick={()=>void editorialPreview(p.id,true)}>画像のみ再生成（記事は維持）</button>} {previewStatus?.postId===p.id&&<div role="status" aria-live="polite" style={{padding:14,marginTop:12,border:"2px solid "+(previewStatus.state==="error"?"#e57373":"#b7a173"),borderRadius:10,whiteSpace:"pre-wrap"}}><strong>{previewStatus.state==="running"?"処理中":previewStatus.state==="success"?"生成成功":"生成エラー"}</strong><p>{previewStatus.message}</p>{editorialPostId===p.id&&editorial&&<section><h3>{editorial.headline}</h3><p style={{whiteSpace:"pre-wrap",lineHeight:1.8}}>{editorial.article}</p><p><a href={editorial.sourceUrl} target="_blank" rel="noopener noreferrer">公式出典</a></p>{editorial.imageBase64&&<img alt="記事の解説画像" src={"data:image/png;base64,"+editorial.imageBase64} style={{width:"100%",maxWidth:650}}/>}</section>}</div>} <button disabled={!live||p.publication_state!=="DRAFT"} onClick={()=>void publish(p.id)}>Xに個別公開</button></article>)}
  <h2>ニュース候補（英語の原文見出し・未投稿）</h2>
  {candidates.map((c,i)=><article key={c.url+":"+c.category+":"+i} style={{border:"1px solid #777",borderRadius:10,padding:16,margin:"12px 0"}}>
   <strong>ニュース候補・未投稿 | 評価 {c.score}/100</strong><p>{c.title}</p>
   <p>{c.publisher} / {c.category} / {new Date(c.publishedAt).toLocaleString("ja-JP")}</p>
   <p>需要 {c.breakdown.demand}・信頼性 {c.breakdown.credibility}・独自性 {c.breakdown.novelty}・鮮度 {c.breakdown.recency}</p>
   <a href={c.url} target="_blank" rel="noopener noreferrer">一次情報を確認</a> <button disabled={!secret} onClick={()=>void draft(c)}>ニュース候補を保存（未投稿）</button>
  </article>)}
 </main>;
}
