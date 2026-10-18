import { useState } from "react"
import { Infinity as InfinityIcon, CalendarClock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface ReopenPollDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** expiresAt: ISO string for a deadline, or null for "open forever". */
  onConfirm: (expiresAt: string | null) => void
  isPending?: boolean
  noun?: "poll" | "form" | "quiz"
}

export function ReopenPollDialog({ open, onOpenChange, onConfirm, isPending, noun = "poll" }: ReopenPollDialogProps) {
  const [mode, setMode] = useState<"forever" | "deadline">("forever")
  const [deadline, setDeadline] = useState("")
  // Lazy init so Date.now() isn't called during render (React purity).
  const [minDatetime] = useState(() =>
    new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)
  )

  const confirm = () => {
    if (mode === "deadline") {
      if (!deadline) return
      onConfirm(new Date(deadline).toISOString())
    } else {
      onConfirm(null)
    }
  }

  const optionClass = (active: boolean) =>
    cn(
      "flex w-full items-center gap-3 border p-3 text-left text-sm transition-colors",
      active ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
    )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reopen {noun}</DialogTitle>
          <DialogDescription>Choose how long this {noun} stays open.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <button type="button" onClick={() => setMode("forever")} className={optionClass(mode === "forever")}>
            <InfinityIcon className="h-4 w-4 shrink-0" />
            <span>Keep open forever <span className="text-muted-foreground">(no deadline)</span></span>
          </button>

          <button type="button" onClick={() => setMode("deadline")} className={optionClass(mode === "deadline")}>
            <CalendarClock className="h-4 w-4 shrink-0" />
            <span>Set a new deadline</span>
          </button>

          {mode === "deadline" && (
            <Input
              type="datetime-local"
              min={minDatetime}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1"
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={isPending || (mode === "deadline" && !deadline)}>
            {isPending ? "Reopening…" : "Reopen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
