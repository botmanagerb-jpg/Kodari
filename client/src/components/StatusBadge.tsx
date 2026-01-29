import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "active" | "offline" | "maintenance";
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles = {
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10",
    offline: "bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/10",
    maintenance: "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/10",
  };

  const labels = {
    active: "Operational",
    offline: "Offline",
    maintenance: "Maintenance",
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border shadow-lg backdrop-blur-md",
      styles[status],
      className
    )}>
      <span className="relative flex h-2 w-2">
        <span className={cn(
          "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
          status === "active" ? "bg-emerald-400" : 
          status === "offline" ? "bg-red-400" : "bg-amber-400"
        )}></span>
        <span className={cn(
          "relative inline-flex rounded-full h-2 w-2",
          status === "active" ? "bg-emerald-500" : 
          status === "offline" ? "bg-red-500" : "bg-amber-500"
        )}></span>
      </span>
      {labels[status]}
    </div>
  );
}
