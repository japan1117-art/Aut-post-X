import { describe, expect, it } from "vitest";
import { asinFromUrl, checkResolvedUrl } from "./affiliate-link-check";
describe("affiliate redirect preflight", () => {
  it("extracts ASIN from verified-format product URL", () => expect(asinFromUrl("https://www.amazon.co.jp/dp/B086WCH4FH?tag=test-22")).toBe("B086WCH4FH"));
  it("does not mistake link.amazon token for ASIN", () => expect(asinFromUrl("https://link.amazon/B08vHNszt")).toBeUndefined());
  it("matches only equal ASIN", () => expect(checkResolvedUrl("https://link.amazon/example","https://www.amazon.co.jp/dp/B086WCH4FH","B086WCH4FH").status).toBe("MATCH"));
  it("blocks mismatched ASIN", () => expect(checkResolvedUrl("https://link.amazon/example","https://www.amazon.co.jp/dp/B086WCH4FH","B000000000").status).toBe("MISMATCH"));
  it("requires review on unknown redirects", () => expect(checkResolvedUrl("https://link.amazon/example","https://example.com/","B086WCH4FH").status).toBe("REVIEW"));
});
