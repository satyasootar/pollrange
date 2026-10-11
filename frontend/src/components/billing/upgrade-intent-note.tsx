import { Sparkles } from "lucide-react";
import { readUpgradeIntent } from "@/lib/upgrade-intent";

/** Reminds visitors on the auth pages which plan they're signing up for. */
export function UpgradeIntentNote({ action }: { action: "create your account" | "sign in" }) {
  const intent = readUpgradeIntent();
  if (!intent) return null;
  const label = intent.plan === "pro" ? "Pro" : "Plus";
  return (
    <div className="mb-6 flex items-start gap-3 border border-primary/40 bg-primary/5 p-3 text-sm" role="status">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <p>
        <span className="font-semibold">Getting {label} ({intent.period})</span>
        <br />
        <span className="text-muted-foreground">
          {action === "sign in" ? "Sign in" : "Create your account"} and we'll send your upgrade request for approval. You can use Kollects on Free meanwhile.
        </span>
      </p>
    </div>
  );
}
