import { Navigate, Outlet, useSearchParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAdminPlanRequests, useIsAdmin } from "@/hooks/use-admin";
import { AdminOverviewTab } from "@/components/admin/admin-overview";
import { AdminUsersTab } from "@/components/admin/admin-users";
import { AdminTrafficTab } from "@/components/admin/admin-traffic";
import { AdminSystemTab } from "@/components/admin/admin-system";
import { AdminApisTab } from "@/components/admin/admin-apis";
import { AdminCleanupTab } from "@/components/admin/admin-cleanup";
import { AdminUpgradesTab } from "@/components/admin/admin-upgrades";
import { AdminSiteAnalyticsTab } from "@/components/admin/admin-site-analytics";
import { AdminConsentTab } from "@/components/admin/admin-consent";

/** Client-side gate for UX only; every /api/admin call is enforced server-side. */
export function AdminRoute() {
  return useIsAdmin() ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

const TABS = [
  { value: "overview", label: "Overview", el: <AdminOverviewTab /> },
  { value: "users", label: "Users", el: <AdminUsersTab /> },
  { value: "upgrades", label: "Upgrades", el: <AdminUpgradesTab /> },
  { value: "site", label: "Site analytics", el: <AdminSiteAnalyticsTab /> },
  { value: "consent", label: "Cookie consent", el: <AdminConsentTab /> },
  { value: "traffic", label: "API traffic", el: <AdminTrafficTab /> },
  { value: "apis", label: "APIs", el: <AdminApisTab /> },
  { value: "system", label: "System & storage", el: <AdminSystemTab /> },
  { value: "cleanup", label: "Cleanup", el: <AdminCleanupTab /> },
] as const;

export function AdminPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.value === params.get("tab"))?.value ?? "overview";
  const pendingUpgrades = useAdminPlanRequests().data?.filter((r) => r.status === "pending").length ?? 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex h-20 shrink-0 items-center gap-3 border-b border-border px-4 md:px-8">
        <span className="flex h-9 w-9 items-center justify-center border border-primary/40 bg-primary/10 text-primary">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
          <p className="text-sm text-muted-foreground">Users, analytics, traffic and system health across Kollects</p>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
          <TabsList className="mb-4 max-w-full overflow-x-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
                {t.value === "upgrades" && pendingUpgrades > 0 && (
                  <span className="ml-1.5 bg-primary px-1.5 text-[10px] font-bold text-primary-foreground" aria-label={`${pendingUpgrades} pending`}>
                    {pendingUpgrades}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((t) => (
            <TabsContent key={t.value} value={t.value}>
              {t.el}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
