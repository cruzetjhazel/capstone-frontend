import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRole, getRoleDashboardPath } from "@/contexts/RoleContext";
import { getApiErrorMessage } from "@/lib/api";
import Logo from "@/components/Logo";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useRole();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const loggedIn = await login(email, password);
      navigate(getRoleDashboardPath(loggedIn.role));
    } catch (err) {
      setError(getApiErrorMessage(err, "Invalid email or password."));
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
            Manage your photography bookings effortlessly
          </h1>
          <p className="text-white/60 text-lg leading-relaxed">
            Streamline scheduling, payments, and client communication — all in one place.
          </p>
        </div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white/5" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative bg-white text-foreground">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="lg:hidden mb-10">
            <Logo />
          </div>

          <h2 className="text-2xl font-heading font-bold mb-1">Welcome back</h2>
          <p className="text-muted-foreground mb-6">Sign in to your account</p>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="client@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
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
              {error && <p className="text-xs text-destructive">{error}</p>}
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
    </div>
  );
}
