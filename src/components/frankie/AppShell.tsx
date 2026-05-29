import { useState } from "react";
import { Menu, Sparkles } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { AppTopbar } from "@/components/admin/app-topbar";
import { ThemeProvider } from "@/components/admin/theme-provider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export function AppShell({ children, topRight }: { children: React.ReactNode; topRight?: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <RequireAuth role="agent">
      <ThemeProvider>
        <div className="flex min-h-screen w-full">
          <Sidebar />
          <main className="min-w-0 flex-1 px-3 py-3 md:px-6 md:py-6">
            {/* Mobile topbar */}
            <div className="glass-strong sticky top-3 z-30 mb-4 flex h-14 items-center gap-3 rounded-2xl px-3 md:hidden">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <button className="grid h-9 w-9 place-items-center rounded-xl hover:bg-white/60" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <VisuallyHidden><SheetTitle>Navigation</SheetTitle></VisuallyHidden>
                  <Sidebar variant="mobile" onNavigate={() => setOpen(false)} />
                </SheetContent>
              </Sheet>
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#57b85c] to-[#3d9e42] text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="font-semibold tracking-tight">Frankie</span>
              </div>
            </div>

            <div className="hidden md:block">
              <AppTopbar />
            </div>
            {topRight && <div className="mb-4 flex flex-wrap items-center justify-end gap-2 md:mb-6">{topRight}</div>}
            {children}
          </main>
        </div>
      </ThemeProvider>
    </RequireAuth>
  );
}
