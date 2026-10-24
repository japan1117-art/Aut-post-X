import { describe, expect, it } from "vitest";
import { parseCsvRecords, parseProductCsv } from "./product-import";
const header = ["優先順位","商品名 / 型番","AmazonアフィリURL【入力・要確認】","ASIN【入力】","ジャンル","調査時参考価格(円)","根拠URL"].join(",");
describe("product CSV preview", () => {
  it("supports quoted commas and line breaks", () => {
    expect(parseCsvRecords('a,b\n"hello, world","line1\nline2"')).toEqual([["a","b"],["hello, world","line1\nline2"]]);
  });
  it("blocks unverified products without writing to DB", () => {
    const rows = parseProductCsv(header + '\n1,商品A,https://link.amazon/example,,日用品,1000,');
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("blocked");
    expect(rows[0].reasons).toContain("ASIN未入力");
  });
  it("rejects missing required columns", () => {
    expect(() => parseProductCsv("商品名\nA")).toThrow("必須列");
  });
});
