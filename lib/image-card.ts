import sharp from "sharp";

const esc = (value: string) => value.replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[char]!));
function crop(value: string, length: number) { return [...value].slice(0, length).join(""); }

export async function createAnalysisCard(title: string, points: string[]) {
  const safeTitle = esc(crop(title, 34));
  const safePoints = points.slice(0, 3).map((p) => esc(crop(p, 28)));
  const rows = safePoints.map((point, i) => `<g transform="translate(100 ${292 + i * 92})"><circle cx="22" cy="-10" r="22" fill="#67E8B3"/><text x="22" y="-2" text-anchor="middle" class="num">${i + 1}</text><text x="70" y="0" class="point">${point}</text></g>`).join("");
  const svg = `<svg width="1200" height="675" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#07111F"/><stop offset="1" stop-color="#16385B"/></linearGradient></defs><rect width="1200" height="675" rx="0" fill="url(#g)"/><circle cx="1070" cy="90" r="180" fill="#67E8B3" opacity=".08"/><text x="92" y="92" class="brand">コスパ投資研究所</text><text x="92" y="185" class="title">${safeTitle}</text><line x1="92" y1="226" x2="1108" y2="226" stroke="#315071" stroke-width="2"/>${rows}<text x="92" y="622" class="foot">少ないお金で、生活のリターンを最大化する。</text><style>.brand{font:700 28px sans-serif;fill:#67E8B3;letter-spacing:3px}.title{font:800 54px sans-serif;fill:#F6FAFF}.point{font:700 34px sans-serif;fill:#E8F1FB}.num{font:800 23px sans-serif;fill:#07111F}.foot{font:500 24px sans-serif;fill:#9DB0C8}</style></svg>`;
  return sharp(Buffer.from(svg)).png({ quality: 92 }).toBuffer();
}
