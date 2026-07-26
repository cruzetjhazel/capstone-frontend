import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRole } from "@/contexts/RoleContext";
import toast, { Toaster } from "react-hot-toast";
import { 
  User, ShieldCheck, Map, Bell, Lock, 
  AlertTriangle, Star, Camera, Eye, CheckCircle2
} from "lucide-react";

export default function Profile() {
  const { user } = useRole();
  const navigate = useNavigate();

  // Simulated active commitments state[cite: 21]
  const [activeCommitments, setActiveCommitments] = useState({
    upcomingBookings: 2,
    pendingPayments: 0,
  });

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const initialData = {
    displayName: "Juan D.",
    name: user?.name || "Juan dela Cruz",
    email: user?.email || "juan.delacruz@gmail.com",
    phone: "+63 917 123 4567",
    birthday: "1995-06-15",
    gender: "Male",
    address: "Zone 5, Bulan, Sorsogon",
    defaultContactName: "Juan dela Cruz",
    defaultPhone: "+63 917 123 4567",
    defaultEmail: "juan.delacruz@gmail.com",
    defaultEventAddress: "Zone 5, Bulan, Sorsogon",
    preferredContact: "email",
    notifications: {
      bookingApproved: true,
      bookingDeclined: true,
      paymentReminder: true,
      upcomingPhotoshoot: true,
      galleryReady: true,
      newInvoice: true,
      studioResponse: true,
      reviewReminder: true
    },
    privacy: {
      allowContact: true,
      showProfilePic: true,
      promotional: false
    }
  };

  const [formData, setFormData] = useState(initialData);
  const [isDirty, setIsDirty] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: ""
  });

  // Modal States[cite: 21]
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Deactivation States[cite: 21]
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateConfirmWord, setDeactivateConfirmWord] = useState("");

  // Track if profile data has been modified[cite: 21]
  useEffect(() => {
    const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialData);
    setIsDirty(hasChanges);
  }, [formData, initialData]);

  // ==========================================
  // HANDLERS
  // ==========================================
  const handleNestedToggle = (category: 'notifications' | 'privacy', key: string) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !prev[category][key as keyof typeof prev[typeof category]]
      }
    }));
  };

  const confirmSaveProfile = async () => {
    setShowSaveModal(false);
    const loadingToast = toast.loading("Saving profile changes...");
    await new Promise(resolve => setTimeout(resolve, 800));
    toast.success("Profile updated successfully!", { id: loadingToast });
    setIsDirty(false);
  };

  const handleInitiatePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedNew = passwordData.new.trim();
    const sanitizedConfirm = passwordData.confirm.trim();

    if (!passwordData.current) {
      toast.error("Please enter your current password.");
      return;
    }
    if (sanitizedNew.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }
    if (sanitizedNew !== sanitizedConfirm) {
      toast.error("New passwords do not match.");
      return;
    }

    setShowPasswordModal(true);
  };

  const confirmPasswordChange = async () => {
    setShowPasswordModal(false);
    const loadingToast = toast.loading("Updating password...");
    await new Promise(resolve => setTimeout(resolve, 800));
    toast.success("Password updated successfully!", { id: loadingToast });
    setPasswordData({ current: "", new: "", confirm: "" });
  };

  // Trigger Deactivation Check[cite: 21]
  const handleDeactivateClick = () => {
    const hasCommitments = activeCommitments.upcomingBookings > 0 || activeCommitments.pendingPayments > 0;
    if (hasCommitments) {
      setShowBlockedModal(true);
    } else {
      setShowDeactivateModal(true);
      setDeactivateConfirmWord(""); // Reset input on open
    }
  };

  // Execute Deactivation Process[cite: 21]
  const confirmDeactivateAccount = async () => {
    setIsDeactivating(true);
    // Simulate Backend API processing
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Save status change to local storage simulation
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    localStorage.setItem("user", JSON.stringify({ ...currentUser, status: "deactivated" }));

    setIsDeactivating(false);
    setShowDeactivateModal(false);
    setShowSuccessModal(true);
  };

  // Complete Deactivation and Redirect[cite: 21]
  const handleFinalizeLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <DashboardLayout>
      <Toaster position="top-center" reverseOrder={false} />
      
      <div className="max-w-5xl mx-auto animate-fade-up pb-24">
        
        <div className="mb-6">
          <h1 className="text-2xl font-heading font-bold">Account Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your profile, preferences, and security.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* LEFT COLUMN: PROFILE SUMMARY */}
          <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4 sticky top-6">
            <div className="bg-card border border-border/50 rounded-xl p-5 text-center shadow-sm">
              <div className="w-20 h-20 rounded-full bg-primary/10 text-primary font-heading font-bold text-3xl flex items-center justify-center mx-auto relative mb-3">
                {formData.displayName.split(" ").map(n => n[0]).join("")}
                <button className="absolute bottom-0 right-0 bg-background border border-border p-1.5 rounded-full shadow-sm hover:bg-muted transition-colors">
                  <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
              
              <h3 className="font-heading font-bold text-lg">{formData.name}</h3>
              <div className="flex items-center justify-center gap-1 mt-0.5 mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-600">Verified Client</span>
              </div>

              <div className="flex items-center justify-center gap-1 text-accent mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-current" />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-border/50 pt-4">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Member</p>
                  <p className="text-xs font-semibold mt-0.5">July 2026</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Bookings</p>
                  <p className="text-xs font-semibold mt-0.5">12</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border/50 rounded-xl p-5 space-y-3 shadow-sm">
              <h3 className="font-heading font-bold text-sm border-b border-border/50 pb-2">Activity Overview</h3>
              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground text-xs">Upcoming</span>
                  <span className="font-semibold text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {activeCommitments.upcomingBookings}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground text-xs">Completed</span>
                  <span className="font-semibold text-xs">18</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground text-xs">Cancelled</span>
                  <span className="font-semibold text-xs text-destructive">1</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: SETTINGS PANELS */}
          <div className="flex-1 space-y-5 w-full">
            
            {/* Personal Information */}
            <section className="bg-card border border-border/50 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-heading font-bold text-sm flex items-center gap-2 border-b border-border/50 pb-2">
                <User className="w-4 h-4 text-primary" /> Personal Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Display Name</label>
                  <Input value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                  <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                  <Input type="email" disabled value={formData.email} className="h-9 text-sm bg-muted/40 cursor-not-allowed" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Contact Number</label>
                  <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Birthday</label>
                  <Input type="date" value={formData.birthday} onChange={e => setFormData({...formData, birthday: e.target.value})} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Gender</label>
                  <select 
                    value={formData.gender}
                    onChange={e => setFormData({...formData, gender: e.target.value})}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Home Address</label>
                  <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="h-9 text-sm" />
                </div>
              </div>
            </section>

            {/* Booking Defaults */}
            <section className="bg-card border border-border/50 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-heading font-bold text-sm flex items-center gap-2 border-b border-border/50 pb-2">
                <Map className="w-4 h-4 text-primary" /> Booking Defaults
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Default Contact Name</label>
                  <Input value={formData.defaultContactName} onChange={e => setFormData({...formData, defaultContactName: e.target.value})} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Default Phone</label>
                  <Input value={formData.defaultPhone} onChange={e => setFormData({...formData, defaultPhone: e.target.value})} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Default Event Address</label>
                  <Input value={formData.defaultEventAddress} onChange={e => setFormData({...formData, defaultEventAddress: e.target.value})} className="h-9 text-sm" />
                </div>
              </div>
            </section>

            {/* Notifications & Privacy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <section className="bg-card border border-border/50 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="font-heading font-bold text-sm flex items-center gap-2 border-b border-border/50 pb-2">
                  <Bell className="w-4 h-4 text-primary" /> Notifications
                </h3>
                <div className="space-y-2 pt-1 h-32 overflow-y-auto pr-2 custom-scrollbar">
                  {Object.entries(formData.notifications).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={value}
                        onChange={() => handleNestedToggle('notifications', key)}
                        className="accent-primary w-3.5 h-3.5 rounded"
                      />
                      <span className="text-xs font-medium">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="bg-card border border-border/50 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="font-heading font-bold text-sm flex items-center gap-2 border-b border-border/50 pb-2">
                  <Eye className="w-4 h-4 text-primary" /> Privacy
                </h3>
                <div className="space-y-3 pt-1">
                  {Object.entries(formData.privacy).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={value}
                        onChange={() => handleNestedToggle('privacy', key)}
                        className="accent-primary w-3.5 h-3.5 rounded"
                      />
                      <span className="text-xs font-medium">
                        {key === 'allowContact' ? "Allow studios to contact me" : 
                         key === 'showProfilePic' ? "Show profile picture" : 
                         "Receive promotional offers"}
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            </div>

            {/* Security */}
            <section className="bg-card border border-border/50 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-heading font-bold text-sm flex items-center gap-2 border-b border-border/50 pb-2">
                <Lock className="w-4 h-4 text-primary" /> Security
              </h3>

              <form onSubmit={handleInitiatePasswordChange} className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Current Password</label>
                    <Input type="password" value={passwordData.current} onChange={e => setPasswordData({...passwordData, current: e.target.value})} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">New Password (Min. 8 chars)</label>
                    <Input type="password" value={passwordData.new} onChange={e => setPasswordData({...passwordData, new: e.target.value})} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Confirm Password</label>
                    <Input type="password" value={passwordData.confirm} onChange={e => setPasswordData({...passwordData, confirm: e.target.value})} className="h-9 text-sm" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" variant="outline" size="sm" className="h-8 text-xs">
                    Update Password
                  </Button>
                </div>
              </form>
            </section>

            {/* Danger Zone */}
            <section className="border border-destructive/20 bg-destructive/5 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-heading font-bold text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Deactivate Account
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Temporarily disable your account. You can reactivate it by logging in again or contacting support.
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={handleDeactivateClick} className="h-8 text-xs shrink-0">
                Deactivate Account
              </Button>
            </section>

          </div>
        </div>

        {/* STICKY ACTION BAR */}
        {isDirty && (
          <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-md border-t border-border p-4 z-40 animate-in slide-in-from-bottom-5 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
              <p className="text-sm font-medium hidden sm:block">You have unsaved profile changes.</p>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <Button variant="outline" size="sm" onClick={() => { setFormData(initialData); setIsDirty(false); }}>
                  Discard
                </Button>
                <Button size="sm" onClick={() => setShowSaveModal(true)}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            MODALS
        ========================================== */}

        {/* Save Profile Modal */}
        {showSaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-card border border-border shadow-lg rounded-xl w-full max-w-sm p-6 animate-in zoom-in-95">
              <h3 className="font-heading font-bold text-lg mb-2">Save Profile Changes?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to update your profile information and preferences?
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" size="sm" onClick={() => setShowSaveModal(false)}>Cancel</Button>
                <Button size="sm" onClick={confirmSaveProfile}>Confirm Save</Button>
              </div>
            </div>
          </div>
        )}

        {/* Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-card border border-border shadow-lg rounded-xl w-full max-w-sm p-6 animate-in zoom-in-95">
              <h3 className="font-heading font-bold text-lg mb-2">Change Password?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to update your account password? You will need to use the new password on your next login.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" size="sm" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
                <Button size="sm" onClick={confirmPasswordChange}>Update Password</Button>
              </div>
            </div>
          </div>
        )}

        {/* Safeguard Modal: Active Commitments Block */}
        {showBlockedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-card border border-border shadow-lg rounded-xl w-full max-w-md p-6 animate-in zoom-in-95">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-lg mb-2">You can't deactivate your account right now</h3>
              <p className="text-sm text-muted-foreground mb-4">
                You still have active commitments linked to your account:
              </p>
              <ul className="text-sm space-y-2 mb-6 bg-muted/40 p-3 rounded-lg border border-border/50">
                {activeCommitments.upcomingBookings > 0 && (
                  <li className="flex items-center text-foreground font-medium">
                    • {activeCommitments.upcomingBookings} upcoming booking{activeCommitments.upcomingBookings > 1 ? 's' : ''}
                  </li>
                )}
                {activeCommitments.pendingPayments > 0 && (
                  <li className="flex items-center text-foreground font-medium">
                    • {activeCommitments.pendingPayments} pending payment{activeCommitments.pendingPayments > 1 ? 's' : ''}
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

        {/* Deactivation Confirmation Modal */}
        {showDeactivateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-card border border-destructive/20 shadow-lg rounded-xl w-full max-w-md p-6 animate-in zoom-in-95">
              <h3 className="font-heading font-bold text-lg mb-2 text-destructive flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Deactivate Account
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Are you sure you want to deactivate your account?
              </p>
              
              <ul className="text-sm text-muted-foreground mb-4 space-y-2 list-disc pl-5">
                <li>Your profile will be hidden.</li>
                <li>You won't receive new bookings.</li>
                <li>Your booking history and payments will be preserved.</li>
                <li>You can reactivate your account by contacting support or logging in again.</li>
              </ul>

              <div className="space-y-3 mb-6 bg-muted/50 p-4 rounded-lg border border-border">
                <label className="text-xs font-semibold text-muted-foreground">
                  To proceed, please type <strong className="text-foreground">DEACTIVATE</strong> below:
                </label>
                <Input 
                  value={deactivateConfirmWord}
                  onChange={(e) => setDeactivateConfirmWord(e.target.value)}
                  placeholder="DEACTIVATE"
                  className="h-9 text-sm font-medium"
                />
              </div>

              <div className="flex justify-end gap-3">
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
                  disabled={isDeactivating || deactivateConfirmWord !== "DEACTIVATE"}
                >
                  {isDeactivating ? "Deactivating account..." : "Deactivate Account"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-card border border-border shadow-xl rounded-xl w-full max-w-sm p-6 text-center animate-in zoom-in-95">
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
        )}

      </div>
    </DashboardLayout>
  );
}