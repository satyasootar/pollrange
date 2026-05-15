import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { fadeUp } from "@/lib/animations";

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="text-center"
      >
        <p className="text-7xl font-black text-border">404</p>
        <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <Button className="mt-6" onClick={() => navigate("/")}>
          Go Home
        </Button>
      </motion.div>
    </div>
  );
}
