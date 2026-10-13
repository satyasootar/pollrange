import { useEffect, useState } from "react";
import { ExternalLink, Globe, Mail } from "lucide-react";
import type { PublicBrand } from "@/types";

/** Logo + company name above a public form/poll. */
export function BrandHeader({ brand, className = "mb-6" }: { brand: PublicBrand | null | undefined; className?: string }) {
  if (!brand || (!brand.logoUrl && !brand.companyName)) return null;
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {brand.logoUrl && <img src={brand.logoUrl} alt={brand.companyName || "Logo"} className="max-h-10 w-auto max-w-[160px] object-contain" />}
      {brand.companyName && <span className="text-sm font-semibold">{brand.companyName}</span>}
    </div>
  );
}

const hostOf = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** Contact line at the bottom of public pages. */
export function BrandFooter({ brand }: { brand: PublicBrand | null | undefined }) {
  if (!brand || (!brand.website && !brand.supportEmail)) return null;
  return (
    <p className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {brand.website && (
        <a href={brand.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
          <Globe className="h-3 w-3" aria-hidden="true" /> {hostOf(brand.website)}
        </a>
      )}
      {brand.supportEmail && (
        <a href={`mailto:${brand.supportEmail}`} className="inline-flex items-center gap-1 hover:text-foreground">
          <Mail className="h-3 w-3" aria-hidden="true" /> {brand.supportEmail}
        </a>
      )}
    </p>
  );
}

const REDIRECT_SECONDS = 5;

/** Thank-you extras: optional auto-redirect (cancellable) and a link back to the brand. */
export function BrandThankYou({ brand }: { brand: PublicBrand | null | undefined }) {
  const redirect = brand?.redirectUrl || "";
  const [left, setLeft] = useState(redirect ? REDIRECT_SECONDS : -1);

  useEffect(() => {
    if (left < 0) return;
    if (left === 0) {
      window.location.assign(redirect);
      return;
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left, redirect]);

  if (!brand) return null;
  return (
    <div className="mt-6 space-y-2 text-sm">
      {left > 0 && (
        <p className="text-xs text-muted-foreground" role="status">
          Redirecting in {left}s…{" "}
          <button type="button" onClick={() => setLeft(-1)} className="underline underline-offset-2 hover:text-foreground">
            Stay here
          </button>
        </p>
      )}
      {(redirect || brand.website) && (
        <a
          href={redirect || brand.website}
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-2 hover:underline"
        >
          {brand.companyName ? `Continue to ${brand.companyName}` : "Continue"} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}
