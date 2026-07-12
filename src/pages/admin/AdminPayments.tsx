import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { DollarSign, Clock } from "lucide-react";

const transactions = [
  { id: "PAY-001", client: "Emily Watson", photographer: "Rivera Studio", date: "Mar 15, 2026", amount: 8000, status: "paid" as const },
  { id: "PAY-002", client: "Lisa Park", photographer: "Rivera Studio", date: "Mar 10, 2026", amount: 1500, status: "paid" as const },
  { id: "PAY-003", client: "David Kim", photographer: "Anya Petrova", date: "Mar 28, 2026", amount: 3500, status: "pending" as const },
  { id: "PAY-004", client: "Sarah Chen", photographer: "Leo Chang", date: "Apr 5, 2026", amount: 5000, status: "pending" as const },
  { id: "PAY-005", client: "Mark Johnson", photographer: "Sofia Mendez", date: "Feb 22, 2026", amount: 4000, status: "paid" as const },
];

export default function AdminPayments() {
  const totalRevenue = transactions.reduce((s, t) => s + t.amount, 0);
  const pendingAmount = transactions.filter(t => t.status === "pending").reduce((s, t) => s + t.amount, 0);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-up">
        <h1 className="text-2xl font-heading font-bold">Payments Overview</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card rounded-xl card-shadow border border-border/50 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-heading font-bold">₱{totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl card-shadow border border-border/50 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Payments</p>
                <p className="text-xl font-heading font-bold">₱{pendingAmount.toLocaleString()}</p>
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
                  <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Photographer</th>
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
                    <td className="px-6 py-4 text-sm hidden md:table-cell">{t.photographer}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden sm:table-cell">{t.date}</td>
                    <td className="px-6 py-4 text-sm font-semibold">₱{t.amount.toLocaleString()}</td>
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
