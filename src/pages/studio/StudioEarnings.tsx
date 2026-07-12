import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { DollarSign, TrendingUp, Clock, ArrowUpRight } from "lucide-react";

const transactions = [
  { id: "PAY-001", client: "Emily Watson", event: "Wedding", date: "Mar 15, 2026", amount: 650, status: "paid" as const },
  { id: "PAY-002", client: "Lisa Park", event: "Portrait", date: "Mar 10, 2026", amount: 200, status: "paid" as const },
  { id: "PAY-003", client: "David Kim", event: "Engagement", date: "Mar 28, 2026", amount: 400, status: "pending" as const },
  { id: "PAY-004", client: "Sarah Chen", event: "Corporate", date: "Apr 5, 2026", amount: 650, status: "pending" as const },
  { id: "PAY-005", client: "Mark Johnson", event: "Event", date: "Feb 22, 2026", amount: 450, status: "paid" as const },
];

export default function StudioEarnings() {
  const totalEarned = transactions.filter(t => t.status === "paid").reduce((s, t) => s + t.amount, 0);
  const pending = transactions.filter(t => t.status === "pending").reduce((s, t) => s + t.amount, 0);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-up">
        <h1 className="text-2xl font-heading font-bold">Earnings</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl card-shadow border border-border/50 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-xl font-heading font-bold">${totalEarned.toLocaleString()}</p>
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
                <p className="text-xl font-heading font-bold">${pending.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl card-shadow border border-border/50 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-xl font-heading font-bold flex items-center gap-1">
                  $1,300 <ArrowUpRight className="w-4 h-4 text-success" />
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Event</th>
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Date</th>
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium">{t.id}</td>
                    <td className="px-6 py-4 text-sm">{t.client}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">{t.event}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden sm:table-cell">{t.date}</td>
                    <td className="px-6 py-4 text-sm font-semibold">${t.amount}</td>
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
