import { useEffect, type CSSProperties, type ReactNode } from "react";
import { brandVars, fontFamily, loadFont } from "@/lib/brand";
import type { BrandLook } from "@/lib/brand";

/** Scoped variant for live previews inside the dashboard. Null brand = untouched. */
export function BrandScope({
  brand,
  children,
  className,
}: {
  brand: BrandLook | null | undefined;
  children: ReactNode;
  className?: string;
}) {
  const family = fontFamily(brand?.font);
  useEffect(() => loadFont(family), [family]);

  if (!brand) return <div className={className}>{children}</div>;
  const style = {
    ...brandVars(brand),
    ...(family ? { fontFamily: `"${family}", sans-serif` } : {}),
  } as CSSProperties;
  return (
    <div data-brand-radius={brand.radius !== "sharp" ? "" : undefined} style={style} className={className}>
      {children}
    </div>
  );
}
