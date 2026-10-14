import { Link } from "react-router-dom";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdminConsentHistory } from "@/hooks/use-admin";
import { formatDatetime } from "@/lib/utils";
import { CONSENT_ACTIONS } from "@/lib/admin-format";
import type { AdminConsentRecord } from "@/types";
import { Pill } from "./admin-ui";

/** Analytics / Campaign as allowed-or-denied pills. */
export function ConsentChoicePills({ r }: { r: Pick<AdminConsentRecord, "analytics" | "marketing"> }) {
  return (
    <>
      <Pill tone={r.analytics ? "good" : "muted"}>analytics {r.analytics ? "allowed" : "denied"}</Pill>
      <Pill tone={r.marketing ? "good" : "muted"}>campaign {r.marketing ? "allowed" : "denied"}</Pill>
    </>
  );
}

/** What changed from the previous decision, e.g. "analytics turned off". */
function changes(r: AdminConsentRecord, prev?: AdminConsentRecord) {
  if (!prev) return "First decision";
  const diff = (["analytics", "marketing"] as const)
    .filter((k) => r[k] !== prev[k])
    .map((k) => `${k === "marketing" ? "campaign" : k} turned ${r[k] ? "on" : "off"}`);
  return diff.length ? diff.join(", ") : "Same choice saved again";
}

/** Full proof-of-consent history for one browser (consent ID). */
export function ConsentHistoryDialog({ consentId, onClose }: { consentId: string | null; onClose: () => void }) {
  const { data, isLoading, isError } = useAdminConsentHistory(consentId);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!consentId) return;
    void navigator.clipboard?.writeText(consentId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <Dialog open={!!consentId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Consent history</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            <span className="break-all font-mono text-xs">{consentId}</span>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1 text-xs text-foreground hover:text-primary"
              aria-label="Copy consent ID"
            >
              {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </DialogDescription>
        </DialogHeader>

        {isLoading && <div className="shimmer h-48" />}
        {isError && <p className="text-sm text-muted-foreground">Couldn't load this consent history.</p>}

        {data && (
          <div className="space-y-5">
            <section className="space-y-2 border border-border bg-muted/30 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current choice</h3>
              <div className="flex flex-wrap items-center gap-1.5">
                <Pill tone={CONSENT_ACTIONS[data.current.action].tone}>{CONSENT_ACTIONS[data.current.action].label}</Pill>
                <ConsentChoicePills r={data.current} />
                <Pill>policy v{data.current.version}</Pill>
              </div>
              <p className="text-xs text-muted-foreground">
                {data.decisions.length} {data.decisions.length === 1 ? "decision" : "decisions"} · first seen {formatDatetime(data.firstSeenAt)} · last
                changed {formatDatetime(data.current.createdAt)}
              </p>
              {data.users.length > 0 && (
                <p className="text-xs">
                  <span className="text-muted-foreground">Signed in as </span>
                  {data.users.map((u, i) => (
                    <span key={u.id}>
                      {i > 0 && ", "}
                      <Link to={`/admin/users/${u.id}`} onClick={onClose} className="font-medium hover:text-primary">
                        {u.name}
                      </Link>{" "}
                      <span className="text-muted-foreground">({u.email})</span>
                    </span>
                  ))}
                </p>
              )}
            </section>

            <ol className="relative space-y-4 border-l border-border pl-5">
              {[...data.decisions].reverse().map((r, i, list) => {
                const prev = list[i + 1];
                return (
                  <li key={r.id} className="relative">
                    <span
                      className="absolute top-1 -left-[25px] size-2.5 border-2 border-background"
                      style={{ background: CONSENT_ACTIONS[r.action].color }}
                      aria-hidden="true"
                    />
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-medium">{formatDatetime(r.createdAt)}</span>
                      <Pill tone={CONSENT_ACTIONS[r.action].tone}>{CONSENT_ACTIONS[r.action].label}</Pill>
                      {r.gpc && <Pill>GPC</Pill>}
                    </div>
                    <p className="mt-0.5 text-xs text-foreground">{changes(r, prev)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {r.analytics ? "Analytics on" : "Analytics off"} · {r.marketing ? "Campaign on" : "Campaign off"} ·{" "}
                      {r.source === "settings" ? "Cookie settings" : "Banner"} · <span className="font-mono">{r.page ?? "—"}</span> · policy v{r.version}
                      {r.user ? ` · ${r.user.email}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">{[r.device, r.browser, r.os].filter(Boolean).join(" · ") || "Unknown device"}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
