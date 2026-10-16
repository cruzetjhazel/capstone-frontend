import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { useRole, getPostLoginPath } from "@/contexts/RoleContext";

export default function EmailVerified() {
  const [params] = useSearchParams();
  const { user, isLoading } = useRole();
  const status = params.get("status");
  const success = status === "success";

  // Tells any other open Bulan tab (same browser) to refresh its verified status.
  useEffect(() => {
    if (success) {
      try {
        localStorage.setItem("bulan_email_verified", String(Date.now()));
      } catch {
        /* storage unavailable: other tabs will still catch up on their own */
      }
    }
  }, [success]);

  const message = success
    ? "Your email has been verified. Thank you!"
    : status === "expired"
    ? "This verification link has expired. Log in and tap Resend to get a new one."
    : "This verification link is invalid. Log in and tap Resend to get a new one.";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white text-foreground">
      <div className="w-full max-w-sm text-center space-y-5">
        <div className="flex justify-center pb-3">
          <Logo />
        </div>
        <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${success ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
          {success ? <CheckCircle2 className="w-7 h-7" /> : <ShieldX className="w-7 h-7" />}
        </div>
        <h1 className="text-xl font-heading font-bold">{success ? "Email verified" : "Verification failed"}</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        {success && (
          <p className="text-xs text-muted-foreground">
            You can close this tab. Any other Bulan tab you have open will update automatically.
          </p>
        )}
        {!isLoading && (
          <Button asChild className="w-full" size="lg">
            <Link to={user ? getPostLoginPath(user) : "/login"}>
              {user ? "Continue" : "Log in"}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}