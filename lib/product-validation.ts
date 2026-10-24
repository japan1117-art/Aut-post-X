/** Preflight validation for manually curated Amazon Associates product records.
 * This module does NOT fetch Amazon pages or create affiliate links.
 * A valid URL alone is not evidence that a product or its claims are accurate.
 */
export type ProductDraft = {
  name: string;
  affiliateUrl: string;
  asin?: string;
  model?: string;
  verifiedClaims?: string[];
  evidenceUrl?: string;
  verifiedAt?: string;
};
export type ProductCheck = { status: "PASS" | "WARNING" | "FAIL"; reasons: string[] };

export function validateProductDraft(product: ProductDraft): ProductCheck {
  const reasons: string[] = [];
  let hardFailure = false;
  if (!product.name?.trim()) { reasons.push("商品名が空欄です"); hardFailure = true; }
  let url: URL | undefined;
  try { url = new URL(product.affiliateUrl); } catch { reasons.push("URLが不正です"); hardFailure = true; }
  if (url) {
    const host = url.hostname.toLowerCase();
    const isAmazon = host === "amazon.co.jp" || host === "www.amazon.co.jp" || host === "amzn.to" || host === "link.amazon";
    if (url.protocol !== "https:" || !isAmazon || url.username || url.password) {
      reasons.push("許可されたAmazon商品URLではありません"); hardFailure = true;
    }
    if (host !== "amzn.to" && host !== "link.amazon" && !url.searchParams.has("tag")) reasons.push("アソシエイトのトラッキングIDを確認してください");
    const match = url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i);
    if (match && product.asin && match[1].toUpperCase() !== product.asin.toUpperCase()) {
      reasons.push("URLのASINと入力ASINが一致しません"); hardFailure = true;
    }
    if (!match) reasons.push("URLからASINを確認できません（短縮URLは転送先の独立した照合が必要）");
  }
  if (product.asin && !/^[A-Z0-9]{10}$/i.test(product.asin)) {
    reasons.push("ASINは英数字10文字で入力してください"); hardFailure = true;
  }
  if (!product.evidenceUrl || !product.verifiedAt) reasons.push("商品仕様の根拠URLまたは確認日が未登録です");
  if (!product.verifiedClaims?.length) reasons.push("投稿に使用できる確認済み仕様がありません");
  return { status: hardFailure ? "FAIL" : reasons.length ? "WARNING" : "PASS", reasons };
}
