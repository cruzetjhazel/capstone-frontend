import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, CalendarDays, CheckCircle, AlertTriangle, AlertCircle, Check, Loader2, Lock } from "lucide-react";
import toast from "react-hot-toast";
import api, { getApiErrorMessage } from "@/lib/api";

type Settings = {
  login_max_attempts: number;
  login_lockout_seconds: number;
};

// Same limits the backend enforces (Admin\SettingsController::update).
const LIMITS = {
  login_max_attempts: { min: 3, max: 10 },
  login_lockout_seconds: { min: 30, max: 600 },
} as const;

const validate = (form: Record<keyof Settings, string>) => {
  const errors: Partial<Record<keyof Settings, string>> = {};
  (Object.keys(LIMITS) as (keyof Settings)[]).forEach((key) => {
    const raw = form[key].trim();
    const n = Number(raw);
    const { min, max } = LIMITS[key];
    if (raw === "" || !Number.isInteger(n)) errors[key] = "Enter a whole number.";
    else if (n < min || n > max) errors[key] = `Enter a number from ${min} to ${max}.`;
  });
  return errors;
};

// Read-only rules. These are enforced by the system and cannot be changed here.
const FIXED_RULES: { label: string; value: string }[] = [
  { label: "Photographer response time for a new request", value: "48 hours" },
  { label: "Payment deadline after a request is accepted", value: "24 hours" },
  { label: "Reschedule and modification requests", value: "At least 7 days before the event" },
  { label: "Report evidence files", value: "Up to 3 files, 2 MB each" },
  { label: "Portfolio images", value: "6 to 12 active images" },
  { label: "Online payment per booking", value: "One GCash payment, then onsite for the balance" },
];

export default function AdminSettings() {
  const [saved, setSaved] = useState<Settings | null>(null);
  const [defaults, setDefaults] = useState<Settings | null>(null);
  const [form, setForm] = useState<Record<keyof Settings, string>>({ login_max_attempts: "", login_lockout_seconds: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingSave, setIsConfirmingSave] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const toForm = (s: Settings) => ({
    login_max_attempts: String(s.login_max_attempts),
    login_lockout_seconds: String(s.login_lockout_seconds),
  });

  useEffect(() => {
    let cancelled = false;
    api
      .get("/admin/settings")
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data ?? res.data;
        setSaved(data.settings);
        setDefaults(data.defaults);
        setForm(toForm(data.settings));
      })
      .catch((err) => !cancelled && setLoadError(getApiErrorMessage(err, "Unable to load platform settings.")))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const errors = validate(form);
  const hasErrors = Object.keys(errors).length > 0;
  const isDirty = !!saved && (form.login_max_attempts !== String(saved.login_max_attempts) || form.login_lockout_seconds !== String(saved.login_lockout_seconds));

  const handleSaveClick = () => {
    setShowErrors(true);
    if (hasErrors) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setIsConfirmingSave(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await api.put("/admin/settings", {
        login_max_attempts: Number(form.login_max_attempts),
        login_lockout_seconds: Number(form.login_lockout_seconds),
      });
      const data = res.data?.data ?? res.data;
      setSaved(data.settings);
      setForm(toForm(data.settings));
      setShowErrors(false);
      setIsConfirmingSave(false);
      toast.success(res.data?.message ?? "Platform settings saved.");
    } catch (err) {
      setIsConfirmingSave(false);
      toast.error(getApiErrorMessage(err, "Couldn't save the settings."));
    } finally {
      setIsSaving(false);
    }
  };

  // Puts the default values in the form. Nothing is changed until the admin clicks Save.
  const handleReset = () => {
    if (!defaults) return;
    setForm(toForm(defaults));
    setShowErrors(false);
    toast("Default values filled in. Click Save Changes to apply them.", { icon: "🔄" });
  };

  const field = (key: keyof Settings, label: string, hint: string) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        inputMode="numeric"
        min={LIMITS[key].min}
        max={LIMITS[key].max}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        disabled={isLoading || isSaving}
        className={showErrors && errors[key] ? "border-destructive" : ""}
      />
      {showErrors && errors[key] ? (
        <p className="text-xs text-destructive">{errors[key]}</p>
      ) : (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-up pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div>
            <h1 className="text-2xl font-heading font-bold">Platform Settings</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Change the settings the system uses, and see the fixed rules it follows.</p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleReset} disabled={isLoading || !!loadError || isSaving}>
              Reset Defaults
            </Button>
            <Button size="sm" onClick={handleSaveClick} disabled={isLoading || !!loadError || isSaving || !isDirty} className="gap-1.5 shadow-sm">
              <Check className="w-4 h-4" /> Save Changes
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="py-12 text-center text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading settings...
          </div>
        )}

        {!isLoading && loadError && <div className="py-12 text-center text-destructive">{loadError}</div>}

        {!isLoading && !loadError && (
          <>
            {/* Editable: saved to the system */}
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold">Security & Access</h3>
                  <p className="text-xs text-muted-foreground">Applies to the Login page right away.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {field("login_max_attempts", "Login attempts limit", `Wrong passwords allowed per email before a lockout (${LIMITS.login_max_attempts.min} to ${LIMITS.login_max_attempts.max}).`)}
                {field("login_lockout_seconds", "Lockout time (seconds)", `How long the user must wait after too many attempts (${LIMITS.login_lockout_seconds.min} to ${LIMITS.login_lockout_seconds.max}).`)}
              </div>
            </div>

            {/* Read-only: rules the system always follows */}
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold flex items-center gap-2">
                    System Rules <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  </h3>
                  <p className="text-xs text-muted-foreground">Fixed by the system. These cannot be changed here.</p>
                </div>
              </div>

              <div className="divide-y divide-border/50 text-sm">
                {FIXED_RULES.map((rule) => (
                  <div key={rule.label} className="flex items-center justify-between gap-4 py-2.5">
                    <span className="text-muted-foreground">{rule.label}</span>
                    <span className="font-medium text-right">{rule.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-heading font-semibold">Verification Rules</h3>
              </div>
              <div className="divide-y divide-border/50 text-sm">
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <span className="text-muted-foreground">Admin approval for every photographer</span>
                  <span className="font-medium">Required</span>
                </div>
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <span className="text-muted-foreground">Documents</span>
                  <span className="font-medium text-right">Government ID, Selfie with ID, Business Permit (Studios)</span>
                </div>
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <span className="text-muted-foreground">Verified email</span>
                  <span className="font-medium text-right">Needed to submit an application, book, or be bookable</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Every saved change is recorded in the System Activity Logs.</span>
            </div>
          </>
        )}
      </div>

      {isConfirmingSave && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-card border border-border/50 rounded-xl shadow-2xl w-full max-w-sm flex flex-col animate-in zoom-in-95 duration-200 p-6 space-y-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-1">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-heading">Save Changes?</h3>
              <p className="text-xs text-muted-foreground">
                The new settings will apply to all users right away.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsConfirmingSave(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving…" : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
