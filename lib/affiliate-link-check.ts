/**
 * Server-only, on-demand affiliate redirect check.
 * No product-page scraping. HEAD redirects only; unknown => REVIEW, never PASS.
 * Do not run checks automatically on a schedule without verifying Amazon's terms.
 */
export type LinkResult = { status: "MATCH" | "MISMATCH" | "REVIEW"; asin?: string; reason: string; finalUrl?: string };
const hosts = new Set(["link.amazon", "amzn.to", "amazon.co.jp", "www.amazon.co.jp"]);
export function asinFromUrl(raw: string): string | undefined {
  try {
    const url = new URL(raw);
    if (!hosts.has(url.hostname.toLowerCase()) || url.protocol !== "https:") return;
    return url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i)?.[1].toUpperCase();
  } catch { return; }
}
export function checkResolvedUrl(original: string, finalUrl: string, expectedAsin: string): LinkResult {
  let url: URL;
  try { url = new URL(finalUrl); } catch { return { status: "REVIEW", reason: "転送先URLが不正" }; }
  if (url.protocol !== "https:" || !hosts.has(url.hostname.toLowerCase())) return { status: "REVIEW", reason: "想定外の転送先", finalUrl };
  const actual = asinFromUrl(finalUrl);
  if (!actual) return { status: "REVIEW", reason: "転送先URLにASINがありません", finalUrl };
  if (!/^[A-Z0-9]{10}$/i.test(expectedAsin)) return { status: "REVIEW", asin: actual, reason: "台帳ASINが未登録または不正", finalUrl };
  return actual === expectedAsin.toUpperCase()
    ? { status: "MATCH", asin: actual, reason: "URL上のASIN一致（商品内容・紹介タグは別途確認）", finalUrl }
    : { status: "MISMATCH", asin: actual, reason: "転送先ASINが台帳と不一致", finalUrl };
}
/** Explicitly triggered only. No automatic approval from this result. */
export async function inspectAffiliateRedirect(input: string, expectedAsin: string): Promise<LinkResult> {
  let current: URL;
  try { current = new URL(input); } catch { return { status: "REVIEW", reason: "URL形式が不正" }; }
  for (let hop = 0; hop < 5; hop++) {
    if (current.protocol !== "https:" || !hosts.has(current.hostname.toLowerCase()) || current.username || current.password || current.port) {
      return { status: "REVIEW", reason: "許可されていないホスト・プロトコルへの転送" };
    }
    if (asinFromUrl(current.toString())) return checkResolvedUrl(input, current.toString(), expectedAsin);
    let response: Response;
    try {
      response = await fetch(current.toString(), { method: "HEAD", redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(5000), headers: { "User-Agent": "AutPostX-LinkPreflight/1.0" } });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const cause = error instanceof Error && "cause" in error ? String(error.cause) : "";
      const info = (detail + " " + cause).toLowerCase();
      const kind = /enotfound|eai_again|dns|name resolution/.test(info) ? "DNS名前解決失敗" : /timeout|timed out|abort/.test(info) ? "接続タイムアウト" : /certificate|tls|ssl/.test(info) ? "TLS証明書・接続失敗" : "ネットワーク接続失敗";
      return { status: "REVIEW", reason: kind + "（URL不正とは限りません）" };
    }
    if (![301, 302, 303, 307, 308].includes(response.status)) return { status: "REVIEW", reason: "HEADで転送先を確認できません（HTTP " + response.status + "）。GETとの挙動差・アクセス制限の可能性" };
    const location = response.headers.get("location");
    if (!location) return { status: "REVIEW", reason: "転送先Locationがありません" };
    try { current = new URL(location, current); } catch { return { status: "REVIEW", reason: "転送先URLが不正" }; }
  }
  return { status: "REVIEW", reason: "転送回数上限に達しました" };
}
