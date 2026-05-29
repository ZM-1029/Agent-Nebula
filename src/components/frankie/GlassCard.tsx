import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";

type GlassCardProps = HTMLMotionProps<"div"> & { soft?: boolean };

export function GlassCard({ className, soft, children, ...rest }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        soft ? "glass-soft" : "glass",
        "rounded-3xl",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
