import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/use-auth-store";
import { BarChart3, LogOut } from "lucide-react";

export function Navbar() {
  const { user, clearAuth } = useAuthStore();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="max-w-[1400px] mx-auto px-12 h-[72px] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center">
            <img src="/logo/logo1.png" alt="PollRange Logo" className="h-8 w-auto object-contain" />
          </div>
          <span className="text-xl font-black uppercase tracking-tighter">PollRange</span>
        </div>

        <div className="hidden md:flex items-center gap-8 font-mono text-xs uppercase tracking-widest">
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#how" className="text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
          <a href="#stats" className="text-muted-foreground hover:text-foreground transition-colors">Stats</a>
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">{user.name.split(" ")[0]}</span>
              <Button variant="outline" size="sm" onClick={clearAuth} className="rounded-none border-border font-mono text-xs uppercase">
                <LogOut className="w-3 h-3 mr-2" /> Exit
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/auth/login" className="text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
              <Link to="/auth/register">
                <Button className="rounded-none bg-foreground text-background hover:bg-primary font-mono text-xs uppercase tracking-widest px-5 py-2 h-auto transition-colors">
                  Get Started →
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
