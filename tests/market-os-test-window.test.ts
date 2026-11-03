import {describe,it,expect} from "vitest";
import {TEST_START,TEST_END,TEST_MAX_POSTS,testWindowOpen,testWindowState} from "../lib/market-os-test-window";
describe("one-day X publication window",()=>{
 it("is exactly one JST calendar day",()=>expect(TEST_END-TEST_START).toBe(86400000));
 it("limits test to three posts",()=>expect(TEST_MAX_POSTS).toBe(3));
 it("rejects before start",()=>expect(testWindowOpen(TEST_START-1)).toBe(false));
 it("allows start",()=>expect(testWindowOpen(TEST_START)).toBe(true));
 it("rejects exactly at end",()=>expect(testWindowOpen(TEST_END)).toBe(false));
 it("reports expired after end",()=>expect(testWindowState(TEST_END+1)).toBe("EXPIRED"));
});
