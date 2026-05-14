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
      className="w-full flex items-center justify-center gap-2 h-11"
      onClick={handleGoogleLogin}
    >
      <FcGoogle className="w-5 h-5" />
      Continue with Google
    </Button>
  );
}
