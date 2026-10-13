import { z } from "zod";

export const BRAND_FONTS = ["default", "inter", "poppins", "dm-sans", "lora", "playfair", "space-grotesk", "nunito"] as const;
export const BRAND_RADII = ["sharp", "soft", "round"] as const;
export const BRAND_BACKGROUNDS = ["plain", "tint"] as const;
export const QR_LOGO_SHAPES = ["square", "circle"] as const;

/** Values an untouched account has; used to tell real edits from resaves. */
export const BRAND_DEFAULTS = {
  companyName: "",
  businessDetails: "",
  logoUrl: "",
  qrColor: "#000000",
  accentColor: "",
  font: "default",
  radius: "sharp",
  background: "plain",
  website: "",
  supportEmail: "",
  qrLogo: false,
  qrLogoShape: "square",
  shareImageUrl: "",
} as const;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex colour like #4f46e5");
// Empty string clears a field; otherwise it must be a real http(s) URL / email.
const httpUrl = z.union([z.literal(""), z.url({ protocol: /^https?$/ }).max(500)]);
const email = z.union([z.literal(""), z.email().max(200)]);

export const brandingInputSchema = z.object({
  companyName: z.string().trim().max(80).optional(),
  businessDetails: z.string().trim().max(300).optional(),
  logoUrl: httpUrl.optional(),
  qrColor: hex.optional(),
  accentColor: z.union([z.literal(""), hex]).optional(),
  font: z.enum(BRAND_FONTS).optional(),
  radius: z.enum(BRAND_RADII).optional(),
  background: z.enum(BRAND_BACKGROUNDS).optional(),
  website: httpUrl.optional(),
  supportEmail: email.optional(),
  qrLogo: z.boolean().optional(),
  qrLogoShape: z.enum(QR_LOGO_SHAPES).optional(),
  shareImageUrl: httpUrl.optional(),
});
export type BrandingInput = z.infer<typeof brandingInputSchema>;

export const formBrandingSchema = z.object({
  useKit: z.boolean().optional(),
  accentColor: z.union([z.literal(""), hex]).optional(),
  redirectUrl: httpUrl.optional(),
  shareTitle: z.string().trim().max(120).optional(),
  shareDescription: z.string().trim().max(300).optional(),
  shareImageUrl: httpUrl.optional(),
});
export type FormBranding = z.infer<typeof formBrandingSchema>;
