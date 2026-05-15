import { Link, useNavigate } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { RegisterForm } from "@/components/auth/register-form";

export function RegisterPage() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 flex flex-col relative overflow-hidden">
      {/* Background Dots */}
      <div className="absolute inset-0 bg-grid-dots opacity-40 pointer-events-none"></div>

      {/* Header with Logo */}
      <header className="p-8 relative z-10">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 border-2 border-primary bg-primary/10 flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform cursor-pointer">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <span className="text-xl font-bold tracking-tighter uppercase font-heading">PollRange</span>
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-12 pb-24 relative z-10">
        <div className="w-full max-w-[420px] space-y-10">
          <div className="space-y-2 text-center">
            <h1 className="text-4xl font-black tracking-tighter uppercase font-heading italic">
              Create Account
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              Join the technical polling frontier
            </p>
          </div>

          <div className="space-y-8 bg-card border-2 border-border p-8 shadow-sm">
            {/* SSO Section */}
            <div className="space-y-4">
              <button 
                onClick={() => window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`}
                className="w-full flex items-center justify-center gap-3 p-4 border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group relative overflow-hidden"
              >
                <FcGoogle className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-widest font-mono">Sign up with Google</span>
              </button>
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink mx-4 text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">OR</span>
              <div className="flex-grow border-t border-border"></div>
            </div>

            <div className="dark">
              <RegisterForm onSuccess={handleSuccess} />
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link 
              to="/auth/login" 
              className="text-primary font-bold hover:underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>

      {/* Footer Decoration */}
      <footer className="p-8 flex justify-center opacity-20 relative z-10">
        <div className="font-mono text-[10px] uppercase tracking-[0.5em] font-bold">
          PollRange System
        </div>
      </footer>
    </div>
  );
}
