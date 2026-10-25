import { validateProductDraft } from "./product-validation";
export type CandidateRow = {
  priority: number; name: string; affiliateUrl: string; asin: string;
  category: string; referencePrice: number | null; evidenceUrl: string;
  status: "blocked" | "review"; reasons: string[];
};
/** Parse exported CSV from the 商品リスト_入力 sheet.
 * Does not write to DB or approve products. Caller must review preview.
 */
export function parseProductCsv(csv: string): CandidateRow[] {
  const records = parseCsvRecords(csv);
  const header = records.shift();
  if (!header) throw new Error("CSVにヘッダーがありません");
  const ix = (name: string, alternatives: string[] = []) => {
    const i = [name, ...alternatives].map(n => header.indexOf(n)).find(i => i >= 0) ?? -1;
    if (i < 0) throw new Error("必須列がありません: " + name);
    return i;
  };
  const nameIx = ix("商品名 / 型番"), urlIx = ix("AmazonアフィリURL【入力・要確認】", ["AmazonアフィリURL【入力】"]);
  const asinIx = ix("ASIN【入力】"), priorityIx = ix("優先順位");
  const categoryIx = ix("ジャンル"), priceIx = ix("調査時参考価格(円)"), evidenceIx = ix("根拠URL");
  return records.filter(r => r.some(v => v.trim())).map((r, index) => {
    const name = r[nameIx]?.trim() ?? "";
    const affiliateUrl = r[urlIx]?.trim() ?? "";
    const asin = r[asinIx]?.trim() ?? "";
    const check = validateProductDraft({ name, affiliateUrl, asin, evidenceUrl: r[evidenceIx], verifiedAt: "", verifiedClaims: [] });
    const reasons = [...check.reasons];
    if (!asin) reasons.push("ASIN未入力");
    if (!affiliateUrl) reasons.push("アフィリエイトURL未入力");
    const priority = Number(r[priorityIx]);
    if (!Number.isInteger(priority) || priority < 1) reasons.push("優先順位が不正");
    const price = Number(r[priceIx]);
    return {
      priority: Number.isInteger(priority) && priority > 0 ? priority : index + 1,
      name, affiliateUrl, asin, category: r[categoryIx] ?? "",
      referencePrice: Number.isFinite(price) && price > 0 ? price : null,
      evidenceUrl: r[evidenceIx] ?? "",
      status: "blocked" as const, reasons: [...new Set(reasons)],
    };
  });
}
export function parseCsvRecords(input: string): string[][] {
  const out: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  const s = input.replace(/^\uFEFF/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"') {
      if (quoted && s[i + 1] === '"') { cell += '"'; i++; }
      else if (!quoted && cell === "") quoted = true;
      else if (quoted) quoted = false;
      else throw new Error("不正なCSVの引用符");
    } else if (c === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cell); out.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("閉じられていないCSV引用符");
  if (cell !== "" || row.length) { row.push(cell); out.push(row); }
  return out;
}
