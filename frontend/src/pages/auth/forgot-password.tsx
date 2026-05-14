import { Link, useNavigate } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export function ForgotPasswordPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/auth/login");
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

      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-24 relative z-10">
        <div className="w-full max-w-[420px] bg-card border-2 border-border p-8 shadow-sm dark">
          <ForgotPasswordForm onBack={handleBack} />
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
