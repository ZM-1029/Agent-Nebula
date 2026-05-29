import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { AppTopbar } from "@/components/admin/app-topbar";
import { ThemeProvider } from "@/components/admin/theme-provider";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();
  const paddingLeft = isMobile ? 12 : collapsed ? 100 : 276;

  return (
    <RequireAuth role="admin">
      <ThemeProvider>
        <div className="min-h-screen">
          <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

          {/* Mobile drawer */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="left" className="w-72 p-0">
              <VisuallyHidden><SheetTitle>Admin navigation</SheetTitle></VisuallyHidden>
              <AppSidebar collapsed={false} onToggle={() => {}} variant="mobile" onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <motion.div
            animate={{ paddingLeft }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="min-w-0 px-3 pt-3 pb-6 md:pr-3"
          >
            <AppTopbar onOpenMobileNav={() => setMobileOpen(true)} />
            <AnimatePresence mode="wait">
              <motion.main
                key={pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="min-w-0"
              >
                <Outlet />
              </motion.main>
            </AnimatePresence>
          </motion.div>
        </div>
      </ThemeProvider>
    </RequireAuth>
  );
}
