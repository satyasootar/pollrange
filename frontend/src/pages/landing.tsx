import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth/auth-modal";
import { useAuthStore } from "@/store/use-auth-store";
import { 
  LogOut, 
  User as UserIcon, 
  BarChart3, 
  PlusCircle, 
  Zap, 
  ShieldCheck, 
  Globe, 
  ArrowRight 
} from "lucide-react";

export function LandingPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user, clearAuth } = useAuthStore();

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-primary bg-primary/5 flex items-center justify-center rotate-3 hover:rotate-0 transition-transform cursor-pointer">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <span className="text-2xl font-bold tracking-tighter uppercase font-heading">PollRange</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-8 text-sm font-medium uppercase tracking-widest text-muted-foreground">
              <a href="#features" className="hover:text-primary transition-colors">Features</a>
              <a href="#analytics" className="hover:text-primary transition-colors">Analytics</a>
              <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
            </div>
            
            <div className="h-6 w-[1px] bg-border hidden md:block"></div>

            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm font-mono bg-muted px-3 py-1.5 border border-border">
                  <UserIcon className="w-4 h-4 text-primary" />
                  {user.name.split(' ')[0]}
                </div>
                <Button variant="ghost" size="sm" onClick={clearAuth} className="border border-transparent hover:border-border rounded-none uppercase font-mono text-xs">
                  <LogOut className="w-4 h-4 mr-2" />
                  Exit
                </Button>
              </div>
            ) : (
              <Button 
                onClick={() => setIsAuthModalOpen(true)}
                className="rounded-none border-2 border-primary bg-primary text-primary-foreground hover:bg-transparent hover:text-primary transition-all font-bold uppercase tracking-tighter px-6"
              >
                Get Started
              </Button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-6">
        {/* Hero Section */}
        <section className="pt-24 pb-16 border-x border-border min-h-[80vh] flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className="absolute top-10 left-10 opacity-10 select-none pointer-events-none">
            <span className="font-mono text-[10rem] font-bold">POLL</span>
          </div>
          <div className="absolute bottom-10 right-10 opacity-10 select-none pointer-events-none rotate-180">
            <span className="font-mono text-[10rem] font-bold uppercase">Range</span>
          </div>

          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-1 mb-8 font-mono text-xs uppercase tracking-widest animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Zap className="w-3 h-3 fill-current" />
            <span>Real-time polling engine v1.0</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 max-w-4xl leading-[0.9] font-heading uppercase italic">
            Capture the <span className="text-primary not-italic">Voice</span> <br /> of your Audience.
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed border-l-4 border-primary pl-6 py-2 text-left italic">
            Create high-fidelity polls with instant feedback. Built for creators who demand precision, speed, and beautiful data.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-lg">
            <Button 
              size="lg" 
              className="w-full sm:w-auto h-16 px-10 text-xl font-black rounded-none border-4 border-primary shadow-[8px_8px_0px_0px_rgba(99,102,241,0.2)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all uppercase italic"
              onClick={() => setIsAuthModalOpen(true)}
            >
              Start Building
              <ArrowRight className="ml-2 w-6 h-6" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full sm:w-auto h-16 px-10 text-xl font-bold rounded-none border-4 border-border hover:bg-muted transition-all uppercase"
            >
              Live Demo
            </Button>
          </div>
        </section>

        {/* Feature Box Grid */}
        <section id="features" className="border border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Real-time Pulse",
                label: "INSTANT",
                desc: "Powered by Socket.io for millisecond latency updates across all devices.",
                icon: Zap,
              },
              {
                title: "Encrypted Data",
                label: "SECURE",
                desc: "AES-256 encryption for private polls and anonymous participant shielding.",
                icon: ShieldCheck,
              },
              {
                title: "Global Reach",
                label: "DISTRIBUTED",
                desc: "Share via QR, Magic Links, or Social Embeds with automatic geo-tracking.",
                icon: Globe,
              },
              {
                title: "Deep Insights",
                label: "ANALYTICS",
                desc: "Question-level heatmaps, participation funnels, and trend forecasting.",
                icon: BarChart3,
              },
            ].map((f, i) => (
              <div key={i} className="group p-10 border-border border-b md:border-b-0 md:border-r last:border-r-0 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between mb-8">
                  <div className="p-3 bg-foreground text-background">
                    <f.icon className="w-6 h-6" />
                  </div>
                  <span className="font-mono text-xs font-bold text-primary tracking-tighter bg-primary/5 px-2 py-1 border border-primary/20">
                    {f.label}
                  </span>
                </div>
                <h3 className="text-2xl font-black mb-4 uppercase tracking-tighter">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Detailed Analytics Feature Section */}
        <section id="analytics" className="mt-24 mb-24 border-2 border-foreground bg-foreground text-background p-12 md:p-20 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-64 h-64 border-4 border-background/10 rounded-full"></div>
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="font-mono text-primary text-sm font-bold uppercase tracking-[0.3em] mb-6 block">Module: Dashboard_v2</span>
              <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter mb-8 leading-[0.9]">
                Beautiful Data <br /> at your fingertips.
              </h2>
              <div className="space-y-6">
                {[
                  "Automated participation insights and bounce rate tracking.",
                  "Question-wise summary with modal distribution curves.",
                  "Option counts with real-time percentage volatility.",
                  "Export directly to CSV, JSON, or high-res PDF."
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="mt-1.5 w-4 h-4 border-2 border-primary bg-primary flex-shrink-0"></div>
                    <p className="text-lg font-medium opacity-80">{item}</p>
                  </div>
                ))}
              </div>
              <Button className="mt-12 rounded-none bg-background text-foreground hover:bg-primary hover:text-primary-foreground transition-all px-8 py-6 text-lg font-black uppercase">
                Explore Analytics
              </Button>
            </div>
            <div className="border-8 border-background/20 p-4 bg-background/5 aspect-video flex items-center justify-center group">
              <div className="w-full h-full border border-background/20 bg-grid-dots p-8 flex flex-col justify-end">
                <div className="flex items-end gap-2 h-48">
                  {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                    <div 
                      key={i} 
                      className="flex-1 bg-primary border border-background/50 group-hover:bg-primary-foreground transition-all duration-500" 
                      style={{ height: `${h}%` }}
                    ></div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-background/20 font-mono text-[10px] flex justify-between uppercase opacity-50">
                  <span>Metric: participation_live</span>
                  <span>Status: Operational</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-20 bg-muted/30">
        <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 border-2 border-foreground flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <span className="text-xl font-bold uppercase tracking-tighter">PollRange</span>
            </div>
            <p className="text-muted-foreground max-w-sm font-medium leading-relaxed">
              The modern standard for audience feedback. Fast, reliable, and designed for the technical era.
            </p>
          </div>
          <div>
            <h4 className="font-mono text-xs font-black uppercase tracking-widest mb-6">Company</h4>
            <ul className="space-y-4 text-sm font-medium text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Manifesto</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-xs font-black uppercase tracking-widest mb-6">Legal</h4>
            <ul className="space-y-4 text-sm font-medium text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Security</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto px-6 mt-20 pt-10 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono uppercase tracking-widest text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} PollRange Inc.</span>
          <div className="flex gap-8">
            <a href="#" className="hover:text-primary transition-colors">Github</a>
            <a href="#" className="hover:text-primary transition-colors">Twitter</a>
          </div>
        </div>
      </footer>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </div>
  );
}
