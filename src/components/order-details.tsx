import type { ReactNode } from "react";
import {
  Hash,
  ShoppingBag,
  Store,
  User,
  MapPin,
  CalendarClock,
  Activity,
  Mail,
  Phone,
  Boxes,
} from "lucide-react";
import type { OrderSnapshot } from "@/services/liveChatService";
import { cn } from "@/lib/utils";

const STEPS = [
  { k: "received", l: "Received" },
  { k: "scheduled", l: "Scheduled" },
  { k: "routed", l: "En Route" },
  { k: "confirmed", l: "Confirmed" },
  { k: "delivered", l: "Delivered" },
] as const;

/** Treat the order API's placeholder strings ("NULL", "N/A", "TBC", "") as empty. */
function clean(v?: string | null): string {
  const s = (v ?? "").trim();
  if (!s || ["null", "n/a", "tbc", "undefined"].includes(s.toLowerCase())) return "";
  return s;
}

function formatDelivery(o: OrderSnapshot): string {
  const date = clean(o.planned_date);
  const start = clean(o.planned_slot?.start);
  const end = clean(o.planned_slot?.end);
  const slot = start ? `${start}${end ? `–${end}` : ""}` : "";
  return [date, slot].filter(Boolean).join(" · ");
}

function Row({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="break-words text-xs font-medium">{clean(value) || "—"}</p>
      </div>
    </div>
  );
}

/**
 * Renders the order snapshot captured when a live chat started. Shared by the
 * admin Live Chats right panel and the agent profile pane. Pass `fallbackReference`
 * so we can still show the consignment when no verified order was attached.
 */
export function OrderDetails({
  order,
  fallbackReference,
}: {
  order: OrderSnapshot | null;
  fallbackReference?: string;
}) {
  if (!order) {
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Consignment</span>
          <span className="font-medium">{fallbackReference || "—"}</span>
        </div>
        <p className="pt-1 text-[10px] text-muted-foreground">
          No verified order was attached to this chat.
        </p>
      </div>
    );
  }

  const stage = STEPS.reduce(
    (acc, s, i) => (order.order_steps?.[s.k] === "Yes" ? i : acc),
    -1,
  );
  const services = [order.services?.service_level, order.services?.delivery_point].filter(
    (s): s is string => !!s && s !== "N/A",
  );
  const products = (order.products ?? []).filter((p) => p.part || p.description);
  const delivery = formatDelivery(order);

  return (
    <div className="space-y-2.5">
      <Row icon={<Hash className="h-3.5 w-3.5" />} label="Consignment" value={order.reference} />
      <Row
        icon={<ShoppingBag className="h-3.5 w-3.5" />}
        label="Order No."
        value={order.order_number}
      />
      <Row icon={<Store className="h-3.5 w-3.5" />} label="Retailer" value={order.retailer} />
      <Row icon={<User className="h-3.5 w-3.5" />} label="Recipient" value={order.recipient} />
      <Row
        icon={<MapPin className="h-3.5 w-3.5" />}
        label="Address"
        value={[clean(order.address), clean(order.postcode)].filter(Boolean).join(", ")}
      />

      {products.length > 0 && (
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 text-muted-foreground">
            <Boxes className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Items</p>
            {products.map((p, i) => (
              <p key={i} className="break-words text-xs font-medium">
                {[p.part, p.description].filter(Boolean).join(" · ")}
              </p>
            ))}
          </div>
        </div>
      )}

      <Row
        icon={<CalendarClock className="h-3.5 w-3.5" />}
        label="Delivery"
        value={delivery || "To be confirmed"}
      />
      <Row icon={<Activity className="h-3.5 w-3.5" />} label="Order status" value={order.status} />

      {services.length > 0 && (
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Services</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {services.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <Row icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={order.email} />
      <Row icon={<Phone className="h-3.5 w-3.5" />} label="Mobile" value={order.mobile} />

      {order.order_steps && (
        <div className="pt-1">
          <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">Tracking</p>
          <div className="flex items-start justify-between">
            {STEPS.map((s, i) => {
              const done = i <= stage && stage >= 0;
              const current = i === stage;
              return (
                <div key={s.k} className="flex flex-1 flex-col items-center text-center">
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full border text-[8px] font-bold",
                      done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30 bg-background text-transparent",
                      current && "ring-2 ring-primary/25",
                    )}
                  >
                    {done ? "✓" : ""}
                  </span>
                  <span
                    className={cn(
                      "mt-1 text-[8px] leading-tight",
                      done ? "font-semibold text-primary" : "text-muted-foreground",
                    )}
                  >
                    {s.l}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
