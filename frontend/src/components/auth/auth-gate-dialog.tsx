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

interface AuthGateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after a successful login/registration. */
  onAuthenticated: () => void
}

/**
 * Lightweight login/register modal used to gate an action (e.g. submitting an
 * authenticated poll). Reuses the standard auth forms; on success it closes and
 * fires onAuthenticated so the caller can continue the interrupted flow.
 */
export function AuthGateDialog({ open, onOpenChange, onAuthenticated }: AuthGateDialogProps) {
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
