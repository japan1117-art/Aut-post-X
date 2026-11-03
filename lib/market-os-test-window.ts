export const TEST_START = Date.parse("2026-11-04T15:00:00.000Z"); // 2026-11-05 00:00 JST
export const TEST_END = Date.parse("2026-11-05T15:00:00.000Z"); // 2026-11-06 00:00 JST
export const TEST_MAX_POSTS = 3;
export function testWindowOpen(now=Date.now()):boolean {return now>=TEST_START&&now<TEST_END;}
export function testWindowState(now=Date.now()):"PENDING"|"OPEN"|"EXPIRED"{
 return now<TEST_START?"PENDING":now>=TEST_END?"EXPIRED":"OPEN";
}
