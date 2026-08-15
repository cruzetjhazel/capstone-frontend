import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRole } from "@/contexts/RoleContext";
import api, { getApiErrorMessage } from "@/lib/api";
import {
  photographerProfileService,
  type PhotographerProfile,
} from "@/services/photographerProfileService";
import {
  photographerApplicationService,
  type PhotographerApplication,
} from "@/services/photographerApplicationService";
import toast from "react-hot-toast";
import {
  Camera, Image as ImageIcon, Briefcase,
  Link2, ShieldCheck, CreditCard, Lock, AlertTriangle,
  FileText, Check, X, Upload, Key, QrCode, MapPin, Layers, Plus
} from "lucide-react";

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

const AREA_COVERAGE_MAP: Record<string, string> = {
  "Bulan only": "bulan_only",
  "Bulan and nearby municipalities": "bulan_nearby",
  "Anywhere in Sorsogon": "anywhere_sorsogon",
  "Travel outside Sorsogon": "travel_outside_sorsogon",
};

const SHOOTING_TYPES = ["Indoor", "Outdoor", "Event Coverage", "Drone / Aerial", "Hybrid (Indoor + Outdoor)"];
const HYBRID = "Hybrid (Indoor + Outdoor)";

const SHOOTING_TYPE_MAP: Record<string, string> = {
  "Indoor": "indoor",
  "Outdoor": "outdoor",
  "Event Coverage": "event_coverage",
  "Drone / Aerial": "drone_aerial",
  [HYBRID]: "hybrid",
};

