import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, ChevronDown, Cookie, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { COOKIE_SETTINGS_EVENT, hasGpc, readConsent, saveConsent, type ConsentAction, type ConsentChoice } from "@/lib/consent";
import { COOKIE_CATEGORIES } from "@/lib/cookie-catalog";

const NONE: ConsentChoice = { analytics: false, marketing: false };
const ALL: ConsentChoice = { analytics: true, marketing: true };

/** Quieter than the global uppercase button style; Reject and Accept stay the same size. */
const compact = "border normal-case tracking-normal font-semibold hover:shadow-none";

/**
 * Cookie banner + preferences. Shown until the visitor chooses; "Reject all" is as
 * prominent as "Accept all", optional categories start off, and nothing optional runs
 * before a choice. Reopened from "Cookie settings" in the footer or on the Privacy page.
 */
export function CookieConsent() {
  const { pathname } = useLocation();
  const [bannerOpen, setBannerOpen] = useState(() => readConsent() === null);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [choice, setChoice] = useState<ConsentChoice>(() => readConsent() ?? NONE);
  const [source, setSource] = useState<"banner" | "settings">("banner");

  useEffect(() => {
    const open = () => {
      setChoice(readConsent() ?? NONE);
      setSource("settings");
      setPrefsOpen(true);
    };
    window.addEventListener(COOKIE_SETTINGS_EVENT, open);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, open);
  }, []);

  const decide = (next: ConsentChoice, action: ConsentAction) => {
    saveConsent(next, action, source);
    setChoice(next);
    setBannerOpen(false);
    setPrefsOpen(false);
  };
  const saveCustom = () =>
    decide(choice, choice.analytics && choice.marketing ? "accept_all" : !choice.analytics && !choice.marketing ? "reject_all" : "custom");

  // Respondent pages (/p/…, /f/…) may carry a creator's branding and run nothing optional.
  const respondentPage = /^\/(p|f)\//.test(pathname);

  return (
    <>
      {bannerOpen && !prefsOpen && !respondentPage && (
        <section
          role="region"
          aria-label="Cookie consent"
          className="fixed inset-x-4 bottom-4 z-110 overflow-hidden border border-border bg-card/95 text-card-foreground shadow-[0_24px_64px_-16px_rgba(0,0,0,0.55)] backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300 motion-reduce:animate-none sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-95"
        >
          <div className="h-0.5 bg-primary" aria-hidden="true" />
          <div className="flex gap-3 p-4">
            <div className="flex size-9 shrink-0 items-center justify-center bg-primary/10 text-primary" aria-hidden="true">
              <Cookie className="size-4" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <h2 className="text-sm font-semibold leading-none">Cookies, your call</h2>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Essential cookies keep Kollects running. With your OK, we'll also use analytics to see how people find and
                use it. No ads, ever.
              </p>
              <Link
                to="/cookies"
                className="inline-flex items-center gap-0.5 text-xs font-medium text-foreground underline-offset-4 hover:underline"
              >
                Cookie policy
                <ArrowUpRight className="size-3" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2 border-t border-border bg-muted/30 px-4 py-3">
            <button
              type="button"
              onClick={() => {
                setSource("banner");
                setPrefsOpen(true);
              }}
              className="mr-auto text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Customize
            </button>
            <Button variant="outline" size="xs" onClick={() => decide(NONE, "reject_all")} className={compact}>
              Reject all
            </Button>
            <Button size="xs" onClick={() => decide(ALL, "accept_all")} className={compact}>
              Accept all
            </Button>
          </div>
        </section>
      )}

      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent className="max-h-[90vh] gap-5 overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cookie preferences</DialogTitle>
            <DialogDescription>
              Optional cookies stay off unless you turn them on. Change this any time from "Cookie settings" in the
              footer.{" "}
              <Link to="/cookies" onClick={() => setPrefsOpen(false)} className="text-foreground underline underline-offset-2">
                Read the cookie policy
              </Link>
            </DialogDescription>
          </DialogHeader>

          {hasGpc() && (
            <p className="flex items-start gap-2 border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-px size-3.5 shrink-0 text-primary" aria-hidden="true" />
              Your browser is sending a Global Privacy Control signal, so optional cookies start switched off.
            </p>
          )}

          <ul className="divide-y divide-border border border-border">
            {COOKIE_CATEGORIES.map((cat) => {
              const optional = cat.id !== "necessary";
              const on = optional ? choice[cat.id as keyof ConsentChoice] : true;
              return (
                <li key={cat.id} className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <label htmlFor={`consent-${cat.id}`} className="text-sm font-semibold">
                      {cat.title}
                    </label>
                    {optional ? (
                      <Switch
                        id={`consent-${cat.id}`}
                        checked={on}
                        onCheckedChange={(v) => setChoice((c) => ({ ...c, [cat.id]: v }))}
                      />
                    ) : (
                      <span className="bg-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Always on
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{cat.description}</p>
                  <details className="group mt-2">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-foreground/80 hover:text-foreground">
                      <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
                      {cat.entries.length} {cat.entries.length === 1 ? "item" : "items"}
                    </summary>
                    <ul className="mt-2 divide-y divide-border bg-muted/30 text-xs">
                      {cat.entries.map((e) => (
                        <li key={e.name} className="grid gap-0.5 p-2 sm:grid-cols-[9rem_1fr]">
                          <span className="font-mono text-foreground">{e.name}</span>
                          <span className="text-muted-foreground">
                            {e.purpose}. <span className="whitespace-nowrap">{e.kind}, {e.duration.toLowerCase()}.</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              );
            })}
          </ul>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" size="sm" onClick={() => decide(NONE, "reject_all")} className={compact}>
              Reject all
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={saveCustom} className={`${compact} flex-1 sm:flex-none`}>
                Save choices
              </Button>
              <Button size="sm" onClick={() => decide(ALL, "accept_all")} className={`${compact} flex-1 sm:flex-none`}>
                Accept all
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
