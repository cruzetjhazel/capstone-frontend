import { Camera, Eye, EyeOff, User, Aperture, ArrowLeft, ArrowRight, MapPin, Globe, Upload, Facebook, Instagram, Plus, X, Clock, CheckCircle2, ShieldCheck, FileText, Info } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useRole, UserRole, getRoleDashboardPath } from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";
import { sanitizeText, sanitizeEmail, sanitizePhone, sanitizeUrl, isValidEmail, isStrongPassword } from "@/lib/sanitize";
import { saveApplication } from "@/lib/pendingApprovals";

/* ============================================================
   Constants
============================================================ */
const SERVICE_OPTIONS = [
  "Wedding", "Debut", "Birthday", "Engagement", "Pre-Nuptial", "Graduation",
  "Family Portrait", "Couples Shoot", "Corporate Event", "Product Shoot",
  "Baptism", "Lifestyle", "Studio Portrait", "Outdoor Photoshoot",
];
const AREA_PRESETS = [
  "Bulan only",
  "Bulan and nearby municipalities",
  "Anywhere in Sorsogon",
  "Travel outside Sorsogon",
];
const SHOOTING_TYPES = ["Indoor", "Outdoor", "Event Coverage", "Drone / Aerial", "Hybrid (Indoor + Outdoor)"];
const HYBRID = "Hybrid (Indoor + Outdoor)";

type AccountType = "client" | "freelancer" | "studio";

const accountTypes: { type: AccountType; role: UserRole; label: string; desc: string; icon: typeof User }[] = [
  { type: "client", role: "client", label: "Client", desc: "Find & book photographers for your events", icon: User },
  { type: "freelancer", role: "studio", label: "Freelance Photographer", desc: "Offer your services independently", icon: Camera },
  { type: "studio", role: "studio", label: "Studio Owner", desc: "Manage a team and list your studio", icon: Aperture },
];

const STEP_TITLES: Record<AccountType, string[]> = {
  client: ["Account type", "Your details"],
  freelancer: ["Account type", "Account basics", "Photographer info", "About your service", "Verification", "Profile preview"],
  studio: ["Account type", "Account basics", "Studio info", "About your service", "Verification", "Profile preview"],
};

