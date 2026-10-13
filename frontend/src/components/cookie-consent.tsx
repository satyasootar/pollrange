import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { COOKIE_SETTINGS_EVENT, hasGpc, readConsent, saveConsent, type ConsentAction, type ConsentChoice } from "@/lib/consent";
import { COOKIE_CATEGORIES } from "@/lib/cookie-catalog";

const NONE: ConsentChoice = { analytics: false, marketing: false };
const ALL: ConsentChoice = { analytics: true, marketing: true };

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
          className="fixed inset-x-4 bottom-4 z-110 border border-border bg-card p-5 text-card-foreground shadow-2xl sm:inset-x-auto sm:bottom-6 sm:left-6 sm:max-w-md"
        >
          <div className="mb-2 flex items-center gap-2">
            <Cookie className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em]">Cookies on Kollects</h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We use essential cookies to run the site. With your permission, we'd also like to use analytics and campaign
            cookies to understand how people find and use Kollects. We never use cookies for advertising.{" "}
            <Link to="/privacy#cookies" className="text-foreground underline underline-offset-2">
              Cookie policy
            </Link>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button variant="outline" size="sm" onClick={() => decide(NONE, "reject_all")} className="sm:flex-1">
              Reject all
            </Button>
            <Button size="sm" onClick={() => decide(ALL, "accept_all")} className="sm:flex-1">
              Accept all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSource("banner");
                setPrefsOpen(true);
              }}
              className="col-span-2 sm:basis-full"
            >
              Set preferences
            </Button>
          </div>
        </section>
      )}

      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Cookie preferences</DialogTitle>
            <DialogDescription>
              Choose which cookies Kollects can use. Optional cookies stay off unless you turn them on, and you can change
              this any time from "Cookie settings" in the footer.
            </DialogDescription>
          </DialogHeader>

          {hasGpc() && (
            <p className="border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              Your browser is sending a Global Privacy Control signal, so optional cookies start switched off.
            </p>
          )}

          <div className="space-y-3">
            {COOKIE_CATEGORIES.map((cat) => {
              const optional = cat.id !== "necessary";
              const on = optional ? choice[cat.id as keyof ConsentChoice] : true;
              return (
                <div key={cat.id} className="border border-border p-4">
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
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Always on</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{cat.description}</p>
                  <details className="group mt-2">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-foreground">
                      <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
                      {cat.entries.length} {cat.entries.length === 1 ? "item" : "items"}
                    </summary>
                    <ul className="mt-2 divide-y divide-border border border-border text-xs">
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
                </div>
              );
            })}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => decide(NONE, "reject_all")}>
              Reject all
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={saveCustom}>
                Save choices
              </Button>
              <Button onClick={() => decide(ALL, "accept_all")}>Accept all</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
