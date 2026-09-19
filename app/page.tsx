const checks = [
  ["Generate", "OpenAIがコスパ・買い物知識の投稿案と画像カード要素を生成"],
  ["Guard", "禁止表現、文字数、類似投稿、頻度、上限を投稿前に検査"],
  ["Visual", "投稿テーマに合わせた独自PNGカードをサーバー上で生成"],
  ["Publish", "X公式APIへ投稿し、投稿ID・結果・エラーを監査ログへ保存"],
];

export default function Home() {
  return <main>
    <p style={{color:"#67e8b3",fontWeight:800}}>COMMERCE MEDIA OS / MVP</p>
    <h1>安全に作り、<br/>自動で届ける。</h1>
    <p className="lead">「コスパ投資研究所」向けの自動投稿エンジンです。初期版は商品画像の転載を避け、独自の分析カードを投稿に添付します。</p>
    <section className="grid">{checks.map(([title, body]) => <article className="card" key={title}><b>{title}</b><p>{body}</p></article>)}</section>
    <div className="notice">初回は必ず <code>DRY_RUN=true</code> で動作確認してください。</div>
  </main>;
}
