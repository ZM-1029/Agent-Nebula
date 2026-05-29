import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  strong?: boolean;
  glow?: boolean;
  interactive?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, strong, glow, interactive, children, ...rest }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={interactive ? { y: -3 } : undefined}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className={cn(
          "rounded-2xl p-5",
          strong ? "glass-strong" : "glass",
          glow && "glow-primary",
          interactive && "cursor-pointer",
          className,
        )}
        {...rest}
      >
        {children}
      </motion.div>
    );
  },
);
GlassCard.displayName = "GlassCard";
