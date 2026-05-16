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
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Lock,
  Globe,
  ArrowLeft,
  Download,
  Camera,
  Copy,
  RotateCcw,
} from "lucide-react";
import { DashboardView } from "../dashboard/dashboard-view";
import { useAuthStore } from "@/store/use-auth-store";
import { cn, formatDate } from "@/lib/utils";
import type { Poll, PollFilters } from "@/types";
import { AnimatePresence, motion } from "framer-motion";

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
    title: "College Life",
    description: "Insights into the daily struggles and experiences of college students.",
    shareToken: "college-life",
    questions: Array(5).fill({}),
    responseMode: "authenticated",
    status: "active",
    expiresAt: new Date(Date.now() + 86400000 * 12).toISOString(),
    totalResponses: 10,
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

const MOCK_ANALYTICS: Record<string, any> = {
  "demo-1": {
    totalResponses: 1284,
    completionRate: 94,
    anonymous: 1284,
    authenticated: 0,
    questions: [
      {
        text: "Which technical area is most critical for Q2?",
        responses: 1284,
        topAnswer: "Performance",
        options: [
          { label: "Performance", count: 642, pct: 50 },
          { label: "Security", count: 385, pct: 30 },
          { label: "Accessibility", count: 128, pct: 10 },
          { label: "Documentation", count: 129, pct: 10 },
        ]
      },
      {
        text: "How would you rate the current roadmap?",
        responses: 1150,
        topAnswer: "Excellent",
        options: [
          { label: "Excellent", count: 800, pct: 70 },
          { label: "Good", count: 250, pct: 22 },
          { label: "Neutral", count: 100, pct: 8 },
        ]
      }
    ]
  },
  "demo-3": {
    totalResponses: 10,
    completionRate: 100,
    anonymous: 0,
    authenticated: 10,
    questions: [
      {
        text: "What's the hardest part of college life?",
        responses: 10,
        topAnswer: "Assignments",
        options: [
          { label: "Assignments", count: 9, pct: 90 },
          { label: "Attendance", count: 7, pct: 70 },
          { label: "Exams", count: 4, pct: 40 },
          { label: "Managing", count: 9, pct: 90 },
          { label: "sleep", count: 4, pct: 40 },
        ]
      },
      {
        text: "Which type of student are you?",
        responses: 10,
        topAnswer: "Front bencher",
        options: [
          { label: "Front bencher", count: 8, pct: 80 },
          { label: "Silent observer", count: 2, pct: 20 },
          { label: "Last bencher", count: 2, pct: 20 },
        ]
      }
    ]
  }
};

const DEFAULT_ANALYTICS = {
  totalResponses: 10,
  completionRate: 100,
  anonymous: 0,
  authenticated: 10,
  questions: [
    {
      text: "What's the hardest part of college life?",
      responses: 10,
      topAnswer: "Assignments",
      options: [
        { label: "Assignments", count: 5, pct: 50 },
        { label: "Attendance", count: 3, pct: 30 },
        { label: "Exams", count: 1, pct: 10 },
        { label: "Managing", count: 1, pct: 10 },
        { label: "sleep", count: 1, pct: 10 },
      ]
    },
    {
      text: "Which type of student are you?",
      responses: 10,
      topAnswer: "Front bencher",
      options: [
        { label: "Front bencher", count: 7, pct: 70 },
        { label: "Silent observer", count: 2, pct: 20 },
        { label: "Last bencher", count: 1, pct: 10 },
      ]
    }
  ]
};

