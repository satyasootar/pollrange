import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { useAuthStore } from "@/store/use-auth-store";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess: () => void;
  onForgotPassword: () => void;
}

export function LoginForm({ onSuccess, onForgotPassword }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const response = await api.post("/auth/login", data);
      const { user, accessToken } = response.data.data;
      setAuth(user, accessToken);
      toast.success("Welcome back!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-3">
        <Label htmlFor="email">Email Address</Label>
        <div className="relative group">
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            {...register("email")}
            disabled={isLoading}
            className="group-hover:border-primary transition-colors"
          />
        </div>
        {errors.email && (
          <p className="text-[10px] font-mono font-bold text-destructive uppercase tracking-tight flex items-center gap-1">
            <span className="w-1 h-1 bg-destructive"></span>
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-[10px] text-muted-foreground hover:text-primary font-mono uppercase tracking-widest font-bold transition-colors"
          >
            Forgot password?
          </button>
        </div>
        <div className="relative group">
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            {...register("password")}
            disabled={isLoading}
            className="group-hover:border-primary transition-colors"
          />
        </div>
        {errors.password && (
          <p className="text-[10px] font-mono font-bold text-destructive uppercase tracking-tight flex items-center gap-1">
            <span className="w-1 h-1 bg-destructive"></span>
            {errors.password.message}
          </p>
        )}
      </div>

      <Button 
        type="submit" 
        size="lg"
        className="w-full mt-4 h-16 relative overflow-hidden group/btn" 
        disabled={isLoading}
      >
        <span className="relative z-10 flex items-center gap-2">
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign In
              <Loader2 className="h-5 w-5 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
            </>
          )}
        </span>
        <div className="absolute inset-0 bg-primary-foreground/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
      </Button>
    </form>
  );
}
