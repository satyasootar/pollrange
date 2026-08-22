import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ApiValidationError } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errors: ApiValidationError[];
  isPending?: boolean;
  /** Present only when one of the errors is on `expiresAt` — lets the user fix it inline and resubmit. */
  onFixExpiryAndRetry?: (expiresAt: string | null) => void;
  /** Fallback for any other field error — sends the user back to the step that owns it. */
  onGoToSettings: () => void;
}

/**
 * Shown when Publish/Save fails validation. Surfaces exactly what's wrong and,
 * for the common "invalid/expired expiry date" case, lets the user fix it and
 * retry without leaving the review screen.
 */
export function PublishErrorDialog({ open, onOpenChange, errors, isPending, onFixExpiryAndRetry, onGoToSettings }: Props) {
  const [value, setValue] = useState("");
  // Lazy init so Date.now() isn't called during render.
  const [minDatetime] = useState(() => new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16));
  const hasExpiryError = errors.some((e) => e.path === "expiresAt");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Couldn't publish
          </DialogTitle>
          <DialogDescription>Fix the following and try again.</DialogDescription>
        </DialogHeader>

        <ul className="space-y-1.5 text-sm">
          {errors.map((e, i) => (
            <li key={i} className="text-destructive">
              • {e.message}
            </li>
          ))}
        </ul>

        {hasExpiryError && onFixExpiryAndRetry && (
          <div className="space-y-2 border-t border-border pt-3">
            <label className="text-xs font-medium text-muted-foreground">
              Set a valid expiry, or leave empty for no expiry
            </label>
            <Input type="datetime-local" min={minDatetime} value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          {hasExpiryError && onFixExpiryAndRetry ? (
            <Button onClick={() => onFixExpiryAndRetry(value ? new Date(value).toISOString() : null)} disabled={isPending}>
              {isPending ? "Retrying…" : "Apply & Retry"}
            </Button>
          ) : (
            <Button onClick={onGoToSettings} disabled={isPending}>
              Go to Settings
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
