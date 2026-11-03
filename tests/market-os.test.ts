import {describe,it,expect} from "vitest";
import {scoreMarketSource,marketDraftSafety} from "../lib/market-os";
const source={title:"Federal Reserve monetary policy statement",url:"https://www.federalreserve.gov/newsevents/pressreleases/test.htm",publishedAt:"2026-11-03T10:00:00Z",publisher:"Federal Reserve",category:"fx" as const};
describe("Market OS safety",()=>{
 it("scores primary source and requires human review",()=>{const result=scoreMarketSource(source,[],Date.parse("2026-11-03T12:00:00Z"));expect(result?.score).toBe(100);expect(result?.status).toBe("REVIEW_REQUIRED");});
 it("rejects duplicates",()=>{expect(scoreMarketSource(source,[source.title],Date.parse("2026-11-03T12:00:00Z"))).toBeNull();});
 it("rejects stale information",()=>{expect(scoreMarketSource(source,[],Date.parse("2026-11-13T12:00:00Z"))).toBeNull();});
 it("rejects unsourced or promotional claims",()=>{expect(marketDraftSafety("必ず儲かる",source.url,[]).pass).toBe(false);expect(marketDraftSafety("市場動向を確認",source.url,[]).pass).toBe(false);});
 it("allows a cited, nonduplicated neutral draft",()=>{expect(marketDraftSafety("金融政策の公表資料はこちら: "+source.url,source.url,[]).pass).toBe(true);});
});
