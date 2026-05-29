import { motion } from "framer-motion";

export function FloatingBubbles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Ambient glows */}
      <div
        className="absolute -top-[10%] -left-[10%] h-[55%] w-[55%] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, oklch(0.82 0.14 155 / 0.55), transparent 70%)" }}
      />
      <div
        className="absolute -bottom-[10%] -right-[10%] h-[60%] w-[60%] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, oklch(0.82 0.10 200 / 0.5), transparent 70%)" }}
      />

      {/* Floating chat bubble — top left */}
      <motion.div
        initial={{ opacity: 0, y: 20, rotate: -3 }}
        animate={{ opacity: 0.85, y: [0, -10, 0], rotate: -3 }}
        transition={{ opacity: { duration: 0.8 }, y: { duration: 8, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute top-20 left-[6%] hidden w-64 rounded-2xl border border-white/50 bg-white/40 p-4 shadow-soft backdrop-blur-md lg:block"
      >
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
            <span className="h-2 w-2 rounded-full bg-primary" />
          </div>
          <div className="h-2 w-20 rounded-full bg-primary/30" />
        </div>
        <div className="space-y-2">
          <div className="h-2 w-full rounded-full bg-foreground/10" />
          <div className="h-2 w-3/4 rounded-full bg-foreground/10" />
        </div>
      </motion.div>

      {/* Resolved ticket card — bottom left */}
      <motion.div
        initial={{ opacity: 0, y: 20, rotate: 2 }}
        animate={{ opacity: 0.75, y: [0, 8, 0], rotate: 2 }}
        transition={{ opacity: { duration: 0.9, delay: 0.2 }, y: { duration: 10, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute bottom-28 left-[4%] hidden w-72 rounded-3xl border border-white/50 bg-white/35 p-5 shadow-soft backdrop-blur-lg lg:block"
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="rounded bg-primary/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
            Resolved
          </div>
          <div className="text-[10px] text-muted-foreground">2m ago</div>
        </div>
        <div className="mb-2 h-3 w-40 rounded-full bg-foreground/10" />
        <div className="h-3 w-24 rounded-full bg-foreground/10" />
      </motion.div>

      {/* Incoming customer message bubble — right */}
      <motion.div
        initial={{ opacity: 0, x: 20, rotate: 3 }}
        animate={{ opacity: 0.8, x: 0, rotate: 3, y: [0, -8, 0] }}
        transition={{ opacity: { duration: 0.9, delay: 0.3 }, x: { duration: 0.9, delay: 0.3 }, y: { duration: 9, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute right-[6%] top-[22%] hidden w-60 rounded-2xl rounded-tr-sm border border-white/50 bg-white/40 p-4 shadow-soft backdrop-blur-md lg:block"
      >
        <div className="mb-2 flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-primary/25" />
          <div className="h-2 w-16 rounded-full bg-foreground/15" />
          <span className="ml-auto text-[9px] font-medium uppercase tracking-wider text-primary">New</span>
        </div>
        <div className="space-y-2">
          <div className="h-2 w-full rounded-full bg-foreground/10" />
          <div className="h-2 w-2/3 rounded-full bg-foreground/10" />
        </div>
        <div className="mt-3 flex items-center gap-1">
          <motion.span className="h-1.5 w-1.5 rounded-full bg-primary" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity }} />
          <motion.span className="h-1.5 w-1.5 rounded-full bg-primary" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.15 }} />
          <motion.span className="h-1.5 w-1.5 rounded-full bg-primary" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.3 }} />
        </div>
      </motion.div>


      {/* Agent online pill — bottom right */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 0.9, y: [0, -6, 0] }}
        transition={{ opacity: { duration: 0.9, delay: 0.4 }, y: { duration: 7, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute bottom-20 right-[12%] hidden items-center gap-3 rounded-full border border-white/60 bg-white/50 p-3 pr-5 shadow-soft backdrop-blur-md lg:flex"
      >
        <div className="relative">
          <div className="h-10 w-10 rounded-full border-2 border-white bg-muted" />
          <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
        </div>
        <div>
          <div className="mb-1 h-2 w-16 rounded-full bg-foreground/20" />
          <div className="h-1.5 w-24 rounded-full bg-foreground/10" />
        </div>
      </motion.div>
    </div>
  );
}
