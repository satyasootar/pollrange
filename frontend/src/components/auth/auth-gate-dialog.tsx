import { useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { LoginForm } from "./login-form"
import { RegisterForm } from "./register-form"
import { GoogleAuthButton } from "./google-auth-button"

interface AuthGateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after a successful login/registration. */
  onAuthenticated: () => void
  /** Path to return to after the Google redirect (e.g. the poll URL). */
  googleRedirect?: string
  /** Runs before the Google redirect — persist in-progress state here. */
  onBeforeGoogle?: () => void
}

/**
 * Lightweight login/register modal used to gate an action (e.g. submitting an
 * authenticated poll). Reuses the standard auth forms; on success it closes and
 * fires onAuthenticated so the caller can continue the interrupted flow.
 */
export function AuthGateDialog({
  open,
  onOpenChange,
  onAuthenticated,
  googleRedirect,
  onBeforeGoogle,
}: AuthGateDialogProps) {
  const [mode, setMode] = useState<"login" | "register">("login")

  const handleSuccess = () => {
    onOpenChange(false)
    onAuthenticated()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "login" ? "Sign in to submit" : "Create an account to submit"}
          </DialogTitle>
          <DialogDescription>
            This poll requires an account. Your selected answers are kept — you'll be
            submitted automatically once you're in.
          </DialogDescription>
        </DialogHeader>

        <GoogleAuthButton redirect={googleRedirect} onBeforeRedirect={onBeforeGoogle} />

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            or
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {mode === "login" ? (
          <LoginForm
            onSuccess={handleSuccess}
            onForgotPassword={() =>
              toast.info("Reset your password from the login page.")
            }
          />
        ) : (
          <RegisterForm onSuccess={handleSuccess} />
        )}

        <p className="text-center text-xs text-muted-foreground">
          {mode === "login" ? "No account yet?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Create one" : "Sign in"}
          </button>
        </p>
      </DialogContent>
    </Dialog>
  )
}
