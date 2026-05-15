import { Sun, Moon } from "lucide-react";
import { useTheme } from "./theme-provider";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  sticky?: boolean;
}

export function ThemeToggle({ className, sticky }: ThemeToggleProps) {
  const { setTheme } = useTheme();

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className={cn(
        "h-10 w-10 shrink-0 rounded-none border-2 border-foreground bg-background transition-all duration-200 hover:bg-foreground hover:text-background active:translate-x-[1px] active:translate-y-[1px]",
        sticky ? "fixed bottom-8 right-8 z-[100]" : "",
        className
      )}
    >
      <div className="flex items-center justify-center">
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
