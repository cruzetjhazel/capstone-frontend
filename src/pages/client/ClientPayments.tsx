import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useRole } from "@/contexts/RoleContext";
import { useBookings } from "@/hooks/useBookings";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { 
  Wallet, CheckCircle2, AlertCircle, ArrowRight, 
  Receipt, X, Loader2, CreditCard 
} from "lucide-react";

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(price);
};

export default function ClientPayments() {
  const { user } = useRole();
  const { data: bookings = [], isLoading } = useBookings(user?.email);
  const navigate = useNavigate();

  // Modal & Payment States
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter based on separate Booking and Payment Statuses as per requirements
  const pendingPayments = bookings.filter((b) => 
    (b.bookingStatus === "accepted" || b.status === "accepted") && b.dueNow > 0
  );
  
  const paymentHistory = bookings.filter((b) => 
    b.paymentStatus === "fully_paid" || 
    b.paymentStatus === "partially_paid" || 
    b.status === "paid" || 
    b.status === "completed" || 
    b.status === "confirmed"
  );

  const handleOpenPaymentModal = (booking: any) => {
    setSelectedBooking(booking);
  };

  const handleConfirmPayment = async () => {
    if (!selectedBooking) return;
    
    setIsProcessing(true);
    
    // Simulating API request to initialize Xendit payment session
    setTimeout(() => {
      toast.success("Redirecting to Xendit secure payment gateway...");
      setIsProcessing(false);
      setSelectedBooking(null);
      navigate(`/booking/${selectedBooking.id}/pay`);
    }, 1500);
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-up">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary" /> My Payments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your outstanding balances and view your payment history.
          </p>
        </div>

        {/* Pending Payments Section */}
        <section>
          <h2 className="text-lg font-heading font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" /> Action Required
          </h2>
          
          {isLoading ? (
            <p className="text-sm text-muted-foreground animate-pulse">Loading pending payments...</p>
          ) : pendingPayments.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 text-green-500/50 mx-auto mb-3" />
              <p>You have no pending payments right now.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingPayments.map((booking) => (
                <div key={booking.id} className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-foreground">{booking.photographerName}</h3>
                    <p className="text-sm text-muted-foreground">Booking ID: {booking.id} &bull; {booking.packageName}</p>
                    <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded">
                      Payment Required to Confirm
                    </span>
                  </div>
                  <div className="flex flex-col sm:items-end gap-3 text-left sm:text-right">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Amount Due</p>
                      <p className="font-bold text-amber-600 dark:text-amber-400 text-lg">{formatPrice(booking.dueNow)}</p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleOpenPaymentModal(booking)}
                      className="gap-2 bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto"
                    >
                      Pay Now <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Payment History Section */}
        <section>
          <h2 className="text-lg font-heading font-semibold mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-muted-foreground" /> Payment History
          </h2>
          
          {isLoading ? (
            <p className="text-sm text-muted-foreground animate-pulse">Loading history...</p>
          ) : paymentHistory.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
              <p>No completed payments yet.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden shadow-sm">
              {paymentHistory.map((booking) => {
                const isHalfPayment = booking.paymentPlan === "half" || booking.dueNow < booking.subtotal;
                const remainingBalance = booking.subtotal - booking.dueNow;

                return (
                  <div key={booking.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                    <div>
                      <h3 className="font-semibold text-sm">{booking.photographerName}</h3>
                      <p className="text-xs text-muted-foreground mb-1">
                        Booking ID: {booking.id} &bull; {booking.date}
                      </p>
                      {booking.transactionReference && (
                        <p className="text-[10px] text-muted-foreground font-mono bg-muted/50 inline-block px-1.5 py-0.5 rounded">
                          Ref: {booking.transactionReference}
                        </p>
                      )}
                    </div>
                    
                    <div className="text-left sm:text-right flex flex-col sm:items-end">
                      <div className="flex gap-4 items-center">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Total Fee</p>
                          <p className="text-sm font-bold text-foreground">{formatPrice(booking.subtotal)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Paid Online</p>
                          <p className="text-sm font-bold text-green-600">{formatPrice(booking.dueNow)}</p>
                        </div>
                      </div>
                      
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 uppercase">
                          {isHalfPayment ? "Half Payment Plan" : "Full Payment Plan"}
                        </span>
                        
                        {isHalfPayment && remainingBalance > 0 ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase">
                            Bal: {formatPrice(remainingBalance)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400 uppercase">
                            Fully Paid
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Confirmation Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border card-shadow p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => !isProcessing && setSelectedBooking(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground disabled:opacity-50"
              disabled={isProcessing}
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-heading font-bold mb-2">Proceed to Payment</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You are about to pay <span className="font-bold text-foreground">{formatPrice(selectedBooking.dueNow)}</span> to confirm your booking with <strong>{selectedBooking.photographerName}</strong>. 
              </p>
              <p className="text-xs text-muted-foreground mt-3 bg-muted/50 p-3 rounded-lg border border-border">
                You will be redirected to the secure Xendit payment gateway to complete your transaction. Your booking will automatically be marked as Confirmed once the payment is successful.
              </p>
            </div>

            <div className="border-t border-border pt-4 flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setSelectedBooking(null)} 
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmPayment} 
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  "Proceed to Pay"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}