// Fixed suggestions only — PhotographerProfileRequest.php validates `style.*`
// as a plain string (no enum), so photographers can also add their own below.
const PHOTOGRAPHY_STYLES = [
  "Cinematic", "Moody", "Bright & Airy", "Classic/Traditional",
  "Vintage/Retro", "Fine Art", "Documentary/Editorial", "Vibrant",
];

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  approved: { text: "Approved / Verified", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  pending_review: { text: "Pending Review", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  revision_requested: { text: "Revision Requested", className: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  rejected: { text: "Rejected", className: "bg-destructive/10 text-destructive" },
  draft: { text: "Draft", className: "bg-muted text-muted-foreground" },
};

type BusinessSnapshot = {
  businessName: string; location: string; yearsActive: string; teamSize: string;
  services: string[]; otherServices: string; coverageArea: string;
  shootingTypes: string[]; priceMin: string; priceMax: string;
};

type ProfileSnapshot = {
  bio: string; styles: string[]; facebook: string; instagram: string; website: string;
};

type GcashSnapshot = { name: string; number: string };

export default function StudioSettings() {
  const { user, refreshProfilePhoto } = useRole();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ---- Application (business/coverage/pricing) state ----
  const [application, setApplication] = useState<PhotographerApplication | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [yearsActive, setYearsActive] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [otherServices, setOtherServices] = useState("");
  const [coverageArea, setCoverageArea] = useState("");
  const [shootingTypes, setShootingTypes] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [initialBusiness, setInitialBusiness] = useState<BusinessSnapshot | null>(null);

  const isFreelancer = application?.photographerType === "freelancer";

  // ---- Profile (branding) state ----
  const [bio, setBio] = useState("");
  const [styles, setStyles] = useState<string[]>([]);
  const [customStyleInput, setCustomStyleInput] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null);
  const [profileExists, setProfileExists] = useState(false);
  const [initialProfile, setInitialProfile] = useState<ProfileSnapshot | null>(null);

  // ---- GCash state ----
  const [gcashAccountName, setGcashAccountName] = useState("");
  const [gcashAccountNumber, setGcashAccountNumber] = useState("");
  const [gcashQrUrl, setGcashQrUrl] = useState<string | null>(null);
  const [gcashQrFile, setGcashQrFile] = useState<File | null>(null);
  const [gcashQrPreview, setGcashQrPreview] = useState<string | null>(null);
  const [initialGcash, setInitialGcash] = useState<GcashSnapshot | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ---- Modals ----
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivateInput, setDeactivateInput] = useState("");
  const [docModal, setDocModal] = useState<{ title: string; url: string } | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [app, profile] = await Promise.all([
          photographerApplicationService.get(),
          photographerProfileService.get(),
        ]);

        setApplication(app);
        setBusinessName(app.businessName);
        setLocation(app.location);
        setYearsActive(app.yearsActive != null ? String(app.yearsActive) : "");
        setTeamSize(app.teamSize != null ? String(app.teamSize) : "");
        setServices(app.services);
        setOtherServices(app.otherServices);
        const areaLabel = Object.entries(AREA_COVERAGE_MAP).find(([, v]) => v === app.coverageArea)?.[0] ?? "";
        setCoverageArea(areaLabel);
        const shootingLabels = app.shootingTypes
          .map((v) => Object.entries(SHOOTING_TYPE_MAP).find(([, mv]) => mv === v)?.[0])
          .filter(Boolean) as string[];
        setShootingTypes(shootingLabels);
        setPriceMin(app.priceMin != null ? String(app.priceMin) : "");
        setPriceMax(app.priceMax != null ? String(app.priceMax) : "");
        setInitialBusiness({
          businessName: app.businessName, location: app.location,
          yearsActive: app.yearsActive != null ? String(app.yearsActive) : "",
          teamSize: app.teamSize != null ? String(app.teamSize) : "",
          services: app.services, otherServices: app.otherServices,
          coverageArea: areaLabel, shootingTypes: shootingLabels,
          priceMin: app.priceMin != null ? String(app.priceMin) : "",
          priceMax: app.priceMax != null ? String(app.priceMax) : "",
        });

        if (profile) {
          setProfileExists(true);
          setBio(profile.bio);
          setStyles(profile.style);
          setFacebook(profile.facebook);
          setInstagram(profile.instagram);
          setWebsite(profile.website);
          setProfilePhotoUrl(profile.profilePhotoUrl);
          setCoverPhotoUrl(profile.coverPhotoUrl);
          setInitialProfile({
            bio: profile.bio, styles: profile.style,
            facebook: profile.facebook, instagram: profile.instagram, website: profile.website,
          });
        } else {
          setInitialProfile({ bio: "", styles: [], facebook: "", instagram: "", website: "" });
        }
      } catch (err) {
        setLoadError(getApiErrorMessage(err, "Failed to load your settings."));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    api.get("/photographer/payment-config").then((res) => {
      const config = res.data?.data ?? res.data;
      if (config) {
        setGcashAccountName(config.gcash_account_name ?? "");
        setGcashAccountNumber(config.gcash_account_number ?? "");
        setGcashQrUrl(config.gcash_qr_url ?? null);
        setInitialGcash({ name: config.gcash_account_name ?? "", number: config.gcash_account_number ?? "" });
      } else {
        setInitialGcash({ name: "", number: "" });
      }
    }).catch(() => {
      setInitialGcash({ name: "", number: "" });
    });
  }, []);

  // ---- Dirty tracking (mirrors ClientProfile.tsx's sticky-bar pattern) ----
  const businessDirty = initialBusiness ? JSON.stringify({
    businessName, location, yearsActive, teamSize, services, otherServices, coverageArea, shootingTypes, priceMin, priceMax,
  }) !== JSON.stringify(initialBusiness) : false;

  const profileDirty = initialProfile ? (
    JSON.stringify({ bio, styles, facebook, instagram, website }) !== JSON.stringify(initialProfile)
    || !!profilePhotoFile || !!coverPhotoFile
  ) : false;

  const gcashDirty = initialGcash ? (
    gcashAccountName !== initialGcash.name || gcashAccountNumber !== initialGcash.number || !!gcashQrFile
  ) : false;

  const isDirty = businessDirty || profileDirty || gcashDirty;

  // ---- Toggle handlers ----
  const toggleService = (v: string) =>
    setServices((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const toggleShootingType = (v: string) => {
    if (v === HYBRID) {
      if (shootingTypes.includes(HYBRID)) {
        setShootingTypes((prev) => prev.filter((x) => x !== HYBRID && x !== "Indoor" && x !== "Outdoor"));
      } else {
        setShootingTypes((prev) => Array.from(new Set([...prev, HYBRID, "Indoor", "Outdoor"])));
      }
      return;
    }
    if ((v === "Indoor" || v === "Outdoor") && shootingTypes.includes(HYBRID)) return;
    setShootingTypes((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };

  const toggleStyle = (style: string) =>
    setStyles((prev) => (prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]));

  const handleAddCustomStyle = () => {
    const value = customStyleInput.trim();
    if (!value) return;
    if (styles.some((s) => s.toLowerCase() === value.toLowerCase())) {
      toast.error("That style is already added.");
      return;
    }
    setStyles((prev) => [...prev, value]);
    setCustomStyleInput("");
  };

  const removeStyle = (style: string) => setStyles((prev) => prev.filter((s) => s !== style));

  const handleAvatarSelect = (file: File | null) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB.");
      return;
    }
    setProfilePhotoFile(file);
    setProfilePhotoPreview(URL.createObjectURL(file));
  };

  const handleCoverSelect = (file: File | null) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB.");
      return;
    }
    setCoverPhotoFile(file);
    setCoverPhotoPreview(URL.createObjectURL(file));
  };

  const handleDiscard = () => {
    if (initialBusiness) {
      setBusinessName(initialBusiness.businessName);
      setLocation(initialBusiness.location);
      setYearsActive(initialBusiness.yearsActive);
      setTeamSize(initialBusiness.teamSize);
      setServices(initialBusiness.services);
      setOtherServices(initialBusiness.otherServices);
      setCoverageArea(initialBusiness.coverageArea);
      setShootingTypes(initialBusiness.shootingTypes);
      setPriceMin(initialBusiness.priceMin);
      setPriceMax(initialBusiness.priceMax);
    }
    if (initialProfile) {
      setBio(initialProfile.bio);
      setStyles(initialProfile.styles);
      setFacebook(initialProfile.facebook);
      setInstagram(initialProfile.instagram);
      setWebsite(initialProfile.website);
    }
    if (initialGcash) {
      setGcashAccountName(initialGcash.name);
      setGcashAccountNumber(initialGcash.number);
    }
    setProfilePhotoFile(null);
    setProfilePhotoPreview(null);
    setCoverPhotoFile(null);
    setCoverPhotoPreview(null);
    setGcashQrFile(null);
    setGcashQrPreview(null);
    setSaveError(null);
  };

  const handleSaveAll = async () => {
    setSaveError(null);
    const fail = (msg: string) => {
      toast.error(msg);
      setSaveError(msg);
    };

    if (businessDirty) {
      if (!businessName.trim() || !location.trim() || !yearsActive) {
        fail("Business name, location, and years active are required.");
        return;
      }
      if (!isFreelancer && !teamSize) {
        fail("Number of team members is required.");
        return;
      }
      if (services.length === 0) {
        fail("Select at least one service you offer.");
        return;
      }
      if (!coverageArea) {
        fail("Select a coverage area.");
        return;
      }
      if (shootingTypes.length === 0) {
        fail("Select at least one shooting type.");
        return;
      }
      if (!priceMin || !priceMax || Number(priceMin) > Number(priceMax)) {
        fail("Minimum price cannot be higher than maximum price.");
        return;
      }
    }
    if (profileDirty) {
      if (bio.trim().length < 20) {
        fail("Bio must be at least 20 characters.");
        return;
      }
      if (styles.length === 0) {
        fail("Select or add at least one photography style.");
        return;
      }
      if (!facebook.trim() && !instagram.trim() && !website.trim()) {
        fail("At least one social link (Facebook, Instagram, or Website) is required.");
        return;
      }
    }

    setIsSaving(true);
    const failures: string[] = [];

    if (businessDirty) {
      try {
        const updated = await photographerApplicationService.update({
          business_name: businessName.trim(),
          location: location.trim(),
          years_active: Number(yearsActive),
          ...(isFreelancer ? {} : { team_size: Number(teamSize) }),
          services,
          other_services: otherServices.trim() || null,
          coverage_area: AREA_COVERAGE_MAP[coverageArea],
          shooting_types: shootingTypes.map((s) => SHOOTING_TYPE_MAP[s]).filter(Boolean),
          price_min: Number(priceMin),
          price_max: Number(priceMax),
        });
        setApplication(updated);
        setInitialBusiness({ businessName, location, yearsActive, teamSize, services, otherServices, coverageArea, shootingTypes, priceMin, priceMax });
      } catch (err) {
        const msg = getApiErrorMessage(err, "Failed to save business details.");
        toast.error(msg);
        failures.push(msg);
      }
    }

    if (profileDirty) {
      try {
        const toUrl = (v: string) => {
          const t = v.trim();
          if (!t) return "";
          if (/^https?:\/\//i.test(t)) return t;
          return `https://${t.replace(/^@/, "")}`;
        };
        const normalizedInstagram = instagram.trim() && !/^https?:\/\//i.test(instagram.trim())
          ? `https://instagram.com/${instagram.trim().replace(/^@/, "")}`
          : instagram.trim();

        const payload = {
          bio: bio.trim(), style: styles,
          facebook: toUrl(facebook), instagram: normalizedInstagram, website: toUrl(website),
          profilePhoto: profilePhotoFile, coverPhoto: coverPhotoFile,
        };
        const updated = profileExists
          ? await photographerProfileService.update(payload)
          : await photographerProfileService.create(payload);

        setProfileExists(true);
        setProfilePhotoUrl(updated.profilePhotoUrl);
        setCoverPhotoUrl(updated.coverPhotoUrl);
        setProfilePhotoFile(null);
        setCoverPhotoFile(null);
        setProfilePhotoPreview(null);
        setCoverPhotoPreview(null);
        setInitialProfile({ bio: bio.trim(), styles, facebook, instagram, website });
        refreshProfilePhoto(updated.profilePhotoUrl);
      } catch (err) {
        const msg = getApiErrorMessage(err, "Failed to save profile.");
        toast.error(msg);
        failures.push(msg);
      }
    }

    if (gcashDirty) {
      try {
        const formData = new FormData();
        formData.append("gcash_account_name", gcashAccountName);
        formData.append("gcash_account_number", gcashAccountNumber);
        if (gcashQrFile) formData.append("gcash_qr_code", gcashQrFile);
        const res = await api.post("/photographer/payment-config", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const config = res.data?.data ?? res.data;
        setGcashQrUrl(config.gcash_qr_url ?? null);
        setGcashQrFile(null);
        setGcashQrPreview(null);
        setInitialGcash({ name: gcashAccountName, number: gcashAccountNumber });
      } catch (err) {
        const msg = getApiErrorMessage(err, "Failed to save payment settings.");
        toast.error(msg);
        failures.push(msg);
      }
    }

    setIsSaving(false);
    if (failures.length > 0) {
      setSaveError(failures.join(" "));
    } else {
      toast.success("Changes saved.");
    }
  };

  const handleViewDocument = async (type: "government_id" | "selfie_with_id" | "business_permit", title: string) => {
    try {
      const url = await photographerApplicationService.downloadDocument(type);
      setDocModal({ title, url });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not load that document."));
    }
  };

  const closeDocModal = () => {
    if (docModal) URL.revokeObjectURL(docModal.url);
    setDocModal(null);
  };

  const handleDeactivate = () => {
    toast.error("Account deactivation isn't available for photographer accounts yet.");
    setShowDeactivateConfirm(false);
    setDeactivateInput("");
  };

  const handlePasswordConfirm = async () => {
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
    try {
      await api.post("/photographer/change-password", {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      toast.success("Password updated successfully!");
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update password."));
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto py-16 text-center text-sm text-muted-foreground">
          Loading settings…
        </div>
      </DashboardLayout>
    );
  }

  if (loadError) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto py-16 text-center text-sm text-destructive">
          {loadError}
        </div>
      </DashboardLayout>
    );
  }

  const statusInfo = STATUS_LABEL[application?.status ?? "draft"];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-up pb-24 relative">

        <div className="bg-card p-6 rounded-xl border border-border/50 card-shadow">
          <h1 className="text-2xl font-heading font-bold">{isFreelancer ? "Photographer" : "Studio"} Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your public profile, coverage, rates, payments, and account security.
          </p>
        </div>

        {/* 1. PUBLIC PROFILE & BRANDING */}
        <section className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
          <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            <h3 className="font-heading font-semibold">Public Profile & Branding</h3>
          </div>
          <div className="p-6 space-y-6">

            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="space-y-2">
                <Label>Profile Avatar</Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary border-2 border-primary/20 overflow-hidden">
                    {(profilePhotoPreview || profilePhotoUrl) ? (
                      <img src={profilePhotoPreview ?? profilePhotoUrl ?? ""} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-7 h-7" />
                    )}
                  </div>
                  <label htmlFor="avatar-input">
                    <Button variant="outline" size="sm" asChild>
                      <span>Upload Avatar</span>
                    </Button>
                  </label>
                  <input id="avatar-input" type="file" accept="image/png, image/jpeg" className="hidden"
                    onChange={(e) => handleAvatarSelect(e.target.files?.[0] ?? null)} />
                </div>
              </div>

              <div className="space-y-2 flex-1 w-full">
                <Label>Cover Banner</Label>
                <label htmlFor="cover-input"
                  className="h-20 w-full rounded-xl bg-muted border-2 border-dashed border-border flex items-center justify-center hover:bg-muted/80 transition-colors cursor-pointer overflow-hidden">
                  {(coverPhotoPreview || coverPhotoUrl) ? (
                    <img src={coverPhotoPreview ?? coverPhotoUrl ?? ""} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center flex flex-col items-center">
                      <ImageIcon className="w-5 h-5 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground font-medium">Click to upload banner photo</span>
                    </div>
                  )}
                </label>
                <input id="cover-input" type="file" accept="image/png, image/jpeg" className="hidden"
                  onChange={(e) => handleCoverSelect(e.target.files?.[0] ?? null)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Email (Read-Only)</Label>
                <Input value={user?.email ?? ""} disabled className="bg-muted/50 cursor-not-allowed" />
              </div>
              <div className="space-y-2">
                <Label>Public Contact Phone (Read-Only)</Label>
                <Input value={(user as any)?.phoneNumber ?? ""} disabled className="bg-muted/50 cursor-not-allowed" />
                <p className="text-[11px] text-muted-foreground">Contact support to change your registered phone number.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Brand Bio / About Us <span className="text-xs text-muted-foreground font-normal">(min. 20 characters)</span></Label>
              <Textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Photography Aesthetic Styles</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PHOTOGRAPHY_STYLES.map((style) => (
                  <label key={style} className="flex items-center gap-2 p-2.5 rounded-lg border border-border/60 bg-muted/20 cursor-pointer hover:bg-muted/50 text-xs font-medium">
                    <input type="checkbox" checked={styles.includes(style)} onChange={() => toggleStyle(style)}
                      className="rounded border-input text-primary focus:ring-primary h-4 w-4" />
                    {style}
                  </label>
                ))}
              </div>

              {styles.filter((s) => !PHOTOGRAPHY_STYLES.includes(s)).length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {styles.filter((s) => !PHOTOGRAPHY_STYLES.includes(s)).map((s) => (
                    <span key={s} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {s}
                      <button type="button" onClick={() => removeStyle(s)} className="hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Input
                  value={customStyleInput}
                  onChange={(e) => setCustomStyleInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCustomStyle(); } }}
                  placeholder="Add your own style (e.g. Editorial Noir)"
                  className="text-sm"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleAddCustomStyle} className="gap-1 shrink-0">
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-border/50 space-y-2">
              <Label className="flex items-center gap-1.5"><Link2 className="w-4 h-4 text-primary" /> Social & Web Links <span className="text-xs text-muted-foreground font-normal">(At least 1 link required)</span></Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input placeholder="facebook.com/yourpage" value={facebook} onChange={(e) => setFacebook(e.target.value)} />
                <Input placeholder="@yourhandle or instagram.com/yourhandle" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
                <Input placeholder="yourdomain.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
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
                <Label>{isFreelancer ? "Photographer Brand Name" : "Studio Name"}</Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Base Location / City</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{isFreelancer ? "Years of Experience" : "Years Operating"}</Label>
                <Input type="number" value={yearsActive} onChange={(e) => setYearsActive(e.target.value)} />
              </div>
              {!isFreelancer && (
                <div className="space-y-2">
                  <Label>Number of Team Members</Label>
                  <Input type="number" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Minimum Base Price (₱)</Label>
                <Input type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Maximum Base Price (₱)</Label>
                <Input type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label>Services Offered</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl border border-border bg-muted/20">
                {SERVICE_OPTIONS.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/60 rounded-md p-1.5 transition-colors">
                    <input type="checkbox" checked={services.includes(s)} onChange={() => toggleService(s)}
                      className="rounded border-input text-primary focus:ring-primary h-4 w-4" />
                    {s}
                  </label>
                ))}
              </div>
              <Input value={otherServices} onChange={(e) => setOtherServices(e.target.value)} placeholder="Others (comma-separated)" maxLength={200} />
            </div>

            <div className="space-y-2 pt-2">
              <Label className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" /> Coverage Area</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AREA_PRESETS.map((area) => (
                  <label key={area} className="flex items-center gap-2 p-2.5 rounded-lg border border-border/60 bg-muted/20 cursor-pointer hover:bg-muted/50 text-sm">
                    <input type="radio" name="coverageArea" checked={coverageArea === area} onChange={() => setCoverageArea(area)} className="text-primary focus:ring-primary" />
                    {area}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label className="flex items-center gap-1.5"><Layers className="w-4 h-4 text-primary" /> Shooting Types Supported</Label>
              <div className="flex flex-wrap gap-2">
                {SHOOTING_TYPES.map((type) => {
                  const active = shootingTypes.includes(type);
                  const isLocked = (type === "Indoor" || type === "Outdoor") && shootingTypes.includes(HYBRID);
                  return (
                    <button key={type} type="button" onClick={() => toggleShootingType(type)} disabled={isLocked}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"
                      } ${isLocked ? "opacity-70 cursor-not-allowed" : ""}`}>
                      {type}
                    </button>
                  );
                })}
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
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase flex items-center gap-1 ${statusInfo.className}`}>
                  <Check className="w-3.5 h-3.5" /> {statusInfo.text}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Your submitted documents are reviewed and approved by administrators.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" disabled={!application?.documentsSubmitted.governmentId}
                onClick={() => handleViewDocument("government_id", "Government ID")}>
                <FileText className="w-4 h-4" /> Government ID
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" disabled={!application?.documentsSubmitted.selfieWithId}
                onClick={() => handleViewDocument("selfie_with_id", "Selfie Holding ID")}>
                <FileText className="w-4 h-4" /> Selfie ID
              </Button>
              {!isFreelancer && (
                <Button variant="outline" size="sm" className="gap-1.5" disabled={!application?.documentsSubmitted.businessPermit}
                  onClick={() => handleViewDocument("business_permit", "Business Permit / DTI Registration")}>
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
                <Input value={gcashAccountName} onChange={(e) => setGcashAccountName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>GCash Account Number</Label>
                <Input inputMode="numeric" value={gcashAccountNumber}
                  onChange={(e) => setGcashAccountNumber(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="09XXXXXXXXX" maxLength={11} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>GCash QR Code</Label>
              <div className="flex items-center gap-4">
                <div className="w-28 h-28 bg-muted border border-border rounded-lg flex flex-col items-center justify-center overflow-hidden relative">
                  {gcashQrPreview || gcashQrUrl ? (
                    <img src={gcashQrPreview ?? gcashQrUrl ?? ""} alt="GCash QR" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <QrCode className="w-8 h-8 text-muted-foreground/70 mb-1" />
                      <span className="text-[10px] text-muted-foreground font-semibold">No QR yet</span>
                    </>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="gcash-qr-input">
                    <Button variant="outline" size="sm" className="gap-1.5" asChild>
                      <span><Upload className="w-3.5 h-3.5" /> {gcashQrUrl ? "Replace QR" : "Upload QR"}</span>
                    </Button>
                  </label>
                  <input id="gcash-qr-input" type="file" accept="image/png, image/jpeg" className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) { toast.error("QR image must be under 2MB."); return; }
                      setGcashQrFile(file);
                      setGcashQrPreview(URL.createObjectURL(file));
                    }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. SECURITY & ACCOUNT */}
        <section className="bg-card rounded-xl card-shadow border border-border/50 overflow-hidden">
          <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <h3 className="font-heading font-semibold">Security & Account</h3>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold">Password Management</p>
              <p className="text-[11px] text-muted-foreground mb-3">Update the password used to sign in to your account.</p>
              <Button variant="outline" size="sm" onClick={() => setShowPasswordModal(true)}>
                <Key className="w-3.5 h-3.5 mr-1.5" /> Change Password
              </Button>
            </div>

            <div>
              <p className="text-xs font-semibold text-destructive">Danger Zone</p>
              <p className="text-[11px] text-muted-foreground mb-3">Not available yet — no photographer deactivation endpoint exists.</p>
              <Button variant="destructive" size="sm" disabled onClick={() => setShowDeactivateConfirm(true)}>
                Deactivate Account
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* STICKY ACTION BAR — same pattern as ClientProfile.tsx */}
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
              <p className="text-sm font-medium hidden sm:block">You have unsaved settings changes.</p>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <Button variant="outline" size="sm" onClick={handleDiscard} disabled={isSaving}>Discard</Button>
                <Button size="sm" onClick={handleSaveAll} disabled={isSaving}>
                  {isSaving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeactivateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-destructive/30 p-6 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-heading font-bold">Deactivate Account</h3>
            </div>
            <Input value={deactivateInput} onChange={(e) => setDeactivateInput(e.target.value)} placeholder="DEACTIVATE"
              className="border-destructive/40 focus-visible:ring-destructive text-sm" />
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => { setShowDeactivateConfirm(false); setDeactivateInput(""); }}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={handleDeactivate}>Confirm Deactivation</Button>
            </div>
          </div>
        </div>
      )}

      {docModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border/50 flex flex-col overflow-hidden max-h-[80vh]">
            <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-heading font-bold">{docModal.title}</h3>
              </div>
              <button onClick={closeDocModal} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex-1 bg-muted/10 flex items-center justify-center overflow-auto">
              <img src={docModal.url} alt={docModal.title} className="max-w-full max-h-full object-contain" />
            </div>
            <div className="px-5 py-3 border-t border-border/50 flex justify-end bg-card">
              <Button size="sm" onClick={closeDocModal}>Close</Button>
            </div>
          </div>
        </div>
      )}

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
                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">New Password (Min 8 chars)</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Confirm New Password</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => {
                setShowPasswordModal(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
              }}>Cancel</Button>
              <Button size="sm" onClick={handlePasswordConfirm}>Update Password</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}