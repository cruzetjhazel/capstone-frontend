import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Wallet, Calendar as CalIcon, MapPin, Clock, User, Mail, Phone, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/data/photographers";
import { useBooking } from "@/hooks/useBookings";

export default function BookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: b, isLoading } = useBooking(id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading booking…</p>
      </div>
    );
  }

  if (!b) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">Booking not found.</p>
          <Link to="/dashboard"><Button>Go to Dashboard</Button></Link>
        </div>
      </div>
    );
  }

  const statusColor =
    b.status === "approved" ? "bg-primary/10 text-primary border-primary/20" :
    b.status === "paid"     ? "bg-success/10 text-success border-success/20" :
    "bg-warning/10 text-warning border-warning/20";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-6 h-16">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="font-mono text-xs text-muted-foreground">{b.id}</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6 animate-fade-up">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-heading font-bold">Booking Request Details</h1>
            <p className="text-sm text-muted-foreground mt-1">Full summary of your booking with {b.photographerName}.</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium border capitalize ${statusColor}`}>
            {b.status}
          </span>
        </div>

        <div className="bg-card rounded-2xl card-shadow border border-border/50 p-6 space-y-5">
          <Section title="Photographer">
            <Row icon={User} label="Studio / Photographer" value={b.photographerName} />
          </Section>
          <Section title="Event">
            <Row icon={CalIcon} label="Date" value={b.date} />
            <Row icon={Clock} label="Start Time" value={b.startTime} />
            <Row icon={MapPin} label="Location" value={b.eventLocation} />
            <Row icon={Package} label="Event Type" value={b.eventType} />
          </Section>
          <Section title="Contact">
            <Row icon={User} label="Name" value={b.contactName} />
            <Row icon={Phone} label="Phone" value={b.contactPhone} />
            <Row icon={Mail} label="Email" value={b.contactEmail} />
          </Section>
          <Section title="Package & Payment">
            <Row icon={Package} label="Package" value={`${b.packageName} — ${formatPrice(b.packagePrice)}`} />
            <Row icon={Wallet} label="Due Now" value={formatPrice(b.dueNow)} />
            <Row icon={Wallet} label="Balance" value={formatPrice(b.balance)} />
            <p className="text-xs text-muted-foreground">Payment plan: {b.paymentOption}</p>
          </Section>
        </div>

        {(b.status === "approved") && (
          <div className="flex gap-2">
            {b.status === "approved" && (
              <Button onClick={() => navigate(`/booking/${b.id}/pay`)} className="gap-1.5">
                <Wallet className="w-4 h-4" /> Pay Balance ({formatPrice(b.dueNow)})
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate("/notifications")}>View Notifications</Button>
          </div>
        )}
        {b.status === "paid" && (
          <Button onClick={() => navigate(`/booking/${b.id}/receipt`)}>View Receipt</Button>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}
