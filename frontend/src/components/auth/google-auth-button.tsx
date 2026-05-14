import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";

export function GoogleAuthButton() {
  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || "http://localhost:3030/api"}/auth/google`;
  };

  return (
    <Button
      variant="outline"
      type="button"
      className="w-full flex items-center justify-center gap-3 h-14 rounded-none border-4 border-foreground font-black uppercase tracking-tighter hover:bg-primary hover:text-primary-foreground hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
      onClick={handleGoogleLogin}
    >
      <FcGoogle className="w-6 h-6" />
      Google
    </Button>
  );
}
