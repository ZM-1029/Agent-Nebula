import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { GlassCard } from "@/components/admin/glass-card";
import { Button } from "@/components/ui/button";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Download, FileText, Calendar, Users, CheckCircle2, XCircle, PackageSearch, FileQuestion } from "lucide-react";
import { toast } from "sonner";
import { api, type DashboardStats, type HourlyData } from "@/services/api";
import { cn } from "@/lib/utils";
import { datesInRange, daysBetween, MAX_RANGE_DAYS } from "@/lib/date-range";

// Sum the per-day KPI counts that drive the summary cards.
function sumStats(list: DashboardStats[]) {
  return list.reduce(
    (acc, s) => ({
      totalRequests: acc.totalRequests + (s.totalRequests ?? 0),
      trackLookups: acc.trackLookups + (s.trackLookups ?? 0),
      ordersFound: acc.ordersFound + (s.ordersFound ?? 0),
      confirmations: acc.confirmations + (s.confirmations ?? 0),
      declines: acc.declines + (s.declines ?? 0),
      instructions: acc.instructions + (s.instructions ?? 0),
    }),
    { totalRequests: 0, trackLookups: 0, ordersFound: 0, confirmations: 0, declines: 0, instructions: 0 },
  );
}

// Merge per-day hourly buckets into a single 0–23 profile for the range.
function sumHourly(lists: HourlyData[][]): HourlyData[] {
  const map = new Map<number, HourlyData>();
  for (const list of lists) {
    for (const h of list) {
      const e = map.get(h.hour) ?? { hour: h.hour, label: h.label, requests: 0, tracks: 0, avgMs: 0 };
      e.requests += h.requests;
      e.tracks += h.tracks;
      map.set(h.hour, e);
    }
  }
  return [...map.values()].sort((a, b) => a.hour - b.hour);
}

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Frankie" },
      { name: "description", content: "Customer interaction trends, delivery outcomes and daily activity." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const today = new Date().toISOString().split("T")[0];

  const { data: availableDates = [] } = useQuery({
    queryKey: ["available-dates"],
    queryFn: () => api.getAvailableDates(),
    retry: 1,
  });

  // Default the range to the most recent day with data (falls back to today),
  // so the page loads with the same figures it showed before ranges existed.
  const mostRecent = availableDates[0] ?? today;
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const activeFrom = (fromDate || mostRecent) <= (toDate || mostRecent) ? (fromDate || mostRecent) : (toDate || mostRecent);
  const activeTo = (fromDate || mostRecent) <= (toDate || mostRecent) ? (toDate || mostRecent) : (fromDate || mostRecent);
  const isRange = activeFrom !== activeTo;
  const rangeLabel = isRange ? `${activeFrom} → ${activeTo}` : activeFrom;

  // Days in the range that actually have data — capped to keep the fan-out sane.
  const dataDays = new Set([...availableDates, today]);
  const rangeDates = datesInRange(activeFrom, activeTo)
    .filter((d) => dataDays.has(d))
    .slice(0, MAX_RANGE_DAYS);
  const rangeTooBig = daysBetween(activeFrom, activeTo) + 1 > MAX_RANGE_DAYS;

  // History covers enough days to reach the start of the range (clamped), then
  // we slice it to the selected window for the chart and table.
  const historyDays = Math.min(Math.max(daysBetween(activeFrom, today) + 1, 14), 90);
  const { data: allHistory = [] } = useQuery({
    queryKey: ["analytics-history", historyDays],
    queryFn: () => api.getHistory(historyDays),
    retry: 1,
  });
  const history = allHistory.filter((d) => d.date >= activeFrom && d.date <= activeTo);

  const hourlyQueries = useQueries({
    queries: rangeDates.map((d) => ({
      queryKey: ["analytics-hourly", d],
      queryFn: () => api.getHourly(d),
      retry: 1,
    })),
  });
  const hourly = sumHourly(hourlyQueries.map((q) => q.data ?? []));

  const statsQueries = useQueries({
    queries: rangeDates.map((d) => ({
      queryKey: ["analytics-stats", d],
      queryFn: () => api.getStats(d),
      retry: 1,
    })),
  });
  const stats = sumStats(statsQueries.map((q) => q.data).filter(Boolean) as DashboardStats[]);

  function exportCSV() {
    const headers = ["Date", "Interactions", "Orders Tracked", "Confirmed", "Declined", "OTP Sent", "Success Rate"];
    const rows = history.map((d) => [
      d.date, d.totalRequests, d.trackLookups, d.confirmations, d.declines, d.otpSent, d.successRate + "%",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = isRange ? `analytics_${activeFrom}_to_${activeTo}.csv` : `analytics_${activeFrom}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  }

  function exportPDF() {
    window.print();
  }

  // 14-day trend for area chart
  const trendData = history.map((d) => ({
    day: d.label,
    "Interactions": d.totalRequests,
    "Confirmed": d.confirmations,
    "Declined": d.declines,
  }));

  // Interactions by hour (business-friendly — shows peak activity times)
  const hourlyActivity = hourly
    .filter((h) => h.requests > 0)
    .map((h) => ({
      hour: h.label.replace(":00", ""),
      interactions: h.requests,
      tracked: h.tracks,
    }));

  // Business KPIs for the selected range (summed across each day).
  const totalInteractions = stats.totalRequests;
  const ordersFound = stats.ordersFound;
  const foundRate = stats.trackLookups ? Math.round((ordersFound / stats.trackLookups) * 100) : 0;
  const confirmed = stats.confirmations;
  const declined = stats.declines;
  const descriptionRequests = stats.instructions;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Customer interaction trends and delivery outcomes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-1.5 text-sm shadow-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={activeFrom}
              max={activeTo}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-sm outline-none"
              aria-label="From date"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={activeTo}
              min={activeFrom}
              max={today}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-sm outline-none"
              aria-label="To date"
            />
          </div>
          {rangeTooBig && (
            <span className="text-xs text-amber-600">capped to {MAX_RANGE_DAYS} days</span>
          )}
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <FileText className="mr-1.5 h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      </div>

      {/* Business KPI cards for selected date */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <GlassCard className="flex items-center gap-4 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Total Interactions</p>
            <p className="text-2xl font-semibold tracking-tight">{totalInteractions.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">{rangeLabel}</p>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
            <PackageSearch className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Order Found Rate</p>
            <p className="text-2xl font-semibold tracking-tight">{foundRate}%</p>
            <p className="text-[11px] text-muted-foreground">{ordersFound} of {stats.trackLookups} tracked</p>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Deliveries Confirmed</p>
            <p className="text-2xl font-semibold tracking-tight">{confirmed.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">Accepted by customer</p>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
            <XCircle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Deliveries Declined</p>
            <p className="text-2xl font-semibold tracking-tight">{declined.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">Refused by customer</p>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
            <FileQuestion className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Instruction Requests</p>
            <p className="text-2xl font-semibold tracking-tight">{descriptionRequests.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">Delivery instructions asked</p>
          </div>
        </GlassCard>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 14-day engagement trend */}
        <GlassCard>
          <p className="text-sm font-semibold">Customer engagement</p>
          <p className="text-[11px] text-muted-foreground">Daily interactions, confirmed and declined deliveries ({isRange ? "selected range" : "single day"})</p>
          <ResponsiveContainer width="100%" height={220} className="mt-2">
            <AreaChart data={trendData} margin={{ left: -20 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
              <Area dataKey="Interactions" stroke="var(--primary)"     strokeWidth={2.5} fill="url(#g1)" />
              <Area dataKey="Confirmed"    stroke="var(--accent-blue)" strokeWidth={2}   fill="url(#g2)" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Peak interaction hours */}
        <GlassCard>
          <p className="text-sm font-semibold">Peak interaction hours</p>
          <p className="text-[11px] text-muted-foreground">When customers are most active — {rangeLabel}</p>
          {hourlyActivity.length > 0 ? (
            <ResponsiveContainer width="100%" height={220} className="mt-2">
              <BarChart data={hourlyActivity} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="hour" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Bar dataKey="interactions" name="Interactions" radius={[6, 6, 0, 0]} fill="var(--primary)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              No data for {rangeLabel}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Daily activity summary for the selected range */}
      {history.length > 0 && (
        <GlassCard>
          <p className="text-sm font-semibold">Daily activity summary</p>
          <p className="text-[11px] text-muted-foreground mb-3">{rangeLabel} — interactions, order lookups and delivery outcomes</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-[11px] uppercase text-muted-foreground">
                  <th className="p-2 font-medium">Date</th>
                  <th className="p-2 font-medium text-right">Interactions</th>
                  <th className="p-2 font-medium text-right">Orders Tracked</th>
                  <th className="p-2 font-medium text-right text-emerald-600">Confirmed</th>
                  <th className="p-2 font-medium text-right text-red-500">Declined</th>
                  <th className="p-2 font-medium text-right">Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((d) => (
                  <tr key={d.date} className={cn("border-b border-border/40 hover:bg-accent/30 transition", !isRange && d.date === activeFrom && "bg-primary/5")}>
                    <td className="p-2 text-xs font-medium">
                      {d.label}
                      {!isRange && d.date === activeFrom && <span className="ml-2 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">selected</span>}
                    </td>
                    <td className="p-2 text-right font-semibold">{d.totalRequests.toLocaleString()}</td>
                    <td className="p-2 text-right text-blue-500">{d.trackLookups.toLocaleString()}</td>
                    <td className="p-2 text-right text-emerald-600 dark:text-emerald-400 font-medium">{d.confirmations.toLocaleString()}</td>
                    <td className="p-2 text-right text-red-500 font-medium">{d.declines.toLocaleString()}</td>
                    <td className="p-2 text-right">
                      <span className={cn("font-semibold", d.successRate >= 90 ? "text-emerald-600 dark:text-emerald-400" : d.successRate >= 70 ? "text-amber-500" : "text-red-500")}>
                        {d.successRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
