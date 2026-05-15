import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { BarChart3, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetPassword } from "@/hooks/use-auth";
import { fadeUp, stagger } from "@/lib/animations";

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const resetPassword = useResetPassword();
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="w-full max-w-sm text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h1 className="text-xl font-bold">Invalid or missing token</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please check your email link or request a new password reset.
          </p>
          <Button className="mt-6" asChild>
            <Link to="/auth/forgot-password">Request new link</Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <motion.div variants={fadeUp} className="mb-8 flex items-center gap-2">
          <div className="flex items-center justify-center">
            <img src="/logo/logo1.png" alt="PollRange Logo" className="h-8 w-auto object-contain" />
          </div>
          <span className="font-semibold text-foreground">PollRange</span>
        </motion.div>

        <motion.div variants={fadeUp} className="mb-6">
          <h1 className="text-2xl font-bold">Reset password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your new password below.
          </p>
        </motion.div>

        <motion.form
          variants={fadeUp}
          onSubmit={handleSubmit((d) => resetPassword.mutate({ token, newPassword: d.password }))}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register("password")}
            />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
          </div>
          <Button type="submit" className="w-full gap-2" disabled={resetPassword.isPending}>
            {resetPassword.isPending ? "Resetting password…" : "Reset password"}
            {!resetPassword.isPending && <ArrowRight className="h-4 w-4" />}
          </Button>
        </motion.form>
      </motion.div>
    </div>
  );
}
