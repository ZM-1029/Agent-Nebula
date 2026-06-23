import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { GlassCard } from "@/components/admin/glass-card";
import { OrderDetailModal } from "@/components/admin/order-detail-modal";
import { api, LogEntry } from "@/services/api";
import { Download, Search, Calendar, ChevronUp, ChevronDown, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { datesInRange, daysBetween, MAX_RANGE_DAYS } from "@/lib/date-range";

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
  const [fromDate, setFromDate] = useState<string>(today);
  const [toDate, setToDate] = useState<string>(today);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [activeRow, setActiveRow] = useState<LogEntry | null>(null);

  const { data: availableDates } = useQuery({
    queryKey: ["available-dates"],
    queryFn: () => api.getAvailableDates(),
    retry: 1,
  });

  // Normalise the range and only fetch days that actually have data (so a wide
  // range doesn't fire dozens of empty requests). Today is always allowed.
  const activeFrom = fromDate <= toDate ? fromDate : toDate;
  const activeTo = fromDate <= toDate ? toDate : fromDate;
  const dataDays = new Set([...(availableDates ?? []), today]);
  const rangeDates = datesInRange(activeFrom, activeTo)
    .filter((d) => dataDays.has(d))
    .slice(0, MAX_RANGE_DAYS);
  const rangeTooBig = daysBetween(activeFrom, activeTo) + 1 > MAX_RANGE_DAYS;

  const logQueries = useQueries({
    queries: rangeDates.map((d) => ({
      queryKey: ["records-logs", d],
      queryFn: () => api.getLogs(d, 500),
      retry: 1,
      refetchInterval: 30_000,
    })),
  });

  const isLoading = logQueries.some((q) => q.isLoading);
  const logs: LogEntry[] = logQueries.flatMap((q) => q.data ?? []);
  const rangeLabel = activeFrom === activeTo ? activeFrom : `${activeFrom} → ${activeTo}`;

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
      const primary = sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      // When sorting by date across a multi-day range, break ties by time so
      // each day's rows stay in chronological order.
      if (primary === 0 && sortKey === "date") {
        return sortDir === "asc" ? a.time.localeCompare(b.time) : b.time.localeCompare(a.time);
      }
      return primary;
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
    a.download =
      activeFrom === activeTo
        ? `records_${activeFrom}.csv`
        : `records_${activeFrom}_to_${activeTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`CSV downloaded (${filtered.length} records)`);
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
          <input
            type="date"
            value={fromDate}
            max={toDate || today}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-transparent text-sm outline-none"
            aria-label="From date"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={toDate}
            min={fromDate}
            max={today}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-transparent text-sm outline-none"
            aria-label="To date"
          />
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
          {rangeTooBig && (
            <span className="ml-2 text-amber-600">· range capped to {MAX_RANGE_DAYS} days</span>
          )}
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
                <tr><td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">No records for {rangeLabel}</td></tr>
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
