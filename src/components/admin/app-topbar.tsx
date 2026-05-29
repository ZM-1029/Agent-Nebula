import { Bell, Moon, Search, Sun, Monitor, ChevronDown, Menu } from "lucide-react";
import { useTheme } from "./theme-provider";
import { notifications } from "@/lib/admin-mock/data";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export function AppTopbar({ onOpenMobileNav }: { onOpenMobileNav?: () => void }) {
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();
  return (
    <header className="glass-strong sticky top-3 z-20 mb-5 flex h-14 items-center gap-2 rounded-2xl px-2 md:gap-3 md:px-4">
      {onOpenMobileNav && (
        <button
          onClick={onOpenMobileNav}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition hover:bg-accent hover:text-foreground md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
      <div className="relative flex min-w-0 flex-1 items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search…"
          className="h-10 w-full rounded-xl border border-transparent bg-background/40 pl-9 pr-3 text-sm outline-none transition focus:border-primary/40 focus:bg-background/70"
        />
      </div>



      <Popover>
        <PopoverTrigger asChild>
          <button className="relative rounded-xl p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 glass-strong border-0 p-0">
          <div className="border-b border-border/60 px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">{notifications.length} new updates</p>
          </div>
          <div className="max-h-80 space-y-1 overflow-y-auto p-2">
            {notifications.map((n) => (
              <div key={n.id} className="rounded-xl p-2.5 transition hover:bg-accent/60">
                <div className="flex items-start gap-2.5">
                  <span className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    n.tone === "warning" && "bg-warning",
                    n.tone === "destructive" && "bg-destructive",
                    n.tone === "primary" && "bg-primary",
                    n.tone === "blue" && "bg-accent-blue",
                  )} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{n.title}</p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{n.ts}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{n.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-xl p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground">
            {theme === "dark" ? <Moon className="h-5 w-5" /> : theme === "light" ? <Sun className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass-strong border-0">
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setTheme("light")}><Sun className="mr-2 h-4 w-4" />Light</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}><Moon className="mr-2 h-4 w-4" />Dark</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}><Monitor className="mr-2 h-4 w-4" />System</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-xl p-1 pr-3 transition hover:bg-accent">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary text-xs font-semibold text-primary-foreground">JD</span>
            <span className="hidden text-left sm:block">
              <span className="block text-xs font-semibold leading-tight">John Doe</span>
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass-strong border-0">
          <DropdownMenuItem onClick={() => signOut()}>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
