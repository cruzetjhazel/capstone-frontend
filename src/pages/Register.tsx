import { Camera, Eye, EyeOff, User, Aperture, ArrowLeft, ArrowRight, MapPin, Globe, Upload, Facebook, Instagram, Plus, X, Clock, CheckCircle2, ShieldCheck, FileText, Info, Sparkles, AlertCircle, Image as ImageIcon, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRole, getRoleDashboardPath, type Role } from "@/contexts/RoleContext";
import { AUTH_TOKEN_KEY } from "@/config/env";
import { cn } from "@/lib/utils";
import { sanitizeText, sanitizeEmail, sanitizePhone, sanitizeUrl, isValidEmail, isStrongPassword } from "@/lib/sanitize";

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

const PHOTOGRAPHY_STYLES = [
  "Cinematic", "Moody", "Bright & Airy", "Classic/Traditional", 
  "Vintage/Retro", "Fine Art", "Documentary/Editorial", "Vibrant"
];

const API_BASE = "http://127.0.0.1:8000/api";

// Frontend labels → backend enum values
const AREA_COVERAGE_MAP: Record<string, string> = {
  "Bulan only": "bulan_only",
  "Bulan and nearby municipalities": "bulan_nearby",
  "Anywhere in Sorsogon": "anywhere_sorsogon",
  "Travel outside Sorsogon": "travel_outside_sorsogon",
};

const SHOOTING_TYPE_MAP: Record<string, string> = {
  "Indoor": "indoor",
  "Outdoor": "outdoor",
  "Event Coverage": "event_coverage",
  "Drone / Aerial": "drone_aerial",
  "Hybrid (Indoor + Outdoor)": "hybrid",
};

// Accepts common PH mobile formats (spaces, hyphens, parens, 09..., +63..., 63..., bare 9XX...)
// and normalizes to a single canonical form: +639XXXXXXXXX
function normalizePhilippinePhone(raw: string): string {
  const cleaned = raw.trim().replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+63")) {
    return "+63" + cleaned.slice(3).replace(/\D/g, "");
  }
  if (cleaned.startsWith("63")) {
    return "+63" + cleaned.slice(2).replace(/\D/g, "");
  }
  if (cleaned.startsWith("0")) {
    return "+63" + cleaned.slice(1).replace(/\D/g, "");
  }
  if (cleaned.startsWith("9")) {
    // bare 10-digit mobile number, missing the leading 0 or country code
    return "+63" + cleaned.replace(/\D/g, "");
  }
  // doesn't match any recognized PH mobile pattern — return as-is so
  // validation rejects it instead of fabricating a fake +63 match
  return cleaned;
}

function isValidPhilippinePhone(canonical: string): boolean {
  // PH mobile numbers are always +63 9XX XXX XXXX — the 9 right after
  // +63 is mandatory, not just "any 10 digits"
  return /^\+639\d{9}$/.test(canonical);
}

function authHeaders(json = true): HeadersInit {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (json) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function parseApiResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 422 && data.errors) {
      const messages = Object.values(data.errors as Record<string, string[]>).flat().join(" ");
      throw new Error(messages || data.message || "Validation failed. Please check your inputs.");
    }
    throw new Error(data.message || `Request failed (${response.status}). Please try again.`);
  }
  return data;
}

type AccountType = "client" | "freelancer" | "studio";

const accountTypes: { type: AccountType; role: Role; label: string; desc: string; icon: typeof User }[] = [
  { type: "client", role: "client", label: "Client", desc: "Find & book photographers for your events", icon: User },
  { type: "freelancer", role: "studio", label: "Freelance Photographer", desc: "Offer your photography services independently", icon: Camera },
  { type: "studio", role: "studio", label: "Studio Owner", desc: "Manage your studio, team, and bookings", icon: Aperture },
];
const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"] as const;

