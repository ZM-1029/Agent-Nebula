import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { GlassCard } from "@/components/admin/glass-card";
import { Button } from "@/components/ui/button";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Download, FileText, Calendar, Users, CheckCircle2, XCircle, PackageSearch, FileQuestion } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Frankie" },
      { name: "description", content: "Customer interaction trends, delivery outcomes and daily activity." },
    ],
  }),
  component: AnalyticsPage,
});

const AUTO = "auto";

function AnalyticsPage() {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(AUTO);

  const { data: availableDates = [] } = useQuery({
    queryKey: ["available-dates"],
    queryFn: () => api.getAvailableDates(),
    retry: 1,
  });

  const activeDate = selectedDate === AUTO ? (availableDates[0] ?? today) : selectedDate;

  const { data: history = [] } = useQuery({
    queryKey: ["analytics-history"],
    queryFn: () => api.getHistory(14),
    retry: 1,
  });

  const { data: hourly = [] } = useQuery({
    queryKey: ["analytics-hourly", activeDate],
    queryFn: () => api.getHourly(activeDate),
    retry: 1,
    enabled: !!activeDate,
  });

  const { data: stats } = useQuery({
    queryKey: ["analytics-stats", activeDate],
    queryFn: () => api.getStats(activeDate),
    retry: 1,
    enabled: !!activeDate,
  });

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
    a.download = `analytics-${activeDate}.csv`;
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

  // Business KPIs for selected date
  const totalInteractions = stats?.totalRequests ?? 0;
  const trackLookups = stats?.trackLookups ?? 1; // avoid div by zero
  const ordersFound = stats?.ordersFound ?? 0;
  const foundRate = stats?.trackLookups ? Math.round((ordersFound / stats.trackLookups) * 100) : 0;
  const confirmed = stats?.confirmations ?? 0;
  const declined = stats?.declines ?? 0;
  const descriptionRequests = stats?.instructions ?? 0;

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
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm outline-none"
            >
              <option value={AUTO}>Most recent ({availableDates[0] ?? today})</option>
              {availableDates.map((d) => (
                <option key={d} value={d}>{d}{d === today ? " (today)" : ""}</option>
              ))}
            </select>
          </div>
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
            <p className="text-[11px] text-muted-foreground">{activeDate}</p>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
            <PackageSearch className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Order Found Rate</p>
            <p className="text-2xl font-semibold tracking-tight">{foundRate}%</p>
            <p className="text-[11px] text-muted-foreground">{ordersFound} of {stats?.trackLookups ?? 0} tracked</p>
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
          <p className="text-[11px] text-muted-foreground">Daily interactions, confirmed and declined deliveries (14 days)</p>
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
          <p className="text-[11px] text-muted-foreground">When customers are most active — {activeDate}</p>
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
              No data for {activeDate}
            </div>
          )}
        </GlassCard>
      </div>

      {/* 14-day daily activity summary */}
      {history.length > 0 && (
        <GlassCard>
          <p className="text-sm font-semibold">Daily activity summary</p>
          <p className="text-[11px] text-muted-foreground mb-3">Last 14 days — interactions, order lookups and delivery outcomes</p>
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
                  <tr key={d.date} className={cn("border-b border-border/40 hover:bg-accent/30 transition", d.date === activeDate && "bg-primary/5")}>
                    <td className="p-2 text-xs font-medium">
                      {d.label}
                      {d.date === activeDate && <span className="ml-2 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">selected</span>}
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
