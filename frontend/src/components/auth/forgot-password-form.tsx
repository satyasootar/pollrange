import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);
    try {
      await api.post("/auth/forgot-password", data);
      setIsSubmitted(true);
      toast.success("Reset link sent to your email!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="text-center space-y-6 py-12 border-2 border-border p-8">
        <div className="mx-auto w-16 h-16 bg-primary/10 border-2 border-primary flex items-center justify-center mb-6">
          <Loader2 className="w-8 h-8 text-primary opacity-50" />
        </div>
        <h3 className="text-2xl font-black uppercase tracking-tighter italic">Check your email</h3>
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest leading-relaxed">
          We've sent a password reset link to your email address.
        </p>
        <Button variant="outline" className="w-full mt-8 h-14" onClick={onBack}>
          Back to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <button
        onClick={onBack}
        className="flex items-center text-[10px] font-mono font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-[0.2em]"
      >
        <ArrowLeft className="mr-2 h-3 w-3" />
        Back to Login
      </button>

      <div className="space-y-3">
        <h3 className="text-2xl font-black uppercase tracking-tighter italic">Reset Password</h3>
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest leading-relaxed">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            {...register("email")}
            disabled={isLoading}
            className="group-hover:border-primary transition-colors"
          />
          {errors.email && (
            <p className="text-[10px] font-mono font-bold text-destructive uppercase tracking-tight flex items-center gap-1">
              <span className="w-1 h-1 bg-destructive"></span>
              {errors.email.message}
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
                Sending link...
              </>
            ) : (
              <>
                Send Reset Link
                <Loader2 className="h-5 w-5 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
              </>
            )}
          </span>
          <div className="absolute inset-0 bg-primary-foreground/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
        </Button>
      </form>
    </div>
  );
}
