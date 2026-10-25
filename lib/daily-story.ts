export type DailyStory = {
  date: string;
  theme: string;
  product: { name: string; asin: string; affiliateUrl: string; verifiedFeatures: string[]; sourceUrls: string[] };
  slots: [{ kind:"knowledge"; angle:string }, {kind:"practical";angle:string}, {kind:"affiliate";angle:string}];
};
export type DailyStoryDraft = { date:string; theme:string; posts:[{kind:"knowledge"|"practical"|"affiliate";text:string;sourceUrls:string[]} ,{kind:"knowledge"|"practical"|"affiliate";text:string;sourceUrls:string[]},{kind:"knowledge"|"practical"|"affiliate";text:string;sourceUrls:string[]}]; status:"REVIEW_REQUIRED"; published:false };
export function checkDailyStory(story:DailyStory):string[] {
  const errors:string[]=[];
  if(!/^\d{4}-\d{2}-\d{2}$/.test(story.date)) errors.push("日付形式が不正");
  if(!story.theme?.trim()) errors.push("テーマ未設定");
  if(!story.product?.name || !/^[A-Z0-9]{10}$/.test(story.product.asin||"")) errors.push("商品名・ASINを確認");
  if(!/^https:\/\/(link\.amazon|amzn\.to|(?:www\.)?amazon\.co\.jp)\//.test(story.product.affiliateUrl||"")) errors.push("アフィリエイトURLを確認");
  if(!story.product.verifiedFeatures?.length || !story.product.sourceUrls?.length) errors.push("機能の根拠が不足");
  if(story.product.sourceUrls?.some(u=>{try{return new URL(u).protocol!=="https:";}catch{return true;}})) errors.push("根拠URLはHTTPSの有効なURLを指定");
  if(story.product.verifiedFeatures?.some(x=>typeof x!=="string" || x.length>250)) errors.push("機能説明が不正");
  if(story.slots?.length!==3 || story.slots[0]?.kind!=="knowledge" || story.slots[1]?.kind!=="practical" || story.slots[2]?.kind!=="affiliate") errors.push("非PR2本＋PR1本の構成が必要");
  return errors;
}
export function validateDailyStoryDraft(story:DailyStory,draft:DailyStoryDraft):string[] {
 const errors:string[]=[];
 if(draft.date!==story.date || draft.theme!==story.theme) errors.push("日付・テーマが入力と一致しません");
 if(!Array.isArray(draft.posts) || draft.posts.length!==3) return [...errors,"3投稿が必要"];
 draft.posts.forEach((p,i)=>{
  if(!p || typeof p.text!=="string") {errors.push(`投稿${i+1}の形式が不正`);return;}
  if(p.kind!==story.slots[i].kind) errors.push(`投稿${i+1}の種類が不一致`);
  if(!p.text || Array.from(p.text).length>240) errors.push(`投稿${i+1}の本文文字数が不正`);
  if(i<2 && (/【PR】|https?:\/\//.test(p.text))) errors.push(`非PR投稿${i+1}にPR・リンクが含まれる`);
  if(i===2 && (!p.text.startsWith("【PR】") || !p.text.includes(story.product.affiliateUrl))) errors.push("PR表記またはURLが不足");
 });
 return errors;
}
