import type { BrandFont, BrandRadius, PublicBrand, UserBranding } from "@/types";

/** Mirrors backend BRAND_DEFAULTS; older accounts lack the newer fields. */
export function withBrandDefaults(b?: Partial<UserBranding>): UserBranding {
  return {
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
    ...b,
  };
}

/** What respondents would see for this kit (used by dashboard previews). */
export function kitToPublic(kit: UserBranding, override?: { accentColor?: string | undefined; redirectUrl?: string | undefined }): PublicBrand {
  return {
    companyName: kit.companyName,
    logoUrl: kit.logoUrl,
    accentColor: override?.accentColor || kit.accentColor,
    font: kit.font,
    radius: kit.radius,
    background: kit.background,
    website: kit.website,
    supportEmail: kit.supportEmail,
    redirectUrl: override?.redirectUrl || "",
    shareImageUrl: kit.shareImageUrl,
  };
}

/** Mirrors backend branding.validation.ts BRAND_FONTS — keep in sync. */
export const BRAND_FONTS: { id: BrandFont; label: string; family: string | null }[] = [
  { id: "default", label: "Kollects default", family: null },
  { id: "inter", label: "Inter", family: "Inter" },
  { id: "poppins", label: "Poppins", family: "Poppins" },
  { id: "dm-sans", label: "DM Sans", family: "DM Sans" },
  { id: "space-grotesk", label: "Space Grotesk", family: "Space Grotesk" },
  { id: "nunito", label: "Nunito", family: "Nunito" },
  { id: "lora", label: "Lora (serif)", family: "Lora" },
  { id: "playfair", label: "Playfair Display (serif)", family: "Playfair Display" },
];

export const BRAND_RADII: { id: BrandRadius; label: string; value: string }[] = [
  { id: "sharp", label: "Sharp", value: "0px" },
  { id: "soft", label: "Soft", value: "0.5rem" },
  { id: "round", label: "Round", value: "1rem" },
];

export const ACCENT_SWATCHES = ["#4f46e5", "#0ea5e9", "#059669", "#d97706", "#dc2626", "#db2777", "#7c3aed", "#0f172a"];

/** qrcode.react has no logo shape option, so clip its <image> instead (html-to-image keeps it in the PNG). */
export const QR_CIRCLE_LOGO = "[&_image]:[clip-path:circle(50%)]";

export const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #rrggbb colours (1–21). */
export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Black or white, whichever reads better on the given colour. */
export function contrastText(hex: string) {
  return contrastRatio(hex, "#ffffff") >= contrastRatio(hex, "#000000") ? "#ffffff" : "#000000";
}

export function fontFamily(id: string | undefined) {
  return BRAND_FONTS.find((f) => f.id === id)?.family ?? null;
}

export function radiusValue(id: string | undefined) {
  return BRAND_RADII.find((r) => r.id === id)?.value ?? "0px";
}

/** Adds one Google Fonts stylesheet per family (idempotent). */
export function loadFont(family: string | null) {
  if (!family || typeof document === "undefined") return;
  const id = `brand-font-${family.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, "+")}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

export type BrandLook = Pick<PublicBrand, "accentColor" | "font" | "radius" | "background">;

/**
 * CSS variables that re-theme the existing UI (buttons, focus rings, progress bars…
 * all read --primary / --background). The tint mixes against --page-bg, which
 * index.css sets per theme, so it follows light/dark switches live.
 */
export function brandVars(brand: BrandLook): Record<string, string> {
  const vars: Record<string, string> = { "--brand-radius": radiusValue(brand.radius) };
  const accent = HEX_RE.test(brand.accentColor) ? brand.accentColor : null;
  if (accent) {
    vars["--primary"] = accent;
    vars["--primary-foreground"] = contrastText(accent);
    vars["--ring"] = accent;
    if (brand.background === "tint") vars["--background"] = `color-mix(in oklab, ${accent} 7%, var(--page-bg))`;
  }
  return vars;
}

