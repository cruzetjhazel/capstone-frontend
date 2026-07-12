import { useMemo, useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Aperture, Camera, Check, FileText, ImageIcon, Instagram, Facebook, Globe,
  MapPin, Search, ShieldCheck, X, Clock, ExternalLink,
} from "lucide-react";
import {
  listApplications, updateApplicationStatus, PendingApplication, ApplicationStatus,
} from "@/lib/pendingApprovals";
import { toast } from "sonner";

const STATUS_TABS: { key: ApplicationStatus | "all"; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

const statusClasses: Record<ApplicationStatus, string> = {
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

export default function AdminVerifications() {
  const [tab, setTab] = useState<ApplicationStatus | "all">("pending");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<PendingApplication[]>([]);
  const [selected, setSelected] = useState<PendingApplication | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  useEffect(() => {
    listApplications().then(setItems);
  }, []);

  const refresh = () => { listApplications().then(setItems); };

  const filtered = useMemo(() => {
    return items.filter((a) => {
      if (tab !== "all" && a.status !== tab) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.businessName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, tab, search]);

  const handleApprove = async (id: string) => {
    await updateApplicationStatus(id, "approved");
    toast.success("Application approved. User can now access their dashboard.");
    setSelected(null);
    refresh();
  };

  const handleReject = async () => {
    if (!selected) return;
    await updateApplicationStatus(selected.id, "rejected", rejectNote || undefined);
    toast.success("Application rejected.");
    setRejectOpen(false);
    setSelected(null);
    setRejectNote("");
    refresh();
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-up">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">Verifications</h1>
            <p className="text-sm text-muted-foreground">
              Review new photographer & studio applications before granting access.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-2xl border border-border/50 p-5 card-shadow space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email or brand…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-muted/50 border-border/50"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === t.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> application{filtered.length !== 1 && "s"}
        </p>

        <div className="grid gap-3">
          {filtered.length === 0 && (
            <div className="p-12 text-center text-muted-foreground bg-card rounded-2xl border border-border/40">
              No applications to review.
            </div>
          )}
          {filtered.map((a) => (
            <div
              key={a.id}
              className="bg-card rounded-2xl border border-border/40 p-5 card-shadow flex flex-col md:flex-row md:items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                a.role === "studio" ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"
              }`}>
                {a.role === "studio" ? <Aperture className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold truncate">{a.businessName}</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize ${statusClasses[a.status]}`}>
                    {a.status}
                  </span>
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
                    {a.role}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {a.name} · {a.email}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {a.address}
                  <span className="mx-1">·</span>
                  <Clock className="w-3 h-3" />
                  {new Date(a.submittedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => setSelected(a)}>
                  Review
                </Button>
                {a.status === "pending" && (
                  <Button size="sm" onClick={() => handleApprove(a.id)}>
                    <Check className="w-4 h-4 mr-1" /> Approve
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selected.role === "studio" ? <Aperture className="w-5 h-5 text-secondary" /> : <Camera className="w-5 h-5 text-primary" />}
                  {selected.businessName}
                </DialogTitle>
                <DialogDescription>
                  Verify identity, documents and public links before approving.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
                <Section title="Applicant">
                  <Row label="Name" value={selected.name} />
                  <Row label="Email" value={selected.email} />
                  <Row label="Phone" value={selected.phone} />
                  <Row label="Address" value={selected.address} />
                  {selected.role === "studio" ? (
                    <>
                      <Row label="Years operating" value={selected.yearsOperating} />
                      <Row label="Team size" value={selected.teamSize} />
                    </>
                  ) : (
                    <Row label="Years experience" value={selected.yearsExp} />
                  )}
                </Section>

                <Section title="Service">
                  <Row label="Services" value={selected.services.join(", ")} />
                  <Row label="Areas covered" value={selected.areaCoverage} />
                  <Row label="Shooting type" value={selected.shootingTypes.join(", ")} />
                  <Row label="Price range" value={`₱${selected.priceMin} – ₱${selected.priceMax}`} />
                  <div className="pt-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Packages</p>
                    <div className="space-y-1.5">
                      {selected.packages.map((p, i) => (
                        <div key={i} className="text-sm p-2 rounded-lg bg-muted/40">
                          <span className="font-medium">{p.name}</span>
                          <span className="text-muted-foreground"> — ₱{p.price}</span>
                          {p.desc && <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </Section>

                <Section title="Verification documents">
                  <DocRow icon={FileText} label="Government ID" value={selected.docs.governmentIdName} />
                  <DocRow icon={ImageIcon} label="Selfie with ID" value={selected.docs.selfieWithIdName} />
                  {selected.role === "studio" ? (
                    <DocRow icon={FileText} label="Business permit / DTI" value={selected.docs.businessPermitName} />
                  ) : (
                    <DocRow
                      icon={ImageIcon}
                      label="Portfolio samples"
                      value={
                        selected.docs.portfolioSampleNames?.length
                          ? `${selected.docs.portfolioSampleNames.length} file(s)`
                          : undefined
                      }
                    />
                  )}
                </Section>

                <Section title="Public presence (cross-check)">
                  <LinkRow icon={Facebook} url={selected.facebook} label="Facebook" />
                  <LinkRow icon={Instagram} url={selected.instagram} label="Instagram" />
                  <LinkRow icon={Globe} url={selected.website} label="Website" />
                </Section>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Verification checklist</p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    <li>ID matches selfie and the name on the account</li>
                    <li>Business permit / portfolio confirms real activity</li>
                    <li>Social profiles are real, active, and match the brand name</li>
                    <li>Contact email/phone is reachable</li>
                  </ul>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-2">
                {selected.status === "pending" ? (
                  <>
                    <Button variant="outline" onClick={() => setRejectOpen(true)}>
                      <X className="w-4 h-4 mr-1" /> Reject
                    </Button>
                    <Button onClick={() => handleApprove(selected.id)}>
                      <Check className="w-4 h-4 mr-1" /> Approve & Verify
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject application</DialogTitle>
            <DialogDescription>
              Optionally leave a note for internal reference.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Reason for rejection…"
            rows={3}
            maxLength={400}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Confirm reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

/* ---------- Small helpers ---------- */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex text-sm gap-3">
      <span className="text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function DocRow({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value?: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm p-2 rounded-lg bg-muted/40">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground w-40 shrink-0">{label}</span>
      <span className={`truncate ${value ? "font-medium" : "italic text-muted-foreground"}`}>
        {value || "Not uploaded"}
      </span>
    </div>
  );
}

function LinkRow({ icon: Icon, url, label }: { icon: typeof Facebook; url?: string; label: string }) {
  if (!url) return null;
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground w-32 shrink-0">{label}</span>
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="text-primary hover:underline truncate flex items-center gap-1">
        {url} <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}
