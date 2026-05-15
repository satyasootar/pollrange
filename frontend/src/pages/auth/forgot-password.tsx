import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForgotPassword } from "@/hooks/use-auth";
import { fadeUp, stagger } from "@/lib/animations";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
});
type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

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
          <h1 className="text-2xl font-bold">Forgot password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link to="/auth/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>

        <motion.form
          variants={fadeUp}
          onSubmit={handleSubmit((d) => forgotPassword.mutate(d.email))}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <Button type="submit" className="w-full gap-2" disabled={forgotPassword.isPending}>
            {forgotPassword.isPending ? "Sending reset link…" : "Send reset link"}
            {!forgotPassword.isPending && <ArrowRight className="h-4 w-4" />}
          </Button>
        </motion.form>
      </motion.div>
    </div>
  );
}
