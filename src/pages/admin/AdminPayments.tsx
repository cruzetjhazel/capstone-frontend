import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { 
  DollarSign, Clock, Search, Filter, 
  Eye, RefreshCw, X, AlertTriangle, 
  CheckCircle2, CreditCard, FileText, Check
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

// --- MOCK DATA ALIGNED WITH SYSTEM REQUIREMENTS ---
type PaymentStatus = "Pending" | "Partially Paid" | "Fully Paid" | "Failed" | "Cancelled";
type PaymentPlan = "Full Payment" | "Half Payment";

interface PaymentRecord {
  id: string;
  bookingId: string;
  clientName: string;
  professionalName: string;
  professionalType: "Freelancer" | "Studio";
  amount: number;
  paymentMethod: "Xendit" | "Onsite";
  paymentPlan: PaymentPlan;
  transactionReference: string;
  date: string;
  status: PaymentStatus;
}

const INITIAL_TRANSACTIONS: PaymentRecord[] = [
  { 
    id: "PAY-9042", 
    bookingId: "BK-1042",
    clientName: "Emily Watson", 
    professionalName: "Rivera Studio", 
    professionalType: "Studio",
    amount: 10000, 
    paymentMethod: "Xendit",
    paymentPlan: "Full Payment",
    transactionReference: "XEN-582910384",
    date: "Jul 15, 2026 14:30", 
    status: "Fully Paid" 
  },
  { 
    id: "PAY-9043", 
    bookingId: "BK-1055",
    clientName: "Lisa Park", 
    professionalName: "Anya Petrova", 
    professionalType: "Freelancer",
    amount: 3500, 
    paymentMethod: "Xendit",
    paymentPlan: "Half Payment",
    transactionReference: "XEN-582910385",
    date: "Jul 18, 2026 09:15", 
    status: "Partially Paid" 
  },
  { 
    id: "PAY-9044", 
    bookingId: "BK-1058",
    clientName: "David Kim", 
    professionalName: "Leo Chang", 
    professionalType: "Freelancer",
    amount: 5000, 
    paymentMethod: "Xendit",
    paymentPlan: "Full Payment",
    transactionReference: "XEN-PENDING-33",
    date: "Jul 20, 2026 11:20", 
    status: "Pending" 
  },
  { 
    id: "PAY-9045", 
    bookingId: "BK-1061",
    clientName: "Sarah Chen", 
    professionalName: "Pixel Perfect Studio", 
    professionalType: "Studio",
    amount: 8000, 
    paymentMethod: "Xendit",
    paymentPlan: "Half Payment",
    transactionReference: "XEN-FAIL-9912",
    date: "Jul 21, 2026 16:45", 
    status: "Failed" 
  },
  { 
    id: "PAY-9046", 
    bookingId: "BK-1062",
    clientName: "Mark Johnson", 
    professionalName: "Sofia Mendez", 
    professionalType: "Freelancer",
    amount: 4000, 
    paymentMethod: "Onsite",
    paymentPlan: "Half Payment",
    transactionReference: "ONSITE-REC-44",
    date: "Jul 22, 2026 10:00", 
    status: "Cancelled" 
  },
];

const STATUS_STYLES: Record<PaymentStatus, { color: string; icon: any }> = {
  "Pending": { color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50", icon: Clock },
  "Partially Paid": { color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50", icon: CreditCard },
  "Fully Paid": { color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50", icon: CheckCircle2 },
  "Failed": { color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/50", icon: AlertTriangle },
  "Cancelled": { color: "text-muted-foreground bg-muted border-border", icon: X },
};

export default function AdminPayments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [isConfirmingVerification, setIsConfirmingVerification] = useState(false);

  // Derived statistics
  const { totalRevenue, pendingAmount } = useMemo(() => {
    return INITIAL_TRANSACTIONS.reduce(
      (acc, t) => {
        if (t.status === "Fully Paid" || t.status === "Partially Paid") acc.totalRevenue += t.amount;
        if (t.status === "Pending") acc.pendingAmount += t.amount;
        return acc;
      },
      { totalRevenue: 0, pendingAmount: 0 }
    );
  }, []);

  const filteredTransactions = INITIAL_TRANSACTIONS.filter((t) => {
    const matchesSearch = 
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.transactionReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.professionalName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "All" || t.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleVerifyTransaction = () => {
    if (!selectedPayment) return;
    
    // Simulate API verification
    setIsConfirmingVerification(false);
    toast.success(`Transaction ${selectedPayment.transactionReference} successfully verified with Xendit API.`);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-up">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-primary" />
              Payments Overview
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor platform payment records, transaction references, and Xendit statuses.
            </p>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card rounded-xl shadow-sm border border-border/50 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Paid Revenue</p>
              <p className="text-2xl font-heading font-bold">₱{totalRevenue.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-card rounded-xl shadow-sm border border-border/50 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-amber-600 dark:text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
              <p className="text-2xl font-heading font-bold">₱{pendingAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-col md:flex-row gap-4 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by Payment ID, Reference, Client, or Professional..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-background"
            />
          </div>
          <div className="w-full md:w-48 shrink-0 flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Fully Paid">Fully Paid</option>
              <option value="Failed">Failed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden text-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border/50">
                  <th className="px-5 py-3.5 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Payment ID / Date</th>
                  <th className="px-5 py-3.5 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Client & Professional</th>
                  <th className="px-5 py-3.5 font-semibold text-muted-foreground uppercase tracking-wider text-xs hidden md:table-cell">Plan & Method</th>
                  <th className="px-5 py-3.5 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Amount</th>
                  <th className="px-5 py-3.5 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Status</th>
                  <th className="px-5 py-3.5 font-semibold text-muted-foreground uppercase tracking-wider text-xs text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredTransactions.map((t) => {
                  const StatusIcon = STATUS_STYLES[t.status].icon;
                  return (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-primary">{t.id}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{t.date}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-foreground">{t.clientName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          to <span className="font-medium">{t.professionalName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <div className="font-medium">{t.paymentPlan}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5 border border-border/60 bg-muted px-1.5 py-0.5 rounded w-max">
                          {t.paymentMethod}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-semibold text-base">₱{t.amount.toLocaleString()}</div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 w-max ${STATUS_STYLES[t.status].color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {t.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedPayment(t)}
                          className="h-8 text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <Eye className="w-4 h-4 mr-1.5" />
                          Details
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <CreditCard className="w-8 h-8 opacity-20" />
                        <p>No payment records found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payment Details Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-card border border-border/50 rounded-2xl shadow-xl w-full max-w-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border/50 bg-muted/30">
              <div>
                <h3 className="text-xl font-heading font-bold flex items-center gap-2">
                  Payment Details
                  <span className={`ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_STYLES[selectedPayment.status].color}`}>
                    {selectedPayment.status}
                  </span>
                </h3>
                <p className="text-sm text-muted-foreground mt-1 font-mono">Record ID: {selectedPayment.id}</p>
              </div>
              <button 
                onClick={() => setSelectedPayment(null)}
                className="p-2 bg-muted/50 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              
              {/* Transaction Highlight */}
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Transaction Reference</p>
                  <p className="font-mono text-lg font-bold">{selectedPayment.transactionReference}</p>
                  <p className="text-xs text-muted-foreground mt-1">Processed via {selectedPayment.paymentMethod}</p>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Amount</p>
                  <p className="text-2xl font-heading font-bold text-foreground">₱{selectedPayment.amount.toLocaleString()}</p>
                </div>
              </div>

              {/* Grid Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Client</p>
                    <p className="font-semibold text-sm">{selectedPayment.clientName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Payment Date</p>
                    <p className="font-semibold text-sm">{selectedPayment.date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Payment Plan</p>
                    <p className="font-semibold text-sm flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      {selectedPayment.paymentPlan}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Professional ({selectedPayment.professionalType})</p>
                    <p className="font-semibold text-sm">{selectedPayment.professionalName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Associated Booking</p>
                    <p className="font-mono font-semibold text-sm text-primary">{selectedPayment.bookingId}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-border/50 bg-muted/30 flex justify-between items-center gap-4">
              <p className="text-xs text-muted-foreground max-w-[60%]">
                *Admins cannot alter historical payment records in a way that destroys the original transaction history.
              </p>
              <Button 
                onClick={() => setIsConfirmingVerification(true)} 
                variant="outline"
                className="gap-2 shrink-0 bg-background"
                disabled={selectedPayment.paymentMethod === "Onsite"}
              >
                <RefreshCw className="w-4 h-4" /> 
                Verify with Xendit
              </Button>
            </div>
            
            {/* Confirmation Overlay Modal */}
            {isConfirmingVerification && (
              <div className="absolute inset-0 z-[60] flex items-center justify-center bg-background/90 backdrop-blur-sm animate-in fade-in duration-200 rounded-2xl">
                <div className="bg-card border border-border/50 rounded-xl shadow-2xl w-full max-w-sm flex flex-col animate-in zoom-in-95 duration-200 p-6 space-y-4 text-center">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-1">
                    <RefreshCw className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold font-heading">Verify Transaction</h3>
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to manually verify the status of transaction <span className="font-mono font-bold text-foreground">{selectedPayment.transactionReference}</span> with the Xendit API?
                  </p>
                  <div className="flex gap-3 pt-4">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setIsConfirmingVerification(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      className="flex-1 gap-2"
                      onClick={handleVerifyTransaction}
                    >
                      <Check className="w-4 h-4" /> Confirm
                    </Button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </DashboardLayout>
  );
}