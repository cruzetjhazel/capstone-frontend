import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRole } from "@/contexts/RoleContext";
import { useBookings } from "@/hooks/useBookings";
import api, { getApiErrorMessage } from "@/lib/api";
import toast from "react-hot-toast";
import { X, Camera, Key, AlertTriangle, CheckCircle2 } from "lucide-react";

// Accepts 09XXXXXXXXX or +639XXXXXXXXX (Philippine mobile format).
const PH_PHONE_REGEX = /^(?:\+63|0)9\d{9}$/;
const isValidPhPhone = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  const normalized = trimmed.replace(/[\s-]/g, "");
  return PH_PHONE_REGEX.test(normalized);
};

interface ProfileOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileOverlay({ open, onClose }: ProfileOverlayProps) {
  const { user, refreshProfilePhoto } = useRole();
  const navigate = useNavigate();
  const { data: bookings = [] } = useBookings(user?.email);

  const upcomingBookings = bookings.filter((b) =>
    ["pending", "accepted", "confirmed"].includes(b.status)
  ).length;
  const pendingPayments = bookings.filter((b) => b.paymentStatus === "pending_verification").length;

  const emptyProfile = { name: "", email: "", phone: "", birthday: "", gender: "", address: "" };
  const [initialData, setInitialData] = useState(emptyProfile);
  const [formData, setFormData] = useState(emptyProfile);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const phoneError = !isValidPhPhone(formData.phone)
    ? "Enter a valid PH mobile number, e.g. 09171234567 or +639171234567."
    : "";

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
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Unable to load your profile."));
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (open) fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    if (phoneError) {
      toast.error(phoneError);
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    const formPayload = new FormData();
    formPayload.append("name", formData.name);
    formPayload.append("phone_number", formData.phone);
    formPayload.append("birthday", formData.birthday);
    formPayload.append("gender", formData.gender);
    formPayload.append("address", formData.address);
    if (avatarFile) formPayload.append("profile_photo", avatarFile);

    try {
      const res = await api.patch("/client/profile", formPayload, {
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
      refreshProfilePhoto(p.profile_photo_url ?? null);
      toast.success("Profile updated successfully!");
      onClose();
    } catch (err) {
      const msg = getApiErrorMessage(err, "Failed to update profile.");
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(initialData);
    setAvatarFile(null);
    setAvatarPreview(null);
    setSaveError(null);
    onClose();
  };

  const handlePasswordConfirm = async () => {
    if (!passwordData.current) { toast.error("Please enter your current password."); return; }
    if (passwordData.new.length < 8) { toast.error("New password must be at least 8 characters long."); return; }
    if (passwordData.new !== passwordData.confirm) { toast.error("New passwords do not match."); return; }

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
    onClose();
    navigate("/login");
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-card w-full max-w-2xl rounded-2xl border border-border/50 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">

          {/* Warm photography-inspired header */}
          <div className="relative shrink-0 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 border-b border-primary/10 px-6 pt-6 pb-8">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full border-[12px] border-primary/10" />
            <button
              onClick={handleCancel}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-xl font-heading font-bold text-foreground">My Profile</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Manage your personal information</p>

            <div className="flex items-center gap-4 mt-5">
              <div className="w-16 h-16 rounded-full bg-primary/15 border-2 border-card shadow-sm flex items-center justify-center text-primary font-heading font-bold text-lg overflow-hidden shrink-0">
                {(avatarPreview || avatarUrl) ? (
                  <img src={avatarPreview ?? avatarUrl ?? ""} alt={formData.name} className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-heading font-semibold text-foreground truncate">{formData.name || "Your name"}</p>
                <p className="text-xs text-muted-foreground truncate">{formData.email}</p>
                <label htmlFor="avatar-input" className="inline-block mt-1.5">
                  <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                    <span>Change Photo</span>
                  </Button>
                </label>
                <input id="avatar-input" type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleAvatarChange} />
              </div>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto p-6 space-y-6">
            {isLoadingProfile ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading your profile…</p>
            ) : (
              <>
                <div className="space-y-4">
                  <p className="text-xs font-bold text-muted-foreground tracking-wider uppercase">Personal Information</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Full Name</Label>
                      <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Contact Number</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="09171234567"
                        className={phoneError ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                      {phoneError && <p className="text-[11px] text-destructive">{phoneError}</p>}
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
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs">Home Address</Label>
                      <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* Compact account & security row — no separate "Account Settings" page/heading */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-border/50">
                  <div>
                    <p className="text-xs font-semibold">Account & Security</p>
                    <p className="text-[11px] text-muted-foreground">Password and account status</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowPasswordModal(true)}>
                      <Key className="w-3.5 h-3.5 mr-1.5" /> Change Password
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDeactivateClick}>
                      Deactivate
                    </Button>
                  </div>
                </div>

                {saveError && (
                  <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{saveError}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer actions */}
          <div className="shrink-0 border-t border-border px-6 py-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>Cancel</Button>
            <Button size="sm" onClick={handleSaveProfile} disabled={isSaving || !!phoneError || isLoadingProfile}>
              {isSaving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-xl shadow-2xl border border-border/50 p-6 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Key className="w-5 h-5" />
              <h3 className="text-base font-heading font-bold">Change Password</h3>
            </div>
            <div className="space-y-3">
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
            <div className="flex gap-2 justify-end pt-2">
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

      {/* Blocked deactivation modal */}
      {showBlockedModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border/50 p-6">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-heading font-bold text-lg mb-2">You can't deactivate your account right now</h3>
            <p className="text-sm text-muted-foreground mb-4">You still have active commitments linked to your account:</p>
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
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowBlockedModal(false)}>Got it</Button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivation confirmation modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-destructive/30 p-6 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-heading font-bold">Deactivate Account</h3>
            </div>
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
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowDeactivateModal(false)} disabled={isDeactivating}>Cancel</Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={confirmDeactivateAccount}
                disabled={isDeactivating || deactivateConfirmWord !== "DEACTIVATE"}
              >
                {isDeactivating ? "Deactivating account..." : "Confirm Deactivation"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-xl shadow-2xl border border-border/50 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-bold text-xl mb-2">Account Deactivated</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Your account has been successfully deactivated. Your information has been safely preserved. Thank you for using SnapBook.
            </p>
            <Button size="sm" className="w-full" onClick={handleFinalizeLogout}>Continue</Button>
          </div>
        </div>
      )}
    </>
  );
}
