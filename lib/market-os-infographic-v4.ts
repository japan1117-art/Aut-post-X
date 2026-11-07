import sharp from "sharp";
import {writeFile,stat} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";

const FONT_PATH=join(tmpdir(),"market-os-noto-sans-jp-v4.ttf");
const FONT_URL="https://raw.githubusercontent.com/google/fonts/main/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf";
let fontPromise:Promise<string>|undefined;
async function japaneseFont():Promise<string>{
 if(!fontPromise)fontPromise=(async()=>{
  try{if((await stat(FONT_PATH)).size>100000)return FONT_PATH;}catch{}
  const response=await fetch(FONT_URL,{signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error("font HTTP "+response.status);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length<100000||bytes.length>20000000)throw new Error("invalid font size");
  await writeFile(FONT_PATH,bytes);
  return FONT_PATH;
 })().catch(e=>{fontPromise=undefined;throw new Error("日本語フォントの取得に失敗しました。文字化け画像は公開しません: "+String(e));});
 return fontPromise;
}
const xml=(s:string)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const tidy=(s:string)=>s.replace(/\s+/g," ").replace(/^(確認できる事実|なぜ重要か|考察|反対シナリオ・リスク|注目点)[：:\s]*/,"").trim();
function lines(s:string,perLine:number,maxLines:number):string[]{
 const chars=Array.from(tidy(s));const result:string[]=[];
 for(let i=0;i<chars.length&&result.length<maxLines;i+=perLine)result.push(chars.slice(i,i+perLine).join("")+(i+perLine<chars.length&&result.length===maxLines-1?"…":""));
 return result.length?result:["情報を確認中"];
}
function section(article:string,label:string):string{
 const index=article.indexOf(label);
 if(index<0)return "";
 return article.slice(index+label.length).replace(/^[】:*：\s]+/,"").split(/\n\s*(?:【|■|\*\*)?(?:確認できる事実|なぜ重要か|考察|反対シナリオ・リスク|注目点)/)[0].trim();
}
async function textLayer(fontfile:string,value:string,x:number,y:number,size:number,color:string,maxWidth:number,weight=500){
 if(!value)return null;
 const markup='<span foreground="'+color+'" weight="'+weight+'">'+xml(value)+'</span>';
 const rendered=await sharp({text:{text:markup,font:"Noto Sans JP "+size,fontfile,rgba:true,width:maxWidth,align:"left",spacing:0}}).png().toBuffer();
 return {input:rendered,left:x,top:y};
}
export async function makeJapaneseInfographic(input:{headline:string;article:string;summary:string;publisher:string}):Promise<Buffer>{
 const font=await japaneseFont();
 const facts=section(input.article,"確認できる事実")||input.summary;
 const analysis=section(input.article,"考察")||section(input.article,"なぜ重要か")||input.summary;
 const watch=section(input.article,"注目点")||section(input.article,"反対シナリオ・リスク")||input.summary;
 const background=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#090f20"/><stop offset="1" stop-color="#172642"/></linearGradient></defs><rect width="1200" height="675" fill="url(#bg)"/><rect x="38" y="34" width="1124" height="607" rx="23" fill="#111d33" stroke="#5c7195" stroke-width="2"/><rect x="64" y="59" width="250" height="36" rx="9" fill="#c9ad75"/><path d="M64 258H1136" stroke="#c9ad75" stroke-width="2"/><rect x="64" y="287" width="344" height="275" rx="16" fill="#1b2c49" stroke="#486084"/><rect x="428" y="287" width="344" height="275" rx="16" fill="#1b2c49" stroke="#486084"/><rect x="792" y="287" width="344" height="275" rx="16" fill="#1b2c49" stroke="#486084"/><rect x="84" y="308" width="5" height="36" rx="2" fill="#c9ad75"/><rect x="448" y="308" width="5" height="36" rx="2" fill="#8ab4e8"/><rect x="812" y="308" width="5" height="36" rx="2" fill="#a1d4bf"/><path d="M64 584H1136" stroke="#455a7a"/></svg>');
 const layers:Array<{input:Buffer;left:number;top:number}>=[];
 const put=async(value:string,x:number,y:number,size:number,color:string,maxWidth:number,weight=500)=>{
  const layer=await textLayer(font,value,x,y,size,color,maxWidth,weight);if(layer)layers.push(layer);
 };
 await put("MARKET INSIGHT  |  解説・考察",82,66,18,"#122033",226,700);
 const headlineLines=lines(input.headline,23,2);
 for(let i=0;i<headlineLines.length;i++)await put(headlineLines[i],68,121+i*53,36,"#f5f3ec",1050,700);
 const cards=[{x:64,title:"01  確認できる事実",body:facts},{x:428,title:"02  背景と考察",body:analysis},{x:792,title:"03  今後の注目点",body:watch}];
 for(const card of cards){
  await put(card.title,card.x+29,316,22,"#f1d6a0",287,700);
  const bodyLines=lines(card.body,18,6);
  for(let i=0;i<bodyLines.length;i++)await put(bodyLines[i],card.x+23,371+i*31,18,"#e1e9f6",296,400);
 }
 await put("出典："+input.publisher,70,598,17,"#c6d1e3",570,400);
 await put("事実と考察を区別して読む  •  投資判断を推奨するものではありません",620,598,14,"#b9c8df",520,400);
 return sharp(background).composite(layers).png().toBuffer();
}