export function LandingDashboard() {
  const navigate = useNavigate();
  const { user: realUser } = useAuthStore();
  const [status, setStatus] = useState<PollFilters["status"]>("all");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"dashboard" | "history" | "analytics">("dashboard");
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);

  const selectedPoll = useMemo(() => 
    MOCK_POLLS.find(p => p._id === selectedPollId) || MOCK_POLLS[0]
  , [selectedPollId]);

  const urlPath = useMemo(() => {
    if (activeTab === "dashboard") return "pollrange.com/dashboard";
    if (activeTab === "history") return "pollrange.com/history";
    if (activeTab === "analytics") return `pollrange.com/polls/${selectedPollId}/analytics`;
    return "pollrange.com";
  }, [activeTab, selectedPollId]);

  const filteredPolls = useMemo(() => {
    return MOCK_POLLS.filter(poll => {
      const matchesStatus = status === "all" || poll.status === status;
      const matchesSearch = poll.title.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    }).slice(0, 6);
  }, [status, search]);

  const stats = useMemo(() => [
    { label: "Total Polls", value: 6, icon: BarChart3, color: "text-primary" },
    { label: "Total Responses", value: 1284, icon: Users, color: "text-emerald-500" },
    { label: "Active Polls", value: 2, icon: TrendingUp, color: "text-amber-500" },
    { label: "Drafts", value: 1, icon: Clock, color: "text-muted-foreground" },
  ], []);

  const handlePollClick = (id: string) => {
    setSelectedPollId(id);
    setActiveTab("analytics");
  };

  const handleAction = () => {
    navigate("/auth/register");
  };

  return (
    <div className="w-full relative aspect-video max-h-[700px] overflow-hidden border border-border bg-background shadow-2xl group/dash flex flex-col">
      <div className="flex shrink-0 items-center gap-4 border-b border-border bg-muted/50 px-4 h-12 z-30">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/20" />
          <div className="w-3 h-3 rounded-full bg-amber-500/20" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/20" />
        </div>
        <div className="flex items-center gap-3 ml-2">
          <ChevronLeft className="h-4 w-4 text-muted-foreground/50" />
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          <RotateCw className="h-4 w-4 text-muted-foreground/50" />
        </div>
        <div className="flex-1 max-w-xl h-8 bg-background border border-border rounded-md flex items-center px-3 gap-2">
          {activeTab === "analytics" ? <Lock className="h-3 w-3 text-emerald-500" /> : <Globe className="h-3 w-3 text-muted-foreground" />}
          <span className="text-xs text-muted-foreground font-medium truncate">
            https://{urlPath}
          </span>
        </div>
        <div className="flex-1" />
      </div>

      <div className="flex-1 relative overflow-hidden">
        <div 
          className="absolute top-0 left-0 w-[150%] h-[150%] origin-top-left transition-all duration-700 ease-in-out"
          style={{ transform: "scale(0.6666)" }}
        >
          <div className="flex h-full w-full bg-background">
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
                    activeTab === "dashboard" || activeTab === "analytics"
                      ? "bg-primary/10 text-primary border border-primary/20" 
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="h-5 w-5" />
                    <span className={cn("font-medium", (activeTab === "dashboard" || activeTab === "analytics") && "font-bold")}>Dashboard</span>
                  </div>
                  {(activeTab === "dashboard" || activeTab === "analytics") && (
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
                    <p className="font-bold text-sm truncate">Satya</p>
                    <p className="text-xs text-muted-foreground truncate">satya.sootar06...</p>
                  </div>
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </aside>

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
               <AnimatePresence mode="wait">
                 {activeTab === "dashboard" && (
                   <motion.div 
                    key="dashboard"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="h-full"
                   >
                     <DashboardView
                        user={{ name: "Satya", isEmailVerified: true } as any}
                        polls={filteredPolls}
                        isLoading={false}
                        stats={stats}
                        status={status}
                        setStatus={setStatus}
                        search={search}
                        setSearch={setSearch}
                        setPage={() => {}}
                        onCreatePoll={handleAction}
                        onPollClick={handlePollClick}
                        hideTopBar={false}
                        isCompact={true}
                        className="h-full overflow-hidden"
                     />
                   </motion.div>
                 )}

                 {activeTab === "history" && (
                   <motion.div 
                    key="history"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="h-full"
                   >
                    <HistoryView onAction={handleAction} />
                   </motion.div>
                 )}

                 {activeTab === "analytics" && (
                   <motion.div 
                    key="analytics"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full"
                   >
                    <AnalyticsView 
                      poll={selectedPoll} 
                      onBack={() => setActiveTab("dashboard")} 
                      onAction={handleAction}
                    />
                   </motion.div>
                 )}
               </AnimatePresence>
            </main>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 z-20 pointer-events-none border-[12px] border-background/5" />
    </div>
  );
}

function AnalyticsView({ poll, onBack, onAction }: { poll: Poll, onBack: () => void, onAction: () => void }) {
  const analytics = MOCK_ANALYTICS[poll._id] || DEFAULT_ANALYTICS;
  
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background h-full overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-border h-20 px-8 bg-card">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-muted rounded-full transition-colors border border-border">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">{poll.title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Expires {formatDate(poll.expiresAt)}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={onAction} className="flex items-center gap-2 px-3 py-2 border border-border bg-card hover:bg-muted transition-colors font-bold text-[10px] uppercase tracking-widest">
            <Download className="h-4 w-4" /> EXPORT
          </button>
          <button onClick={onAction} className="flex items-center gap-2 px-3 py-2 border border-border bg-card hover:bg-muted transition-colors font-bold text-[10px] uppercase tracking-widest">
            <Camera className="h-4 w-4" /> SNAPSHOT
          </button>
          <button onClick={onAction} className="flex items-center gap-2 px-3 py-2 border border-border bg-card hover:bg-muted transition-colors font-bold text-[10px] uppercase tracking-widest">
            <Copy className="h-4 w-4" /> COPY LINK
          </button>
          <button onClick={onAction} className="p-2 border border-border bg-card hover:bg-muted transition-colors">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 bg-muted/20 custom-scrollbar">
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Responses", value: analytics.totalResponses, icon: Users, color: "text-primary" },
            { label: "Completion Rate", value: `${analytics.completionRate}%`, icon: Clock, color: "text-emerald-500" },
            { label: "Anonymous", value: analytics.anonymous, icon: Users, color: "text-amber-500" },
            { label: "Authenticated", value: analytics.authenticated, icon: TrendingUp, color: "text-primary" },
          ].map((stat, i) => (
            <div key={i} className="bg-card border border-border p-6 relative overflow-hidden">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">{stat.label}</span>
              <div className="flex items-end justify-between">
                <span className="text-4xl font-black tracking-tighter tabular-nums">{stat.value}</span>
                <stat.icon className={cn("h-5 w-5 opacity-40", stat.color)} />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {analytics.questions.map((q: any, i: number) => (
            <div key={i} className="bg-card border border-border p-8 relative">
              <div className="absolute top-8 right-8 bg-muted/50 border border-border px-3 py-1.5 flex flex-col items-center">
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">Top answer</span>
                <span className="text-[10px] font-black text-primary leading-tight">{q.topAnswer}</span>
              </div>
              <h3 className="text-lg font-bold mb-1 leading-tight">{q.text} <span className="text-red-500">*</span></h3>
              <p className="text-xs text-muted-foreground mb-8">{q.responses} responses • 0 skipped</p>
              
              <div className="space-y-4">
                {q.options.map((opt: any, idx: number) => (
                  <div key={idx} className="relative">
                    <div className="flex justify-between items-center mb-1.5 px-1">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{opt.label}</span>
                    </div>
                    <div className="h-6 bg-muted relative overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${opt.pct}%` }}
                        transition={{ duration: 1, delay: 0.2 + idx * 0.1 }}
                        className="h-full bg-primary/60"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
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
