import { useState, useMemo } from "react";
import toast, { Toaster } from "react-hot-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { 
  DollarSign, TrendingUp, Clock, ArrowUpRight, Search, Filter, 
  ExternalLink, X, Calendar, MapPin, User, Mail, Phone, Package as PackageIcon, AlignLeft, Receipt, CheckCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Added `paymentType` to the data structure
type PaymentType = "deposit" | "balance" | "full";

const initialTransactionsData = [
  { 
    id: "PAY-001", 
    bookingId: "BK-1023", 
    client: "Emily Watson", 
    email: "emily.watson@example.com",
    phone: "+1 (555) 123-4567",
    event: "Wedding", 
    date: "2026-07-15T10:00:00Z", 
    location: "St. Patrick's Cathedral & The Plaza Hotel",
    package: "Premium Wedding Package (8 Hours)",
    notes: "Please focus on candid moments during the reception. Ensure we get a large group photo before dinner.",
    amount: 1300, 
    totalCost: 2600,
    paymentType: "deposit" as PaymentType,
    status: "paid" as const 
  },
  { 
    id: "PAY-002", 
    bookingId: "BK-1024", 
    client: "Lisa Park", 
    email: "lisa.park99@example.com",
    phone: "+1 (555) 987-6543",
    event: "Portrait", 
    date: "2026-07-10T14:30:00Z", 
    location: "Downtown Studio - Room A",
    package: "Standard Studio Portrait (1 Hour)",
    notes: "Needs photos for corporate LinkedIn profile. Prefers dark grey backdrop.",
    amount: 200, 
    totalCost: 200,
    paymentType: "full" as PaymentType,
    status: "paid" as const 
  },
  { 
    id: "PAY-003", 
    bookingId: "BK-1025", 
    client: "David Kim", 
    email: "dkim.creative@example.com",
    phone: "+1 (555) 456-7890",
    event: "Engagement", 
    date: "2026-06-28T09:15:00Z", 
    location: "Botanical Gardens",
    package: "Outdoor Engagement Session (2 Hours)",
    notes: "Bringing our golden retriever for the first 30 minutes of the shoot.",
    amount: 400, 
    totalCost: 800,
    paymentType: "deposit" as PaymentType,
    status: "pending" as const 
  },
  { 
    id: "PAY-004", 
    bookingId: "BK-1023", 
    client: "Emily Watson", 
    email: "emily.watson@example.com",
    phone: "+1 (555) 123-4567",
    event: "Wedding", 
    date: "2026-07-15T10:00:00Z", 
    location: "St. Patrick's Cathedral & The Plaza Hotel",
    package: "Premium Wedding Package (8 Hours)",
    notes: "Final balance for the wedding package.",
    amount: 1300, 
    totalCost: 2600,
    paymentType: "balance" as PaymentType,
    status: "pending" as const 
  },
  { 
    id: "PAY-005", 
    bookingId: "BK-1027", 
    client: "Mark Johnson", 
    email: "mjohnson88@example.com",
    phone: "+1 (555) 777-8888",
    event: "Event", 
    date: "2026-05-22T16:45:00Z", 
    location: "Riverside Country Club",
    package: "Birthday Party Coverage (3 Hours)",
    notes: "Surprise 50th birthday party. Please arrive 30 mins early to capture the surprise.",
    amount: 450, 
    totalCost: 450,
    paymentType: "full" as PaymentType,
    status: "paid" as const 
  },
];

