import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, KeyRound, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api, { getApiErrorMessage } from "@/lib/api";
import Logo from "@/components/Logo";
import toast from "react-hot-toast";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // These two come from the link Laravel's Password::sendResetLink() generates —
  // the backend's Password::reset() call requires both to look up and validate the token.
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const missingLinkParams = !token || !email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== passwordConfirmation) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      toast.success("Password has been reset. Please sign in with your new password.");
      navigate("/login");
    } catch (err) {
      const message = getApiErrorMessage(err, "This reset link is invalid or has expired.");
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white relative text-foreground">
      <Link
        to="/"
        className="absolute top-5 left-5 z-20 inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full bg-white/80 backdrop-blur border border-border text-foreground/80 hover:bg-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to website
      </Link>

      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center bg-gradient-to-br from-[#1a1006] via-[#2a1810] to-[#4a2c1e] text-white">
        <div className="relative z-10 px-16 max-w-lg animate-fade-up">
          <Logo onDark className="mb-8" />
          <h1 className="text-4xl font-heading font-bold leading-tight mb-4">
            Choose a new password
          </h1>
          <p className="text-white/60 text-lg leading-relaxed">
            Pick something secure you haven't used before on this account.
          </p>
        </div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white/5" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative bg-white text-foreground animate-fade-in">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="lg:hidden mb-10">
            <Logo />
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-bold">Reset your password</h2>
              {email && <p className="text-xs text-muted-foreground">for {email}</p>}
            </div>
          </div>

          {missingLinkParams ? (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              <ShieldX className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                This link is missing required information. Please use the link from your password reset email, or
                {" "}
                <Link to="/login" className="underline font-medium">request a new one</Link>.
              </span>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pr-10"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="passwordConfirmation">Confirm New Password</Label>
                <Input
                  id="passwordConfirmation"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={passwordConfirmation}
                  onChange={(e) => { setPasswordConfirmation(e.target.value); setError(""); }}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="min-h-[1.25rem]">
                {error && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive">
                    <ShieldX className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <Button className="w-full" size="lg" type="submit" disabled={submitting}>
                {submitting ? "Resetting…" : "Reset Password"}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered your password?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
