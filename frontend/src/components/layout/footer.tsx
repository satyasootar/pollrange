import { Link } from "react-router-dom";

const FOOTER_COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Blog", to: "/blog" },
      { label: "Careers", to: "/careers" },
      { label: "Press", to: "/press" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
      { label: "Security", to: "/security" },
      { label: "DMCA", to: "/dmca" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/10">
      <div className="max-w-350 mx-auto px-12 py-20 grid grid-cols-2 md:grid-cols-4 gap-12">
        <div className="col-span-2">
          <div className="flex items-center gap-3 mb-5">
            <img src="/logo/logo1.png" alt="Kollects Logo" className="h-8 w-auto object-contain" />
            <span className="text-lg font-black uppercase tracking-tighter">Kollects</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            A simple way to get feedback from your audience. Fast, live, and built for everyone.
          </p>
        </div>

        {FOOTER_COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground mb-5">{col.title}</h4>
            <ul className="space-y-3">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="max-w-350 mx-auto px-12 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            © 2026 Kollects. All Rights Reserved.
          </p>
          <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            All Systems Operational
          </div>
        </div>
      </div>
    </footer>
  );
}
