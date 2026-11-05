import {describe,it,expect} from "vitest";
import {safeOfficialUrl} from "../lib/market-os-editorial-v3";
import type {MarketSource} from "../lib/market-os";
const source:MarketSource={title:"Regulatory update",url:"https://www.sec.gov/newsroom/press-releases/test",publishedAt:"2026-11-06T00:00:00Z",publisher:"SEC",category:"investment"};
describe("v3 editorial source validation",()=>{
 it("allows verified SEC host",()=>expect(safeOfficialUrl(source)).toBe(true));
 it("blocks lookalike host",()=>expect(safeOfficialUrl({...source,url:"https://www.sec.gov.evil.test/x"})).toBe(false));
 it("blocks non-HTTPS",()=>expect(safeOfficialUrl({...source,url:"http://www.sec.gov/x"})).toBe(false));
 it("blocks unknown publisher",()=>expect(safeOfficialUrl({...source,publisher:"Untrusted"})).toBe(false));
});