/* ============================================================
   Component
============================================================ */
export default function Register() {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const { loginAsRole } = useRole();
  const navigate = useNavigate();

  // Basics
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");

  // Studio / photographer info
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [yearsExp, setYearsExp] = useState("");
  const [yearsOperating, setYearsOperating] = useState("");
  const [teamSize, setTeamSize] = useState("");

  // Service
  const [services, setServices] = useState<string[]>([]);
  const [otherService, setOtherService] = useState("");
  const [areaCoverage, setAreaCoverage] = useState<string>("");
  const [shootingTypes, setShootingTypes] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [packages, setPackages] = useState<{ name: string; price: string; desc: string }[]>([
    { name: "", price: "", desc: "" },
  ]);

  // Verification docs (files stored as names only — real upload happens on backend later)
  const [govId, setGovId] = useState<File | null>(null);
  const [selfieId, setSelfieId] = useState<File | null>(null);
  const [businessPermit, setBusinessPermit] = useState<File | null>(null);
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);

  // Profile preview
  const [bio, setBio] = useState("");
  const [equipment, setEquipment] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");

  const totalSteps = accountType ? STEP_TITLES[accountType].length : 3;

  /* ---------- Helpers ---------- */
  const toggleServices = (v: string) =>
    setServices((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const toggleShooting = (v: string) => {
    // Hybrid auto-selects Indoor + Outdoor and locks them
    if (v === HYBRID) {
      if (shootingTypes.includes(HYBRID)) {
        setShootingTypes((prev) => prev.filter((x) => x !== HYBRID && x !== "Indoor" && x !== "Outdoor"));
      } else {
        setShootingTypes((prev) => Array.from(new Set([...prev, HYBRID, "Indoor", "Outdoor"])));
      }
      return;
    }
    // Indoor/Outdoor locked while Hybrid is on
    if ((v === "Indoor" || v === "Outdoor") && shootingTypes.includes(HYBRID)) return;
    setShootingTypes((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };

  /* ---------- Gating ---------- */
  const canStep1 = accountType !== null;
  const canStep2 =
    !!name.trim() &&
    isValidEmail(email) &&
    !!phone.trim() &&
    isStrongPassword(password) &&
    password === confirmPassword;

  const canStep3 =
    accountType === "studio"
      ? !!(businessName.trim() && address.trim() && yearsOperating && teamSize)
      : !!(businessName.trim() && address.trim() && yearsExp);

  const validPackages = packages.filter((p) => p.name.trim() && p.price.trim());
  const canStep4 =
    services.length > 0 &&
    !!areaCoverage &&
    shootingTypes.length > 0 &&
    !!priceMin &&
    !!priceMax &&
    Number(priceMax) >= Number(priceMin) &&
    validPackages.length > 0;

  const canStep5Verify =
    accountType === "studio"
      ? !!(govId && selfieId && businessPermit)
      : !!(govId && selfieId && portfolioFiles.length >= 3);

  const canStep6 = bio.trim().length >= 20 && (facebook.trim() || instagram.trim() || website.trim());

  /* ---------- Submit ---------- */
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canStep6 || !accountType || accountType === "client") return;

    const clean = {
      id: `app_${Date.now()}`,
      role: accountType,
      status: "pending" as const,
      submittedAt: new Date().toISOString(),
      name: sanitizeText(name, 100),
      email: sanitizeEmail(email),
      phone: sanitizePhone(phone),
      businessName: sanitizeText(businessName, 120),
      address: sanitizeText(address, 200),
      yearsExp: yearsExp || undefined,
      yearsOperating: yearsOperating || undefined,
      teamSize: teamSize || undefined,
      services: [
        ...services,
        ...otherService.split(",").map((s) => sanitizeText(s, 40)).filter(Boolean),
      ],
      areaCoverage,
      shootingTypes,
      priceMin,
      priceMax,
      packages: validPackages.map((p) => ({
        name: sanitizeText(p.name, 60),
        price: p.price,
        desc: sanitizeText(p.desc, 200),
      })),
      bio: sanitizeText(bio, 800),
      equipment: sanitizeText(equipment, 400),
      facebook: sanitizeUrl(facebook),
      instagram: sanitizeUrl(instagram),
      website: sanitizeUrl(website),
      docs: {
        governmentIdName: govId?.name,
        selfieWithIdName: selfieId?.name,
        businessPermitName: businessPermit?.name,
        portfolioSampleNames: portfolioFiles.map((f) => f.name),
      },
    };

    await saveApplication(clean);
    setSubmitted(true);
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canStep2) return;
    loginAsRole("client");
    navigate(getRoleDashboardPath("client"));
  };

  /* ============================================================
     Pending approval screen
  ============================================================ */
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6 relative">
        <BackLink />
        <div className="max-w-md w-full text-center bg-card border border-border rounded-2xl p-8 card-shadow animate-fade-up">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center mb-5">
            <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl font-heading font-bold mb-2">Account pending approval</h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            Thanks for signing up, <span className="font-medium text-foreground">{name}</span>!
            Your {accountType === "studio" ? "studio" : "photographer"} account is now under review.
            You'll receive an email at <span className="font-medium text-foreground">{email}</span> once verified.
          </p>
          <div className="grid gap-3 mb-6 text-left">
            {[
              "Admin reviews your uploaded ID & documents",
              "Portfolio and social links are verified",
              "You'll get full dashboard access once approved",
            ].map((t) => (
              <div key={t} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{t}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild variant="outline" className="flex-1"><Link to="/">Back to home</Link></Button>
            <Button asChild className="flex-1"><Link to="/login">Go to sign in</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     Form
  ============================================================ */
  const stepLabel = accountType ? STEP_TITLES[accountType][step - 1] : "Join the community";

  return (
    <div className="min-h-screen flex bg-white relative text-foreground">
      <BackLink />

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center bg-gradient-to-br from-[#1a1006] via-[#2a1810] to-[#4a2c1e] text-white">
        <div className="relative z-10 px-16 max-w-lg animate-fade-up">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading text-2xl font-bold text-white">Bulan</span>
          </div>
          <h1 className="text-4xl font-heading font-bold leading-tight mb-4">{stepLabel}</h1>
          <p className="text-white/60 text-lg leading-relaxed">
            {step === 1 && "Whether you're booking or showcasing your craft — Bulan connects talent with opportunity."}
            {step === 2 && "Set up your account with a few basic details."}
            {step === 3 && (accountType === "studio" ? "Tell us about your studio." : "Tell us about your photography practice.")}
            {step === 4 && "Define what services you offer and your pricing."}
            {step === 5 && "Upload documents so we can verify you're a real professional."}
            {step === 6 && "Polish what clients will see on your public profile."}
          </p>
        </div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white/5" />
      </div>

      {/* Right panel — white form area */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white text-foreground">
        <div className="w-full max-w-md animate-fade-up">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Camera className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-heading font-semibold text-lg">Bulan</span>
          </div>

          <StepIndicator step={step} total={totalSteps} />

          {/* ===== Step 1 ===== */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-heading font-bold mb-1">Create your account</h2>
              <p className="text-muted-foreground mb-6">Choose how you want to use SnapBook</p>

              <div className="space-y-3 mb-8">
                {accountTypes.map((a) => (
                  <button
                    key={a.type}
                    type="button"
                    onClick={() => setAccountType(a.type)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left",
                      accountType === a.type ? "border-primary bg-primary/5" : "border-border hover:border-primary/30",
                    )}
                  >
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                      accountType === a.type ? "bg-primary/10" : "bg-muted")}>
                      <a.icon className={cn("w-6 h-6", accountType === a.type ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <span className="font-semibold text-sm block">{a.label}</span>
                      <span className="text-xs text-muted-foreground">{a.desc}</span>
                    </div>
                  </button>
                ))}
              </div>

              <Button className="w-full" size="lg" disabled={!canStep1} onClick={() => setStep(2)}>
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* ===== Step 2 ===== */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-heading font-bold mb-1">Account basics</h2>
              <p className="text-muted-foreground mb-6">
                {accountType === "client" ? "Set up your account to start booking." : "Required information for your account."}
              </p>

              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                if (accountType === "client") return handleClientSubmit(e);
                if (canStep2) setStep(3);
              }}>
                <Field label={accountType === "studio" ? "Your full name (owner)" : "Full name"} required>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={100} />
                </Field>
                <Field label="Email" required>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" maxLength={254} />
                </Field>
                <Field label="Phone number" required>
                  <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+63 9XX XXX XXXX" maxLength={20} />
                </Field>

                <Field label="Password" required hint="Minimum 8 characters">
                  <PasswordInput value={password} onChange={setPassword} show={showPassword} setShow={setShowPassword} placeholder="Min. 8 characters" />
                </Field>
                <Field
                  label="Confirm password"
                  required
                  hint={confirmPassword && password !== confirmPassword ? "Passwords do not match" : undefined}
                >
                  <PasswordInput value={confirmPassword} onChange={setConfirmPassword} show={showConfirm} setShow={setShowConfirm} placeholder="Re-enter password" />
                </Field>

                <StepNav onBack={() => setStep(1)} nextLabel={accountType === "client" ? "Create account" : "Continue"} disabled={!canStep2} />
              </form>
            </div>
          )}

          {/* ===== Step 3 ===== */}
          {step === 3 && accountType !== "client" && (
            <div>
              <h2 className="text-2xl font-heading font-bold mb-1">
                {accountType === "studio" ? "Studio information" : "Photographer information"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {accountType === "studio" ? "Details about your studio business." : "Details about your photography practice."}
              </p>

              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (canStep3) setStep(4); }}>
                <Field label={accountType === "studio" ? "Studio / Business name" : "Photography brand name"} required>
                  <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                    placeholder={accountType === "studio" ? "e.g. Rivera Studio" : "e.g. Juan dela Cruz Photography"} maxLength={120} />
                </Field>

                <Field label={accountType === "studio" ? "Studio address" : "Based in"} required>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Zone 8, Bulan, Sorsogon" className="pl-9" maxLength={200} />
                  </div>
                </Field>

                {accountType === "studio" ? (
                  <>
                    <Field label="Years operating" required>
                      <Input type="number" min={0} value={yearsOperating} onChange={(e) => setYearsOperating(e.target.value)} placeholder="e.g. 4" />
                    </Field>
                    <Field label="Number of team members" required>
                      <Input type="number" min={1} value={teamSize} onChange={(e) => setTeamSize(e.target.value)} placeholder="e.g. 5" />
                    </Field>
                  </>
                ) : (
                  <Field label="Years of experience" required>
                    <Input type="number" min={0} value={yearsExp} onChange={(e) => setYearsExp(e.target.value)} placeholder="e.g. 3" />
                  </Field>
                )}

                <StepNav onBack={() => setStep(2)} nextLabel="Continue" disabled={!canStep3} />
              </form>
            </div>
          )}

          {/* ===== Step 4 ===== */}
          {step === 4 && accountType !== "client" && (
            <div>
              <h2 className="text-2xl font-heading font-bold mb-1">About your service</h2>
              <p className="text-muted-foreground mb-6">What you offer, where you cover, and pricing.</p>

              <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (canStep4) setStep(5); }}>
                <Field label="Services you offer" required>
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl border border-border bg-card">
                    {SERVICE_OPTIONS.map((s) => (
                      <label key={s} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/60 rounded-md p-1.5 transition-colors">
                        <Checkbox checked={services.includes(s)} onCheckedChange={() => toggleServices(s)} />
                        {s}
                      </label>
                    ))}
                  </div>
                  <Input value={otherService} onChange={(e) => setOtherService(e.target.value)} placeholder="Others (comma-separated)" className="mt-2" maxLength={200} />
                </Field>

                <Field label="Areas you cover" required>
                  <div className="grid gap-2">
                    {AREA_PRESETS.map((a) => (
                      <label key={a} className={cn(
                        "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm cursor-pointer transition-colors",
                        areaCoverage === a ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                      )}>
                        <input type="radio" name="area" className="accent-primary" checked={areaCoverage === a} onChange={() => setAreaCoverage(a)} />
                        {a}
                      </label>
                    ))}
                  </div>
                </Field>

                <Field label="Shooting type" required hint="Choosing Hybrid auto-selects Indoor + Outdoor">
                  <div className="flex flex-wrap gap-2">
                    {SHOOTING_TYPES.map((s) => {
                      const active = shootingTypes.includes(s);
                      const isLocked = (s === "Indoor" || s === "Outdoor") && shootingTypes.includes(HYBRID);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleShooting(s)}
                          disabled={isLocked}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                            active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted",
                            isLocked && "opacity-70 cursor-not-allowed",
                          )}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label="Price range (₱)" required>
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="number" min={0} value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="Min" />
                    <Input type="number" min={0} value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="Max" />
                  </div>
                </Field>

                <Field label="Fixed packages you offer" required hint="Add at least one complete package">
                  <div className="space-y-3">
                    {packages.map((pkg, i) => (
                      <div key={i} className="p-3 rounded-xl border border-border bg-card relative">
                        {packages.length > 1 && (
                          <button type="button" onClick={() => setPackages(packages.filter((_, j) => j !== i))}
                            className="absolute top-2 right-2 w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <Input placeholder="Package name" value={pkg.name} maxLength={60}
                            onChange={(e) => { const c = [...packages]; c[i].name = e.target.value; setPackages(c); }} />
                          <Input type="number" placeholder="Price ₱" value={pkg.price}
                            onChange={(e) => { const c = [...packages]; c[i].price = e.target.value; setPackages(c); }} />
                        </div>
                        <Input placeholder="What's included (short description)" value={pkg.desc} maxLength={200}
                          onChange={(e) => { const c = [...packages]; c[i].desc = e.target.value; setPackages(c); }} />
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" className="gap-1.5"
                      onClick={() => setPackages([...packages, { name: "", price: "", desc: "" }])}>
                      <Plus className="w-3.5 h-3.5" /> Add another package
                    </Button>
                  </div>
                </Field>

                <StepNav onBack={() => setStep(3)} nextLabel="Continue" disabled={!canStep4} />
              </form>
            </div>
          )}

          {/* ===== Step 5: Verification ===== */}
          {step === 5 && accountType !== "client" && (
            <div>
              <h2 className="text-2xl font-heading font-bold mb-1 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-primary" /> Verification
              </h2>
              <p className="text-muted-foreground mb-6">
                Help our admins confirm you're a real professional. Documents are private and reviewed by admin only.
              </p>

              <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (canStep5Verify) setStep(6); }}>
                <FileField
                  label="Government ID (front)"
                  required
                  hint="Any valid gov-issued ID (Passport, Driver's License, National ID, PhilSys, UMID…)"
                  file={govId}
                  onChange={setGovId}
                  accept="image/*,application/pdf"
                />

                <FileField
                  label="Selfie holding your ID"
                  required
                  hint="A clear photo of you holding the same ID next to your face"
                  file={selfieId}
                  onChange={setSelfieId}
                  accept="image/*"
                />

                {accountType === "studio" ? (
                  <FileField
                    label="Business permit / DTI registration"
                    required
                    hint="Upload your registered business permit, DTI, or barangay business clearance"
                    file={businessPermit}
                    onChange={setBusinessPermit}
                    accept="image/*,application/pdf"
                  />
                ) : (
                  <Field
                    label="Proof-of-work portfolio"
                    required
                    hint="Upload at least 3 sample photos of your own work (or paste your portfolio/FB link in the next step)"
                  >
                    <label className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/30 transition-colors cursor-pointer block">
                      <Upload className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {portfolioFiles.length > 0
                          ? `${portfolioFiles.length} file${portfolioFiles.length > 1 ? "s" : ""} selected`
                          : "Click to upload sample works"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Minimum 3 photos, JPG/PNG up to 10MB each</p>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => setPortfolioFiles(Array.from(e.target.files || []))}
                      />
                    </label>
                  </Field>
                )}

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground flex gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                  <p>
                    Admins cross-check your ID, business documents, and public social/website links before approval to prevent fake accounts.
                  </p>
                </div>

                <StepNav onBack={() => setStep(4)} nextLabel="Continue" disabled={!canStep5Verify} />
              </form>
            </div>
          )}

          {/* ===== Step 6: Profile preview ===== */}
          {step === 6 && accountType !== "client" && (
            <div>
              <h2 className="text-2xl font-heading font-bold mb-1">Profile preview</h2>
              <p className="text-muted-foreground mb-6">This is what clients will see on your public profile.</p>

              <form className="space-y-5" onSubmit={handleFinalSubmit}>
                <Field label={accountType === "studio" ? "Studio description" : "Short bio"} required hint="Minimum 20 characters">
                  <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What makes your work unique?" rows={3} maxLength={800} />
                </Field>

                {accountType === "freelancer" && (
                  <Field label="Equipment / gear">
                    <Textarea value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="e.g. Sony A7 IV, 50mm f/1.4, Godox AD200…" rows={2} maxLength={400} />
                  </Field>
                )}

                <Field label="Social media & website" required hint="At least one link required — used for verification too">
                  <div className="space-y-2">
                    <IconInput icon={Facebook} value={facebook} onChange={setFacebook} placeholder="Facebook page URL" />
                    <IconInput icon={Instagram} value={instagram} onChange={setInstagram} placeholder="Instagram handle or URL" />
                    <IconInput icon={Globe} value={website} onChange={setWebsite} placeholder="Website (optional)" />
                  </div>
                </Field>

                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/5 dark:border-amber-500/20 p-3 text-xs text-amber-800 dark:text-amber-300 flex gap-2">
                  <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>After submitting, your account will be <strong>pending admin approval</strong>. You'll be able to access your dashboard once verified.</p>
                </div>

                <StepNav onBack={() => setStep(5)} nextLabel="Submit for approval" disabled={!canStep6} />
              </form>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Small building blocks
============================================================ */
function BackLink() {
  return (
    <Link
      to="/"
      className="absolute top-5 left-5 z-20 inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full bg-card/90 backdrop-blur border border-border text-foreground hover:bg-card transition-colors shadow-sm"
    >
      <ArrowLeft className="w-4 h-4" /> Back to website
    </Link>
  );
}

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, idx) => {
        const s = idx + 1;
        return (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
              step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}>
              {s}
            </div>
            {s < total && <div className={cn("w-6 h-0.5 rounded-full transition-colors", step > s ? "bg-primary" : "bg-border")} />}
          </div>
        );
      })}
      <span className="text-xs text-muted-foreground ml-2">Step {step} of {total}</span>
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function StepNav({ onBack, nextLabel, disabled }: { onBack: () => void; nextLabel: string; disabled?: boolean }) {
  return (
    <div className="flex gap-3 pt-2">
      <Button type="button" variant="outline" onClick={onBack} className="gap-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>
      <Button type="submit" className="flex-1" size="lg" disabled={disabled}>
        {nextLabel} <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}

function PasswordInput({ value, onChange, show, setShow, placeholder }: {
  value: string; onChange: (v: string) => void; show: boolean; setShow: (b: boolean) => void; placeholder?: string;
}) {
  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={72} />
      <button type="button" onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function IconInput({ icon: Icon, value, onChange, placeholder }: {
  icon: typeof Facebook; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-9" maxLength={300} />
    </div>
  );
}

function FileField({ label, required, hint, file, onChange, accept }: {
  label: string; required?: boolean; hint?: string; file: File | null; onChange: (f: File | null) => void; accept?: string;
}) {
  return (
    <Field label={label} required={required} hint={hint}>
      <label className="border-2 border-dashed border-border rounded-xl p-4 hover:border-primary/30 transition-colors cursor-pointer flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", file ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
          {file ? <CheckCircle2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{file?.name || "Click to upload"}</p>
          <p className="text-xs text-muted-foreground">{file ? `${(file.size / 1024).toFixed(0)} KB` : "JPG, PNG, or PDF"}</p>
        </div>
        <input type="file" accept={accept} className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] || null)} />
      </label>
    </Field>
  );
}
