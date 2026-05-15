import { config } from "@/config/config";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/hooks/use-auth";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { fadeUp, stagger } from "@/lib/animations";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const login = useLogin();
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
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/auth/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </motion.div>

        <motion.form
          variants={fadeUp}
          onSubmit={handleSubmit((d) => login.mutate(d))}
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
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/auth/forgot-password" className="text-xs text-muted-foreground hover:text-primary">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register("password")}
            />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full gap-2" disabled={login.isPending}>
            {login.isPending ? "Signing in…" : "Sign in"}
            {!login.isPending && <ArrowRight className="h-4 w-4" />}
          </Button>
        </motion.form>

        <motion.div variants={fadeUp} className="mt-6 flex items-center justify-between">
          <span className="w-1/5 border-b border-border lg:w-1/4"></span>
          <span className="text-xs text-center text-muted-foreground uppercase">or continue with</span>
          <span className="w-1/5 border-b border-border lg:w-1/4"></span>
        </motion.div>

        <motion.div variants={fadeUp} className="mt-6">
          <GoogleAuthButton />
        </motion.div>
      </motion.div>
    </div>
  );
}
