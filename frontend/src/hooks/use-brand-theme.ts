import { useEffect } from "react";
import { brandVars, fontFamily, loadFont } from "@/lib/brand";
import type { PublicBrand } from "@/types";

/**
 * Applies a respondent-facing brand to the whole document (so dialogs and toasts
 * match too), plus tab title and favicon. Everything is restored on unmount.
 */
export function useBrandTheme(brand: PublicBrand | null | undefined, title?: string) {
  const family = fontFamily(brand?.font);
  const key = brand ? JSON.stringify([brand.accentColor, brand.font, brand.radius, brand.background, brand.logoUrl, brand.companyName]) : "";

  useEffect(() => {
    if (!brand) return;
    loadFont(family);
    const root = document.documentElement;
    const vars = brandVars(brand);
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    if (brand.radius !== "sharp") root.setAttribute("data-brand-radius", "");
    const prevFont = document.body.style.fontFamily;
    if (family) document.body.style.fontFamily = `"${family}", sans-serif`;

    const icon = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    const prevIcon = icon?.href;
    if (icon && brand.logoUrl) icon.href = brand.logoUrl;

    return () => {
      Object.keys(vars).forEach((k) => root.style.removeProperty(k));
      root.removeAttribute("data-brand-radius");
      document.body.style.fontFamily = prevFont;
      if (icon && prevIcon) icon.href = prevIcon;
    };
    // key captures every brand field we read
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, family]);

  useEffect(() => {
    if (!brand || !title) return;
    const prev = document.title;
    document.title = brand.companyName ? `${title} · ${brand.companyName}` : title;
    return () => {
      document.title = prev;
    };
  }, [brand, title]);
}

