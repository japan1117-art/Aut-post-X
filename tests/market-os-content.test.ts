import {describe,it,expect} from "vitest";
import {validateGroundedDraft} from "../lib/market-os-content";
const source={title:"Federal Reserve issues policy statement",publisher:"Federal Reserve",url:"https://www.federalreserve.gov/feeds/example",publishedAt:"2026-11-03T00:00:00Z",category:"fx" as const};
describe("grounded content guard",()=>{
 it("accepts exact headline and official source",()=>expect(validateGroundedDraft(source.title+"\n出典 "+source.publisher+"\n"+source.url,source).pass).toBe(true));
 it("blocks invented directional prediction",()=>expect(validateGroundedDraft(source.title+" 必ず儲かる\n"+source.publisher+"\n"+source.url,source).pass).toBe(false));
 it("blocks unverified links",()=>expect(validateGroundedDraft(source.title+"\n"+source.publisher+"\n"+source.url+" https://example.com",source).pass).toBe(false));
 it("requires exact title",()=>expect(validateGroundedDraft("金融ニュース\n"+source.publisher+"\n"+source.url,source).pass).toBe(false));
});
