import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { GlassCard } from "@/components/admin/glass-card";
import { OrderDetailModal } from "@/components/admin/order-detail-modal";
import { api, LogEntry } from "@/services/api";
import { Download, Search, Calendar, ChevronUp, ChevronDown, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/records")({
  head: () => ({
    meta: [
      { title: "Records — Frankie Admin" },
      { name: "description", content: "Customer interaction log — all delivery enquiries per day." },
    ],
  }),
  component: RecordsPage,
});

type SortKey = keyof Pick<LogEntry, "date" | "time" | "endpoint" | "reference" | "postcode">;

// Human-friendly action labels for business users
function actionLabel(ep: string): string {
  const map: Record<string, string> = {
    "track":        "Track Order",
    "confirm":      "Confirm Delivery",
    "decline":      "Decline Delivery",
    "instructions": "Get Instructions",
    "note":         "Leave Note",
    "send-otp":     "Identity Verify",
    "verify-otp":   "Identity Verify",
  };
  return map[ep] ?? ep;
}

function actionColor(ep: string): string {
  if (ep === "confirm")      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (ep === "decline")      return "bg-red-500/10 text-red-700 dark:text-red-400";
  if (ep === "track")        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
  if (ep === "instructions") return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
  if (ep === "note")         return "bg-muted text-muted-foreground";
  return "bg-primary/10 text-primary";
}

function resultLabel(entry: LogEntry): { text: string; cls: string } {
  if (entry.dataFound === true)  return { text: "Found",     cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" };
  if (entry.dataFound === false) return { text: "Not Found", cls: "bg-red-500/15 text-red-700 dark:text-red-400" };
  if (entry.endpoint === "confirm") return { text: "Confirmed", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" };
  if (entry.endpoint === "decline") return { text: "Declined",  cls: "bg-red-500/15 text-red-700 dark:text-red-400" };
  if (entry.isSuccess) return { text: "OK",    cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" };
  return                      { text: "Failed", cls: "bg-red-500/15 text-red-600 dark:text-red-400" };
}

function rowTone(entry: LogEntry): string {
  if (entry.endpoint === "confirm" || entry.dataFound === true)  return "hover:bg-emerald-500/5";
  if (entry.endpoint === "decline" || entry.dataFound === false) return "hover:bg-red-500/5";
  return "hover:bg-accent/40";
}

function RecordsPage() {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("time");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [activeRow, setActiveRow] = useState<LogEntry | null>(null);

  const { data: availableDates } = useQuery({
    queryKey: ["available-dates"],
    queryFn: () => api.getAvailableDates(),
    retry: 1,
  });

  const { data: logs, isLoading } = useQuery({
    queryKey: ["records-logs", selectedDate],
    queryFn: () => api.getLogs(selectedDate, 500),
    retry: 1,
    refetchInterval: 30_000,
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const filtered = (logs ?? [])
    .filter((l) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        l.reference?.toLowerCase().includes(q) ||
        l.postcode?.toLowerCase().includes(q) ||
        actionLabel(l.endpoint).toLowerCase().includes(q) ||
        false
      );
    })
    .sort((a, b) => {
      const av: string = String((a as any)[sortKey] ?? "");
      const bv: string = String((b as any)[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  function exportCsv() {
    const rows = [
      ["#", "Date", "Time", "Action", "Reference / Order No.", "Postcode", "Result"],
      ...filtered.map((l, i) => [
        i + 1,
        l.date,
        l.time,
        actionLabel(l.endpoint),
        l.reference ?? "",
        l.postcode ?? "",
        resultLabel(l).text,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `records-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="ml-1 opacity-30"><ChevronUp className="inline h-3 w-3 -mb-0.5" /></span>;
    return sortDir === "asc"
      ? <ChevronUp className="inline ml-1 h-3 w-3 text-primary" />
      : <ChevronDown className="inline ml-1 h-3 w-3 text-primary" />;
  }

  const th = (label: string, col?: SortKey, extraCls?: string) => (
    <th
      className={cn("p-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground whitespace-nowrap", col && "cursor-pointer select-none hover:text-foreground", extraCls)}
      onClick={col ? () => toggleSort(col) : undefined}
    >
      {label}{col && <SortIcon col={col} />}
    </th>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Records</h1>
          <p className="text-sm text-muted-foreground">All customer interactions — delivery enquiries, confirmations and declines.</p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-background/60 px-3 py-1.5 text-sm font-medium shadow-sm transition hover:bg-accent"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <GlassCard className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-1.5">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-sm outline-none"
          >
            <option value={today}>{today} (today)</option>
            {(availableDates ?? [])
              .filter((d) => d !== today)
              .map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
          </select>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-1.5 flex-1 min-w-[200px]">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference, postcode, action…"
            className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
          />
        </div>
        <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </span>
      </GlassCard>

      {/* Table */}
      <GlassCard className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="border-b border-border/60 bg-muted/30">
              <tr>
                {th("#", undefined, "w-8")}
                {th("Date", "date", "w-28")}
                {th("Time", "time", "w-20")}
                {th("Action", "endpoint", "w-36")}
                <th
                  className="p-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground cursor-pointer select-none hover:text-foreground w-36"
                  onClick={() => toggleSort("reference")}
                >
                  Reference / Order No. <SortIcon col="reference" />
                </th>
                {th("Postcode", "postcode", "w-24")}
                {th("Result", undefined, "w-24")}
                {th("Details", undefined, "w-16 text-center")}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">No records for {selectedDate}</td></tr>
              ) : (
                filtered.map((l, i) => {
                  const { text: resText, cls: resCls } = resultLabel(l);
                  return (
                    <tr key={i} className={cn("border-b border-border/30 transition", rowTone(l))}>
                      <td className="p-2 text-[11px] text-muted-foreground w-8">{i + 1}</td>
                      <td className="p-2 text-xs whitespace-nowrap w-28">{l.date}</td>
                      <td className="p-2 text-xs font-mono whitespace-nowrap w-20">{l.time}</td>
                      <td className="p-2 w-36">
                        <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", actionColor(l.endpoint))}>
                          {actionLabel(l.endpoint)}
                        </span>
                      </td>
                      <td className="p-2 text-xs font-mono w-36 max-w-[144px]">
                        <span className="block truncate" title={l.reference ?? ""}>
                          {l.reference ?? <span className="text-muted-foreground">—</span>}
                        </span>
                      </td>
                      <td className="p-2 text-xs whitespace-nowrap w-24">
                        {l.postcode ?? <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="p-2 w-24">
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", resCls)}>
                          {resText}
                        </span>
                      </td>
                      <td className="p-2 w-16 text-center">
                        {l.reference && l.postcode && (
                          <button
                            onClick={() => setActiveRow(l)}
                            className="inline-flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                            title="View order details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {activeRow && (
        <OrderDetailModal
          entry={activeRow}
          onClose={() => setActiveRow(null)}
        />
      )}
    </div>
  );
}
