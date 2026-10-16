import { useEffect, useRef, useState } from "react";
import { MailWarning, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { useRole } from "@/contexts/RoleContext";
import api, { getApiErrorMessage } from "@/lib/api";

const RESEND_COOLDOWN = 60;

export default function VerifyEmailBanner() {
  const { user, refreshEmailVerification } = useRole();
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const needsVerification =
    !!user && user.emailVerified === false && user.accountType !== "administrator";

  // Always call the latest version of the refresh function without
  // restarting the timers below on every render.
  const refreshRef = useRef(refreshEmailVerification);
  refreshRef.current = refreshEmailVerification;

  // While the card is showing, re-check with the server so it disappears by
  // itself after the link is clicked (in this tab, another tab, or another window).
  useEffect(() => {
    if (!needsVerification) return;

    const check = async () => {
      if (document.visibilityState !== "visible") return;
      if (await refreshRef.current()) {
        toast.success("Email verified. Thank you!", { id: "email-verified" });
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "bulan_email_verified") check();
    };

    const timer = setInterval(check, 5000);
    window.addEventListener("focus", check);
    window.addEventListener("storage", onStorage);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", check);
      window.removeEventListener("storage", onStorage);
    };
  }, [needsVerification]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!needsVerification || dismissed || !user) return null;

  const resend = async () => {
    setSending(true);
    try {
      await api.post("/auth/email/resend");
      toast.success(`Verification email sent to ${user.email}. Check your inbox or spam.`);
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not send the email. Please try again."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md bg-card border border-border rounded-xl shadow-lg p-3 flex items-center gap-3">
      <MailWarning className="w-5 h-5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">Verify your email</p>
        <p className="text-xs text-muted-foreground">
          Open the link we sent to <strong className="text-foreground">{user.email}</strong> (check spam too).
          This updates automatically once you've verified.
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={resend} disabled={sending || cooldown > 0}>
        {sending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
      </Button>
      <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}