export default function StudioEarnings() {
  const [transactions, setTransactions] = useState(initialTransactionsData);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("all");
  
  const [selectedTransaction, setSelectedTransaction] = useState<typeof transactions[0] | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Dynamic Statistics Calculations
  const totalEarned = transactions
    .filter((t) => t.status === "paid")
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingAmount = transactions
    .filter((t) => t.status === "pending")
    .reduce((sum, t) => sum + t.amount, 0);

  const currentMonthEarned = transactions
    .filter((t) => {
      const txDate = new Date(t.date);
      const today = new Date();
      return (
        t.status === "paid" &&
        txDate.getMonth() === today.getMonth() &&
        txDate.getFullYear() === today.getFullYear()
      );
    })
    .reduce((sum, t) => sum + t.amount, 0);

  // Filtering Logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        tx.client.toLowerCase().includes(searchLower) ||
        tx.id.toLowerCase().includes(searchLower) ||
        tx.bookingId.toLowerCase().includes(searchLower);

      const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
      const matchesType = paymentTypeFilter === "all" || tx.paymentType === paymentTypeFilter;

      let matchesDate = true;
      if (dateFilter !== "all") {
        const txDate = new Date(tx.date);
        const today = new Date();
        
        if (dateFilter === "this_month") {
          matchesDate = txDate.getMonth() === today.getMonth() && txDate.getFullYear() === today.getFullYear();
        } else if (dateFilter === "last_month") {
          const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          matchesDate = txDate.getMonth() === lastMonth.getMonth() && txDate.getFullYear() === lastMonth.getFullYear();
        } else if (dateFilter === "this_year") {
          matchesDate = txDate.getFullYear() === today.getFullYear();
        }
      }

      return matchesSearch && matchesStatus && matchesType && matchesDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchQuery, statusFilter, dateFilter, paymentTypeFilter]);

  const hasActiveFilters = searchQuery !== "" || statusFilter !== "all" || dateFilter !== "all" || paymentTypeFilter !== "all";

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateFilter("all");
    setPaymentTypeFilter("all");
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const getPaymentTypeLabel = (type: PaymentType) => {
    switch (type) {
      case "deposit": return "50% Deposit";
      case "balance": return "Final Balance";
      case "full": return "Full Payment";
    }
  };

  const calculateRemainingBalance = (tx: typeof transactions[0]) => {
    if (tx.paymentType === "full") return 0;
    if (tx.paymentType === "balance" && tx.status === "paid") return 0;
    if (tx.paymentType === "balance" && tx.status === "pending") return tx.amount;
    return tx.totalCost - tx.amount;
  };

  // Action: Record Onsite Payment
  const handleConfirmPayment = () => {
    if (!selectedTransaction) return;

    // Update Transaction State
    setTransactions(prev => prev.map(t => 
      t.id === selectedTransaction.id ? { ...t, status: "paid" } : t
    ));

    // Update modal's local state view
    setSelectedTransaction(prev => prev ? { ...prev, status: "paid" } : null);

    setIsConfirmModalOpen(false);
    toast.success("Onsite payment recorded successfully!");
  };

  return (
    <DashboardLayout>
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-up relative">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Earnings</h1>
            <p className="text-sm text-muted-foreground mt-1">Track your studio's revenue and pending payments.</p>
          </div>
        </div>

        {/* Global Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl card-shadow border border-border/50 p-5 transition-all hover:border-success/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Earned</p>
                <p className="text-2xl font-heading font-bold">${totalEarned.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-xl card-shadow border border-border/50 p-5 transition-all hover:border-warning/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Pending Output</p>
                <p className="text-2xl font-heading font-bold">${pendingAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-xl card-shadow border border-border/50 p-5 transition-all hover:border-primary/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Earned This Month</p>
                <p className="text-2xl font-heading font-bold flex items-center gap-2">
                  ${currentMonthEarned.toLocaleString()} 
                  {currentMonthEarned > 0 && <ArrowUpRight className="w-5 h-5 text-success" />}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-3 bg-card p-2 rounded-lg border border-border/50 card-shadow">
          <div className="relative w-full xl:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search by client, payment ID, or booking ID..." 
              className="h-9 pl-9 border-none bg-muted/50 focus-visible:ring-1" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
              <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs border-none bg-muted/50">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="deposit">Deposits</SelectItem>
                <SelectItem value="balance">Balances</SelectItem>
                <SelectItem value="full">Full Payments</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs border-none bg-muted/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs border-none bg-muted/50">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="this_year">This Year</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllFilters}
                className="h-9 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <X className="w-3.5 h-3.5 mr-1.5" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Transaction ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Client</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Event</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Amount & Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4 text-sm font-mono font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                        {t.id}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium">{t.client}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5 md:hidden">{t.event}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted/50 text-xs font-medium">
                          {t.event}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground hidden sm:table-cell">
                        {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-heading font-bold text-foreground">
                            ${t.amount.toLocaleString()}
                          </span>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-0.5">
                            {getPaymentTypeLabel(t.paymentType)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-xs font-medium gap-1.5 text-muted-foreground hover:text-foreground"
                          onClick={() => setSelectedTransaction(t)}
                        >
                          Details <ExternalLink className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                        <Search className="w-8 h-8 opacity-20" />
                        <p className="text-sm font-medium">No transactions found.</p>
                        <p className="text-xs opacity-70">Try adjusting your search or filter settings.</p>
                        <Button variant="link" onClick={clearAllFilters}>Clear Filters</Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* OVERLAY: Complete Booking Details Modal */}
        {selectedTransaction && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl border border-border/50 flex flex-col">
              
              <div className="flex items-center justify-between p-5 border-b border-border/50 bg-muted/10 sticky top-0 z-10 backdrop-blur-md">
                <div>
                  <h2 className="text-xl font-heading font-bold flex items-center gap-2">
                    Booking Details
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={selectedTransaction.status} />
                    <span className="text-xs text-muted-foreground font-mono">ID: {selectedTransaction.bookingId}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedTransaction(null)} className="h-8 w-8 rounded-full bg-background/50 hover:bg-background">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-6 space-y-8">
                <div className="flex items-start sm:items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1 sm:mt-0">
                    <Receipt className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium flex items-center gap-2">
                      Viewing Transaction: <span className="font-mono">{selectedTransaction.id}</span>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                        {getPaymentTypeLabel(selectedTransaction.paymentType)}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      This transaction represents a <span className="font-bold text-foreground">${selectedTransaction.amount.toLocaleString()}</span> payment 
                      toward this booking, currently marked as <span className="uppercase tracking-wider font-semibold text-foreground">{selectedTransaction.status}</span>.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">
                    <User className="w-4 h-4 text-primary" />
                    Client Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormInput label="Full Name" value={selectedTransaction.client} icon={<User className="w-4 h-4" />} />
                    <FormInput label="Event Type" value={selectedTransaction.event} />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">
                    <PackageIcon className="w-4 h-4 text-primary" />
                    Package & Finances
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <FormInput label="Selected Package" value={selectedTransaction.package} />
                    </div>
                    <FormInput label="Total Event Cost" value={`$${selectedTransaction.totalCost.toLocaleString()}`} />
                    <FormInput 
                      label={selectedTransaction.paymentType === "full" ? "Amount Paid" : "Remaining Balance (After this payment)"}
                      value={`$${calculateRemainingBalance(selectedTransaction).toLocaleString()}`} 
                    />
                  </div>
                </div>
              </div>
              
              <div className="p-5 border-t border-border/50 bg-muted/10 flex justify-end gap-3 sticky bottom-0 z-10 backdrop-blur-md">
                {selectedTransaction.status === "pending" && (
                  <Button variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setIsConfirmModalOpen(true)}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Record Onsite Payment
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedTransaction(null)}>Close</Button>
              </div>
            </div>
          </div>
        )}

        {/* OVERLAY: Confirmation Modal */}
        {isConfirmModalOpen && selectedTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-sm p-6 rounded-xl shadow-2xl border border-border/50 flex flex-col text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold font-heading">Confirm Onsite Payment</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Are you sure you want to record a <span className="font-bold text-foreground">${selectedTransaction.amount.toLocaleString()}</span> onsite payment from 
                <span className="font-medium text-foreground"> {selectedTransaction.client}</span>? 
                This action will mark the remaining balance as paid.
              </p>
              <div className="flex items-center gap-3 w-full mt-4">
                <Button variant="outline" className="flex-1" onClick={() => setIsConfirmModalOpen(false)}>Cancel</Button>
                <Button variant="default" className="flex-1" onClick={handleConfirmPayment}>Confirm Payment</Button>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </DashboardLayout>
  );
}

// Reusable dummy input component for the modal layout
function FormInput({ label, value, icon }: { label: string, value: string, icon?: React.ReactNode }) {
  return (
    <div className="space-y-1.5 flex-1">
      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70">
            {icon}
          </div>
        )}
        <input 
          readOnly 
          value={value} 
          className={cn(
            "w-full h-10 rounded-md border border-input bg-background/50 text-sm font-medium text-foreground focus:outline-none focus:border-primary/50 transition-colors",
            icon ? "pl-10 pr-3" : "px-3"
          )}
        />
      </div>
    </div>
  );
}