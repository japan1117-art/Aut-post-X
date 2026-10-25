"use client";
import { useState } from "react";
import { parseProductCsv, type CandidateRow } from "@/lib/product-import";
type LinkCheck = { status: "MATCH" | "MISMATCH" | "REVIEW"; asin?: string; reason: string; finalUrl?: string };

export default function AffiliateImportPage() {
  const [rows, setRows] = useState<CandidateRow[]>([]);
  const [error, setError] = useState("");
  const [secret, setSecret] = useState("");
  const [checking, setChecking] = useState(false);
  const [checks, setChecks] = useState<LinkCheck[]>([]);
  async function onFile(file?: File) {
    if (!file) return;
    setError(""); setRows([]); setChecks([]);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("CSV形式で保存したファイルを選んでください。Excel (.xlsx) の直接取込は未対応です。"); return;
    }
    try {
      const parsed = parseProductCsv(await file.text());
      if (parsed.length > 100) throw new Error("100商品を超えています");
      setRows(parsed);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }
  async function checkLinks() {
    if (checking || !rows.length || !secret.trim()) return;
    setChecking(true); setError(""); setChecks([]);
    try {
      const results: LinkCheck[] = [];
      for (let i = 0; i < rows.length; i += 20) {
        const response = await fetch("/api/affiliate/check-links", {
          method: "POST", cache: "no-store",
          headers: { "Content-Type": "application/json", "x-admin-secret": secret },
          body: JSON.stringify({ items: rows.slice(i, i + 20).map(r => ({ url: r.affiliateUrl, asin: r.asin })) }),
        });
        if (!response.ok) throw new Error(response.status === 401 ? "管理者認証に失敗しました" : "照合APIでエラーが発生しました (HTTP " + response.status + ")");
        const data: { results?: LinkCheck[] } = await response.json();
        if (!Array.isArray(data.results) || data.results.length !== Math.min(20, rows.length - i)) throw new Error("照合結果の件数が一致しません");
        results.push(...data.results);
      }
      setChecks(results);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setChecking(false); setSecret(""); }
  }
  const matched = checks.filter(r => r.status === "MATCH").length;
  const mismatched = checks.filter(r => r.status === "MISMATCH").length;
  return <main style={{maxWidth:1100,margin:"auto",padding:24}}>
    <h1>Amazon商品台帳 CSV検証</h1>
    <p>CSVの読込はブラウザ内で実行します。「リンクを照合」を押した場合のみURLとASINを管理者認証付きでサーバーに送信します。商品登録・X投稿は行いません。</p>
    <label>CSVファイルを選択 <input type="file" accept=".csv,text/csv" onChange={e=>void onFile(e.target.files?.[0])}/></label>
    {rows.length>0 && <section style={{marginTop:20}}>
      <p>読込 {rows.length}件 / 投稿許可 0件（全件保留）</p>
      <label>管理者シークレット（照合時のみ使用、保存しません）
        <input type="password" autoComplete="off" value={secret} onChange={e=>setSecret(e.target.value)} style={{display:"block",width:"100%",maxWidth:460,padding:8,marginTop:6}}/>
      </label>
      <button type="button" disabled={checking || !secret.trim()} onClick={()=>void checkLinks()} style={{marginTop:12,padding:"10px 18px"}}>
        {checking ? "照合中…" : "リンクを一括照合（X投稿なし）"}
      </button>
      {checks.length>0 && <p role="status">照合結果: 一致 {matched}件 / 不一致 {mismatched}件 / 要確認 {checks.length-matched-mismatched}件。ASIN一致は商品仕様や紹介タグの保証ではありません。</p>}
    </section>}
    {error && <p role="alert" style={{color:"#d44"}}>{error}</p>}
    {rows.length>0 && <div style={{overflowX:"auto",marginTop:16}}><table style={{borderCollapse:"collapse",width:"100%"}}>
      <thead><tr>{["優先","商品名","ASIN","短縮URL","リンク照合","投稿可否","確認事項"].map(h=><th key={h} style={{padding:8,borderBottom:"1px solid #aaa",textAlign:"left"}}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r,i)=><tr key={i}>
        <td>{r.priority}</td><td>{r.name}</td><td>{r.asin||"未登録"}</td>
        <td>{r.affiliateUrl ? "入力あり" : "未入力"}</td>
        <td>{checks[i] ? checks[i].status : "未照合"}</td><td>保留</td>
        <td>{[...r.reasons, ...(checks[i] ? [checks[i].reason] : [])].join(" / ")}</td>
      </tr>)}</tbody>
    </table></div>}
    <p>照合はAmazonへのHEADリクエストで転送先URLを確認するだけです。ネットワーク制限・不明な転送は要確認となります。広告表示、アソシエイトタグ、商品仕様の確認が終わるまで公開しないでください。</p>
  </main>;
}
