import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, KeyRound, Mail, X, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRole, getPostLoginPath } from "@/contexts/RoleContext";
import { getApiErrorMessage } from "@/lib/api";
import Logo from "@/components/Logo";
import toast from "react-hot-toast";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const { login } = useRole();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      // login() throws for invalid credentials or a suspended/deactivated account —
      // the backend enforces account_status before issuing a token.
      const loggedIn = await login(email, password);
      toast.success("Successfully logged in! Welcome back.");
      navigate(getPostLoginPath(loggedIn));
    } catch (err) {
      const errorMessage = getApiErrorMessage(err, "Invalid email or password.");
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInitiatePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error("Please enter your registered email address.");
      return;
    }
    setIsConfirmResetOpen(true);
  };

  const handleConfirmPasswordReset = async () => {
    setIsConfirmResetOpen(false);
    setSendingReset(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(`Password reset instructions sent to ${forgotEmail}`);
      setIsForgotPasswordOpen(false);
      setForgotEmail("");
    } catch {
      toast.error("Failed to send reset email. Please try again.");
    } finally {
      setSendingReset(false);
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
            Manage your photography bookings effortlessly
          </h1>
          <p className="text-white/60 text-lg leading-relaxed">
            Streamline scheduling, payments, and client communication — all in one place.
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

          <h2 className="text-2xl font-heading font-bold mb-1">Welcome back</h2>
          <p className="text-muted-foreground mb-6">Sign in to your account</p>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(true)}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pr-10"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  autoComplete="current-password"
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

            <div className="min-h-[1.25rem]">
              {error && (
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <ShieldX className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <Button className="w-full" size="lg" type="submit" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>

      {isForgotPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5 animate-in zoom-in-95 relative">
            <button
              onClick={() => setIsForgotPasswordOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-foreground text-base">Reset Your Password</h3>
                <p className="text-xs text-muted-foreground">Enter your email address to receive instructions.</p>
              </div>
            </div>

            <form onSubmit={handleInitiatePasswordReset} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="forgotEmail" className="text-xs">Registered Email Address</Label>
                <div className="relative">
                  <Input
                    id="forgotEmail"
                    type="email"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="pl-9"
                    required
                  />
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsForgotPasswordOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Send Reset Link
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isConfirmResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-foreground">Confirm Password Reset</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Are you sure you want to send password reset instructions to <strong className="text-foreground">{forgotEmail}</strong>?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsConfirmResetOpen(false)} disabled={sendingReset}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleConfirmPasswordReset} disabled={sendingReset}>
                {sendingReset ? "Sending…" : "Confirm & Send"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}