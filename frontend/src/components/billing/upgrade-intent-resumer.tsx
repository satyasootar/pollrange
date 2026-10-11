import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useRequestUpgrade } from "@/hooks/use-plan";
import { clearUpgradeIntent, readUpgradeIntent } from "@/lib/upgrade-intent";
import { toastApiError } from "@/lib/utils";

/**
 * Files the upgrade request a visitor started on the pricing page, once they're
 * signed in and onboarded (AppShell only renders after both). Fires at most once.
 */
export function UpgradeIntentResumer() {
  const navigate = useNavigate();
  const request = useRequestUpgrade();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    const intent = readUpgradeIntent();
    if (!intent) return;
    fired.current = true;
    clearUpgradeIntent(); // clear first so a failure can't loop
    request.mutate(intent, {
      onSuccess: (r) => {
        toast.success(`Upgrade request sent for ${r.plan === "pro" ? "Pro" : "Plus"}. We'll email you once it's approved.`);
        navigate("/dashboard/billing");
      },
      onError: (err) => {
        toastApiError(err);
        navigate("/dashboard/billing");
      },
    });
  }, [navigate, request]);

  return null;
}
