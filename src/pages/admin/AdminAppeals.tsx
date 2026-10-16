import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldAlert, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import toast from "react-hot-toast";
import api, { getApiErrorMessage } from "@/lib/api";

type Appeal = {
  id: number;
  status: "pending" | "approved" | "denied";
  message: string;
  attachments: { url: string; name: string }[];
  admin_response: string | null;
  created_at: string | null;
  decided_at: string | null;
  user: {
    id: number;
    name: string;
    email: string;
    account_status: string;
    suspension_reason: string | null;
    suspended_at: string | null;
  };
};

const FILTERS: { id: string; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "denied", label: "Rejected" },
  { id: "", label: "All" },
];

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "-");

export default function AdminAppeals() {
  const [filter, setFilter] = useState("pending");
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<{ appeal: Appeal; step: "reject-reason" | "reject-confirm" | "approve" } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/appeals", { params: filter ? { status: filter } : {} });
      setAppeals(res.data?.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't load appeals."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  const decide = async (a: Appeal, decision: "approve" | "deny") => {
    const response = (responses[a.id] ?? "").trim();
    if (decision === "deny" && !response) {
      toast.error("Please explain why the appeal is rejected.");
      return;
    }
    setBusyId(a.id);
    try {
      await api.patch(`/admin/appeals/${a.id}/decide`, { decision, response: response || undefined });
      setDialog(null);
      toast.success(decision === "approve" ? `${a.user.name}'s account was reactivated.` : "Appeal rejected.");
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't save the decision."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <div>
          <h1 className="text-2xl font-heading font-bold">Suspension Appeals</h1>
          <p className="text-sm text-muted-foreground mt-1">Review appeals from suspended accounts. Approving reactivates the account.</p>
        </div>

        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <Button key={f.label} size="sm" variant={filter === f.id ? "default" : "outline"} onClick={() => setFilter(f.id)}>
              {f.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading...
          </div>
        ) : appeals.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-12">No appeals here.</p>
        ) : (
          <div className="space-y-4">
            {appeals.map((a) => (
              <div key={a.id} className="bg-card border border-border rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{a.user.name}</p>
                    <p className="text-xs text-muted-foreground break-all">{a.user.email}</p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                      a.status === "pending" ? "bg-amber-500/10 text-amber-600"
                      : a.status === "approved" ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {a.status === "pending" ? <Clock className="w-3 h-3" /> : a.status === "approved" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {a.status === "denied" ? "rejected" : a.status}
                  </span>
                </div>

                <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
                  <p className="font-semibold flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> Suspended {fmt(a.user.suspended_at)}</p>
                  <p className="text-muted-foreground break-words">Reason: {a.user.suspension_reason || "none recorded"}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Appeal ({fmt(a.created_at)})</p>
                  <p className="text-sm whitespace-pre-wrap break-words">{a.message}</p>
                </div>

                {a.attachments.length > 0 && (
                  <div className="grid grid-cols-5 gap-2">
                    {a.attachments.map((f) => (
                      <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="block aspect-square rounded-lg overflow-hidden border border-border">
                        {/\.pdf$/i.test(f.name) ? (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-muted/50 p-1 text-center">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                            <span className="text-[9px] leading-tight text-muted-foreground break-all line-clamp-2">{f.name}</span>
                          </div>
                        ) : (
                          <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                        )}
                      </a>
                    ))}
                  </div>
                )}

                {a.status === "pending" ? (
                  <div className="space-y-2 pt-2 border-t border-border/50">

                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="destructive" disabled={busyId === a.id} onClick={() => setDialog({ appeal: a, step: "reject-reason" })}>Reject</Button>
                      <Button size="sm" disabled={busyId === a.id} onClick={() => setDialog({ appeal: a, step: "approve" })}>
                        Approve &amp; reactivate
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                    Decided {fmt(a.decided_at)}{a.admin_response ? `: ${a.admin_response}` : ""}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {dialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            {dialog.step === "reject-reason" && (
              <>
                <div>
                  <h3 className="font-heading font-bold text-base">Reject appeal</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Explain to {dialog.appeal.user.name} why the appeal is rejected. They will see this on their account status page.
                  </p>
                </div>
                <div className="space-y-1">
                  <Textarea
                    rows={4}
                    placeholder="Reason for rejecting the appeal (at least 10 characters)"
                    value={responses[dialog.appeal.id] ?? ""}
                    onChange={(e) => setResponses((prev) => ({ ...prev, [dialog.appeal.id]: e.target.value }))}
                  />
                  <p
                    className={`text-[11px] ${
                      (responses[dialog.appeal.id] ?? "").trim().length >= 10 ? "text-emerald-600" : "text-muted-foreground"
                    }`}
                  >
                    {(responses[dialog.appeal.id] ?? "").trim().length} / 10 characters minimum
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDialog(null)}>Cancel</Button>
                  <Button
                    size="sm"
                    disabled={(responses[dialog.appeal.id] ?? "").trim().length < 10}
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => {
                      if ((responses[dialog.appeal.id] ?? "").trim().length < 10) return;
                      setDialog({ appeal: dialog.appeal, step: "reject-confirm" });
                    }}
                  >
                    Continue
                  </Button>
                </div>
              </>
            )}

            {dialog.step === "reject-confirm" && (
              <>
                <div>
                  <h3 className="font-heading font-bold text-base">Are you sure you want to reject this appeal?</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {dialog.appeal.user.name}'s account will stay suspended and they will see your reason:
                  </p>
                </div>
                <p className="text-sm bg-muted/40 rounded-lg p-3 whitespace-pre-wrap break-words">
                  {(responses[dialog.appeal.id] ?? "").trim()}
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" disabled={busyId === dialog.appeal.id} onClick={() => setDialog({ appeal: dialog.appeal, step: "reject-reason" })}>
                    Go back
                  </Button>
                  <Button variant="destructive" size="sm" disabled={busyId === dialog.appeal.id} onClick={() => decide(dialog.appeal, "deny")}>
                    {busyId === dialog.appeal.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Yes, reject"}
                  </Button>
                </div>
              </>
            )}

            {dialog.step === "approve" && (
              <>
                <div>
                  <h3 className="font-heading font-bold text-base">Approve and reactivate?</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {dialog.appeal.user.name}'s account will be reactivated and they will be able to log in again.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" disabled={busyId === dialog.appeal.id} onClick={() => setDialog(null)}>Cancel</Button>
                  <Button size="sm" disabled={busyId === dialog.appeal.id} onClick={() => decide(dialog.appeal, "approve")}>
                    {busyId === dialog.appeal.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Yes, approve"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
