import { GlassCard } from "./glass-card";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  suffix?: string;
  delta?: number; // percent
  icon: LucideIcon;
  tone?: "primary" | "blue" | "amber" | "violet" | "rose";
  format?: (n: number) => string;
}

const toneMap = {
  primary: "from-primary/20 to-primary/5 text-primary",
  blue: "from-accent-blue/25 to-accent-blue/5 text-accent-blue",
  amber: "from-accent-amber/25 to-accent-amber/5 text-accent-amber",
  violet: "from-accent-violet/25 to-accent-violet/5 text-accent-violet",
  rose: "from-accent-rose/25 to-accent-rose/5 text-accent-rose",
};

function Counter({ to, format }: { to: number; format?: (n: number) => string }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => (format ? format(v) : Math.round(v).toLocaleString()));
  const [display, setDisplay] = useState(format ? format(0) : "0");
  useEffect(() => {
    const controls = animate(mv, to, { duration: 1.1, ease: "easeOut" });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [to]);
  return <>{display}</>;
}

export function StatCard({ label, value, suffix, delta, icon: Icon, tone = "primary", format }: StatCardProps) {
  const up = (delta ?? 0) >= 0;
  return (
    <GlassCard interactive className="relative overflow-hidden">
      <div className={cn("absolute -right-6 -top-6 h-28 w-28 rounded-full bg-gradient-to-br blur-2xl opacity-60", toneMap[tone])} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">
            {typeof value === "number" ? <Counter to={value} format={format} /> : value}
            {suffix && <span className="ml-1 text-base font-normal text-muted-foreground">{suffix}</span>}
          </p>
          {delta !== undefined && (
            <div className={cn("mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", up ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
              {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(delta)}%
            </div>
          )}
        </div>
        <motion.div whileHover={{ rotate: 8, scale: 1.05 }} className={cn("flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br shadow-soft", toneMap[tone])}>
          <Icon className="h-5 w-5" />
        </motion.div>
      </div>
    </GlassCard>
  );
}
