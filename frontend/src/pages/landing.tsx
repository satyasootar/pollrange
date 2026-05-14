import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/use-auth-store";
import { 
  Zap, 
  ShieldCheck, 
  Globe, 
  BarChart3, 
  ArrowRight,
  Menu,
  LogOut,
  User as UserIcon
} from "lucide-react";
import { motion } from "framer-motion";
import ColorBends from "@/components/ui/ColorBends";

export function LandingPage() {
  const { user, clearAuth } = useAuthStore();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <div className="min-h-screen font-sans relative">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-border backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              className="w-10 h-10 border-2 border-foreground flex items-center justify-center bg-foreground text-background"
            >
              <BarChart3 className="w-5 h-5" />
            </motion.div>
            <span className="text-2xl font-black uppercase tracking-tighter">PollRange</span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-10 font-bold uppercase text-xs tracking-widest">
              <a href="#features" className="hover:text-primary transition-colors">Features</a>
              <a href="#analytics" className="hover:text-primary transition-colors">Insights</a>
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
                <>
                  <Link to="/auth/login" className="hover:text-primary transition-colors">Sign In</Link>
                  <Link to="/auth/register">
                    <Button className="rounded-none px-6 border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all uppercase italic font-black">
                      Join Now
                    </Button>
                  </Link>
                </>
              )}
            </div>

            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-6">
        {/* Hero Section */}
        <section className="py-10 md:py-32 flex flex-col items-center text-center relative group overflow-hidden z-0">
          {/* ColorBends Background */}
          <div className="absolute inset-0 -z-20 opacity-40">
            <ColorBends
              colors={["#6366f1", "#a855f7", "#ec4899"]}
              rotation={90}
              speed={0.15}
              scale={1.2}
              frequency={1}
              warpStrength={1.2}
              mouseInfluence={0.5}
              noise={0.1}
              parallax={0.2}
              iterations={2}
              intensity={1.2}
              bandWidth={4}
              transparent
            />
          </div>

          {/* Static Dotted Background */}
          <div className="absolute inset-0 bg-grid-dots -z-10 [mask-image:radial-gradient(ellipse_at_center,black,transparent)] opacity-20"></div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-1 mb-8 font-mono text-xs uppercase tracking-widest"
          >
            <Zap className="w-3 h-3 fill-current" />
            <span>Real-time polling for everyone</span>
          </motion.div>
          
          <motion.h1 
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-6xl md:text-8xl font-black tracking-tighter mb-8 max-w-4xl leading-[0.9] font-heading uppercase italic"
          >
            Capture the <span className="text-primary not-italic">Voice</span> <br /> of your Audience.
          </motion.h1>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-lg"
          >
            <Link to="/auth/register" className="w-full sm:w-auto">
              <Button 
                size="lg" 
                className="w-full sm:w-auto h-16 px-10 text-xl font-black rounded-none border-4 border-primary shadow-[8px_8px_0px_0px_rgba(99,102,241,0.2)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all uppercase italic"
              >
                Get Started
                <ArrowRight className="ml-2 w-6 h-6" />
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full sm:w-auto h-16 px-10 text-xl font-bold rounded-none border-4 border-border hover:bg-muted transition-all uppercase"
            >
              Learn More
            </Button>
          </motion.div>
        </section>

        {/* Feature Box Grid */}
        <motion.section 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          id="features" 
          className="border-2 border-foreground bg-background relative"
        >
          {/* Subtle dotted border accent */}
          <div className="absolute inset-0 border-[12px] border-dotted-custom opacity-20 pointer-events-none"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 relative z-10">
            {[
              {
                title: "Instant Updates",
                label: "REAL-TIME",
                desc: "Experience live feedback with updates that happen the moment someone votes.",
                icon: Zap,
              },
              {
                title: "Private & Secure",
                label: "PROTECTED",
                desc: "Your data is protected with industry-standard security and anonymous participation.",
                icon: ShieldCheck,
              },
              {
                title: "Share Anywhere",
                label: "GLOBAL",
                desc: "Share your polls via link, QR code, or embed them directly onto your website.",
                icon: Globe,
              },
              {
                title: "Deep Analytics",
                label: "INSIGHTS",
                desc: "Understand your audience with detailed results and trend tracking.",
                icon: BarChart3,
              },
            ].map((f, i) => (
              <motion.div 
                key={i} 
                variants={itemVariants}
                className="group p-10 border-border border-b md:border-b-0 md:border-r last:border-r-0 hover:bg-muted/50 transition-colors relative"
              >
                {/* Dotted Border Overlay for group hover */}
                <div className="absolute inset-0 border-4 border-dotted-custom border-primary/20 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300"></div>
                
                <div className="flex items-center justify-between mb-8">
                  <div className="p-3 bg-foreground text-background transition-transform group-hover:scale-110 group-hover:rotate-6">
                    <f.icon className="w-6 h-6" />
                  </div>
                  <span className="font-mono text-xs font-bold text-primary tracking-tighter bg-primary/5 px-2 py-1 border border-primary/20">
                    {f.label}
                  </span>
                </div>
                <h3 className="text-2xl font-black mb-4 uppercase tracking-tighter group-hover:text-primary transition-colors">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed font-medium">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Detailed Analytics Feature Section */}
        <motion.section 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          id="analytics" 
          className="mt-24 mb-24 border-4 border-foreground bg-foreground text-background p-12 md:p-20 relative overflow-hidden group z-0"
        >
          {/* Animated Background Dotted Pattern */}
          <div className="absolute inset-0 opacity-10 bg-grid-dots"></div>
          
          {/* Dotted Border Accent */}
          <div className="absolute inset-0 border-[16px] border-dotted-custom opacity-10 pointer-events-none"></div>
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="font-mono text-primary text-sm font-bold uppercase tracking-[0.3em] mb-6 block">Visual Dashboard</span>
              <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter mb-8 leading-[0.9]">
                Beautiful Data <br /> at your fingertips.
              </h2>
              <div className="space-y-6">
                {[
                  "Clear participation stats and bounce rate tracking.",
                  "Question-wise summary with easy-to-read charts.",
                  "Option counts with live percentage updates.",
                  "Export your data to CSV or high-res PDF."
                ].map((item, idx) => (
                  <motion.div 
                    key={idx} 
                    initial={{ x: -20, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-start gap-4"
                  >
                    <div className="mt-1.5 w-4 h-4 border-2 border-primary bg-primary flex-shrink-0"></div>
                    <p className="text-lg font-medium opacity-80">{item}</p>
                  </motion.div>
                ))}
              </div>
              <Button className="mt-12 rounded-none bg-background text-foreground hover:bg-primary hover:text-primary-foreground transition-all px-8 py-6 text-lg font-black uppercase border-4 border-background hover:border-primary">
                Explore Features
              </Button>
            </div>
            
            <motion.div 
              initial={{ rotate: 2, opacity: 0 }}
              whileInView={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="border-8 border-background/20 p-4 bg-background/5 aspect-video flex items-center justify-center group relative"
            >
              <div className="absolute inset-0 border-2 border-dotted-custom border-background/30 m-2 pointer-events-none"></div>
              <div className="w-full h-full border border-background/20 bg-grid-dots p-8 flex flex-col justify-end">
                <div className="flex items-end gap-2 h-48">
                  {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className="flex-1 bg-primary border border-background/50 group-hover:bg-primary-foreground transition-all duration-500" 
                    ></motion.div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-background/20 font-mono text-[10px] flex justify-between uppercase opacity-50">
                  <span>Live participation</span>
                  <span>Operational</span>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>
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
              The modern standard for audience feedback. Fast, reliable, and designed for everyone.
            </p>
          </div>
          
          <div>
            <h4 className="font-black uppercase text-xs tracking-widest mb-6">Product</h4>
            <ul className="space-y-4 font-bold text-sm text-muted-foreground uppercase">
              <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Templates</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Enterprise</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black uppercase text-xs tracking-widest mb-6">Company</h4>
            <ul className="space-y-4 font-bold text-sm text-muted-foreground uppercase">
              <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms</a></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-[1400px] mx-auto px-6 mt-20 pt-10 border-t border-border flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            © 2024 PollRange System / All Rights Reserved
          </p>
          <div className="flex items-center gap-6 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              System Live
            </span>
            <span>Version 1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
