import {describe,it,expect} from "vitest";
import {checkDailyStory,validateDailyStoryDraft,type DailyStory,type DailyStoryDraft} from "./daily-story";
const sample:DailyStory={date:"2026-10-25",theme:"充電のQOL",product:{name:"Test cable",asin:"B093L5CMMT",affiliateUrl:"https://link.amazon/B0beMgQTd",verifiedFeatures:["最大出力の確認済み仕様"],sourceUrls:["https://example.com/spec"]},slots:[{kind:"knowledge",angle:"給電の仕組み"},{kind:"practical",angle:"選び方"},{kind:"affiliate",angle:"対応機器"}]};
const valid:DailyStoryDraft={date:sample.date,theme:sample.theme,status:"REVIEW_REQUIRED",published:false,posts:[{kind:"knowledge",text:"USB-Cの規格は用途で異なる",sourceUrls:[]},{kind:"practical",text:"端末と充電器の対応を確認",sourceUrls:[]},{kind:"affiliate",text:"【PR】対応規格を確認して選ぶ。 https://link.amazon/B0beMgQTd",sourceUrls:[]}]};
describe("daily story safety",()=>{
 it("accepts one educational pair and one disclosed affiliate",()=>{expect(checkDailyStory(sample)).toEqual([]);expect(validateDailyStoryDraft(sample,valid)).toEqual([]);});
 it("blocks missing evidence",()=>{expect(checkDailyStory({...sample,product:{...sample.product,sourceUrls:[]}})).toContain("機能の根拠が不足");});
 it("blocks non-PR link",()=>{const draft=structuredClone(valid);draft.posts[0].text="詳しくは https://example.com";expect(validateDailyStoryDraft(sample,draft).some(x=>x.includes("非PR"))).toBe(true);});
 it("blocks undisclosed affiliate",()=>{const draft=structuredClone(valid);draft.posts[2].text="おすすめ https://link.amazon/B0beMgQTd";expect(validateDailyStoryDraft(sample,draft)).toContain("PR表記またはURLが不足");});
 it("blocks wrong date",()=>{const draft={...valid,date:"2026-10-26"};expect(validateDailyStoryDraft(sample,draft)).toContain("日付・テーマが入力と一致しません");});
});
