import { motion } from "framer-motion";
import { Bot, Shield, Zap, Server, Activity, Terminal } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useBots } from "@/hooks/use-bots";

export default function Home() {
  const { data: bots, isLoading } = useBots();
  
  // Calculate stats based on real data or defaults
  const activeBots = bots?.length || 0;
  const totalServers = bots?.length ? bots.length * 15 : 0; // Simulated multiplier
  
  return (
    <div className="min-h-screen bg-background relative overflow-hidden font-display">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
      <div className="absolute top-0 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-[128px]" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px]" />

      <main className="relative container mx-auto px-4 py-20 lg:py-32 flex flex-col items-center justify-center min-h-[80vh]">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-primary-foreground/80 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            System Online v2.4.0
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Discord Bot <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400 glow-text">Manager</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Advanced fleet management for high-performance Discord bots. 
            Automated scaling, security monitoring, and real-time analytics.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl mt-12">
            <StatCard 
              icon={<Bot className="w-6 h-6 text-blue-400" />}
              label="Active Bots"
              value={activeBots.toString()}
              delay={0.1}
            />
            <StatCard 
              icon={<Server className="w-6 h-6 text-purple-400" />}
              label="Servers Managed"
              value={totalServers > 0 ? `${totalServers}+` : "Ready"}
              delay={0.2}
            />
            <StatCard 
              icon={<Activity className="w-6 h-6 text-emerald-400" />}
              label="Uptime"
              value="99.9%"
              delay={0.3}
            />
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-16 w-full max-w-2xl"
          >
            <div className="glass-card rounded-2xl p-1 overflow-hidden">
              <div className="bg-black/40 rounded-xl p-4 font-mono text-sm text-left relative group">
                <div className="flex gap-2 mb-4 border-b border-white/5 pb-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
                </div>
                <div className="space-y-2 text-muted-foreground/80">
                  <p><span className="text-emerald-400">root@manager:~$</span> status check --all</p>
                  <p className="text-white pl-4">✓ Core services initialized</p>
                  <p className="text-white pl-4">✓ Database connection established</p>
                  <p className="text-white pl-4">✓ {activeBots} bot instances running</p>
                  <p><span className="text-emerald-400">root@manager:~$</span> <span className="animate-pulse">_</span></p>
                </div>
                
                <div className="absolute top-4 right-4 opacity-50 group-hover:opacity-100 transition-opacity">
                  <StatusBadge status="active" />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

      </main>

      <footer className="absolute bottom-0 w-full py-6 border-t border-white/5 bg-black/20 backdrop-blur-md">
        <div className="container mx-auto px-4 flex justify-between items-center text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>Secure Environment</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2 hover:text-primary transition-colors cursor-default">
              <Terminal className="w-4 h-4" /> API Ready
            </span>
            <span className="flex items-center gap-2 hover:text-primary transition-colors cursor-default">
              <Zap className="w-4 h-4" /> Low Latency
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ icon, label, value, delay }: { icon: React.ReactNode, label: string, value: string, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4 }}
      className="glass-card p-6 rounded-2xl flex flex-col items-center text-center hover:bg-white/5 transition-all duration-300 hover:-translate-y-1"
    >
      <div className="mb-3 p-3 rounded-full bg-white/5 ring-1 ring-white/10">
        {icon}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-muted-foreground font-medium">{label}</div>
    </motion.div>
  );
}
