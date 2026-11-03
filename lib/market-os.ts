export type MarketCategory = "investment" | "fx" | "crypto";
export type MarketSource = { title: string; url: string; publishedAt: string; publisher: string; category: MarketCategory };
export type MarketCandidate = MarketSource & { score: number; breakdown: { demand: number; credibility: number; novelty: number; recency: number }; status: "REVIEW_REQUIRED" };
export const MARKET_FEEDS = [
  { url: "https://www.federalreserve.gov/feeds/press_all.xml", publisher: "Federal Reserve", category: "fx" as const },
  { url: "https://www.sec.gov/news/pressreleases.rss", publisher: "SEC", category: "investment" as const },
];
const terms: Record<MarketCategory, RegExp> = {
 investment: /invest|market|fund|securit|stock|equity|etf|asset|financial|disclos/i,
 fx: /rate|inflation|monetary|currency|dollar|exchange|fed|policy|econom/i,
 crypto: /crypto|bitcoin|ethereum|token|blockchain|digital asset/i,
};
export function scoreMarketSource(source: MarketSource, existingTitles: string[], now = Date.now()): MarketCandidate | null {
 const title = source.title.trim();
 if (!title || !/^https:\/\//.test(source.url) || !Number.isFinite(Date.parse(source.publishedAt))) return null;
 const normalized = title.toLowerCase().replace(/[^a-z0-9\p{L}\p{N}]/gu, "");
 if (existingTitles.some(t => t.toLowerCase().replace(/[^a-z0-9\p{L}\p{N}]/gu, "") === normalized)) return null;
 const ageHours = (now - Date.parse(source.publishedAt)) / 3_600_000;
 if (ageHours < -2 || ageHours > 168) return null;
 const demand = terms[source.category].test(title) ? 25 : 5;
 const credibility = ["Federal Reserve", "SEC"].includes(source.publisher) ? 30 : 0;
 const novelty = existingTitles.some(t => t.toLowerCase().includes(title.toLowerCase().slice(0, 24))) ? 0 : 20;
 const recency = ageHours <= 24 ? 25 : ageHours <= 72 ? 15 : 5;
 return { ...source, score: demand + credibility + novelty + recency, breakdown: { demand, credibility, novelty, recency }, status: "REVIEW_REQUIRED" };
}
export function marketDraftSafety(text: string, sourceUrl: string, previous: string[]): { pass: boolean; reasons: string[] } {
 const reasons: string[] = [];
 if (!text || [...text].length > 280) reasons.push("length");
 if (!sourceUrl.startsWith("https://") || !text.includes(sourceUrl)) reasons.push("missing_source");
 if (/絶対|必ず儲かる|確実に上がる|元本保証|今すぐ買え|爆益|100%儲かる/i.test(text)) reasons.push("investment_claim");
 if (previous.some(p => p.trim() === text.trim())) reasons.push("duplicate");
 return { pass: reasons.length === 0, reasons };
}
