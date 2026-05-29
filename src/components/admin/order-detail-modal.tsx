import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LogEntry, OrderDetail } from "@/services/api";
import { cn } from "@/lib/utils";
import { User, MapPin, Calendar, Clock, Package, Building2, Phone, Tag } from "lucide-react";

interface Props {
  entry: LogEntry;
  onClose: () => void;
}

// Format "2025/02/20" → "20 Feb 2025"
function fmtDate(raw: string): string {
  if (!raw || raw === "N/A") return raw;
  const d = new Date(raw.replace(/\//g, "-"));
  return isNaN(d.getTime()) ? raw : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const lower = (status ?? "").toLowerCase();
  const cls = lower.includes("deliver") ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            : lower.includes("cancel")  ? "bg-red-500/15 text-red-700 dark:text-red-400"
            : lower.includes("on hold") ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
            : "bg-blue-500/15 text-blue-600 dark:text-blue-400";
  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", cls)}>
      {status}
    </span>
  );
}

const STEPS: { key: keyof OrderDetail["orderSteps"]; label: string }[] = [
  { key: "received",  label: "Received"  },
  { key: "scheduled", label: "Scheduled" },
  { key: "routed",    label: "En Route"  },
  { key: "confirmed", label: "Confirmed" },
  { key: "delivered", label: "Delivered" },
];

function StepTracker({ steps }: { steps: OrderDetail["orderSteps"] }) {
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => {
        const done    = steps[s.key] === "Yes";
        const isFinal = i === STEPS.length - 1;
        return (
          <div key={s.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className={cn(
                "h-5 w-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold",
                done ? "border-emerald-500 bg-emerald-500 text-white" : "border-border bg-background text-muted-foreground"
              )}>
                {done ? "✓" : i + 1}
              </div>
              <span className={cn("text-[9px] font-medium whitespace-nowrap", done ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                {s.label}
              </span>
            </div>
            {!isFinal && (
              <div className={cn("flex-1 h-0.5 mx-1 mb-3.5", steps[STEPS[i + 1].key] === "Yes" || done ? "bg-emerald-500" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value || value === "N/A") return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
        <p className="text-xs font-medium">{value}</p>
      </div>
    </div>
  );
}

// Build an OrderDetail from a log entry's snapshot fields (no API needed)
function snapshotToDetail(entry: LogEntry): OrderDetail | null {
  if (!entry.recipient && !entry.senderCompany && !entry.deliveryStatus) return null;
  return {
    carrierReference:     entry.reference ?? "",
    orderNumber:          entry.orderNumber ?? "",
    recipient:            entry.recipient ?? "",
    senderCompany:        entry.senderCompany ?? "",
    address:              entry.address ?? "",
    postcode:             entry.postcode ?? "",
    contactMobile:        "",
    contactHome:          "",
    email:                "",
    plannedDate:          entry.plannedDate ?? "",
    plannedSlotStart:     entry.plannedSlotStart ?? "",
    plannedSlotEnd:       entry.plannedSlotEnd ?? "",
    status:               entry.deliveryStatus ?? "",
    confirmed:            "",
    deliveryInstructions: "",
    orderSteps: { released: "", received: "", scheduled: "", routed: "", confirmed: "", delivered: "" },
    products:             (entry.productDescriptions ?? []).map(d => ({ description: d, part: "" })),
    serviceLevel:         entry.serviceLevel ?? "",
    deliveryPoint:        entry.deliveryPoint ?? "",
  };
}

function OrderContent({ order }: { order: OrderDetail }) {
  const hasSteps = Object.values(order.orderSteps).some(v => v === "Yes" || v === "No");
  return (
    <>
      {/* Status */}
      {order.status && order.status !== "N/A" && (
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={order.status} />
          {order.senderCompany && order.senderCompany !== "N/A" && (
            <span className="text-xs text-muted-foreground">
              from <span className="font-medium text-foreground">{order.senderCompany}</span>
            </span>
          )}
        </div>
      )}

      {/* Progress steps (only if live API data) */}
      {hasSteps && <StepTracker steps={order.orderSteps} />}

      {/* Key details */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <InfoRow icon={User}      label="Recipient"   value={order.recipient} />
        <InfoRow icon={Building2} label="Retailer"    value={order.senderCompany} />
        <InfoRow icon={MapPin}    label="Address"     value={order.address} />
        <InfoRow icon={Tag}       label="Order No."   value={order.orderNumber} />
        <InfoRow icon={Calendar}  label="Planned"     value={fmtDate(order.plannedDate)} />
        <InfoRow icon={Clock}     label="Time Slot"
          value={order.plannedSlotStart && order.plannedSlotStart !== "N/A"
            ? `${order.plannedSlotStart} – ${order.plannedSlotEnd}` : undefined} />
        {order.contactMobile && order.contactMobile !== "N/A" && (
          <InfoRow icon={Phone} label="Mobile" value={order.contactMobile} />
        )}
      </div>

      {/* Service tags */}
      {(order.serviceLevel !== "N/A" || order.deliveryPoint !== "N/A") && (
        <div className="flex flex-wrap gap-2">
          {order.serviceLevel && order.serviceLevel !== "N/A" && (
            <span className="rounded-md bg-primary/10 text-primary text-[11px] font-medium px-2 py-0.5">
              {order.serviceLevel}
            </span>
          )}
          {order.deliveryPoint && order.deliveryPoint !== "N/A" && (
            <span className="rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-medium px-2 py-0.5">
              {order.deliveryPoint}
            </span>
          )}
        </div>
      )}

      {/* Products */}
      {order.products.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Items ({order.products.length})
          </p>
          <div className="space-y-1">
            {order.products.map((p, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                {p.part && p.part !== "N/A" && (
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0">{p.part}</span>
                )}
                <span className="text-xs">{p.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery instructions */}
      {order.deliveryInstructions && order.deliveryInstructions !== "N/A" && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
          <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">
            Delivery Instructions
          </p>
          <p className="text-xs text-foreground">{order.deliveryInstructions}</p>
        </div>
      )}
    </>
  );
}

export function OrderDetailModal({ entry, onClose }: Props) {
  const order = snapshotToDetail(entry);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-primary" />
            Order Details
            {entry.reference && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground font-normal">
                {entry.reference}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
          {order ? (
            <OrderContent order={order} />
          ) : (
            <div className="py-12 text-center space-y-1">
              <p className="text-sm font-medium text-muted-foreground">No order details available</p>
              <p className="text-xs text-muted-foreground">
                Details are only captured for recently tracked orders.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
