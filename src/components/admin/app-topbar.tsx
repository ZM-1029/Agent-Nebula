import { Bell, Moon, Search, Sun, Monitor, ChevronDown, Menu, Loader2 } from "lucide-react";
import { useTheme } from "./theme-provider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsService } from "@/services/notificationsService";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

// Map a backend notification "type" string to a visual tone dot.
function toneForType(type: string): "warning" | "destructive" | "primary" | "blue" {
  const t = type.toLowerCase();
  if (t.includes("offline") || t.includes("error") || t.includes("breach")) return "destructive";
  if (t.includes("transfer") || t.includes("escalat")) return "warning";
  if (t.includes("newchat") || t.includes("new_chat") || t.includes("assign")) return "primary";
  return "blue";
}

function friendlyTitle(type: string): string {
  const map: Record<string, string> = {
    NewChat: "New Chat",
    ChatTransferred: "Chat Transferred",
    AgentOffline: "Agent Offline",
    AgentOnline: "Agent Online",
    SLABreach: "SLA Breach",
  };
  return map[type] ?? type.replace(/([A-Z])/g, " $1").trim();
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppTopbar({ onOpenMobileNav }: { onOpenMobileNav?: () => void }) {
  const { theme, setTheme } = useTheme();
  const { signOut, user } = useAuth();
  const qc = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsService.getAll,
    refetchInterval: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllMutation = useMutation({
    mutationFn: notificationsService.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

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
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 glass-strong border-0 p-0">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Notifications</p>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="text-[11px] font-medium text-primary hover:underline disabled:opacity-50"
              >
                {markAllMutation.isPending ? "Marking…" : "Mark all read"}
              </button>
            )}
          </div>
          <div className="max-h-80 space-y-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : (notifications?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1 py-8 text-xs text-muted-foreground">
                <Bell className="mb-1 h-5 w-5 opacity-40" />
                You're all caught up.
              </div>
            ) : (
              notifications!.map((n) => {
                const tone = toneForType(n.type);
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) markReadMutation.mutate(n.id);
                    }}
                    disabled={n.isRead || markReadMutation.isPending}
                    className={cn(
                      "w-full rounded-xl p-2.5 text-left transition hover:bg-accent/60",
                      !n.isRead && "bg-primary/[0.04]",
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          n.isRead && "bg-muted-foreground/30",
                          !n.isRead && tone === "warning" && "bg-warning",
                          !n.isRead && tone === "destructive" && "bg-destructive",
                          !n.isRead && tone === "primary" && "bg-primary",
                          !n.isRead && tone === "blue" && "bg-accent-blue",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={cn(
                              "truncate text-sm font-medium",
                              n.isRead && "font-normal text-muted-foreground",
                            )}
                          >
                            {friendlyTitle(n.type)}
                          </p>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{n.message}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-xl p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground">
            {theme === "dark" ? (
              <Moon className="h-5 w-5" />
            ) : theme === "light" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Monitor className="h-5 w-5" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass-strong border-0">
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setTheme("light")}>
            <Sun className="mr-2 h-4 w-4" />
            Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            <Moon className="mr-2 h-4 w-4" />
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            <Monitor className="mr-2 h-4 w-4" />
            System
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-xl p-1 pr-3 transition hover:bg-accent">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary text-xs font-semibold text-primary-foreground">
              {initials(user?.displayName)}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-xs font-semibold leading-tight">
                {user?.displayName ?? "Account"}
              </span>
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
