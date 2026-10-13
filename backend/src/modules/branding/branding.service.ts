import mongoose from "mongoose";
import { User } from "../user/user.model.js";
import { Form } from "../form/form.model.js";
import { Poll } from "../poll/poll.model.js";
import config from "../../config/config.js";
import { PLANS, effectivePlan } from "../../config/plans.js";
import { BRAND_DEFAULTS, type FormBranding } from "./branding.validation.js";

/** What respondents' pages receive. Never includes private profile data. */
export interface PublicBrand {
  companyName: string;
  logoUrl: string;
  accentColor: string;
  font: string;
  radius: string;
  background: string;
  website: string;
  supportEmail: string;
  redirectUrl: string;
  shareImageUrl: string;
}

/**
 * The creator's brand kit merged with a form's override, or null when it shouldn't
 * show (plan lacks branding, or the form opted out). Downgrades revert automatically.
 */
export async function resolveBrand(
  creatorId: string | mongoose.Types.ObjectId,
  override?: FormBranding | null
): Promise<PublicBrand | null> {
  if (override?.useKit === false) return null;
  const user = await User.findById(creatorId).select("branding plan").lean();
  if (!user || !PLANS[effectivePlan(user as any)].features.branding) return null;
  const b = { ...BRAND_DEFAULTS, ...((user as any).branding ?? {}) };
  return {
    companyName: b.companyName,
    logoUrl: b.logoUrl,
    accentColor: override?.accentColor || b.accentColor,
    font: b.font,
    radius: b.radius,
    background: b.background,
    website: b.website,
    supportEmail: b.supportEmail,
    redirectUrl: override?.redirectUrl || "",
    shareImageUrl: override?.shareImageUrl || b.shareImageUrl,
  };
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Minimal HTML with Open Graph tags for link-preview crawlers (WhatsApp, Slack…).
 * The SPA can't serve these because crawlers don't run JS; vercel.json routes bots here.
 * Returns null when the item isn't public.
 */
export async function renderSharePage(kind: "f" | "p", token: string): Promise<string | null> {
  const doc: any =
    kind === "f"
      ? await Form.findOne({ shareToken: token, isDeleted: false }).select("title description coverImageUrl status creatorId branding").lean()
      : await Poll.findOne({ shareToken: token, isDeleted: false }).select("title description status creatorId").lean();
  if (!doc || doc.status === "draft") return null;

  const override: FormBranding | undefined = doc.branding;
  const brand = await resolveBrand(doc.creatorId, override);
  const site = brand?.companyName || "Kollects";
  const title = (brand && override?.shareTitle) || doc.title;
  const description =
    (brand && override?.shareDescription) || doc.description || (kind === "f" ? `Fill out this form on ${site}.` : `Vote in this poll on ${site}.`);
  const image =
    (brand && (brand.shareImageUrl || brand.logoUrl)) || doc.coverImageUrl || `${config.CLIENT_URL}/logo/logo1.png`;
  const url = `${config.CLIENT_URL}/${kind}/${encodeURIComponent(token)}`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${esc(title)} · ${esc(site)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0;url=${esc(url)}">
</head><body><a href="${esc(url)}">${esc(title)}</a></body></html>`;
}
