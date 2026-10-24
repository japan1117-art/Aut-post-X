"use client";
import { useState } from "react";
import { parseProductCsv, type CandidateRow } from "@/lib/product-import";

export default function AffiliateImportPage() {
  const [rows, setRows] = useState<CandidateRow[]>([]);
  const [error, setError] = useState("");
  async function onFile(file?: File) {
    if (!file) return;
    setError(""); setRows([]);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("CSV形式で保存したファイルを選んでください。Excel (.xlsx) の直接取込は未対応です。");
      return;
    }
    try {
      const parsed = parseProductCsv(await file.text());
      if (parsed.length > 100) throw new Error("100商品を超えています");
      setRows(parsed);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }
  return <main style={{maxWidth:1000,margin:"auto",padding:24}}>
    <h1>Amazon商品台帳 CSV検証</h1>
    <p>ファイルはブラウザ内で読み込みます。商品登録・外部送信・X投稿は行いません。</p>
    <label>CSVファイルを選択 <input type="file" accept=".csv,text/csv" onChange={e=>void onFile(e.target.files?.[0])}/></label>
    {error && <p role="alert" style={{color:"#d44"}}>{error}</p>}
    {rows.length>0 && <>
      <p>読込: {rows.length}件 / 要確認: {rows.filter(r=>r.reasons.length).length}件 / 投稿許可: 0件（全件保留）</p>
      <div style={{overflowX:"auto"}}><table style={{borderCollapse:"collapse",width:"100%"}}>
        <thead><tr>{["優先","商品名","ASIN","URL","状態","確認事項"].map(h=><th key={h} style={{padding:8,borderBottom:"1px solid #aaa",textAlign:"left"}}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r,i)=><tr key={i}>
          <td>{r.priority}</td><td>{r.name}</td><td>{r.asin||"未登録"}</td>
          <td>{r.affiliateUrl ? "入力あり" : "未入力"}</td><td>保留</td><td>{r.reasons.join(" / ")}</td>
        </tr>)}</tbody>
      </table></div>
    </>}
    <p>この画面では短縮リンクの転送先確認は実行しません。ASIN一致・商品仕様・広告表示は別途審査が必要です。</p>
  </main>;
}
