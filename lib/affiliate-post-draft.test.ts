import { describe, expect, it } from "vitest";
import { createAffiliateDraft } from "./affiliate-post-draft";
const product = {
  name: "サンプル収納ケース", affiliateUrl: "https://www.amazon.co.jp/dp/B012345678?tag=example-22",
  asin: "B012345678", evidenceUrl: "https://www.amazon.co.jp/dp/B012345678",
  verifiedAt: "2026-10-24", verifiedClaims: ["幅30cm"], benefit: "幅30cm",
  audience: "収納を見直したい方", verifiedBenefit: true, linkVerified: true,
};
describe("affiliate post draft safety", () => {
  it("generates PR-labelled draft only for reviewed input", () => {
    const result = createAffiliateDraft(product);
    expect(result.status).toBe("READY_FOR_REVIEW");
    expect(result.text).toContain("【PR】");
    expect(result.text).toContain(product.affiliateUrl);
  });
  it("blocks unverified link", () => expect(createAffiliateDraft({ ...product, linkVerified: false }).status).toBe("BLOCKED"));
  it("blocks unsupported benefit", () => expect(createAffiliateDraft({ ...product, benefit: "世界一" }).status).toBe("BLOCKED"));
  it("blocks missing evidence", () => expect(createAffiliateDraft({ ...product, verifiedAt: "" }).status).toBe("BLOCKED"));
  it("blocks long copy", () => expect(createAffiliateDraft({ ...product, audience: "あ".repeat(300) }).status).toBe("BLOCKED"));
  it("blocks duplicates", () => {
    const draft = createAffiliateDraft(product).text;
    expect(createAffiliateDraft(product, [draft]).status).toBe("BLOCKED");
  });
});
