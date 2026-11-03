import {describe,it,expect} from "vitest";
import {makeSourcePost} from "../lib/market-os-pipeline";
import {marketDraftSafety} from "../lib/market-os";
const source={title:"Monetary policy press release",url:"https://www.federalreserve.gov/press/test",publisher:"Federal Reserve",publishedAt:"2026-11-03T12:00:00Z",category:"fx" as const};
describe("source-only publishing safety",()=>{
 it("contains the source headline and citation",()=>{const body=makeSourcePost(source);expect(body).toContain(source.title);expect(body).toContain(source.url);expect(marketDraftSafety(body,source.url,[]).pass).toBe(true);});
 it("does not infer price moves or trading recommendations",()=>{expect(makeSourcePost(source)).not.toMatch(/買い推奨|上昇確実|売り推奨/);});
});
