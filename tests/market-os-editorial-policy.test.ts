import {describe,it,expect} from "vitest";
import {reviewEditorialSafety} from "../lib/market-os-editorial-policy";
describe("financial editorial safety",()=>{
 it("allows balanced educational analysis",()=>expect(reviewEditorialSafety("金利低下は株式評価に影響し得るが、景気悪化時は別の結果もあり得る。").pass).toBe(true));
 it("blocks buy recommendations",()=>expect(reviewEditorialSafety("この銘柄は買うべきです").pass).toBe(false));
 it("blocks guaranteed returns",()=>expect(reviewEditorialSafety("絶対に儲かる").pass).toBe(false));
 it("blocks immediate sell instructions",()=>expect(reviewEditorialSafety("今すぐ売りましょう").pass).toBe(false));
 it("blocks source marked unknown",()=>expect(reviewEditorialSafety("出典：不明").pass).toBe(false));
});
