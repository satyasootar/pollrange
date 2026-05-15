import { config } from "@/config/config";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegister } from "@/hooks/use-auth";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { fadeUp, stagger } from "@/lib/animations";

const schema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const register_ = useRegister();
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
        <motion.div variants={fadeUp} className="mb-8 flex items-center gap-2">
          <div className="flex items-center justify-center">
            <img src="/logo/logo1.png" alt="PollRange Logo" className="h-8 w-auto object-contain" />
          </div>
          <span className="font-semibold text-foreground">PollRange</span>
        </motion.div>

        <motion.div variants={fadeUp} className="mb-6">
          <h1 className="text-2xl font-bold">Create account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/auth/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>

        <motion.form
          variants={fadeUp}
          onSubmit={handleSubmit((d) => register_.mutate(d))}
          className="space-y-4"
        >
          {[
            { id: "name", label: "Full Name", type: "text", placeholder: "John Doe" },
            { id: "email", label: "Email", type: "email", placeholder: "you@example.com" },
            { id: "password", label: "Password", type: "password", placeholder: "••••••••" },
            { id: "confirmPassword", label: "Confirm Password", type: "password", placeholder: "••••••••" },
          ].map(({ id, label, type, placeholder }) => (
            <div key={id} className="space-y-1.5">
              <Label htmlFor={id}>{label}</Label>
              <Input
                id={id}
                type={type}
                placeholder={placeholder}
                {...register(id as keyof FormValues)}
              />
              {errors[id as keyof FormValues] && (
                <p className="text-xs text-destructive">
                  {errors[id as keyof FormValues]?.message}
                </p>
              )}
            </div>
          ))}
          <Button type="submit" className="w-full" disabled={register_.isPending}>
            {register_.isPending ? "Creating account…" : "Create account"}
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
