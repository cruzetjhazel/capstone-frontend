import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { DollarSign, TrendingUp, Clock } from "lucide-react";

const transactions = [
  { id: "INV-001", photographer: "Marcus Rivera", event: "Wedding Photography", date: "Mar 15, 2026", amount: 650, method: "Credit Card", status: "paid" as const },
  { id: "INV-002", photographer: "Anya Petrova", event: "Portrait Session", date: "Mar 22, 2026", amount: 200, method: "PayPal", status: "paid" as const },
  { id: "INV-003", photographer: "Leo Chang", event: "Corporate Event", date: "Mar 28, 2026", amount: 400, method: "Credit Card", status: "pending" as const },
  { id: "INV-004", photographer: "Sofia Mendez", event: "Engagement Shoot", date: "Apr 3, 2026", amount: 350, method: "Bank Transfer", status: "pending" as const },
  { id: "INV-005", photographer: "James Okafor", event: "Product Shoot", date: "Feb 10, 2026", amount: 300, method: "Credit Card", status: "paid" as const },
  { id: "INV-006", photographer: "Isla Nakamura", event: "Lifestyle Session", date: "Feb 18, 2026", amount: 280, method: "PayPal", status: "paid" as const },
];

const totalPaid = transactions.filter((t) => t.status === "paid").reduce((s, t) => s + t.amount, 0);
const totalPending = transactions.filter((t) => t.status === "pending").reduce((s, t) => s + t.amount, 0);

export default function Payments() {
  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-up">
        <h1 className="text-2xl font-heading font-bold">Payments</h1>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl card-shadow border border-border/50 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-xl font-heading font-bold">${totalPaid.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl card-shadow border border-border/50 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-heading font-bold">${totalPending.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl card-shadow border border-border/50 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-xl font-heading font-bold">{transactions.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Photographer</th>
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Event</th>
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Date</th>
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Method</th>
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium">{t.id}</td>
                    <td className="px-6 py-4 text-sm">{t.photographer}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">{t.event}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden sm:table-cell">{t.date}</td>
                    <td className="px-6 py-4 text-sm font-semibold">${t.amount}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden lg:table-cell">{t.method}</td>
                    <td className="px-6 py-4"><StatusBadge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
