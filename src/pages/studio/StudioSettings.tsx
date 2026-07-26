import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "react-hot-toast";
import { 
  Camera, Image as ImageIcon, Briefcase, 
  Link2, ShieldCheck, CreditCard, Bell, Lock, AlertTriangle,
  FileText, Check, X, Upload, Plus, Key, Eye, QrCode, MapPin, Layers
} from "lucide-react";

export default function StudioSettings() {
  const { user } = useRole();
  const isFreelancer = user?.role === "studio" && user?.name && !user.name.toLowerCase().includes("studio");

  // Form State
  const [studioName, setStudioName] = useState(user?.name || (isFreelancer ? "Juan Rivera Photography" : "Rivera Creative Studio"));
  const [contactEmail] = useState(user?.email || "contact@riverastudio.ph");
  const [phone, setPhone] = useState("+63 917 123 4567");
  const [address, setAddress] = useState("123 Creative Hub, Bulan, Sorsogon");
  const [yearsOperating, setYearsOperating] = useState("5");
  const [teamMembers, setTeamMembers] = useState("3");
  const [minPrice, setMinPrice] = useState("5000");
  const [maxPrice, setMaxPrice] = useState("50000");
  const [bio, setBio] = useState("Capturing timeless memories and authentic moments across Bulan and Sorsogon.");

  // Social Links (System Rule: At least 1 of Facebook, Instagram, or Website required)
  const [facebook, setFacebook] = useState("facebook.com/riverastudio");
  const [instagram, setInstagram] = useState("@riverastudio");
  const [website, setWebsite] = useState("https://riverastudio.ph");

  // Coverage Area Requirement Options
  const [coverageArea, setCoverageArea] = useState("Bulan and Nearby Municipalities");

  // Shooting Types (Hybrid logic: checking Hybrid selects Indoor & Outdoor)
  const [shootingTypes, setShootingTypes] = useState<string[]>(["Indoor", "Outdoor", "Event Coverage"]);

  const handleShootingTypeChange = (type: string, checked: boolean) => {
    if (type === "Hybrid") {
      if (checked) {
        setShootingTypes((prev) => Array.from(new Set([...prev, "Hybrid", "Indoor", "Outdoor"])));
      } else {
        setShootingTypes((prev) => prev.filter((t) => t !== "Hybrid"));
      }
    } else {
      if (checked) {
        setShootingTypes((prev) => [...prev, type]);
      } else {
        setShootingTypes((prev) => prev.filter((t) => t !== type));
      }
    }
  };

  // Dynamic Tags / Categories
  const [specialties, setSpecialties] = useState(["Weddings", "Events", "Portraits", "Corporate"]);
  const [styles, setStyles] = useState(["Cinematic", "Moody", "Bright & Airy", "Documentary"]);

  // Modal States
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivateInput, setDeactivateInput] = useState("");
  
  const [uploadModal, setUploadModal] = useState<{ title: string } | null>(null);
  const [addModal, setAddModal] = useState<{ title: string; placeholder: string; type: "specialty" | "style" } | null>(null);
  const [newItemValue, setNewItemValue] = useState("");
  const [docModal, setDocModal] = useState<{ title: string; isQr?: boolean } | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Handlers with Hot Toast Notifications
  const handleSave = () => {
    // Validation requirement check: At least 1 social/website link required
    if (!facebook.trim() && !instagram.trim() && !website.trim()) {
      toast.error("At least one social link (Facebook, Instagram, or Website) is required.");
      setShowSaveConfirm(false);
      return;
    }

    if (Number(minPrice) > Number(maxPrice)) {
      toast.error("Minimum price cannot be higher than maximum price.");
      setShowSaveConfirm(false);
      return;
    }

    setShowSaveConfirm(false);
    toast.success("Studio settings updated successfully!");
  };

  const handleDeactivate = () => {
    if (deactivateInput.trim() !== "DEACTIVATE") {
      toast.error('Please type "DEACTIVATE" to confirm.');
      return;
    }
    setShowDeactivateConfirm(false);
    setDeactivateInput("");
    toast.error("Account deactivation requested. Administrator has been notified.");
  };

  const handleUploadConfirm = () => {
    toast.success(`${uploadModal?.title} updated successfully!`);
    setUploadModal(null);
  };

  const handleAddConfirm = () => {
    if (!newItemValue.trim()) {
      toast.error("Please enter a valid item name.");
      return;
    }
    if (addModal?.type === "specialty") {
      setSpecialties((prev) => [...prev, newItemValue.trim()]);
    } else if (addModal?.type === "style") {
      setStyles((prev) => [...prev, newItemValue.trim()]);
    }
    toast.success(`"${newItemValue}" added!`);
    setNewItemValue("");
    setAddModal(null);
  };

  const handlePasswordConfirm = () => {
    if (!currentPassword) {
      toast.error("Please enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    toast.success("Password changed successfully!");
    setShowPasswordModal(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-up pb-12 relative">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border/50 card-shadow">
          <div>
            <h1 className="text-2xl font-heading font-bold">{isFreelancer ? "Photographer" : "Studio"} Settings</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage your public profile, coverage, rates, payments, and account security.
            </p>
          </div>
          <Button onClick={() => setShowSaveConfirm(true)} className="gap-2">
            <Check className="w-4 h-4" /> Save All Changes
          </Button>
        </div>

        {/* 1. PUBLIC PROFILE & BRANDING */}
        <section className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
          <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            <h3 className="font-heading font-semibold">Public Profile & Branding</h3>
          </div>
          <div className="p-6 space-y-6">
            
            {/* Media Uploads */}
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="space-y-2">
                <Label>Profile Avatar</Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary border-2 border-primary/20">
                    <Camera className="w-7 h-7" />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setUploadModal({ title: "Upload Profile Avatar" })}>
                    Upload Avatar
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2 flex-1 w-full">
                <Label>Cover Banner</Label>
                <div 
                  onClick={() => setUploadModal({ title: "Upload Cover Banner" })}
                  className="h-20 w-full rounded-xl bg-muted border-2 border-dashed border-border flex items-center justify-center hover:bg-muted/80 transition-colors cursor-pointer"
                >
                  <div className="text-center flex flex-col items-center">
                    <ImageIcon className="w-5 h-5 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground font-medium">Click to upload banner photo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isFreelancer ? "Photographer Brand Name" : "Studio Name"}</Label>
                <Input value={studioName} onChange={(e) => setStudioName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Account Email (Read-Only)</Label>
                <Input value={contactEmail} disabled className="bg-muted/50 cursor-not-allowed" />
              </div>
              <div className="space-y-2">
                <Label>Public Contact Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Base Location / City</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Brand Bio / About Us</Label>
              <Textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>

            {/* Specialties & Photography Styles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <Label>Services Offered</Label>
                <div className="flex flex-wrap gap-2">
                  {specialties.map((s) => (
                    <span key={s} className="px-2.5 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-medium">{s}</span>
                  ))}
                  <button 
                    onClick={() => setAddModal({ title: "Add Service Category", placeholder: "e.g. Newborn / Maternity", type: "specialty" })}
                    className="px-2.5 py-1 rounded-full border border-dashed border-border text-xs text-muted-foreground hover:border-primary/50 transition-colors"
                  >
                    + Add
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Photography Aesthetic Styles</Label>
                <div className="flex flex-wrap gap-2">
                  {styles.map((s) => (
                    <span key={s} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{s}</span>
                  ))}
                  <button 
                    onClick={() => setAddModal({ title: "Add Aesthetic Style", placeholder: "e.g. Vintage Film", type: "style" })}
                    className="px-2.5 py-1 rounded-full border border-dashed border-border text-xs text-muted-foreground hover:border-primary/50 transition-colors"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>

            {/* Social Links Requirement */}
            <div className="pt-4 border-t border-border/50 space-y-2">
              <Label className="flex items-center gap-1.5"><Link2 className="w-4 h-4 text-primary" /> Social & Web Links <span className="text-xs text-muted-foreground font-normal">(At least 1 link required)</span></Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input placeholder="Facebook URL" value={facebook} onChange={(e) => setFacebook(e.target.value)} />
                <Input placeholder="Instagram Handle" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
                <Input placeholder="Website URL" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
            </div>
          </div>
        </section>

        {/* 2. BUSINESS DETAILS, COVERAGE & SHOOTING TYPES */}
        <section className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
          <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            <h3 className="font-heading font-semibold">Business Operations & Coverage</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isFreelancer ? "Years of Experience" : "Years Operating"}</Label>
                <Input type="number" value={yearsOperating} onChange={(e) => setYearsOperating(e.target.value)} />
              </div>
              {!isFreelancer && (
                <div className="space-y-2">
                  <Label>Number of Team Members</Label>
                  <Input type="number" value={teamMembers} onChange={(e) => setTeamMembers(e.target.value)} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Minimum Base Price (₱)</Label>
                <Input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Maximum Base Price (₱)</Label>
                <Input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
              </div>
            </div>

            {/* Coverage Area Selection */}
            <div className="space-y-2 pt-2">
              <Label className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" /> Coverage Area</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  "Bulan Only",
                  "Bulan and Nearby Municipalities",
                  "Anywhere in Sorsogon",
                  "Travel Outside Sorsogon"
                ].map((area) => (
                  <label key={area} className="flex items-center gap-2 p-2.5 rounded-lg border border-border/60 bg-muted/20 cursor-pointer hover:bg-muted/50 text-sm">
                    <input 
                      type="radio" 
                      name="coverageArea" 
                      checked={coverageArea === area} 
                      onChange={() => setCoverageArea(area)} 
                      className="text-primary focus:ring-primary" 
                    />
                    {area}
                  </label>
                ))}
              </div>
            </div>

            {/* Shooting Types (With Hybrid Logic) */}
            <div className="space-y-2 pt-2">
              <Label className="flex items-center gap-1.5"><Layers className="w-4 h-4 text-primary" /> Shooting Types Supported</Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {["Indoor", "Outdoor", "Event Coverage", "Drone / Aerial", "Hybrid"].map((type) => (
                  <label key={type} className="flex items-center gap-2 p-2.5 rounded-lg border border-border/60 bg-muted/20 cursor-pointer hover:bg-muted/50 text-xs font-medium">
                    <input 
                      type="checkbox" 
                      checked={shootingTypes.includes(type)} 
                      onChange={(e) => handleShootingTypeChange(type, e.target.checked)} 
                      className="rounded border-input text-primary focus:ring-primary h-4 w-4" 
                    />
                    {type}
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Note: Selecting 'Hybrid' automatically enables both Indoor and Outdoor coverage options.
              </p>
            </div>
          </div>
        </section>

        {/* 3. VERIFICATION DOCUMENTS */}
        <section className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
          <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <h3 className="font-heading font-semibold">Identity & Business Verification</h3>
          </div>
          <div className="p-6 flex flex-col md:flex-row gap-6 md:items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Verification Status:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Approved / Verified
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Your submitted documents are reviewed and approved by administrators.</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDocModal({ title: "Government ID" })}>
                <FileText className="w-4 h-4" /> Government ID
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDocModal({ title: "Selfie Holding ID" })}>
                <FileText className="w-4 h-4" /> Selfie ID
              </Button>
              {!isFreelancer && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDocModal({ title: "Business Permit / DTI Registration" })}>
                  <FileText className="w-4 h-4" /> Business Permit
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* 4. PAYMENT & GCASH QR */}
        <section className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
          <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <h3 className="font-heading font-semibold">Payment & GCash Account Details</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>GCash Account Name</Label>
                <Input defaultValue="Juan Rivera" />
              </div>
              <div className="space-y-2">
                <Label>GCash Account Number</Label>
                <Input defaultValue="0917 123 4567" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>GCash QR Code</Label>
              <div className="flex items-center gap-4">
                <div 
                  onClick={() => setDocModal({ title: "GCash QR Code", isQr: true })}
                  className="w-28 h-28 bg-muted border border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors group relative overflow-hidden"
                >
                  <QrCode className="w-8 h-8 text-muted-foreground/70 group-hover:scale-105 transition-transform mb-1" />
                  <span className="text-[10px] text-muted-foreground font-semibold">View QR</span>
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDocModal({ title: "GCash QR Code", isQr: true })}>
                    <Eye className="w-3.5 h-3.5" /> View
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setUploadModal({ title: "Upload New GCash QR Code" })}>
                    <Upload className="w-3.5 h-3.5" /> Replace QR
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. NOTIFICATIONS & SECURITY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
            <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-semibold">Notification Preferences</h3>
            </div>
            <div className="p-6 space-y-4">
              {[
                { title: "Email Notifications", desc: "General platform updates" },
                { title: "Booking Alerts", desc: "Instant alert on new booking requests" },
                { title: "Payment Alerts", desc: "Alerts when clients submit deposits" },
                { title: "Marketing & Trends", desc: "Tips for photographers" }
              ].map((item, i) => (
                <div key={item.title} className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked={i !== 3} className="sr-only peer" />
                    <div className="w-8 h-4 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
            <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-semibold">Security & Account</h3>
            </div>
            <div className="p-6 flex flex-col justify-between h-[calc(100%-57px)]">
              <div>
                <p className="text-xs font-semibold">Password Management</p>
                <p className="text-[11px] text-muted-foreground mb-3">Update your account password regularly.</p>
                <Button variant="outline" size="sm" onClick={() => setShowPasswordModal(true)}>
                  <Key className="w-3.5 h-3.5 mr-1.5" /> Change Password
                </Button>
              </div>

              <div className="pt-4 border-t border-border/50 mt-4">
                <p className="text-xs font-semibold text-destructive">Danger Zone</p>
                <p className="text-[11px] text-muted-foreground mb-3">Temporarily deactivate your profile from search results.</p>
                <Button variant="destructive" size="sm" onClick={() => setShowDeactivateConfirm(true)}>
                  Deactivate Account
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* MODAL: Save Confirmation */}
      {showSaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-xl shadow-2xl border border-border/50 p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-heading font-bold text-foreground">Save Studio Changes</h3>
              <p className="text-xs text-muted-foreground mt-1">Are you sure you want to update your public profile and settings?</p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <Button variant="outline" size="sm" className="w-full" onClick={() => setShowSaveConfirm(false)}>Cancel</Button>
              <Button size="sm" className="w-full" onClick={handleSave}>Confirm Save</Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Deactivate Account Confirmation */}
      {showDeactivateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-destructive/30 p-6 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-heading font-bold">Deactivate Account</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Deactivating will hide your profile from search results and halt incoming booking requests. Active bookings will remain intact.
            </p>
            <p className="text-xs font-medium text-foreground bg-muted p-2.5 rounded border border-border/50">
              Please type <span className="font-mono text-destructive font-bold select-all">DEACTIVATE</span> to confirm.
            </p>
            <Input 
              value={deactivateInput}
              onChange={(e) => setDeactivateInput(e.target.value)}
              placeholder="DEACTIVATE" 
              className="border-destructive/40 focus-visible:ring-destructive text-sm" 
            />
            
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => { setShowDeactivateConfirm(false); setDeactivateInput(""); }}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={handleDeactivate}>Confirm Deactivation</Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: File Upload */}
      {uploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-xl shadow-2xl border border-border/50 p-6 space-y-4 text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-heading font-bold text-foreground">{uploadModal.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">Select an image file (JPG or PNG, max 2MB).</p>
            </div>
            <div className="flex items-center justify-center w-full">
              <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 border-border bg-muted/20">
                <div className="flex flex-col items-center justify-center pt-4 pb-4">
                  <Upload className="w-5 h-5 mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                </div>
                <input id="dropzone-file" type="file" className="hidden" accept="image/png, image/jpeg" />
              </label>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <Button variant="outline" size="sm" className="w-full" onClick={() => setUploadModal(null)}>Cancel</Button>
              <Button size="sm" className="w-full" onClick={handleUploadConfirm}>Confirm Upload</Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Custom Specialty/Style */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-xl shadow-2xl border border-border/50 p-6 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Plus className="w-5 h-5" />
              <h3 className="text-base font-heading font-bold">{addModal.title}</h3>
            </div>
            <Input 
              placeholder={addModal.placeholder} 
              value={newItemValue} 
              onChange={(e) => setNewItemValue(e.target.value)}
              autoFocus 
            />
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => { setAddModal(null); setNewItemValue(""); }}>Cancel</Button>
              <Button size="sm" onClick={handleAddConfirm}>Add Item</Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Document Preview & QR Viewer */}
      {docModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border/50 flex flex-col overflow-hidden max-h-[80vh]">
            <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                {docModal.isQr ? <QrCode className="w-4 h-4 text-primary" /> : <FileText className="w-4 h-4 text-primary" />}
                <h3 className="text-sm font-heading font-bold">{docModal.title}</h3>
              </div>
              <button onClick={() => setDocModal(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 flex-1 bg-muted/10 flex items-center justify-center">
              {docModal.isQr ? (
                <div className="p-5 bg-white rounded-xl shadow-sm border border-border text-center space-y-2">
                  <div className="w-48 h-48 bg-zinc-100 rounded-lg flex flex-col items-center justify-center border border-zinc-200 mx-auto">
                    <QrCode className="w-28 h-28 text-zinc-800" />
                  </div>
                  <p className="text-xs text-zinc-500 font-medium">Scan with GCash app to transfer</p>
                </div>
              ) : (
                <div className="w-full h-64 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground bg-card">
                  <Eye className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-xs font-medium">Verified Document Preview</p>
                  <p className="text-[11px] text-muted-foreground">{docModal.title}</p>
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-border/50 flex justify-end bg-card">
              <Button size="sm" onClick={() => setDocModal(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Password Update */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-xl shadow-2xl border border-border/50 p-6 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Key className="w-5 h-5" />
              <h3 className="text-base font-heading font-bold">Change Password</h3>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Current Password</Label>
                <Input 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">New Password (Min 8 chars)</Label>
                <Input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Confirm New Password</Label>
                <Input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => {
                setShowPasswordModal(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}>Cancel</Button>
              <Button size="sm" onClick={handlePasswordConfirm}>Update Password</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}