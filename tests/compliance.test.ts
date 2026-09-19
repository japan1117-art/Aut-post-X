import { describe, expect, it } from "vitest";
import { checkContent, similarity } from "../lib/compliance";

describe("compliance", () => {
  it("passes an original educational post", () => {
    expect(checkContent("買う前に、価格を使用予定回数で割る。1回あたりの金額で比較すると判断しやすい。", []).status).toBe("PASS");
  });
  it("rejects fake experience", () => {
    expect(checkContent("実際に使ってみたら絶対に得でした。", []).status).toBe("FAIL");
  });
  it("detects near duplicates", () => {
    const text = "価格を使用回数で割ると、一回あたりの費用が見える";
    expect(similarity(text, text)).toBe(1);
    expect(checkContent(text, [text]).status).toBe("WARNING");
  });
});
