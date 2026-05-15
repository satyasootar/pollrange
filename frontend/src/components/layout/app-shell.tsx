import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Plus,
  LogOut,
  BarChart3,
  User,
  ChevronRight,
  Menu,
  X,
  MoreVertical,
  Sun,
  Moon,
  Monitor,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/use-auth-store";
import { useLogout } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/polls/create", icon: Plus, label: "Create Poll" },
];

function NavItem({
  to,
  icon: Icon,
  label,
  onClick,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={to === "/dashboard"}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-none border border-transparent px-4 py-2.5 text-sm font-medium transition-all duration-200",
          isActive
            ? "border-border bg-primary/10 text-primary"
            : "text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1">{label}</span>
          {isActive && (
            <motion.div
              layoutId="nav-indicator"
              className="h-4 w-0.5 bg-primary"
              initial={false}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
        </>
      )}
    </NavLink>
  );
}

export function AppShell() {
  const { user } = useAuthStore();
  const logout = useLogout();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div
        className="flex cursor-pointer items-center gap-2 border-b border-border px-5 py-4 h-20"
        onClick={() => {
          navigate("/dashboard");
          setIsSidebarOpen(false);
        }}
      >
        <div className="flex items-center justify-center">
          <img src="/logo/logo1.png" alt="PollRange Logo" className="h-6 w-auto object-contain" />
        </div>
        <span className="font-semibold tracking-tight text-foreground uppercase">
          PollRange
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto py-3">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} onClick={() => setIsSidebarOpen(false)} />
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div 
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl p-1 transition-colors hover:bg-muted"
            onClick={() => {
              navigate("/dashboard/profile");
              setIsSidebarOpen(false);
            }}
          >
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-muted text-xs font-semibold text-foreground">
              {user?.name?.charAt(0).toUpperCase()}
              {!user?.isEmailVerified && (
                <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Settings</DropdownMenuLabel>
              {!user?.isEmailVerified && (
                <DropdownMenuItem 
                  onClick={() => navigate("/dashboard/profile")}
                  className="text-amber-600 focus:bg-amber-500/10 focus:text-amber-700 font-semibold"
                >
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  Verify Email
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => navigate("/dashboard/profile")}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  {theme === "light" && <Sun className="mr-2 h-4 w-4" />}
                  {theme === "dark" && <Moon className="mr-2 h-4 w-4" />}
                  {theme === "system" && <Monitor className="mr-2 h-4 w-4" />}
                  Theme
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setTheme("light")}>
                      <Sun className="mr-2 h-4 w-4" />
                      Light
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                      <Moon className="mr-2 h-4 w-4" />
                      Dark
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("system")}>
                      <Monitor className="mr-2 h-4 w-4" />
                      System
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border md:flex">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-background md:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 md:px-8 md:hidden">
          <div className="flex items-center gap-4">
            <div
              className="flex cursor-pointer items-center gap-2 md:hidden "
              onClick={() => navigate("/dashboard")}
            >
              <img src="/logo/logo1.png" alt="PollRange Logo" className="h-6 w-auto" />
              <span className="font-semibold tracking-tight text-foreground uppercase text-sm">
                PollRange
              </span>
            </div>
          </div>
          
          <div className="flex lg:hidden items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
              className="h-9 w-9"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </header>
        
        <Outlet />
      </main>
    </div>
  );
}
