// Financial education and neutral analysis only. No individual investment recommendations.
export const forbiddenInvestmentPromotion = [
 /(?:今すぐ|絶対|必ず|迷わず|いますぐ).{0,16}(?:買|売|購入|投資|エントリー)/i,
 /(?:買うべき|売るべき|購入すべき|投資すべき|仕込むべき|エントリーすべき)/i,
 /(?:買い推奨|売り推奨|おすすめ銘柄|必勝|爆益|儲かる|利益保証|元本保証|確実に上がる|確実に下がる)/i,
 /(?:この銘柄|この通貨|この株).{0,15}(?:買って|売って|購入して)/i,
];
export function reviewEditorialSafety(text:string):{pass:boolean;reasons:string[]} {
 const reasons:string[]=[];
 if(!text.trim())reasons.push("empty");
 if(forbiddenInvestmentPromotion.some(pattern=>pattern.test(text)))reasons.push("investment_solicitation");
 if(/(?:出典|引用)\s*[:：]?\s*(?:なし|不明)/i.test(text))reasons.push("unverified_source");
 return {pass:reasons.length===0,reasons};
}
export const EDITORIAL_POLICY = `日本語の金融・経済リサーチ編集者として、投資教育と中立的な市場分析のみを書く。
禁止：売買・購入・口座開設・入金の勧誘、個別最適化された投資助言、利益保証、煽り、根拠のない価格目標。
事実、合理的推測、未検証の仮説を区別し、反対シナリオとリスクを説明する。
本文を確認していないニュースの見出しから、具体的な影響や数値を創作しない。
引用は短く、出典とURLを記載する。出典の確認ができない情報は使わない。
画像内の文字・数値・グラフにも同じルールを適用する。`;
