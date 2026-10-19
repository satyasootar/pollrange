import config from "../config/config.js";
import { escapeHtml as esc } from "./html.js";
import type { PublicBrand } from "../modules/branding/branding.service.js";

/** The parts of a brand an email can show. Null/absent = Kollects' own look. */
export type EmailBrand = Pick<PublicBrand, "companyName" | "logoUrl" | "accentColor" | "font" | "radius" | "background" | "website" | "supportEmail">;

const KOLLECTS_ACCENT = "#6366f1";
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** Mirrors frontend/src/lib/brand.ts BRAND_FONTS; web-safe fallbacks for clients without the web font. */
const FONT_STACKS: Record<string, string> = {
  inter: "Inter,Arial,sans-serif",
  poppins: "Poppins,Arial,sans-serif",
  "dm-sans": "'DM Sans',Arial,sans-serif",
  "space-grotesk": "'Space Grotesk',Arial,sans-serif",
  nunito: "Nunito,Arial,sans-serif",
  lora: "Lora,Georgia,serif",
  playfair: "'Playfair Display',Georgia,serif",
};
const DEFAULT_FONT = "'Plus Jakarta Sans',Arial,Helvetica,sans-serif";
const RADII: Record<string, number> = { sharp: 0, soft: 8, round: 16 };

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

/** `amount` (0-1) of `hex` over `base`, as #rrggbb — email clients don't support color-mix(). */
export function mix(hex: string, base: string, amount: number) {
  const [a, b] = [rgb(hex), rgb(base)];
  return `#${a.map((c, i) => Math.round(c * amount + b[i]! * (1 - amount)).toString(16).padStart(2, "0")).join("")}`;
}

/** Black or white text, whichever reads better on `hex` (WCAG contrast). */
export function textOn(hex: string) {
  const lum = (h: string) =>
    rgb(h)
      .map((v) => v / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
      .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i]!, 0);
  const contrast = (x: number, y: number) => (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  const l = lum(hex);
  return contrast(l, 1) >= contrast(l, 0) ? "#ffffff" : "#111111";
}

/** Colours, font and corners for one email. */
export function emailTheme(brand?: EmailBrand | null) {
  const accent = brand && HEX_RE.test(brand.accentColor) ? brand.accentColor : KOLLECTS_ACCENT;
  return {
    accent,
    onAccent: textOn(accent),
    soft: mix(accent, "#ffffff", 0.1),
    page: brand?.background === "tint" ? mix(accent, "#f5f5f4", 0.08) : "#f4f4f5",
    font: (brand && FONT_STACKS[brand.font]) || DEFAULT_FONT,
    radius: RADII[brand?.radius ?? "soft"] ?? 8,
  };
}
export type EmailTheme = ReturnType<typeof emailTheme>;

/** A bulletproof (table-based) button that renders in Outlook too. */
export function emailButton(t: EmailTheme, label: string, url: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px"><tr>
<td style="background:${t.accent};border-radius:${t.radius}px">
<a href="${esc(url)}" target="_blank" style="display:inline-block;padding:12px 22px;font-family:${t.font};font-size:15px;font-weight:600;color:${t.onAccent};text-decoration:none;border-radius:${t.radius}px">${esc(label)}</a>
</td></tr></table>`;
}

export interface EmailLayout {
  /** Shown in the inbox list after the subject; never visible in the body. */
  preheader: string;
  heading: string;
  /** Trusted HTML: escape every user-supplied value before passing it in. */
  bodyHtml: string;
  cta?: { label: string; url: string };
  /** Full-width banner under the header (e.g. the form's cover image). */
  bannerUrl?: string | undefined;
  /** Small print under the card ("why you got this"). */
  footnote?: string;
  brand?: EmailBrand | null | undefined;
}

/**
 * The one wrapper every email uses: brand header (logo or name), accent stripe, card, button and
 * footer. Inline styles and tables only, so it holds up in Gmail, Outlook and Apple Mail.
 */
export function renderEmail({ preheader, heading, bodyHtml, cta, bannerUrl, footnote, brand }: EmailLayout, theme = emailTheme(brand)) {
  const t = theme;
  const name = brand?.companyName || "Kollects";
  const logo = brand?.logoUrl || (brand ? "" : `${config.CLIENT_URL}/logo/logo1.png`);
  const header = logo
    ? `<img src="${esc(logo)}" alt="${esc(name)}" height="36" style="display:block;height:36px;width:auto;max-width:200px;border:0">`
    : `<span style="font-size:18px;font-weight:700;color:${t.accent}">${esc(name)}</span>`;
  const contact = brand
    ? [brand.website && `<a href="${esc(brand.website)}" style="color:#71717a">${esc(brand.website.replace(/^https?:\/\//, ""))}</a>`,
       brand.supportEmail && `<a href="mailto:${esc(brand.supportEmail)}" style="color:#71717a">${esc(brand.supportEmail)}</a>`]
        .filter(Boolean)
        .join(" &middot; ")
    : "";
  const r = t.radius;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(heading)}</title></head>
<body style="margin:0;padding:0;background:${t.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${t.page}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;font-family:${t.font};color:#18181b">
<tr><td style="padding:0 4px 16px">${header}</td></tr>
<tr><td style="background:#ffffff;border-radius:${r}px;overflow:hidden;border:1px solid #e4e4e7">
<div style="height:4px;background:${t.accent};line-height:4px;font-size:0">&nbsp;</div>
${bannerUrl ? `<img src="${esc(bannerUrl)}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0">` : ""}
<div style="padding:28px 28px 24px">
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:700;color:#18181b">${esc(heading)}</h1>
<div style="font-size:15px;line-height:1.6;color:#3f3f46">${bodyHtml}</div>
${cta ? emailButton(t, cta.label, cta.url) : ""}
</div></td></tr>
<tr><td style="padding:20px 8px 0;font-size:12px;line-height:1.6;color:#71717a;text-align:center">
${contact ? `<p style="margin:0 0 6px">${esc(name)} &middot; ${contact}</p>` : ""}
${footnote ? `<p style="margin:0 0 6px">${footnote}</p>` : ""}
<p style="margin:0">${brand ? `Sent with <a href="${config.CLIENT_URL}" style="color:#71717a">Kollects</a>` : `&copy; Kollects &middot; <a href="${config.CLIENT_URL}" style="color:#71717a">${esc(config.CLIENT_URL.replace(/^https?:\/\//, ""))}</a>`}</p>
</td></tr>
</table></td></tr></table></body></html>`;
}
