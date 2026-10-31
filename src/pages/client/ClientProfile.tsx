import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRole } from "@/contexts/RoleContext";
import EmailVerifiedBadge from "@/components/EmailVerifiedBadge";
import { useBookings } from "@/hooks/useBookings";
import api, { getApiErrorMessage } from "@/lib/api";
import toast from "react-hot-toast";
import {
  User, Lock, Key,
  AlertTriangle, Camera, CheckCircle2, Mail, Phone, Clock,
  CalendarClock, CalendarCheck, ChevronRight
} from "lucide-react";

// Route of the client "My Bookings" page (set to your real path).
const BOOKINGS_PATH = "/bookings";



export default function Profile() {
  const { user, refreshProfilePhoto } = useRole();
  const navigate = useNavigate();
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings(user?.email);

  // Real counts, derived from actual bookings — used to (pre-)block deactivation
  // the same way the backend's DeactivateAccountAction already enforces server-side.
  const upcomingBookings = bookings.filter((b) =>
    ["pending", "accepted", "confirmed"].includes(b.status)
  ).length;
  // Counts for the Booking Overview card — same bookings already loaded above, no extra request.
  const completedBookings = bookings.filter((b) => b.status === "completed").length;
  const pendingPayments = bookings.filter((b) => b.paymentStatus === "pending_verification").length;

  // ==========================================
  // PROFILE DATA — loaded from the real backend (GET /client/profile)
  // ==========================================
  const emptyProfile = {
    name: "",
    email: "",
    phone: "",
    birthday: "",
    gender: "",
    address: "",
  };

  const [initialData, setInitialData] = useState(emptyProfile);
  const [formData, setFormData] = useState(emptyProfile);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deactivateAvailableOn, setDeactivateAvailableOn] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<string>("");
  const memberSinceLabel = memberSince
    ? new Date(memberSince).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—";
  const accountTypeLabel = user?.accountType
    ? user.accountType.charAt(0).toUpperCase() + user.accountType.slice(1)
    : "Client";
  const accountStatusLabel = accountStatus
    ? accountStatus.charAt(0).toUpperCase() + accountStatus.slice(1)
    : "—";
  const deactivateCooldownActive = !!deactivateAvailableOn && new Date(deactivateAvailableOn) > new Date();
  const deactivateAvailableLabel = deactivateAvailableOn
    ? new Date(deactivateAvailableOn).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "";
  const deactivateDaysLeft = deactivateAvailableOn
    ? Math.max(1, Math.ceil((new Date(deactivateAvailableOn).getTime() - Date.now()) / 86400000))
    : 0;

  // ==========================================
  // EMAIL / CONTACT NUMBER SELF-SERVICE CHANGE
  // ==========================================
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailChange, setEmailChange] = useState({ email: "", password: "" });
  const [emailChangeError, setEmailChangeError] = useState<string | null>(null);
  const [isRequestingEmail, setIsRequestingEmail] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [isCancellingEmail, setIsCancellingEmail] = useState(false);

  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneChange, setPhoneChange] = useState({ phone: "", password: "" });
  const [phoneChangeError, setPhoneChangeError] = useState<string | null>(null);
  const [isChangingPhone, setIsChangingPhone] = useState(false);

  // Refreshes ONLY the email / phone / pending-email fields so unsaved edits to the
  // rest of the form are never overwritten. Returns the fresh profile (or null).
  const refreshContact = async (opts?: { announceVerified?: boolean }) => {
    try {
      const res = await api.get("/client/profile");
      const p = res.data?.data ?? res.data;
      const email = p.email ?? "";
      const phone = p.phone_number ?? "";
      const pending: string | null = p.pending_email ?? null;

      if (opts?.announceVerified && pendingEmail && !pending && email.toLowerCase() === pendingEmail.toLowerCase()) {
        toast.success("Your new email address is verified and now active.", { id: "email-change-verified" });
      }
      setInitialData((d) => ({ ...d, email, phone }));
      setFormData((d) => ({ ...d, email, phone }));
      setPendingEmail(pending);
      return p;
    } catch {
      return null;
    }
  };

  // While a change is pending, re-check when the client returns to this tab
  // (e.g. after clicking the link in their new inbox) so the status updates by itself.
  useEffect(() => {
    if (!pendingEmail) return;
    const check = () => {
      if (document.visibilityState === "visible") refreshContact({ announceVerified: true });
    };
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    const timer = setInterval(check, 10000);
    return () => {
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingEmail]);

  const closeEmailModal = () => {
    setShowEmailModal(false);
    setEmailChange({ email: "", password: "" });
    setEmailChangeError(null);
  };

  const handleRequestEmailChange = async () => {
    if (!emailChange.email.trim()) {
      setEmailChangeError("Enter your new email address.");
      return;
    }
    if (!emailChange.password) {
      setEmailChangeError("Enter your current password to continue.");
      return;
    }
    setIsRequestingEmail(true);
    setEmailChangeError(null);
    try {
      await api.post("/client/change-email", {
        email: emailChange.email.trim(),
        current_password: emailChange.password,
      });
      toast.success("Verification link sent. Your current email stays active until you verify the new one.");
      closeEmailModal();
      await refreshContact();
    } catch (err) {
      setEmailChangeError(getApiErrorMessage(err, "Could not start the email change. Please try again."));
    } finally {
      setIsRequestingEmail(false);
    }
  };

  const handleResendEmailChange = async () => {
    setIsResendingEmail(true);
    try {
      await api.post("/client/change-email/resend");
      toast.success(`Verification link re-sent to ${pendingEmail}.`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not resend the verification email."));
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleCancelEmailChange = async () => {
    setIsCancellingEmail(true);
    try {
      await api.post("/client/change-email/cancel");
      setPendingEmail(null);
      toast.success("Email change cancelled.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not cancel the email change."));
    } finally {
      setIsCancellingEmail(false);
    }
  };

  const closePhoneModal = () => {
    setShowPhoneModal(false);
    setPhoneChange({ phone: "", password: "" });
    setPhoneChangeError(null);
  };

  const handleChangePhone = async () => {
    if (!phoneChange.phone.trim()) {
      setPhoneChangeError("Enter your new mobile number.");
      return;
    }
    if (!phoneChange.password) {
      setPhoneChangeError("Enter your current password to continue.");
      return;
    }
    setIsChangingPhone(true);
    setPhoneChangeError(null);
    try {
      await api.post("/client/change-contact-number", {
        phone_number: phoneChange.phone.trim(),
        current_password: phoneChange.password,
      });
      toast.success("Contact number updated successfully!");
      closePhoneModal();
      await refreshContact();
    } catch (err) {
      setPhoneChangeError(getApiErrorMessage(err, "Could not update your contact number."));
    } finally {
      setIsChangingPhone(false);
    }
  };

  const fetchProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const res = await api.get("/client/profile");
      const p = res.data?.data ?? res.data;
      const loaded = {
        name: p.name ?? "",
        email: p.email ?? "",
        phone: p.phone_number ?? "",
        birthday: p.birthday ?? "",
        gender: p.gender ?? "",
        address: p.address ?? "",
      };
      setInitialData(loaded);
      setFormData(loaded);
      setAvatarUrl(p.profile_photo_url ?? null);
      setDeactivateAvailableOn(p.deactivate_available_on ?? null);
      setPendingEmail(p.pending_email ?? null);
      setMemberSince(p.member_since ?? null);
      setAccountStatus(p.account_status ?? "");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Unable to load your profile."));
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialData) || !!avatarFile;
    setIsDirty(hasChanges);
  }, [formData, initialData, avatarFile]);

  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" });

  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateConfirmWord, setDeactivateConfirmWord] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Profile photo must be under 2MB.");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async () => {

    setIsSaving(true);
    setSaveError(null);
    const formPayload = new FormData();
    formPayload.append("name", formData.name);
    formPayload.append("birthday", formData.birthday);
    formPayload.append("gender", formData.gender);
    formPayload.append("address", formData.address);
    if (avatarFile) formPayload.append("profile_photo", avatarFile);
    // PHP doesn't parse multipart bodies on real PATCH requests, so POST + spoof PATCH
    formPayload.append("_method", "PATCH");

    try {
      const res = await api.post("/client/profile", formPayload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const p = res.data?.data ?? res.data;
      const saved = {
        name: p.name ?? "",
        email: p.email ?? "",
        phone: p.phone_number ?? "",
        birthday: p.birthday ?? "",
        gender: p.gender ?? "",
        address: p.address ?? "",
      };
      setInitialData(saved);
      setFormData(saved);
      setAvatarUrl(p.profile_photo_url ?? null);
      setAvatarFile(null);
      setAvatarPreview(null);
      setPendingEmail(p.pending_email ?? null);
      refreshProfilePhoto(p.profile_photo_url ?? null); // updates the header immediately
      toast.success("Profile updated successfully!");
    } catch (err) {
      const msg = getApiErrorMessage(err, "Failed to update profile.");
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setFormData(initialData);
    setAvatarFile(null);
    setAvatarPreview(null);
    setSaveError(null);
  };

  // ⚠️ ASSUMPTION: field names (current_password/password/password_confirmation)
  // inferred from Laravel convention + ChangePasswordAction's execute(user, current, new)
  // signature — not confirmed against the real ChangePasswordRequest.php. Adjust
  // these three keys if your request validates different field names.
  const handlePasswordConfirm = async () => {
    if (!passwordData.current) {
      toast.error("Please enter your current password.");
      return;
    }
    if (passwordData.new.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }
    if (passwordData.new !== passwordData.confirm) {
      toast.error("New passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post("/client/change-password", {
        current_password: passwordData.current,
        password: passwordData.new,
        password_confirmation: passwordData.confirm,
      });
      toast.success("Password updated successfully!");
      setShowPasswordModal(false);
      setPasswordData({ current: "", new: "", confirm: "" });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update password."));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeactivateClick = () => {
    if (upcomingBookings > 0 || pendingPayments > 0) {
      setShowBlockedModal(true);
    } else {
      setShowDeactivateModal(true);
      setDeactivateConfirmWord("");
    }
  };

  // ⚠️ ASSUMPTION: confirmation field name inferred from the "DEACTIVATE" word
  // pattern already used elsewhere in this codebase (BookingCancellationTest-style
  // "type X to confirm" convention) — not confirmed against DeactivateAccountRequest.php.
  const confirmDeactivateAccount = async () => {
    setIsDeactivating(true);
    try {
      await api.post("/client/deactivate", { confirmation: deactivateConfirmWord });
      setShowDeactivateModal(false);
      setShowSuccessModal(true);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to deactivate account."));
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleFinalizeLogout = () => {
    navigate("/login");
  };

  if (isLoadingProfile) {
    return (
      <ClientLayout>
        <div className="max-w-4xl mx-auto py-16 text-center text-sm text-muted-foreground">Loading your profile…</div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>

      <div className="max-w-4xl mx-auto space-y-4 animate-fade-up pb-24 relative">

        {/* Hero banner — same treatment as My Bookings */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 border border-primary/10 p-4 sm:p-5">
          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full border-[16px] border-primary/5 sm:h-56 sm:w-56" />
          <div className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 rounded-full border-[10px] border-primary/10 sm:h-36 sm:w-36" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground">Account Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your profile, preferences, and security.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/activity">My Activity</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

          {/* IDENTITY — photo upload */}
          <div className="space-y-4 lg:sticky lg:top-6">
          <section className="bg-card rounded-xl card-shadow border border-border/50 p-4 flex flex-row lg:flex-col items-center gap-4 lg:text-center">
            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary border-2 border-primary/20 overflow-hidden shrink-0">
              {(avatarPreview || avatarUrl) ? (
                <img src={avatarPreview ?? avatarUrl ?? ""} alt={formData.name} className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-7 h-7" />
              )}
            </div>
            <div className="min-w-0 space-y-2">
              <div>
                <p className="font-heading font-semibold text-sm truncate">{formData.name || "Your name"}</p>
                <div className="mt-1 flex lg:justify-center">
                  <EmailVerifiedBadge verified={user?.emailVerified} />
                </div>
              </div>
              <div>
                <label htmlFor="avatar-input">
                  <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                    <span>Upload Photo</span>
                  </Button>
                </label>
                <input id="avatar-input" type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleAvatarChange} />

              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            {/* ACCOUNT OVERVIEW */}
            <section className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
              <div className="bg-muted/30 px-4 py-3 border-b border-border/50 flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <h3 className="font-heading font-semibold text-sm">Account Overview</h3>
              </div>
              <dl className="p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Account type</dt>
                  <dd className="font-medium text-foreground">{accountTypeLabel}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="font-medium text-foreground inline-flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${accountStatus.toLowerCase() === "active" ? "bg-emerald-500" : "bg-amber-500"}`} />
                    {accountStatusLabel}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Member since</dt>
                  <dd className="font-medium text-foreground text-right">{memberSinceLabel}</dd>
                </div>
              </dl>
            </section>

            {/* BOOKING OVERVIEW */}
            <section className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
              <div className="bg-muted/30 px-4 py-3 border-b border-border/50 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-primary" />
                <h3 className="font-heading font-semibold text-sm">Booking Overview</h3>
              </div>
              <div className="p-2">
                <Link to={BOOKINGS_PATH} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40 transition-colors">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <CalendarClock className="w-4 h-4" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold leading-tight">{bookingsLoading ? "–" : upcomingBookings}</span>
                    <span className="block text-[11px] text-muted-foreground">Upcoming bookings</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </Link>
                <Link to={BOOKINGS_PATH} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40 transition-colors">
                  <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <CalendarCheck className="w-4 h-4" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold leading-tight">{bookingsLoading ? "–" : completedBookings}</span>
                    <span className="block text-[11px] text-muted-foreground">Completed bookings</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </Link>
              </div>
            </section>
          </div>
          </div>

          <div className="lg:col-span-2 space-y-4">

            {/* 1. PROFILE */}
            <section className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
              <div className="bg-muted/30 px-4 py-3 border-b border-border/50 flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <h3 className="font-heading font-semibold text-sm">Profile</h3>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Full Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Birthday</Label>
                  <Input type="date" value={formData.birthday} onChange={(e) => setFormData({ ...formData, birthday: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Gender</Label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Home Address</Label>
                  <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                </div>

                {/* Contact details — clients manage these themselves */}
                <div className="space-y-1.5 md:border-t md:border-border/50 md:pt-3 md:col-span-2 md:grid md:grid-cols-2 md:gap-x-4 md:space-y-0">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs">Email Address</Label>
                      <EmailVerifiedBadge verified={user?.emailVerified} />
                    </div>
                    <Input type="email" disabled value={formData.email} className="bg-muted/50 cursor-not-allowed" />
                    {user?.emailVerified === false && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400">
                        Check your inbox (or spam) for the verification link.
                      </p>
                    )}
                    {pendingEmail ? (
                      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 space-y-1.5">
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                          <Clock className="w-3.5 h-3.5 shrink-0 mt-px" />
                          <span>
                            Pending verification: <strong className="break-all">{pendingEmail}</strong>. Open the link we sent
                            there to finish. Your current email stays active until then.
                          </span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={handleResendEmailChange} disabled={isResendingEmail || isCancellingEmail}>
                            {isResendingEmail ? "Sending…" : "Resend link"}
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCancelEmailChange} disabled={isCancellingEmail || isResendingEmail}>
                            {isCancellingEmail ? "Cancelling…" : "Cancel change"}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    <Button type="button" variant="outline" size="sm" className="mt-1 h-8 text-xs" onClick={() => setShowEmailModal(true)}>
                      <Mail className="w-3.5 h-3.5 mr-1.5" /> {pendingEmail ? "Use a different email" : "Change Email"}
                    </Button>
                  </div>
                  <div className="space-y-1.5 mt-3 md:mt-0">
                    <Label className="text-xs">Contact Number</Label>
                    <Input
                      disabled
                      value={formData.phone}
                      placeholder="No number on file"
                      className="bg-muted/50 cursor-not-allowed"
                    />

                    <Button type="button" variant="outline" size="sm" className="mt-1 h-8 text-xs" onClick={() => setShowPhoneModal(true)}>
                      <Phone className="w-3.5 h-3.5 mr-1.5" /> Change Contact Number
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. SECURITY & ACCOUNT */}
            <section className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
              <div className="bg-muted/30 px-4 py-3 border-b border-border/50 flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                <h3 className="font-heading font-semibold text-sm">Security & Account</h3>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold">Password Management</p>
                  <p className="text-[11px] text-muted-foreground mb-2.5">Update the password used to sign in to your account.</p>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowPasswordModal(true)}>
                    <Key className="w-3.5 h-3.5 mr-1.5" /> Change Password
                  </Button>
                </div>

                <div className="sm:border-l sm:border-border/50 sm:pl-4">
                  <p className="text-xs font-semibold text-destructive">Danger Zone</p>
                  <p className="text-[11px] text-muted-foreground mb-2.5">
                    Temporarily disable your account. You can reactivate it by logging in again or contacting support.
                  </p>
                  <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={handleDeactivateClick}>
                    Deactivate Account
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* STICKY ACTION BAR — same pattern as StudioSettings.tsx */}
      {isDirty && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-md border-t border-border p-4 z-40 animate-in slide-in-from-bottom-5 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <div className="max-w-4xl mx-auto space-y-3">
            {saveError && (
              <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{saveError}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium hidden sm:block">You have unsaved profile changes.</p>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <Button variant="outline" size="sm" onClick={handleDiscard} disabled={isSaving}>
                  Discard
                </Button>
                <Button size="sm" onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-xl shadow-2xl border border-border/50 max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 text-primary p-6 pb-4 shrink-0">
              <Mail className="w-5 h-5" />
              <h3 className="text-base font-heading font-bold">Change Email</h3>
            </div>
            <div className="space-y-3 px-6 overflow-y-auto">
              <p className="text-xs text-muted-foreground">
                We'll send a verification link to the new address. Your current email ({formData.email}) stays active until you open it.
              </p>
              <div className="space-y-1">
                <Label className="text-xs">New Email Address</Label>
                <Input type="email" autoComplete="off" value={emailChange.email} onChange={(e) => setEmailChange({ ...emailChange, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Current Password</Label>
                <Input type="password" autoComplete="current-password" value={emailChange.password} onChange={(e) => setEmailChange({ ...emailChange, password: e.target.value })} />
              </div>
              {emailChangeError && (
                <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{emailChangeError}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end p-6 pt-4 shrink-0">
              <Button variant="outline" size="sm" disabled={isRequestingEmail} onClick={closeEmailModal}>Cancel</Button>
              <Button size="sm" onClick={handleRequestEmailChange} disabled={isRequestingEmail}>
                {isRequestingEmail ? "Sending…" : "Send Verification Link"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Change Contact Number Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-xl shadow-2xl border border-border/50 max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 text-primary p-6 pb-4 shrink-0">
              <Phone className="w-5 h-5" />
              <h3 className="text-base font-heading font-bold">Change Contact Number</h3>
            </div>
            <div className="space-y-3 px-6 overflow-y-auto">
              <div className="space-y-1">
                <Label className="text-xs">New Mobile Number</Label>
                <Input type="tel" inputMode="tel" placeholder="0917 123 4567" autoComplete="off" value={phoneChange.phone} onChange={(e) => setPhoneChange({ ...phoneChange, phone: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Current Password</Label>
                <Input type="password" autoComplete="current-password" value={phoneChange.password} onChange={(e) => setPhoneChange({ ...phoneChange, password: e.target.value })} />
              </div>
              {phoneChangeError && (
                <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{phoneChangeError}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end p-6 pt-4 shrink-0">
              <Button variant="outline" size="sm" disabled={isChangingPhone} onClick={closePhoneModal}>Cancel</Button>
              <Button size="sm" onClick={handleChangePhone} disabled={isChangingPhone}>
                {isChangingPhone ? "Saving…" : "Save Number"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-xl shadow-2xl border border-border/50 max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 text-primary p-6 pb-4 shrink-0">
              <Key className="w-5 h-5" />
              <h3 className="text-base font-heading font-bold">Change Password</h3>
            </div>
            <div className="space-y-3 px-6 overflow-y-auto">
              <div className="space-y-1">
                <Label className="text-xs">Current Password</Label>
                <Input type="password" value={passwordData.current} onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">New Password (Min 8 chars)</Label>
                <Input type="password" value={passwordData.new} onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Confirm New Password</Label>
                <Input type="password" value={passwordData.confirm} onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 justify-end p-6 pt-4 shrink-0">
              <Button variant="outline" size="sm" disabled={isChangingPassword} onClick={() => {
                setShowPasswordModal(false); setPasswordData({ current: "", new: "", confirm: "" });
              }}>Cancel</Button>
              <Button size="sm" onClick={handlePasswordConfirm} disabled={isChangingPassword}>
                {isChangingPassword ? "Updating…" : "Update Password"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Safeguard Modal: Active Commitments Block */}
      {showBlockedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border/50 max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-6 pb-0 overflow-y-auto">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-lg mb-2">You can't deactivate your account right now</h3>
              <p className="text-sm text-muted-foreground mb-4">
                You still have active commitments linked to your account:
              </p>
              <ul className="text-sm space-y-2 mb-6 bg-muted/40 p-3 rounded-lg border border-border/50">
                {upcomingBookings > 0 && (
                  <li className="flex items-center text-foreground font-medium">
                    • {upcomingBookings} upcoming booking{upcomingBookings > 1 ? "s" : ""}
                  </li>
                )}
                {pendingPayments > 0 && (
                  <li className="flex items-center text-foreground font-medium">
                    • {pendingPayments} pending payment{pendingPayments > 1 ? "s" : ""}
                  </li>
                )}
              </ul>
              <p className="text-xs text-muted-foreground mb-6">
                Please complete or cancel these commitments before deactivating your account.
              </p>
            </div>
            <div className="flex justify-end p-6 pt-4 shrink-0 border-t border-border/50">
              <Button size="sm" onClick={() => setShowBlockedModal(false)}>Got it</Button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivation Confirmation Modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-destructive/30 max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center gap-3 text-destructive p-6 pb-4 shrink-0">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-heading font-bold">Deactivate Account</h3>
            </div>

            <div className="space-y-4 px-6 overflow-y-auto">
              {deactivateCooldownActive && (
                <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    You recently reactivated your account. You can deactivate it again in{" "}
                    <strong>{deactivateDaysLeft} day{deactivateDaysLeft === 1 ? "" : "s"}</strong>{" "}
                    (on {deactivateAvailableLabel}).
                  </span>
                </div>
              )}
              <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
                <li>Your profile will be hidden.</li>
                <li>You won't receive new bookings.</li>
                <li>Your booking history and payments will be preserved.</li>
                <li>You can reactivate your account by contacting support or logging in again.</li>
              </ul>

              <div className="space-y-2">
                <Label className="text-xs">
                  To proceed, type <strong className="text-foreground">DEACTIVATE</strong> below:
                </Label>
                <Input
                  value={deactivateConfirmWord}
                  onChange={(e) => setDeactivateConfirmWord(e.target.value)}
                  placeholder="DEACTIVATE"
                  className="border-destructive/40 focus-visible:ring-destructive text-sm font-medium"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end p-6 pt-4 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeactivateModal(false)}
                disabled={isDeactivating}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={confirmDeactivateAccount}
                disabled={isDeactivating || deactivateCooldownActive || deactivateConfirmWord !== "DEACTIVATE"}
              >
                {isDeactivating ? "Deactivating account..." : "Confirm Deactivation"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-xl shadow-2xl border border-border/50 max-h-[85vh] flex flex-col overflow-hidden text-center">
            <div className="p-6 overflow-y-auto">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-xl mb-2">Account Deactivated</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Your account has been successfully deactivated. Your information has been safely preserved. Thank you for using SnapBook.
              </p>
              <Button size="sm" className="w-full" onClick={handleFinalizeLogout}>
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}

    </ClientLayout>
  );
}
