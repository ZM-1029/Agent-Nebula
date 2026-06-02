import { createFileRoute, Link } from "@tanstack/react-router";
import { GlassCard } from "@/components/admin/glass-card";
import { ArrowLeft, UserX } from "lucide-react";

export const Route = createFileRoute("/admin/customers/$customerId")({
  head: ({ params }) => ({ meta: [{ title: `Customer ${params.customerId} — Helix` }] }),
  component: CustomerDetail,
});

function CustomerDetail() {
  const { customerId } = Route.useParams();

  return (
    <div className="space-y-4">
      <Link
        to="/admin/customers"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> All customers
      </Link>

      <GlassCard>
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-muted-foreground">
          <UserX className="h-7 w-7 opacity-40" />
          <p className="font-medium">Customer not found</p>
          <p className="text-xs">
            No record for <span className="font-mono">{customerId}</span>. Customer detail will
            appear here once the backend customer API is available.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