const STEP_TITLES: Record<AccountType, string[]> = {
  client: ["Account basics", "About you"],
  freelancer: [
    "Account basics", 
    "Photographer info", 
    "About your service", 
    "Verification", 
    "Portfolio upload", 
    "Public Profile & Preview"
  ],
  studio: [
    "Account basics", 
    "Studio info", 
    "About your service", 
    "Verification", 
    "Portfolio upload", 
    "Public Profile & Preview"
  ],
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
  const [clientCreated, setClientCreated] = useState(false);
  
  // API loading & error state
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [isResuming, setIsResuming] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [existingDocs, setExistingDocs] = useState({
    governmentId: false,
    selfieWithId: false,
    businessPermit: false,
    additionalDocuments: 0,
  });
  const [existingPortfolioCount, setExistingPortfolioCount] = useState(0);
  const [isResumingApplication, setIsResumingApplication] = useState(false);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);

  const { setUserFromRegistration, refreshApplication } = useRole();
  const navigate = useNavigate();

  // Smooth scroll helper for step transitions
  const handleStepChange = (newStep: number) => {
    setStep(newStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const wantsResume =
      searchParams.get("continue") === "true" ||
      searchParams.get("edit") === "true" ||
      searchParams.get("retry") === "true";
    if (!wantsResume) return;

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return; // not logged in — fall through to normal Step 1

    const resume = async () => {
      setIsResuming(true);
      setResumeError(null);

      try {
        if (searchParams.get("retry") === "true") {
          const reapplyResponse = await fetch(`${API_BASE}/photographer/application/reapply`, {
            method: "POST",
            headers: authHeaders(),
          });
          await parseApiResponse(reapplyResponse);
        }

        // Account basics (Step 2) — name/email/phone come from the authenticated
        // account itself, never re-typed. Password is intentionally never fetched.
        const meResponse = await fetch(`${API_BASE}/auth/me`, {
          method: "GET",
          headers: authHeaders(),
        });
        const mePayload = await parseApiResponse(meResponse);
        const me = mePayload.data;
        setName(me.name ?? "");
        setEmail(me.email ?? "");
        setPhone(me.phone_number ?? "");

        const appResponse = await fetch(`${API_BASE}/photographer/application`, {
          method: "GET",
          headers: authHeaders(),
        });
        const appPayload = await parseApiResponse(appResponse);
        const application = appPayload.data;

        if (application.status === "pending_review" || application.status === "approved" || application.status === "rejected") {
          navigate("/photographer/status");
          return;
        }

        // draft or revision_requested — safe to resume editing
        setIsResumingApplication(true);
        setAccountType(application.photographer_type === "studio" ? "studio" : "freelancer");
        setBusinessName(application.business_name ?? "");
        setAddress(application.location ?? "");
        if (application.photographer_type === "studio") {
          setYearsOperating(application.years_active != null ? String(application.years_active) : "");
          setTeamSize(application.team_size != null ? String(application.team_size) : "");
        } else {
          setYearsExp(application.years_active != null ? String(application.years_active) : "");
        }
        setServices(application.services ?? []);
        setOtherService(application.other_services ?? "");

        const areaLabel = Object.entries(AREA_COVERAGE_MAP).find(([, v]) => v === application.coverage_area)?.[0];
        setAreaCoverage(areaLabel ?? "");

        const shootingLabels = (application.shooting_types ?? [])
          .map((v: string) => Object.entries(SHOOTING_TYPE_MAP).find(([, mv]) => mv === v)?.[0])
          .filter(Boolean) as string[];
        setShootingTypes(shootingLabels);

        setPriceMin(application.price_min != null ? String(application.price_min) : "");
        setPriceMax(application.price_max != null ? String(application.price_max) : "");

        setExistingDocs({
          governmentId: !!application.documents_submitted?.government_id,
          selfieWithId: !!application.documents_submitted?.selfie_with_id,
          businessPermit: !!application.documents_submitted?.business_permit,
          additionalDocuments: application.documents_submitted?.additional_documents ?? 0,
        });

        try {
          const portfolioResponse = await fetch(`${API_BASE}/photographer/portfolio`, {
            method: "GET",
            headers: authHeaders(),
          });
          const portfolioPayload = await parseApiResponse(portfolioResponse);
          const activeCount = Array.isArray(portfolioPayload.data)
            ? portfolioPayload.data.filter((img: any) => img.status !== "archived").length
            : 0;
          setExistingPortfolioCount(activeCount);
        } catch {
          // non-fatal — Step 6 will just ask for fresh uploads
        }

        // Step 7 profile — only exists once the applicant reached Step 7 before.
        // A revision-requested user who got that far already has one; a draft
        // interrupted earlier won't. 404 here is expected and non-fatal.
        try {
          const profileResponse = await fetch(`${API_BASE}/photographer/profile`, {
            method: "GET",
            headers: authHeaders(),
          });
          if (profileResponse.ok) {
            const profilePayload = await profileResponse.json();
            const profile = profilePayload.data;
            setBio(profile.bio ?? "");
            setPhotographyStyles(profile.style ?? []);
            setFacebook(profile.facebook ?? "");
            setInstagram(profile.instagram ?? "");
            setWebsite(profile.website ?? "");
            if (profile.profile_photo_url) setProfilePreview(profile.profile_photo_url);
            if (profile.cover_photo_url) setCoverPreview(profile.cover_photo_url);
            setHasExistingProfile(true);
          }
        } catch {
          // no profile yet — Step 7 stays blank, handled by create (POST) as before
        }

        handleStepChange(1);
      } catch (err) {
        setResumeError(err instanceof Error ? err.message : "Could not load your existing application.");
      } finally {
        setIsResuming(false);
      }
    };

    resume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Basics
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);

  // Client — about you
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("Sorsogon"); // default only — client can change it

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

  const handleStep4Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canStep4 || isLoading) return;

    setIsLoading(true);
    setApiError(null);

    try {
      const response = await fetch(`${API_BASE}/photographer/application`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          services,
          other_services: otherService.trim() || null,
          coverage_area: AREA_COVERAGE_MAP[areaCoverage] ?? null,
          shooting_types: shootingTypes.map((s) => SHOOTING_TYPE_MAP[s]).filter(Boolean),
          price_min: Number(priceMin),
          price_max: Number(priceMax),
        }),
      });
      await parseApiResponse(response);

      setIsLoading(false);
      handleStepChange(5);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Unable to save. Please try again.");
      setIsLoading(false);
    }
  };

  // Verification docs
  const [govId, setGovId] = useState<File | null>(null);
  const [selfieId, setSelfieId] = useState<File | null>(null);
  const [businessPermit, setBusinessPermit] = useState<File | null>(null);
  const [additionalProof, setAdditionalProof] = useState<File[]>([]);
  
  // Portfolio Step 6
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [portfolioPreviews, setPortfolioPreviews] = useState<string[]>([]);

  const handleStep6Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canStep6Portfolio || isLoading) return;

    setIsLoading(true);
    setApiError(null);

    const failed: string[] = [];

    for (const file of portfolioFiles) {
      try {
        const formData = new FormData();
        formData.append("image", file);
        const response = await fetch(`${API_BASE}/photographer/portfolio`, {
          method: "POST",
          headers: authHeaders(false),
          body: formData,
        });
        await parseApiResponse(response);
      } catch {
        failed.push(file.name);
      }
    }

    setIsLoading(false);

    if (failed.length > 0) {
      setApiError(`${failed.length} image(s) failed to upload: ${failed.join(", ")}. Remove and re-add them, then try again.`);
      return;
    }

    handleStepChange(7);
  };

  // Step 7: Public profile preview & assets
  const [bio, setBio] = useState("");
  const [photographyStyles, setPhotographyStyles] = useState<string[]>([]);
  const [customStyleInput, setCustomStyleInput] = useState(""); 
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");

  const totalSteps = accountType ? STEP_TITLES[accountType].length : 3;

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canProStep3 || isLoading) return;

    setIsLoading(true);
    setApiError(null);

    try {
      const payload: Record<string, unknown> = {
        business_name: businessName.trim(),
        location: address.trim(),
      };
      if (accountType === "studio") {
        payload.years_active = Number(yearsOperating);
        payload.team_size = Number(teamSize);
      } else {
        payload.years_active = Number(yearsExp);
      }

      const response = await fetch(`${API_BASE}/photographer/application`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      await parseApiResponse(response);

      setIsLoading(false);
      handleStepChange(4);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Unable to save. Please try again.");
      setIsLoading(false);
    }
  };

  const handleStep5Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canStep5Verify || isLoading) return;

    setIsLoading(true);
    setApiError(null);

    try {
      const formData = new FormData();
      formData.append("_method", "PATCH");
      if (govId) formData.append("government_id", govId);
      if (selfieId) formData.append("selfie_with_id", selfieId);
      if (accountType === "studio" && businessPermit) {
        formData.append("business_permit", businessPermit);
      }
      additionalProof.forEach((file) => {
        formData.append("additional_documents[]", file);
      });

      const response = await fetch(`${API_BASE}/photographer/application`, {
        method: "POST",
        headers: authHeaders(false),
        body: formData,
      });
      await parseApiResponse(response);

      setIsLoading(false);
      handleStepChange(6);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Unable to upload documents. Please try again.");
      setIsLoading(false);
    }
  };

  /* ---------- Helpers ---------- */
  const toggleServices = (v: string) =>
    setServices((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const toggleShooting = (v: string) => {
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

  const toggleStyle = (style: string) => {
    setPhotographyStyles((prev) => 
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  const handleAddCustomStyle = () => {
    const trimmed = customStyleInput.trim();
    if (trimmed && !photographyStyles.includes(trimmed)) {
      setPhotographyStyles((prev) => [...prev, trimmed]);
      setCustomStyleInput("");
    }
  };

  const handleAdditionalProofChange = (files: File[]) => {
    const MAX_SIZE = 2 * 1024 * 1024; 
    const validFiles = files.filter((f) => f.size <= MAX_SIZE);
    
    if (validFiles.length < files.length) {
      alert("Some files were skipped because they exceed the 2MB size limit.");
    }

    const totalSelected = [...additionalProof, ...validFiles].slice(0, 6);
    setAdditionalProof(totalSelected);
  };

  const removeAdditionalProof = (idx: number) => {
    setAdditionalProof((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePortfolioChange = (files: File[]) => {
    const totalSelected = [...portfolioFiles, ...files].slice(0, 12);
    setPortfolioFiles(totalSelected);

    portfolioPreviews.forEach((url) => URL.revokeObjectURL(url));
    const newPreviews = totalSelected.map((f) => URL.createObjectURL(f));
    setPortfolioPreviews(newPreviews);
  };

  const removePortfolioImage = (idx: number) => {
    const updatedFiles = portfolioFiles.filter((_, i) => i !== idx);
    setPortfolioFiles(updatedFiles);

    URL.revokeObjectURL(portfolioPreviews[idx]);
    const updatedPreviews = portfolioPreviews.filter((_, i) => i !== idx);
    setPortfolioPreviews(updatedPreviews);
  };

  const handleCoverPhotoChange = (file: File | null) => {
    setCoverPhoto(file);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  };

  /* ---------- Gating ---------- */
  const canStep1 = accountType !== null;
  const canStep2 =
    !!name.trim() &&
    isValidEmail(email) &&
    isValidPhilippinePhone(normalizePhilippinePhone(phone)) &&
    (isResumingApplication || (isStrongPassword(password) && password === confirmPassword));

  const canClientStep3 = !!clientAddress.trim() && !!city.trim() && !!province.trim();

  const canProStep3 =
    accountType === "studio"
      ? !!(businessName.trim() && address.trim() && yearsOperating && teamSize)
      : !!(businessName.trim() && address.trim() && yearsExp);

  const canStep4 =
    services.length > 0 &&
    !!areaCoverage &&
    shootingTypes.length > 0 &&
    !!priceMin &&
    !!priceMax &&
    Number(priceMax) >= Number(priceMin);

  const additionalProofValid = additionalProof.length >= 2 && additionalProof.length <= 6;
  const hasAdequateAdditionalProof = additionalProofValid || existingDocs.additionalDocuments >= 2;
  const canStep5Verify =
    accountType === "studio"
      ? !!((govId || existingDocs.governmentId) && (selfieId || existingDocs.selfieWithId) && (businessPermit || existingDocs.businessPermit) && hasAdequateAdditionalProof)
      : !!((govId || existingDocs.governmentId) && (selfieId || existingDocs.selfieWithId) && hasAdequateAdditionalProof);

  const portfolioFilesWithinLimits = portfolioFiles.length >= 6 && portfolioFiles.length <= 12;
  const portfolioFilesValidSizes = portfolioFiles.every((f) => f.size <= 5 * 1024 * 1024);
  const canStep6Portfolio = (portfolioFilesWithinLimits || existingPortfolioCount >= 6) && portfolioFilesValidSizes;

  const canStep7Profile = bio.trim().length >= 20 && photographyStyles.length > 0 && (facebook.trim() || instagram.trim() || website.trim());

  /* ---------- Submit Handlers ---------- */
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canStep7Profile || isLoading) return;

    setIsLoading(true);
    setApiError(null);

    try {
      const profileFormData = new FormData();
      profileFormData.append("bio", bio.trim());
      photographyStyles.forEach((style) => profileFormData.append("style[]", style));
      if (facebook.trim()) profileFormData.append("facebook", facebook.trim());
      if (instagram.trim()) profileFormData.append("instagram", instagram.trim());
      if (website.trim()) profileFormData.append("website", website.trim());
      if (profilePicture) profileFormData.append("profile_photo", profilePicture);
      if (coverPhoto) profileFormData.append("cover_photo", coverPhoto);

      if (hasExistingProfile) {
        profileFormData.append("_method", "PATCH");
      }
      const profileResponse = await fetch(`${API_BASE}/photographer/profile`, {
        method: "POST", // same _method-spoofing pattern already used in handleStep5Submit for file uploads
        headers: authHeaders(false),
        body: profileFormData,
      });
      await parseApiResponse(profileResponse);

      const submitResponse = await fetch(`${API_BASE}/photographer/application/submit`, {
        method: "POST",
        headers: authHeaders(),
      });
      await parseApiResponse(submitResponse);

      await refreshApplication();
      setIsLoading(false);
      navigate("/photographer/status");
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Unable to submit your application. Please try again.");
      setIsLoading(false);
    }
  };

  const handleProfilePictureChange = (file: File | null) => {
    setProfilePicture(file);
    if (profilePreview) URL.revokeObjectURL(profilePreview);
    setProfilePreview(file ? URL.createObjectURL(file) : null);
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canClientStep3 || isLoading) return;

    setIsLoading(true);
    setApiError(null);

    let response: Response;
    let data: any;

    try {
      response = await fetch("http://127.0.0.1:8000/api/auth/register-client", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone_number: normalizePhilippinePhone(phone),
          password: password,
          password_confirmation: confirmPassword,
          address: clientAddress.trim(),
          city: city.trim(),
          province: province.trim(),
        }),
      });
      data = await response.json().catch(() => ({}));
    } catch (err: unknown) {
      // Only genuine network-level failures land here now
      setApiError("Unable to connect to the server. Please check your connection and try again.");
      setIsLoading(false);
      return;
    }

    if (!response.ok) {
      if (response.status === 422 && data.errors) {
        const messages = Object.values(data.errors as Record<string, string[]>).flat().join(" ");
        setApiError(messages || data.message || "Validation failed. Please check your inputs.");
      } else {
        setApiError(data.message || `Registration failed (${response.status}). Please try again.`);
      }
      setIsLoading(false);
      return;
    }

    // Registration succeeded — this is now OUTSIDE the fetch try/catch,
    // so a bug here won't be mislabeled as a connection error
    setIsLoading(false);
    await setUserFromRegistration(data.data.user, data.data.token);
    setClientCreated(true);
  };

  const handlePhotographerAccountSubmit = async () => {
    if (!canStep2 || isLoading || !accountType || accountType === "client") return;

    setIsLoading(true);
    setApiError(null);

    try {
      const response = await fetch(`${API_BASE}/auth/register-photographer`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone_number: normalizePhilippinePhone(phone),
          password: password,
          password_confirmation: confirmPassword,
          photographer_type: accountType, // "freelancer" | "studio"
        }),
      });
      const data = await parseApiResponse(response);

      await setUserFromRegistration(data.data.user, data.data.token);

      setIsLoading(false);
      handleStepChange(3);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Unable to connect to the server. Please check your connection and try again.");
      setIsLoading(false);
    }
  };

  if (clientCreated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6 relative">
        <BackLink />
        <div className="max-w-md w-full text-center bg-card border border-border rounded-2xl p-8 card-shadow animate-fade-up">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-5">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-heading font-bold mb-2">Welcome!</h1>
          <p className="text-foreground font-medium text-lg mb-2">Account created successfully!</p>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            Let's personalize your experience.
          </p>
          <Button className="w-full" size="lg" onClick={() => navigate(getRoleDashboardPath("client"))}>
            Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

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

  const stepLabel = step > 1 && accountType ? STEP_TITLES[accountType][step - 2] : "Connect with photography talent in Bulan";

  return (
    <div className="min-h-screen flex bg-white relative text-foreground">
      <BackLink onDark />

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
            {step === 1 && "Discover photographers, manage bookings, and grow your photography business — all in one place."}
            {step === 2 && "We'll use these details to secure your Bulan account."}
            {step === 3 && (accountType === "client" ? "Tell us a bit about yourself." : accountType === "studio" ? "Tell us about your studio." : "Tell us about your photography practice.")}
            {step === 4 && "Define what services you offer, your general price limits, and active dynamic coverage area."}
            {step === 5 && "Upload documents so we can verify you're a real professional."}
            {step === 6 && "Upload 6 to 12 showcase items from your stunning portfolio."}
            {step === 7 && "Review and build your public profile live before submission."}
          </p>
        </div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white/5" />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white text-foreground overflow-y-auto overflow-x-visible">
        <div className="w-full max-w-md max-h-full overflow-y-visible animate-fade-up">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Camera className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-heading font-semibold text-lg">Bulan</span>
          </div>

          <div className={cn("min-h-[76px] mb-8", step === 1 ? "invisible" : "visible")}>
            <StepIndicator step={step - 1} total={totalSteps} labels={accountType ? STEP_TITLES[accountType] : undefined} />
          </div>

          {/* ===== Step 1 ===== */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-heading font-bold mb-1">Create your account</h2>
              <p className="text-muted-foreground mb-6">Choose how you'll use Bulan</p>

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
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm block">{a.label}</span>
                      <span className="text-xs text-muted-foreground">{a.desc}</span>
                    </div>
                    {accountType === a.type && (
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              <Button className="w-full" size="lg" disabled={!canStep1} onClick={() => handleStepChange(2)}>
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* ===== Step 2 ===== */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-heading font-bold mb-1">Account basics</h2>
              <p className="text-foreground/80 font-medium mb-1">Create your login details.</p>
              <p className="text-muted-foreground mb-6">We'll use these details to secure your Bulan account.</p>

              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                if (!canStep2) return;
                if (accountType === "client" || isResumingApplication) {
                  handleStepChange(3);
                } else {
                  handlePhotographerAccountSubmit();
                }
              }}>
                <Field label={accountType === "studio" ? "Full name (owner)" : "Full name"} required>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={100} />
                </Field>
                <Field label="Email address" required>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" maxLength={254} />
                </Field>
                <Field label="Phone number" required>
                  <Input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={() => setPhoneTouched(true)}
                    placeholder="0917 123 4567"
                    maxLength={20}
                  />
                  {phoneTouched && phone.trim() && (
                    isValidPhilippinePhone(normalizePhilippinePhone(phone))
                      ? <ValidationHint text="Valid phone number" valid />
                      : <p className="text-xs text-destructive">Enter a valid Philippine mobile number.</p>
                  )}
                </Field>

                <Field label="Password" required>
                  <PasswordInput value={password} onChange={setPassword} show={showPassword} setShow={setShowPassword} placeholder="Min. 8 characters" />
                  <ValidationHint text="At least 8 characters" valid={password.length >= 8} />
                </Field>
                <Field label="Confirm password" required>
                  <PasswordInput value={confirmPassword} onChange={setConfirmPassword} show={showConfirm} setShow={setShowConfirm} placeholder="Re-enter password" />
                  {confirmPassword && (
                    password === confirmPassword
                      ? <ValidationHint text="Passwords match" valid />
                      : <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                </Field>

                {apiError && accountType !== "client" && (
                  <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-xs uppercase tracking-wider mb-0.5">Registration Failed</p>
                      <p className="text-xs leading-relaxed">{apiError}</p>
                    </div>
                  </div>
                )}

                <StepNav onBack={() => handleStepChange(1)} nextLabel="Continue" disabled={!canStep2 || isLoading} isLoading={isLoading} />
              </form>
            </div>
          )}

          {/* ===== Step 3: Client — About you ===== */}
          {step === 3 && accountType === "client" && (
            <div>
              <h2 className="text-2xl font-heading font-bold mb-1">About you</h2>
              <p className="text-muted-foreground mb-6">Help photographers know who they're working with.</p>

              <form className="space-y-4" onSubmit={handleClientSubmit}>
                <Field label="Profile picture" hint="Optional — add a photo so photographers can recognize you">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
                      {profilePreview ? (
                        <img src={profilePreview} alt="Profile preview" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-7 h-7 text-muted-foreground/50" />
                      )}
                    </div>
                    <label className="cursor-pointer">
                      <span className="text-sm text-primary font-medium hover:underline">Upload photo</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => handleProfilePictureChange(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    {profilePicture && (
                      <button type="button" onClick={() => handleProfilePictureChange(null)} className="text-xs text-muted-foreground hover:text-foreground">
                        Remove
                      </button>
                    )}
                  </div>
                </Field>

                <Field label="Birthday" hint="Optional">
                  <Input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} max={new Date().toISOString().split("T")[0]} />
                </Field>

                <Field label="Gender" hint="Optional">
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Address" required>
                  <Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Street, barangay" maxLength={200} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="City / Municipality" required>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Legazpi" maxLength={100} />
                  </Field>
                  <Field label="Province" required>
                    <Input value={province} onChange={(e) => setProvince(e.target.value)} placeholder="e.g. Albay" maxLength={100} />
                  </Field>
                </div>

                {apiError && (
                  <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-xs uppercase tracking-wider mb-0.5">Registration Failed</p>
                      <p className="text-xs leading-relaxed">{apiError}</p>
                    </div>
                  </div>
                )}

                <StepNav
                  onBack={() => handleStepChange(2)}
                  nextLabel="Create account"
                  disabled={!canClientStep3 || isLoading}
                  isLoading={isLoading}
                />
              </form>
            </div>
          )}

          {/* ===== Step 3: Pro — Studio / Photographer info ===== */}
          {step === 3 && accountType !== "client" && (
            <div>
              <h2 className="text-2xl font-heading font-bold mb-1">
                {accountType === "studio" ? "Studio information" : "Photographer information"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {accountType === "studio" ? "Details about your studio business." : "Details about your photography practice."}
              </p>

              <form className="space-y-4" onSubmit={handleStep3Submit}>
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

                {apiError && (
                  <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-xs uppercase tracking-wider mb-0.5">Couldn't save</p>
                      <p className="text-xs leading-relaxed">{apiError}</p>
                    </div>
                  </div>
                )}

                <StepNav onBack={() => handleStepChange(2)} nextLabel="Continue" disabled={!canProStep3 || isLoading} isLoading={isLoading} />
              </form>
            </div>
          )}

          {/* ===== Step 4: Pro — Services ===== */}
          {step === 4 && accountType !== "client" && (
            <div>
              <h2 className="text-2xl font-heading font-bold mb-1">About your service</h2>
              <p className="text-muted-foreground mb-6">What you offer, where you cover, and pricing options.</p>

              <form className="space-y-5" onSubmit={handleStep4Submit}>
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

                <Field label="General base pricing rate limits (₱)" required>
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="number" min={0} value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="Min Price" />
                    <Input type="number" min={0} value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="Max Price" />
                  </div>
                  <div className="mt-2 text-xs bg-muted/40 p-3 rounded-lg flex items-start gap-2 text-muted-foreground border">
                    <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <p>Specific booking catalogs and draft tiers can be configured comfortably inside your dashboard room post-registration approval.</p>
                  </div>
                </Field>

                {apiError && (
                  <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-xs uppercase tracking-wider mb-0.5">Couldn't save</p>
                      <p className="text-xs leading-relaxed">{apiError}</p>
                    </div>
                  </div>
                )}

                <StepNav onBack={() => handleStepChange(3)} nextLabel="Continue" disabled={!canStep4 || isLoading} isLoading={isLoading} />
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

              <form className="space-y-5" onSubmit={handleStep5Submit}>
                <FileField
                  label="Government ID (front)"
                  required
                  hint="Any valid gov-issued ID (Passport, Driver's License, National ID, PhilSys, UMID…)"
                  file={govId}
                  onChange={setGovId}
                  accept="image/*,application/pdf"
                  alreadyUploaded={existingDocs.governmentId}
                />

                <FileField
                  label="Selfie holding your ID"
                  required
                  hint="A clear photo of you holding the same ID next to your face"
                  file={selfieId}
                  onChange={setSelfieId}
                  accept="image/*"
                  alreadyUploaded={existingDocs.selfieWithId}
                />

                {accountType === "studio" && (
                  <FileField
                    label="Business permit / DTI registration"
                    required
                    hint="Upload your registered business permit, DTI, or barangay business clearance"
                    file={businessPermit}
                    onChange={setBusinessPermit}
                    accept="image/*,application/pdf"
                    alreadyUploaded={existingDocs.businessPermit}
                  />
                )}

                <Field label="Additional Proof / Documents" required hint="Please upload 2 to 6 files. Max 2MB per file. Accepts images or documents. Add files one by one or select multiple.">
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">SVG, PNG, JPG or PDF (Max 2MB)</p>
                      </div>
                      <Input 
                        type="file" 
                        multiple 
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            handleAdditionalProofChange(Array.from(e.target.files));
                          }
                          e.target.value = '';
                        }}
                        accept="image/*,.pdf,.doc,.docx" 
                      />
                    </label>
                  </div>

                  <div className="flex justify-between items-center text-xs mt-3 mb-1">
                    <span className={cn("font-medium", (additionalProofValid || existingDocs.additionalDocuments >= 2) ? "text-emerald-600" : "text-destructive")}>
                      {additionalProof.length > 0
                        ? `${additionalProof.length} / 6 files selected (minimum 2)`
                        : existingDocs.additionalDocuments >= 2
                        ? `${existingDocs.additionalDocuments} file(s) already on file — add more to replace`
                        : `${additionalProof.length} / 6 files selected (minimum 2)`}
                    </span>
                  </div>

                  {additionalProof.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {additionalProof.map((file, idx) => {
                        const isImage = file.type.startsWith("image/");
                        const previewUrl = isImage ? URL.createObjectURL(file) : null;

                        return (
                          <div key={idx} className="flex items-center gap-3 p-3 border border-border rounded-xl bg-card relative group shadow-sm">
                            {isImage ? (
                              <div className="w-10 h-10 shrink-0 rounded-md overflow-hidden bg-muted">
                                <img src={previewUrl!} alt="preview" className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 shrink-0 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                                <FileText className="w-5 h-5" />
                              </div>
                            )}
                            
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate text-foreground">{file.name}</p>
                              <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            
                            <button 
                              type="button" 
                              onClick={() => removeAdditionalProof(idx)}
                              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                              title="Remove file"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Field>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground flex gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                  <p>
                    Admins cross-check your ID, business documents, and public social/website links before approval to prevent fake accounts.
                  </p>
                </div>

                {apiError && (
                  <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-xs uppercase tracking-wider mb-0.5">Upload failed</p>
                      <p className="text-xs leading-relaxed">{apiError}</p>
                    </div>
                  </div>
                )}

                <StepNav onBack={() => handleStepChange(4)} nextLabel="Continue" disabled={!canStep5Verify || isLoading} isLoading={isLoading} />
              </form>
            </div>
          )}

          {/* ===== Step 6: Portfolio upload ===== */}
          {step === 6 && accountType !== "client" && (
            <div>
              <h2 className="text-2xl font-heading font-bold mb-1 flex items-center gap-2">
                <ImageIcon className="w-6 h-6 text-primary" /> Portfolio upload
              </h2>
              <p className="text-muted-foreground mb-6">
                Upload between 6 to 12 showcase items from your stunning portfolio. Real pictures under 5MB are preferred.
              </p>

              <form className="space-y-5" onSubmit={handleStep6Submit}>
                <Field 
                  label="Sample works gallery" 
                  required 
                  hint="Please upload at least 6 but no more than 12 images. Choose photos one by one or select multiple."
                >
                  <label className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/30 transition-colors cursor-pointer block bg-muted/20">
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-bounce" />
                    <p className="text-sm font-semibold">Click to browse and add files</p>
                    <p className="text-xs text-muted-foreground mt-1">Accepts JPG, PNG, WEBP (6 to 12 images, max 5MB per file)</p>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          handlePortfolioChange(Array.from(e.target.files));
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                </Field>

                {portfolioFiles.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className={cn("font-medium", portfolioFilesWithinLimits ? "text-emerald-600" : "text-destructive")}>
                        {portfolioFiles.length} / 12 files selected (minimum 6)
                      </span>
                      {!portfolioFilesValidSizes && (
                        <span className="text-destructive font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> High-res assets exceed 5MB!
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 border border-border p-3 rounded-xl bg-card shadow-sm">
                      {portfolioFiles.map((f, idx) => {
                        const isSizeWarn = f.size > 5 * 1024 * 1024;
                        return (
                          <div key={idx} className={cn("relative aspect-square rounded-lg border overflow-hidden bg-muted group", isSizeWarn ? "border-destructive" : "border-border")}>
                            {portfolioPreviews[idx] && (
                              <img src={portfolioPreviews[idx]} alt="portfolio preview" className="w-full h-full object-cover" />
                            )}
                            <button
                              type="button"
                              onClick={() => removePortfolioImage(idx)}
                              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-colors"
                              title="Remove image"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            {isSizeWarn && (
                              <div className="absolute inset-x-0 bottom-0 bg-destructive/90 text-white text-[9px] py-0.5 text-center font-medium flex items-center justify-center gap-0.5">
                                <AlertCircle className="w-2.5 h-2.5" /> Over 5MB
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {apiError && (
                  <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-xs uppercase tracking-wider mb-0.5">Upload failed</p>
                      <p className="text-xs leading-relaxed">{apiError}</p>
                    </div>
                  </div>
                )}

                <StepNav onBack={() => handleStepChange(5)} nextLabel="Continue to Profile Builder" disabled={!canStep6Portfolio || isLoading} isLoading={isLoading} />
              </form>
            </div>
          )}

          {/* ===== Step 7: Public Profile Redesign ===== */}
          {step === 7 && accountType !== "client" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-heading font-bold mb-1">Public Profile Builder</h2>
                <p className="text-muted-foreground">This is exactly how prospective clients in Sorsogon will see your public profile card.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <form className="lg:col-span-6 space-y-5" onSubmit={handleFinalSubmit}>
                  
                  <Field label="Brand bio/description" required hint="Tell clients who you are. Min 20 characters">
                    <Textarea 
                      value={bio} 
                      onChange={(e) => setBio(e.target.value)} 
                      placeholder="e.g. Capturing timeless moments across Sorsogon with cinematic flair and natural lightning..." 
                      rows={3} 
                      maxLength={800} 
                    />
                  </Field>

                  <Field label="Your Photography Style" required hint="Select tags below or create custom ones that match your brand identity">
                    <div className="flex flex-wrap gap-1.5 p-3 rounded-xl border border-border bg-card mb-2">
                      {PHOTOGRAPHY_STYLES.map((style) => {
                        const active = photographyStyles.includes(style);
                        return (
                          <button
                            key={style}
                            type="button"
                            onClick={() => toggleStyle(style)}
                            className={cn(
                              "px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200",
                              active 
                                ? "bg-primary/10 text-primary border-primary" 
                                : "border-border text-muted-foreground hover:bg-muted"
                            )}
                          >
                            {style}
                          </button>
                        );
                      })}

                      {photographyStyles.filter(s => !PHOTOGRAPHY_STYLES.includes(s)).map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => toggleStyle(style)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-primary/10 text-primary border-primary flex items-center gap-1"
                        >
                          {style} <X className="w-3 h-3" />
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={customStyleInput}
                        onChange={(e) => setCustomStyleInput(e.target.value)}
                        placeholder="Add your own custom style (e.g., Neon Noir, High-Contrast)"
                        maxLength={30}
                        className="h-9 text-xs flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomStyle();
                          }
                        }}
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleAddCustomStyle}
                        className="h-9 px-3 text-xs flex shrink-0 items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </Button>
                    </div>
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Profile avatar" hint="PNG or JPG, max 5MB">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
                          {profilePreview ? (
                            <img src={profilePreview} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-muted-foreground/50" />
                          )}
                        </div>
                        <label className="cursor-pointer">
                          <span className="text-xs text-primary font-semibold hover:underline">Upload photo</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => handleProfilePictureChange(e.target.files?.[0] ?? null)}
                          />
                        </label>
                      </div>
                    </Field>

                    <Field label="Cover Banner" hint="Wide format cover preview, max 5MB">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-10 rounded-md bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
                          {coverPreview ? (
                            <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-muted-foreground/50" />
                          )}
                        </div>
                        <label className="cursor-pointer">
                          <span className="text-xs text-primary font-semibold hover:underline">Upload cover</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => handleCoverPhotoChange(e.target.files?.[0] ?? null)}
                          />
                        </label>
                      </div>
                    </Field>
                  </div>

                  <Field label="Social profiles & website" required hint="At least one profile url required for live verification">
                    <div className="space-y-2">
                      <IconInput icon={Facebook} value={facebook} onChange={setFacebook} placeholder="Facebook Page URL" />
                      <IconInput icon={Instagram} value={instagram} onChange={setInstagram} placeholder="Instagram handle or URL" />
                      <IconInput icon={Globe} value={website} onChange={setWebsite} placeholder="Business Website link" />
                    </div>
                  </Field>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/5 dark:border-amber-500/20 p-3 text-xs text-amber-800 dark:text-amber-300 flex gap-2">
                    <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>Submitting launches your <strong>pending admin verification review</strong>. Admins cross-verify links in Sorsogon before system publication.</p>
                  </div>

                  {apiError && (
                    <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-xs uppercase tracking-wider mb-0.5">Submission failed</p>
                        <p className="text-xs leading-relaxed">{apiError}</p>
                      </div>
                    </div>
                  )}

                  <StepNav onBack={() => handleStepChange(6)} nextLabel="Submit application" disabled={!canStep7Profile || isLoading} isLoading={isLoading} />
                </form>

                <div className="lg:col-span-6 bg-muted/40 p-6 rounded-2xl border border-border sticky top-6">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-4 text-center">Live profile mockup card</span>
                  
                  <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg animate-fade-up">
                    <div className="h-32 w-full bg-[#3a2215] relative overflow-hidden">
                      {coverPreview ? (
                        <img src={coverPreview} alt="Cover Banner" className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-950 to-orange-950 opacity-90 flex items-center justify-center">
                          <span className="text-[11px] text-white/30 uppercase font-mono tracking-widest">No Cover Photo Uploaded</span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 pt-0 relative space-y-4">
                      <div className="w-16 h-16 rounded-full border-4 border-card bg-muted overflow-hidden absolute -top-8 left-4 shadow-md">
                        {profilePreview ? (
                          <img src={profilePreview} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/10">
                            <User className="w-6 h-6 text-primary" />
                          </div>
                        )}
                      </div>

                      <div className="pl-24 pt-1.5 flex justify-between items-start">
                        <div>
                          <h3 className="font-heading font-bold text-base leading-tight truncate max-w-[180px]">
                            {businessName || name || "Brand / Studio Name"}
                          </h3>
                          <span className="text-[10px] text-primary font-semibold block capitalize">
                            {accountType === "studio" ? "Photography Studio" : "Freelancer"}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {facebook && <Facebook className="w-3.5 h-3.5 text-[#1877f2]" />}
                          {instagram && <Instagram className="w-3.5 h-3.5 text-[#e1306c]" />}
                          {website && <Globe className="w-3.5 h-3.5 text-muted-foreground" />}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground px-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{address || "Based in Bulan, Sorsogon"}</span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {photographyStyles.length > 0 ? (
                          photographyStyles.map((style) => (
                            <span key={style} className="px-2 py-0.5 rounded-full bg-primary/5 text-primary text-[10px] font-medium border border-primary/20">
                              {style}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic px-1">No photography style selected</span>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground leading-relaxed px-1 line-clamp-3 italic">
                        {bio ? `"${bio}"` : "Short creative description of your photography service goes here..."}
                      </div>

                      <div className="space-y-2 border-t border-border pt-3">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Showcase Gallery</span>
                        <div className="grid grid-cols-6 gap-1">
                          {portfolioPreviews.slice(0, 12).map((previewUrl, i) => (
                            <div key={i} className="aspect-square rounded overflow-hidden bg-muted">
                              <img src={previewUrl} alt="gallery thumbnail" className="w-full h-full object-cover" />
                            </div>
                          ))}
                          {Array.from({ length: Math.max(0, 6 - portfolioPreviews.length) }).map((_, i) => (
                            <div key={i} className="aspect-square rounded border border-dashed border-border bg-muted/20 flex items-center justify-center">
                              <ImageIcon className="w-3.5 h-3.5 text-muted-foreground/30" />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 border-t border-border pt-3">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Service Packages</span>
                        <div className="p-3 bg-muted/30 border border-dashed border-border rounded-lg text-center">
                          <p className="text-[11px] font-medium text-muted-foreground">No custom tiers configured yet</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5">You can build drafts and publish custom rates instantly from your dashboard once approved!</p>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step !== 7 && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Small building blocks
============================================================ */
function BackLink({ onDark = false }: { onDark?: boolean }) {
  return (
    <Link
      to="/"
      className={`absolute top-5 left-5 z-20 inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border border-transparent text-foreground/80 transition-colors hover:bg-card hover:border-border hover:text-foreground hover:shadow-sm hover:backdrop-blur ${
        onDark ? "lg:text-white/80" : ""
      }`}
    >
      <ArrowLeft className="w-4 h-4" /> Back to website
    </Link>
  );
}

function StepIndicator({ step, total, labels }: { step: number; total: number; labels?: string[] }) {
  const currentLabel = labels?.[step - 1];
  return (
    <div>
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {Array.from({ length: total }).map((_, idx) => {
          const s = idx + 1;
          return (
            <div key={s} className="flex items-center gap-2 shrink-0">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors",
                step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}>
                {s}
              </div>
              {s < total && <div className={cn("w-4 h-0.5 rounded-full transition-colors", step > s ? "bg-primary" : "bg-border")} />}
            </div>
          );
        })}
      </div>
      <p className="text-sm font-medium text-foreground mt-2">
        {currentLabel}
        <span className="text-xs font-normal text-muted-foreground ml-2">Step {step} of {total}</span>
      </p>
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

function ValidationHint({ text, valid }: { text: string; valid: boolean }) {
  return (
    <p className={cn("text-xs flex items-center gap-1", valid ? "text-green-600" : "text-muted-foreground")}>
      {valid && <CheckCircle2 className="w-3.5 h-3.5" />}
      {text}
    </p>
  );
}
function StepNav({ onBack, nextLabel, disabled, isLoading }: { onBack: () => void; nextLabel: string; disabled?: boolean; isLoading?: boolean }) {
  return (
    <div className="flex gap-3 pt-2">
      <Button type="button" variant="outline" onClick={onBack} className="gap-1" disabled={isLoading}>
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>
      <Button type="submit" className="flex-1" size="lg" disabled={disabled || isLoading}>
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Processing...
          </span>
        ) : (
          <>
            {nextLabel} <ArrowRight className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>
    </div>
  );
}

function PasswordInput({ value, onChange, show, setShow, placeholder }: {
  value: string; onChange: (v: string) => void; show: boolean; setShow: (b: boolean) => void; placeholder?: string;
}) {
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
        maxLength={72}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="w-4 h-4 shrink-0" strokeWidth={2} /> : <Eye className="w-4 h-4 shrink-0" strokeWidth={2} />}
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

function FileField({ label, required, hint, file, onChange, accept, alreadyUploaded }: {
  label: string; required?: boolean; hint?: string; file: File | null; onChange: (f: File | null) => void; accept?: string; alreadyUploaded?: boolean;
}) {
  const showsExisting = !file && alreadyUploaded;
  return (
    <Field label={label} required={required} hint={hint}>
      <label className="border-2 border-dashed border-border rounded-xl p-4 hover:border-primary/30 transition-colors cursor-pointer flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", (file || showsExisting) ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
          <CheckCircle2 className="w-5 h-5" style={{ display: file || showsExisting ? undefined : "none" }} />
          <FileText className="w-5 h-5" style={{ display: file || showsExisting ? "none" : undefined }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">
            {file?.name || (showsExisting ? "Already uploaded — click to replace" : "Click to upload")}
          </p>
          <p className="text-xs text-muted-foreground">
            {file ? `${(file.size / 1024).toFixed(0)} KB` : showsExisting ? "On file from your previous submission" : "JPG, PNG, or PDF"}
          </p>
        </div>
        <input type="file" accept={accept} className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] || null)} />
      </label>
    </Field>
  );
}