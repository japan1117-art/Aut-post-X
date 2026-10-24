"use client";
import { useState } from "react";
import { createAffiliateDraft } from "@/lib/affiliate-post-draft";

export default function Page() {
  const [name, setName] = useState("");
  const [asin, setAsin] = useState("");
  const [affiliateUrl, setUrl] = useState("");
  const [audience, setAudience] = useState("");
  const [benefit, setBenefit] = useState("");
  const [evidenceUrl, setEvidence] = useState("");
  const [verifiedAt, setDate] = useState("");
  const [linkVerified, setLink] = useState(false);
  const [verifiedBenefit, setBenefitCheck] = useState(false);
  const draft = createAffiliateDraft({name,asin,affiliateUrl,audience,benefit,evidenceUrl,verifiedAt,linkVerified,verifiedBenefit,verifiedClaims:verifiedBenefit ? [benefit] : []});
  return <main style={{maxWidth:720,margin:"auto",padding:24}}>
    <h1>商品紹介記事・安全テスト</h1>
    <p>下書きのみ。Xへの送信や商品登録は行いません。</p>
    {([
      ["商品名",name,setName],["ASIN",asin,setAsin],["短縮アフィリエイトURL",affiliateUrl,setUrl],
      ["想定読者",audience,setAudience],["確認済みの特徴",benefit,setBenefit],
      ["根拠URL",evidenceUrl,setEvidence],["確認日",verifiedAt,setDate]
    ] as const).map(([label,value,change])=><label key={label} style={{display:"block",marginBottom:12}}>{label}<input value={value} onChange={e=>change(e.target.value)} style={{display:"block",width:"100%",padding:8}}/></label>)}
    <label style={{display:"block"}}><input type="checkbox" checked={linkVerified} onChange={e=>setLink(e.target.checked)}/> 転送先とASINを別途確認済み</label>
    <label style={{display:"block"}}><input type="checkbox" checked={verifiedBenefit} onChange={e=>setBenefitCheck(e.target.checked)}/> 特徴の根拠を別途確認済み</label>
    <h2>投稿プレビュー</h2><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{draft.text}</pre>
    <p>判定：{draft.status === "BLOCKED" ? "要確認・投稿不可" : "レビュー待ち・投稿不可"}</p>
    <ul>{draft.reasons.map(r=><li key={r}>{r}</li>)}</ul>
    <p>自己申告のチェックは自動検証の代わりにはなりません。</p>
  </main>;
}
