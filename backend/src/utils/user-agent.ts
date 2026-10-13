/**
 * Coarse user-agent breakdown for analytics. Order matters: Edge/Opera/Samsung UAs also
 * contain "Chrome", Chrome contains "Safari", and Android contains "Linux".
 * ponytail: regex sniffing, swap for ua-parser-js if versions/models are ever needed.
 */
export function parseUserAgent(ua = "") {
  const device = /iPad|Tablet/i.test(ua) ? "tablet" : /Mobi|Android/i.test(ua) ? "mobile" : "desktop";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /SamsungBrowser/.test(ua)
        ? "Samsung Internet"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Chrome\//.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : "Other";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iPod/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Other";
  const bot = /bot|crawl|spider|slurp|headless|preview|facebookexternalhit|whatsapp|lighthouse/i.test(ua);
  return { device, browser, os, bot };
}
