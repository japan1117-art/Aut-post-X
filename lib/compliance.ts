import type { ComplianceResult } from "@/lib/types";

const prohibited = [
  /実際に使ってみた/, /買ってよかった/, /愛用して/, /使い続けて/, /絶対(?:に)?/, /必ず(?:効果|得|改善)/,
  /[NＮ]o\.?\s?1/i, /一番売れている/, /確実に/, /効果を保証/,
];

function normalize(text: string) {
  return text.toLowerCase().replace(/https?:\/\/\S+/g, "").replace(/[\s\p{P}\p{S}]/gu, "");
}

function grams(text: string, size = 3) {
  const value = normalize(text);
  const set = new Set<string>();
  for (let i = 0; i <= value.length - size; i++) set.add(value.slice(i, i + size));
  return set;
}

export function similarity(a: string, b: string) {
  const left = grams(a); const right = grams(b);
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection++;
  return intersection / (left.size + right.size - intersection);
}

export function checkContent(text: string, recentTexts: string[]): ComplianceResult {
  const reasons: string[] = [];
  if (!text.trim()) reasons.push("本文が空です");
  if ([...text].length > 280) reasons.push("280文字を超えています");
  for (const pattern of prohibited) if (pattern.test(text)) reasons.push(`禁止表現: ${pattern.source}`);
  const maxSimilarity = recentTexts.reduce((max, recent) => Math.max(max, similarity(text, recent)), 0);
  if (maxSimilarity >= 0.72) reasons.push("過去投稿との類似度が高すぎます");
  const hardFailure = reasons.some((r) => r.includes("禁止表現") || r.includes("280文字") || r.includes("空です"));
  return { status: hardFailure ? "FAIL" : reasons.length ? "WARNING" : "PASS", reasons, similarity: maxSimilarity };
}
