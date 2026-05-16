import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  History,
  MoreVertical,
  BarChart3,
  Clock,
  Users,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { DashboardView } from "../dashboard/dashboard-view";
import { useAuthStore } from "@/store/use-auth-store";
import { cn } from "@/lib/utils";
import type { Poll, PollFilters } from "@/types";

const MOCK_POLLS: Poll[] = [
  {
    _id: "demo-1",
    creatorId: "demo-user",
    title: "Q2 Product Strategy Survey",
    description: "Gathering feedback on the new roadmap and feature priorities for the upcoming quarter.",
    shareToken: "strategy-q2",
    questions: Array(5).fill({}),
    responseMode: "anonymous",
    status: "active",
    expiresAt: new Date(Date.now() + 86400000 * 5).toISOString(),
    totalResponses: 1284,
    isDeleted: false,
    settings: {
      allowResponseEdit: false,
      showProgressBar: true,
      randomizeQuestions: false,
      randomizeOptions: true,
    },
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    _id: "demo-2",
    creatorId: "demo-user",
    title: "Customer Satisfaction 2024",
    description: "Annual NPS and satisfaction survey for our enterprise clients.",
    shareToken: "nps-2024",
    questions: Array(10).fill({}),
    responseMode: "anonymous",
    status: "published",
    expiresAt: new Date(Date.now() - 86400000).toISOString(),
    totalResponses: 856,
    isDeleted: false,
    publishedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    settings: {
      allowResponseEdit: false,
      showProgressBar: true,
      randomizeQuestions: false,
      randomizeOptions: false,
    },
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    _id: "demo-3",
    creatorId: "demo-user",
    title: "New Feature Prioritization",
    description: "Which features should we build next? Vote now!",
    shareToken: "feature-vote",
    questions: Array(3).fill({}),
    responseMode: "authenticated",
    status: "active",
    expiresAt: new Date(Date.now() + 86400000 * 12).toISOString(),
    totalResponses: 432,
    isDeleted: false,
    settings: {
      allowResponseEdit: true,
      showProgressBar: true,
      randomizeQuestions: true,
      randomizeOptions: true,
    },
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    _id: "demo-4",
    creatorId: "demo-user",
    title: "Marketing Campaign A/B Test",
    description: "Testing different messaging variants for the summer campaign.",
    shareToken: "marketing-ab",
    questions: Array(4).fill({}),
    responseMode: "anonymous",
    status: "draft",
    expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
    totalResponses: 0,
    isDeleted: false,
    settings: {
      allowResponseEdit: false,
      showProgressBar: false,
      randomizeQuestions: false,
      randomizeOptions: false,
    },
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    _id: "demo-5",
    creatorId: "demo-user",
    title: "Team Offsite Feedback",
    description: "How was the offsite? What could we improve?",
    shareToken: "offsite-2024",
    questions: Array(6).fill({}),
    responseMode: "anonymous",
    status: "closed",
    expiresAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    totalResponses: 48,
    isDeleted: false,
    closedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    settings: {
      allowResponseEdit: false,
      showProgressBar: true,
      randomizeQuestions: false,
      randomizeOptions: false,
    },
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    _id: "demo-6",
    creatorId: "demo-user",
    title: "User Persona Research",
    description: "Understanding our user base better through qualitative data.",
    shareToken: "persona-research",
    questions: Array(15).fill({}),
    responseMode: "authenticated",
    status: "closed",
    expiresAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    totalResponses: 112,
    isDeleted: false,
    closedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    settings: {
      allowResponseEdit: false,
      showProgressBar: true,
      randomizeQuestions: false,
      randomizeOptions: false,
    },
    createdAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
  }
];

