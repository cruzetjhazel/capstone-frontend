import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  ShieldAlert, UserX, ArrowLeft, Eye, EyeOff, Info, CalendarClock,
  Paperclip, FileText, X, Send, Clock, XCircle, CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Logo from "@/components/Logo";
import api, { getApiErrorMessage } from "@/lib/api";
import { useRole, getPostLoginPath } from "@/contexts/RoleContext";

// Must match the cooldown enforced in DeactivateAccountAction.
const REDEACTIVATE_COOLDOWN_DAYS = 7;

// Must match the validation in Api\AppealController.
const MAX_FILES = 5;
const MAX_FILE_MB = 4;
const MIN_MESSAGE = 20;
const MAX_MESSAGE = 2000;

type AppealInfo = {
  status: "pending" | "approved" | "denied";
  submittedAt: string | null;
  adminResponse: string | null;
};

type AccountInfo = {
  status: "suspended" | "deactivated";
  email: string;
  reason: string | null;
  suspendedAt: string | null;
  deactivatedAt: string | null;
  appeal: AppealInfo | null;
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default function AccountStatus() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useRole();

  const account = (location.state as { account?: AccountInfo } | null)?.account;

  // reactivate (deactivated accounts)
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // appeal (suspended accounts)
  const [appeal, setAppeal] = useState<AppealInfo | null>(account?.appeal ?? null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [appealPassword, setAppealPassword] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [appealError, setAppealError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  // Only images get a thumbnail; other files (PDF) are shown as a file chip.
  const previews = useMemo(() => files.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : null)), [files]);
  useEffect(() => () => previews.forEach((u) => u && URL.revokeObjectURL(u)), [previews]);

  // Opened directly (or refreshed): nothing to show, so go sign in.
  if (!account) return <Navigate to="/login" replace />;

  const isSuspended = account.status === "suspended";
  const canAppeal = isSuspended && appeal?.status !== "pending";

  const handleReactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/auth/reactivate", { email: account.email, password });
      const loggedIn = await login(account.email, password);
      toast.success("Your account is active again. Welcome back!");
      navigate(getPostLoginPath(loggedIn), { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't reactivate this account."));
    } finally {
      setSubmitting(false);
    }
  };

  const pickFiles = (list: FileList | null) => {
    if (!list) return;
    setAppealError("");
    const next = [...files];
    for (const f of Array.from(list)) {
      if (!["image/jpeg", "image/png", "application/pdf"].includes(f.type)) {
        setAppealError("Only JPG, PNG or PDF files are allowed.");
        continue;
      }
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        setAppealError(`"${f.name}" is larger than ${MAX_FILE_MB} MB.`);
        continue;
      }
      if (next.length >= MAX_FILES) {
        setAppealError(`You can attach up to ${MAX_FILES} files.`);
        break;
      }
      next.push(f);
    }
    setFiles(next);
    if (fileInput.current) fileInput.current.value = "";
  };

  const submitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppealError("");
    if (message.trim().length < MIN_MESSAGE) {
      setAppealError(`Please explain in at least ${MIN_MESSAGE} characters.`);
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("email", account.email);
      form.append("password", appealPassword);
      form.append("message", message.trim());
      files.forEach((f) => form.append("evidence[]", f));

      const res = await api.post("/auth/appeal", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = res.data?.data ?? res.data;
      setAppeal({ status: "pending", submittedAt: data?.submitted_at ?? new Date().toISOString(), adminResponse: null });
      setShowForm(false);
      setMessage("");
      setAppealPassword("");
      setFiles([]);
      toast.success("Appeal submitted. An administrator will review it.");
    } catch (err) {
      setAppealError(getApiErrorMessage(err, "Couldn't submit your appeal."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12 relative">
      <Link
        to="/login"
        className="absolute top-5 left-5 inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full text-foreground/80 hover:bg-white hover:shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back to login
      </Link>

      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-sm p-8 flex flex-col gap-6 animate-fade-up">
        <div>
          <Logo />
        </div>

        <div className="flex items-start gap-3">
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
              isSuspended ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600"
            }`}
          >
            {isSuspended ? <ShieldAlert className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-heading font-bold">
              {isSuspended ? "Your account has been suspended" : "Your account is deactivated"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 break-all">{account.email}</p>
          </div>
        </div>

        {isSuspended ? (
          <>
            <div className="rounded-xl border border-border divide-y divide-border text-sm">
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Reason</p>
                <p className="text-foreground break-words">{account.reason?.trim() || "No reason was recorded for this suspension."}</p>
              </div>
              {formatDate(account.suspendedAt) && (
                <div className="p-4 flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Suspended on</span>
                  <span className="font-medium">{formatDate(account.suspendedAt)}</span>
                </div>
              )}
            </div>

            {/* Appeal status */}
            {appeal?.status === "pending" && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-sm flex gap-2">
                <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-300">Appeal under review</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Submitted{formatDate(appeal.submittedAt) ? ` on ${formatDate(appeal.submittedAt)}` : ""}. You'll be able to
                    log in again if it's approved.
                  </p>
                </div>
              </div>
            )}
            {appeal?.status === "denied" && (
              <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-4 text-sm flex gap-2">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-destructive" />
                <div className="min-w-0">
                  <p className="font-semibold text-destructive">Your last appeal was rejected</p>
                  {appeal.adminResponse && <p className="text-xs text-muted-foreground mt-0.5 break-words">{appeal.adminResponse}</p>}
                  <p className="text-xs text-muted-foreground mt-1">You can submit a new appeal with more information.</p>
                </div>
              </div>
            )}
            {appeal?.status === "approved" && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm flex gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <p className="font-semibold text-emerald-700">Your appeal was approved. Go back to login to continue.</p>
              </div>
            )}

            {(
              <div className="rounded-xl bg-muted/50 p-4 text-sm space-y-2">
                <p className="font-semibold flex items-center gap-1.5">
                  <Info className="w-4 h-4" /> What this means
                </p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>You can't log in or use the platform while the suspension is in place.</li>
                  <li>Only an administrator can lift a suspension. You can ask for a review by submitting an appeal.</li>
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {canAppeal && appeal?.status !== "approved" && (
                <Button className="w-full" size="lg" onClick={() => setShowForm(true)}>
                  <Send className="w-4 h-4 mr-2" /> {appeal?.status === "denied" ? "Submit a new appeal" : "Appeal this suspension"}
                </Button>
              )}
              <Button asChild variant="outline" className="w-full" size="lg">
                <Link to="/login">Back to login</Link>
              </Button>
            </div>

            {showForm && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
                  <div>
                    <h3 className="font-heading font-bold text-base">
                      {appeal?.status === "denied" ? "Submit a new appeal" : "Appeal this suspension"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      An administrator will review your appeal. You'll see the result on this page when you log in.
                    </p>
                  </div>
              <form onSubmit={submitAppeal} className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appeal-message">Why should this suspension be lifted?</Label>
                  <Textarea
                    id="appeal-message"
                    rows={5}
                    maxLength={MAX_MESSAGE}
                    placeholder="Explain what happened and why you believe the suspension was a mistake."
                    value={message}
                    onChange={(e) => { setMessage(e.target.value); setAppealError(""); }}
                  />
                  <p className="text-[11px] text-muted-foreground text-right">
                    {message.trim().length}/{MAX_MESSAGE} (min {MIN_MESSAGE})
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>
                    Attachments <span className="text-muted-foreground font-normal">(optional: photos or PDF files, up to {MAX_FILES}, {MAX_FILE_MB} MB each)</span>
                  </Label>
                  {previews.length > 0 && (
                    <div className="grid grid-cols-5 gap-2">
                      {previews.map((src, i) => (
                        <div key={`${files[i].name}-${i}`} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                          {src ? (
                            <img src={src} alt={files[i].name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-muted/50 p-1 text-center">
                              <FileText className="w-5 h-5 text-muted-foreground" />
                              <span className="text-[9px] leading-tight text-muted-foreground break-all line-clamp-2">{files[i].name}</span>
                            </div>
                          )}
                          <button
                            type="button"
                            aria-label={`Remove ${files[i].name}`}
                            onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => pickFiles(e.target.files)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={files.length >= MAX_FILES}
                    onClick={() => fileInput.current?.click()}
                  >
                    <Paperclip className="w-4 h-4" /> Add photos or files ({files.length}/{MAX_FILES})
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appeal-password">Confirm your password</Label>
                  <div className="relative">
                    <Input
                      id="appeal-password"
                      type={showPassword ? "text" : "password"}
                      className="pr-10 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                      placeholder="••••••••"
                      value={appealPassword}
                      onChange={(e) => { setAppealPassword(e.target.value); setAppealError(""); }}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Needed to prove the appeal comes from the account owner.</p>
                </div>

                {appealError && <p className="text-xs text-destructive">{appealError}</p>}

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowForm(false); setAppealError(""); }} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 gap-1.5" disabled={submitting || !appealPassword}>
                    <Send className="w-4 h-4" /> {submitting ? "Submitting…" : "Submit appeal"}
                  </Button>
                </div>
              </form>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="rounded-xl border border-border p-4 text-sm space-y-1">
              <p className="text-muted-foreground">
                You deactivated this account
                {formatDate(account.deactivatedAt) ? ` on ${formatDate(account.deactivatedAt)}` : ""}. Your data is kept,
                and you can turn the account back on at any time.
              </p>
            </div>

            <form onSubmit={handleReactivate} className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label htmlFor="reactivate-password">Confirm your password to reactivate</Label>
                <div className="relative">
                  <Input
                    id="reactivate-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pr-10 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>

              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-800 dark:text-amber-300 flex gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  After you reactivate, you won't be able to deactivate again for{" "}
                  <strong>{REDEACTIVATE_COOLDOWN_DAYS} days</strong>.
                </span>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={submitting || !password}>
                {submitting ? "Reactivating…" : "Reactivate my account"}
              </Button>
              <Button asChild variant="outline" className="w-full" size="lg" type="button">
                <Link to="/login">Back to login</Link>
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
