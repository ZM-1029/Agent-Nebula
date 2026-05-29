import { motion } from "framer-motion";
import { Shield, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/hooks/use-auth";

export function RoleToggle({
  value,
  onChange,
}: {
  value: AppRole;
  onChange: (r: AppRole) => void;
}) {
  return (
    <div className="relative grid grid-cols-2 rounded-2xl border border-border/60 bg-background/40 p-1 backdrop-blur-sm">
      {(["admin", "agent"] as const).map((r) => {
        const active = value === r;
        const Icon = r === "admin" ? Shield : Headphones;
        return (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            className={cn(
              "relative z-10 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
              active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="role-toggle-active"
                className="absolute inset-0 -z-10 rounded-xl gradient-primary shadow-soft"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <Icon className="h-4 w-4" />
            {r === "admin" ? "Admin" : "Agent"}
          </button>
        );
      })}
    </div>
  );
}
