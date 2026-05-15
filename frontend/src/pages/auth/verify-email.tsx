import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVerifyEmail } from "@/hooks/use-auth-actions";
import { fadeUp } from "@/lib/animations";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const { mutate: verify, isPending, isSuccess, isError, error } = useVerifyEmail();
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (token && !attempted) {
      verify(token);
      setAttempted(true);
    }
  }, [token, verify, attempted]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl"
      >
        {!token ? (
          <>
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-amber-500/10 p-3 text-amber-500">
                <XCircle className="h-10 w-10" />
              </div>
            </div>
            <h1 className="mb-2 text-2xl font-bold tracking-tight">Invalid Link</h1>
            <p className="mb-8 text-muted-foreground">
              The verification link is missing or malformed.
            </p>
            <Button asChild className="w-full">
              <Link to="/login">Back to Login</Link>
            </Button>
          </>
        ) : isPending ? (
          <>
            <div className="mb-4 flex justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
            <h1 className="mb-2 text-2xl font-bold tracking-tight">Verifying...</h1>
            <p className="text-muted-foreground">
              Please wait while we verify your email address.
            </p>
          </>
        ) : isSuccess ? (
          <>
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-500">
                <CheckCircle2 className="h-10 w-10" />
              </div>
            </div>
            <h1 className="mb-2 text-2xl font-bold tracking-tight">Verified!</h1>
            <p className="mb-8 text-muted-foreground">
              Your email has been successfully verified. You can now access all features.
            </p>
            <Button asChild className="w-full gap-2">
              <Link to="/dashboard">
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </>
        ) : isError ? (
          <>
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-destructive/10 p-3 text-destructive">
                <XCircle className="h-10 w-10" />
              </div>
            </div>
            <h1 className="mb-2 text-2xl font-bold tracking-tight">Verification Failed</h1>
            <p className="mb-8 text-muted-foreground">
              {(error as any)?.response?.data?.message || "The verification link may be expired or invalid."}
            </p>
            <div className="flex flex-col gap-3">
              <Button asChild className="w-full">
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Back to Login</Link>
              </Button>
            </div>
          </>
        ) : null}
      </motion.div>
    </div>
  );
}
