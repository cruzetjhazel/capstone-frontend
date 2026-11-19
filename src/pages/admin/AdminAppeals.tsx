import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Pagination, PillTabs, usePagination } from "@/components/ListPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldAlert, CheckCircle2, XCircle, Clock, FileText, Search, Eye, X } from "lucide-react";
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
  { id: "", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "denied", label: "Rejected" },
];

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "-");

function StatusPill({ status }: { status: Appeal["status"] }) {
  return (
    <span
      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
        status === "pending" ? "bg-amber-500/10 text-amber-600"
        : status === "approved" ? "bg-emerald-500/10 text-emerald-600"
        : "bg-destructive/10 text-destructive"
      }`}
    >
      {status === "pending" ? <Clock className="w-3 h-3" /> : status === "approved" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {status === "denied" ? "rejected" : status}
    </span>
  );
}

export default function AdminAppeals() {
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [viewAppeal, setViewAppeal] = useState<Appeal | null>(null);
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

  // Deep link from a notification: /admin/appeals?open=<appeal id>
  const [searchParams, setSearchParams] = useSearchParams();
  const [openId, setOpenId] = useState<number | null>(null);
  useEffect(() => {
    const id = searchParams.get("open");
    if (!id) return;
    setFilter(""); // show All so the appeal is found whatever its status
    setOpenId(Number(id));
    setSearchParams({}, { replace: true });
  }, [searchParams]);
  useEffect(() => {
    if (openId == null || loading) return;
    const target = appeals.find((a) => a.id === openId);
    if (target) {
      setViewAppeal(target);
      setOpenId(null);
    }
  }, [openId, loading, appeals]);

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
      setViewAppeal(null);
      toast.success(decision === "approve" ? `${a.user.name}'s account was reactivated.` : "Appeal rejected.");
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't save the decision."));
    } finally {
      setBusyId(null);
    }
  };

  const q = search.trim().toLowerCase();
  const visible = appeals.filter(
    (a) =>
      !q ||
      a.user.name.toLowerCase().includes(q) ||
      a.user.email.toLowerCase().includes(q) ||
      a.message.toLowerCase().includes(q) ||
      (a.user.suspension_reason ?? "").toLowerCase().includes(q) ||
      String(a.id) === q.replace("#", "")
  );
  const pager = usePagination(visible, 10, `${filter}|${search}`);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-up pb-12">
        <div>
          <h1 className="text-2xl font-heading font-bold">Appeals</h1>
          <p className="text-sm text-muted-foreground mt-1">Review appeals from users. Approving an appeal reactivates the account.</p>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <PillTabs
            value={filter}
            onChange={setFilter}
            tabs={FILTERS.map((f) => ({ key: f.id, label: f.label }))}
          />
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 h-10 rounded-xl bg-card"
            />
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden text-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border/50">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suspension Reason</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Appealed</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading...
                    </td>
                  </tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center text-muted-foreground italic">No appeals here.</td>
                  </tr>
                ) : (
                  pager.pageItems.map((a) => (
                    <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold">{a.user.name}</p>
                        <p className="text-xs text-muted-foreground break-all">{a.user.email}</p>
                      </td>
                      <td className="px-4 py-3 max-w-[260px] truncate" title={a.user.suspension_reason ?? ""}>
                        {a.user.suspension_reason || <span className="text-muted-foreground italic">none recorded</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{fmt(a.created_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><StatusPill status={a.status} /></td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewAppeal(a)}
                          className="h-8 text-primary hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Eye className="w-4 h-4 mr-1.5" /> Review
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {!loading && <Pagination pagination={pager} />}
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
      </div>
    </DashboardLayout>
  );
}