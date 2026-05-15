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
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              const redirect = params.get("redirect");
              const googleUrl = new URL(`${config.apiUrl}/auth/google`, window.location.origin);
              if (redirect) googleUrl.searchParams.set("state", redirect);
              window.location.href = googleUrl.toString();
            }}
          >
            <svg
              className="mr-2 h-4 w-4"
              aria-hidden="true"
              focusable="false"
              data-prefix="fab"
              data-icon="google"
              role="img"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 488 512"
            >
              <path
                fill="currentColor"
                d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
              ></path>
            </svg>
            Google
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
