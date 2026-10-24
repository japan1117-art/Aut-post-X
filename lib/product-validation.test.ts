import { describe, expect, it } from "vitest";
import { validateProductDraft } from "./product-validation";

const base = { name: "テスト商品", affiliateUrl: "https://www.amazon.co.jp/dp/B012345678?tag=example-22", asin: "B012345678", verifiedClaims: ["型番を確認"], evidenceUrl: "https://example.com/source", verifiedAt: "2026-10-24" };
describe("product preflight", () => {
  it("accepts a complete manually verified record", () => {
    expect(validateProductDraft(base).status).toBe("PASS");
  });
  it("blocks ASIN mismatch", () => {
    expect(validateProductDraft({ ...base, asin: "B000000000" }).status).toBe("FAIL");
  });
  it("blocks lookalike domains", () => {
    expect(validateProductDraft({ ...base, affiliateUrl: "https://amazon.co.jp.evil.example/dp/B012345678" }).status).toBe("FAIL");
  });
  it("holds missing evidence for review", () => {
    expect(validateProductDraft({ ...base, evidenceUrl: "" }).status).toBe("WARNING");
  });
  it("holds short links for manual resolution and verification", () => {
    expect(validateProductDraft({ ...base, affiliateUrl: "https://amzn.to/example" }).status).toBe("PASS");
  });
});