export function LandingDashboard() {
  const navigate = useNavigate();
  const { user: realUser } = useAuthStore();
  const [status, setStatus] = useState<PollFilters["status"]>("all");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"dashboard" | "history">("dashboard");

  const filteredPolls = useMemo(() => {
    return MOCK_POLLS.filter(poll => {
      const matchesStatus = status === "all" || poll.status === status;
      const matchesSearch = poll.title.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    }).slice(0, 6); // Keep it small
  }, [status, search]);

  const stats = useMemo(() => [
    { label: "Total Polls", value: 6, icon: BarChart3, color: "text-primary" },
    { label: "Total Responses", value: 25, icon: Users, color: "text-emerald-500" },
    { label: "Active Polls", value: 1, icon: TrendingUp, color: "text-amber-500" },
    { label: "Drafts", value: 0, icon: Clock, color: "text-muted-foreground" },
  ], []);

  const handleAction = () => {
    navigate("/auth/register");
  };

  return (
    <div className="w-full relative aspect-video max-h-[700px] overflow-hidden border border-border bg-background shadow-2xl group/dash">
      {/* Scaling Wrapper */}
      <div 
        className="absolute top-0 left-0 w-[150%] h-[150%] origin-top-left transition-all duration-700 ease-in-out"
        style={{ transform: "scale(0.6666)" }}
      >
        <div className="flex h-full w-full bg-background">
          {/* Sidebar */}
          <aside className="w-72 shrink-0 flex flex-col border-r border-border bg-card">
            <div className="flex items-center gap-3 border-b border-border px-6 h-20">
              <img src="/logo/logo1.png" alt="Logo" className="h-8 w-auto" />
              <span className="font-black tracking-tighter text-foreground uppercase text-xl">
                PollRange
              </span>
            </div>
            
            <nav className="flex-1 py-6 px-3 space-y-2">
              <button 
                onClick={() => setActiveTab("dashboard")}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 transition-colors relative",
                  activeTab === "dashboard" 
                    ? "bg-primary/10 text-primary border border-primary/20" 
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="h-5 w-5" />
                  <span className={cn("font-medium", activeTab === "dashboard" && "font-bold")}>Dashboard</span>
                </div>
                {activeTab === "dashboard" && (
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary" />
                )}
              </button>
              <button 
                onClick={() => setActiveTab("history")}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 transition-colors relative",
                  activeTab === "history" 
                    ? "bg-primary/10 text-primary border border-primary/20" 
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-3">
                  <History className="h-5 w-5" />
                  <span className={cn("font-medium", activeTab === "history" && "font-bold")}>History</span>
                </div>
                {activeTab === "history" && (
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary" />
                )}
              </button>
            </nav>

            <div className="border-t border-border p-5">
              <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted transition-colors">
                <div className="h-10 w-10 border border-border bg-muted flex items-center justify-center font-bold text-lg">
                  S
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">SatyaSootar</p>
                  <p className="text-xs text-muted-foreground truncate">satya.sootar06...</p>
                </div>
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
             {activeTab === "dashboard" ? (
               <DashboardView
                  user={{ name: "SatyaSootar", isEmailVerified: true } as any}
                  polls={filteredPolls}
                  isLoading={false}
                  stats={stats}
                  status={status}
                  setStatus={setStatus}
                  search={search}
                  setSearch={setSearch}
                  setPage={() => {}}
                  onCreatePoll={handleAction}
                  hideTopBar={false}
                  isCompact={true}
                  className="h-full overflow-hidden"
               />
             ) : (
               <HistoryView onAction={handleAction} />
             )}
          </main>
        </div>
      </div>

      {/* Decorative Overlay to prevent accidental clicks on scaled elements that might not align perfectly */}
      <div className="absolute inset-0 z-20 pointer-events-none border-[12px] border-background/5" />
    </div>
  );
}

function HistoryView({ onAction }: { onAction: () => void }) {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background/50">
      <div className="flex shrink-0 items-center border-b border-border h-20 px-8">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Poll History</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mb-8">
          <p className="text-muted-foreground text-lg">A record of all the polls you have participated in.</p>
        </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Card 1 */}
        <div className="bg-card border border-border p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="px-2 py-0.5 bg-muted border border-border text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Completed
            </span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              ABOUT 15 HOURS AGO
            </span>
          </div>
          <h3 className="text-xl font-bold mb-6 line-clamp-2">What matters most in life right now?</h3>
          <button 
            onClick={onAction}
            className="mt-auto w-full py-3 px-4 border border-border hover:bg-muted transition-colors flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-widest"
          >
            <ExternalLink className="h-4 w-4" />
            View Poll
          </button>
        </div>

        {/* Card 2 */}
        <div className="bg-card border border-border p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-xs font-bold text-primary uppercase tracking-wider">
              Results Published
            </span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              ABOUT 15 HOURS AGO
            </span>
          </div>
          <h3 className="text-xl font-bold mb-6 line-clamp-2">Daily life</h3>
          <div className="mt-auto grid grid-cols-2 gap-3">
            <button 
              onClick={onAction}
              className="py-3 px-4 border border-border hover:bg-muted transition-colors flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-widest"
            >
              <ExternalLink className="h-4 w-4" />
              View Poll
            </button>
            <button 
              onClick={onAction}
              className="py-3 px-4 bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-widest"
            >
              <BarChart3 className="h-4 w-4" />
              Results
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
