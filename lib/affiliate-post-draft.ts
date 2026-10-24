import { checkContent } from "./compliance";
import { validateProductDraft, type ProductDraft } from "./product-validation";

export type AffiliatePostInput = ProductDraft & {
  benefit: string;
  audience: string;
  verifiedBenefit?: boolean;
  linkVerified?: boolean;
};
export type AffiliateDraft = { text: string; status: "READY_FOR_REVIEW" | "BLOCKED"; reasons: string[] };

/** Deterministic offline draft: never invent prices, stock, experience or specifications. */
export function createAffiliateDraft(product: AffiliatePostInput, recentTexts: string[] = []): AffiliateDraft {
  const reasons: string[] = [];
  const productCheck = validateProductDraft(product);
  if (productCheck.status !== "PASS") reasons.push(...productCheck.reasons);
  if (!product.linkVerified) reasons.push("短縮URLの転送先・ASIN・アソシエイトIDの確認が未完了");
  if (!product.verifiedBenefit || !product.verifiedClaims?.includes(product.benefit)) reasons.push("紹介ポイントが確認済み仕様と一致しません");
  if (!product.audience?.trim()) reasons.push("想定読者が未入力");
  if (!product.benefit?.trim()) reasons.push("紹介ポイントが未入力");
  const text = `【PR】${product.audience}向けにチェックしたい商品：${product.name}。\n確認ポイント：${product.benefit}\n購入前に対応機種・サイズ・販売条件をご確認ください。\n${product.affiliateUrl}`;
  const contentCheck = checkContent(text, recentTexts);
  if (contentCheck.status !== "PASS") reasons.push(...contentCheck.reasons);
  return { text, status: reasons.length ? "BLOCKED" : "READY_FOR_REVIEW", reasons: [...new Set(reasons)] };
}
