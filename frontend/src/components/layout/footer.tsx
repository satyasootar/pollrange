import { BarChart3 } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/10">
      <div className="max-w-[1400px] mx-auto px-12 py-20 grid grid-cols-2 md:grid-cols-5 gap-12">
        <div className="col-span-2">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-foreground text-background flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <span className="text-lg font-black uppercase tracking-tighter">PollRange</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            The modern standard for audience feedback. Fast, real-time, and built for everyone.
          </p>
        </div>

        {[
          {
            title: "Product",
            links: ["Features", "Templates", "Analytics", "Enterprise"],
          },
          {
            title: "Company",
            links: ["About", "Blog", "Careers", "Press"],
          },
          {
            title: "Legal",
            links: ["Privacy", "Terms", "Security", "DMCA"],
          },
        ].map((col) => (
          <div key={col.title}>
            <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground mb-5">{col.title}</h4>
            <ul className="space-y-3">
              {col.links.map((l) => (
                <li key={l}>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="max-w-[1400px] mx-auto px-12 py-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          © 2025 PollRange — All Rights Reserved
        </p>
        <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          All Systems Operational
        </div>
      </div>
    </footer>
  );
}
