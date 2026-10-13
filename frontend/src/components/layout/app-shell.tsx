import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  LogOut,
  User,
  MoreVertical,
  Sun,
  Moon,
  Monitor,
  ShieldAlert,
  FileText,
  BarChart3,
  ShieldCheck,
  CreditCard,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/use-auth-store";
import { useLogout } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { UpgradeIntentResumer } from "@/components/billing/upgrade-intent-resumer";
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

const navItems = [
  { to: "/dashboard/overview", icon: LayoutDashboard, label: "Overview" },
  { to: "/dashboard", icon: BarChart3, label: "Polls" },
  { to: "/dashboard/forms", icon: FileText, label: "Forms" },
];

const mobileTabItems = [
  { to: "/dashboard/overview", icon: LayoutDashboard, label: "Overview" },
  { to: "/dashboard", icon: BarChart3, label: "Polls" },
  { to: "/dashboard/forms", icon: FileText, label: "Forms" },
  { to: "/dashboard/profile", icon: User, label: "Profile" },
];

const adminItem = { to: "/admin", icon: ShieldCheck, label: "Admin" };

// "Polls"/"Forms" own top-level builder & analytics routes (/polls/*, /forms/*)
// outside of /dashboard, so plain NavLink prefix matching can't tell those tabs
// apart from a same-path-prefix sibling like /dashboard/forms.
function isNavItemActive(pathname: string, to: string): boolean {
  if (to === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/polls");
  if (to === "/dashboard/forms") return pathname.startsWith("/dashboard/forms") || pathname.startsWith("/forms");
  return pathname.startsWith(to);
}

function MobileTabBar() {
  const { pathname } = useLocation();
  const items = useIsAdmin() ? [...mobileTabItems, adminItem] : mobileTabItems;
  return (
    <nav className={cn("grid h-16 shrink-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden", items.length === 5 ? "grid-cols-5" : "grid-cols-4")}>
      {items.map(({ to, icon: Icon, label }) => {
        const isActive = isNavItemActive(pathname, to);
        return (
          <NavLink
            key={to}
            to={to}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium uppercase tracking-wide transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        );
      })}
    </nav>
  );
}

function NavItem({
  to,
  icon: Icon,
  label,
  pathname,
  onClick,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  pathname: string;
  onClick?: () => void;
}) {
  const isActive = isNavItemActive(pathname, to);
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-none border border-transparent px-4 py-2.5 text-sm font-medium transition-all duration-200",
        isActive
          ? "border-border bg-primary/10 text-primary"
          : "text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
      )}
    >
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
    </NavLink>
  );
}

export function AppShell() {
  const { user } = useAuthStore();
  const logout = useLogout();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const isProfileActive = location.pathname === "/dashboard/profile";
  const isAdmin = useIsAdmin();

  const sidebarContent = (
    <>
      {/* Logo */}
      <div
        className="flex cursor-pointer items-center gap-2 border-b border-border px-5 py-4 h-20"
        onClick={() => navigate("/dashboard")}
      >
        <div className="flex items-center justify-center">
          <img src="/logo/logo1.png" alt="Kollects Logo" className="h-6 w-auto object-contain" />
        </div>
        <span className="font-semibold tracking-tight text-foreground uppercase">
          Kollects
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto py-3">
        {(isAdmin ? [...navItems, adminItem] : navItems).map((item) => (
          <NavItem key={item.to} {...item} pathname={location.pathname} />
        ))}
      </nav>

      {/* User footer — fixed h-20 so it aligns with the top bars / chat composer */}
      <div className="flex h-20 shrink-0 flex-col justify-center border-t border-border px-3">
        <div
          className={cn(
            "flex items-center gap-3 border px-3 py-2 transition-colors duration-200",
            isProfileActive
              ? "border-border bg-primary/10"
              : "border-transparent hover:border-border hover:bg-muted"
          )}
        >
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            onClick={() => navigate("/dashboard/profile")}
          >
            <div
              className={cn(
                "relative flex h-9 w-9 shrink-0 items-center justify-center border text-xs font-semibold",
                isProfileActive
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-muted text-foreground"
              )}
            >
              {user?.name?.charAt(0).toUpperCase()}
              {!user?.isEmailVerified && (
                <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate text-sm font-medium",
                  isProfileActive && "text-primary"
                )}
              >
                {user?.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="shrink-0">
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
              <DropdownMenuItem onClick={() => navigate("/dashboard/billing")}>
                <CreditCard className="mr-2 h-4 w-4" />
                Plan & usage
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/dashboard/branding")}>
                <Palette className="mr-2 h-4 w-4" />
                Brand kit
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
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border md:flex">
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
        <MobileTabBar />
        <UpgradeIntentResumer />
      </main>
    </div>
  );
}
