import { useState } from "react";
import toast from "react-hot-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { 
  Plus, Archive, Sparkles, Wand2, Package, Save, Copy, 
  FileBox, Eye, EyeOff, AlertTriangle, X, Info, RotateCcw, Trash2, CheckCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface PackageItem {
  id: string;
  name: string;
  price: number;
  description: string;
  inclusions: string;
  status: "Active" | "Draft" | "Archived";
}

interface AddonItem {
  id: string;
  name: string;
  description: string;
  price: number;
  enabled: boolean;
  status: "Active" | "Archived";
}

const initialPackages: PackageItem[] = [
  { 
    id: "PK-1", 
    name: "Basic Portrait Package", 
    price: 3000, 
    description: "Ideal for individual portrait sessions and small shoots", 
    inclusions: "Up to 2 hours coverage\n50 edited photos\nOnline photo gallery\n1 Photographer", 
    status: "Active" 
  },
  { 
    id: "PK-2", 
    name: "Standard Event Package", 
    price: 7000, 
    description: "Great for birthdays and medium-sized celebrations", 
    inclusions: "Up to 5 hours coverage\n200 edited photos\n2 Photographers\nSame-day teaser photos", 
    status: "Active" 
  },
  { 
    id: "PK-3", 
    name: "Grand Wedding Draft", 
    price: 18000, 
    description: "Full-day comprehensive wedding coverage", 
    inclusions: "Full-day coverage (up to 10 hrs)\n500+ edited photos\n2 Photographers + 1 Videographer\nFree Prenup Session", 
    status: "Draft" 
  },
];

const initialAddons: AddonItem[] = [
  { id: "AD-1", name: "Extra Coverage Hour", description: "Additional hour of photo coverage on location", price: 1500, enabled: true, status: "Active" },
  { id: "AD-2", name: "Premium Photobook", description: "Hardcover 20-page high quality print photo album", price: 5000, enabled: true, status: "Active" },
  { id: "AD-3", name: "Drone Aerial Photography", description: "Aerial photo & video footage by licensed operator", price: 3500, enabled: false, status: "Active" },
];

export default function StudioPackages() {
  const [allowCustom, setAllowCustom] = useState(true);
  const [packages, setPackages] = useState<PackageItem[]>(initialPackages);
  const [addons, setAddons] = useState<AddonItem[]>(initialAddons);

  // Modal States
  const [packageToArchive, setPackageToArchive] = useState<PackageItem | null>(null);
  const [packageToDraft, setPackageToDraft] = useState<PackageItem | null>(null);
  const [addonToArchive, setAddonToArchive] = useState<AddonItem | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [itemToDeletePermanently, setItemToDeletePermanently] = useState<{ id: string; type: "package" | "addon"; name: string } | null>(null);
  const [isAddAddonOpen, setIsAddAddonOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  
  // Custom Toggle Confirmation State
  const [pendingCustomToggle, setPendingCustomToggle] = useState<boolean | null>(null);
  const [isCustomToggleModalOpen, setIsCustomToggleModalOpen] = useState(false);

  // New Add-on Form State
  const [newAddon, setNewAddon] = useState({ name: "", description: "", price: 1000 });

  // Custom Package Calculator Rates
  const [rates, setRates] = useState({
    baseFee: 2000,
    rawFiles: 1500,
    secondLocation: 1000,
    photoTiers: [
      { label: "50 Photos included", price: 0 },
      { label: "100 Photos included", price: 1000 },
      { label: "200 Photos included", price: 2500 },
    ],
    deliveryTiers: [
      { label: "Standard Delivery (2-3 weeks)", price: 0 },
      { label: "Express Delivery (48 hours)", price: 3000 },
    ]
  });

  // Calculate active packages count
  const activePackagesCount = packages.filter(p => p.status === "Active").length;

  // Handlers for Custom Request Toggle
  const handleCustomToggle = (checked: boolean) => {
    setPendingCustomToggle(checked);
    setIsCustomToggleModalOpen(true);
  };

  const confirmCustomToggle = () => {
    if (pendingCustomToggle === null) return;
    setAllowCustom(pendingCustomToggle);
    setIsCustomToggleModalOpen(false);
    
    if (!pendingCustomToggle) {
      toast("Custom package calculator disabled. Clients can only select fixed packages.", { icon: "⚠️" });
    } else {
      toast.success("Custom package calculator enabled for clients.");
    }
    setPendingCustomToggle(null);
  };

  // Add Draft Package
  const handleAddDraftPackage = () => {
    const newPkg: PackageItem = {
      id: `PK-${Date.now()}`,
      name: "Untitled Package Draft",
      price: 2500,
      description: "Package short description...",
      inclusions: "List inclusions here...",
      status: "Draft"
    };
    setPackages([...packages, newPkg]);
    toast.success("New draft package added. Edit details below.");
  };

  // Duplicate Package
  const duplicatePackage = (pkg: PackageItem) => {
    const duplicated: PackageItem = { 
      ...pkg, 
      id: `PK-${Date.now()}`, 
      name: `${pkg.name} (Copy)`, 
      status: "Draft" 
    };
    setPackages([...packages, duplicated]);
    toast.success(`Duplicated "${pkg.name}" as a new draft.`);
  };

  // Toggle Publish / Draft
  const handleStatusChangeClick = (pkg: PackageItem) => {
    if (pkg.status === "Active") {
      setPackageToDraft(pkg);
    } else {
      setPackages(packages.map(p => p.id === pkg.id ? { ...p, status: "Active" } : p));
      toast.success(`"${pkg.name}" is now Published & visible to clients!`);
    }
  };

  const confirmRevertToDraft = () => {
    if (!packageToDraft) return;
    setPackages(packages.map(p => p.id === packageToDraft.id ? { ...p, status: "Draft" } : p));
    toast.success(`"${packageToDraft.name}" moved to Drafts and hidden from new clients.`);
    setPackageToDraft(null);
  };

  // Archiving Package
  const confirmArchivePackage = () => {
    if (!packageToArchive) return;
    setPackages(packages.map(p => p.id === packageToArchive.id ? { ...p, status: "Archived" } : p));
    toast.success(`"${packageToArchive.name}" has been moved to Archive.`);
    setPackageToArchive(null);
  };

  // Add-on Creation & Archiving
  const handleCreateAddon = () => {
    if (!newAddon.name.trim()) {
      toast.error("Please enter an add-on name.");
      return;
    }
    const addonObj: AddonItem = {
      id: `AD-${Date.now()}`,
      name: newAddon.name,
      description: newAddon.description,
      price: Number(newAddon.price),
      enabled: true,
      status: "Active"
    };
    setAddons([...addons, addonObj]);
    setNewAddon({ name: "", description: "", price: 1000 });
    setIsAddAddonOpen(false);
    toast.success("Custom add-on created successfully!");
  };

  const confirmArchiveAddon = () => {
    if (!addonToArchive) return;
    setAddons(addons.map(a => a.id === addonToArchive.id ? { ...a, status: "Archived" } : a));
    toast.success(`Add-on "${addonToArchive.name}" archived.`);
    setAddonToArchive(null);
  };

  // Restore & Delete from Archive
  const restoreItem = (id: string, type: "package" | "addon") => {
    if (type === "package") {
      setPackages(packages.map(p => p.id === id ? { ...p, status: "Draft" } : p));
      toast.success("Package restored as a Draft.");
    } else {
      setAddons(addons.map(a => a.id === id ? { ...a, status: "Active" } : a));
      toast.success("Add-on restored to active list.");
    }
  };

  const confirmPermanentDelete = () => {
    if (!itemToDeletePermanently) return;
    if (itemToDeletePermanently.type === "package") {
      setPackages(packages.filter(p => p.id !== itemToDeletePermanently.id));
    } else {
      setAddons(addons.filter(a => a.id !== itemToDeletePermanently.id));
    }
    toast.success(`Permanently deleted ${itemToDeletePermanently.name}.`);
    setItemToDeletePermanently(null);
  };

  // Save Config
  const confirmSaveConfig = () => {
    setIsSaveModalOpen(false);
    toast.success("All package configurations, add-ons, and calculator rates saved!");
  };

  const visiblePackages = packages.filter(p => p.status !== "Archived");
  const visibleAddons = addons.filter(a => a.status !== "Archived");
  const archivedPackages = packages.filter(p => p.status === "Archived");
  const archivedAddons = addons.filter(a => a.status === "Archived");

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-up pb-12">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Services & Packages</h1>
            <p className="text-sm text-muted-foreground mt-1">Configure your service catalogs, custom calculator rates, and optional add-ons.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              className="gap-2 h-9 text-xs"
              onClick={() => setIsArchiveModalOpen(true)}
            >
              <FileBox className="w-4 h-4" /> 
              View Archive ({archivedPackages.length + archivedAddons.length})
            </Button>
            <Button onClick={() => setIsSaveModalOpen(true)} className="gap-2 h-9 text-xs bg-primary text-primary-foreground">
              <Save className="w-4 h-4" /> Save All Changes
            </Button>
          </div>
        </div>

        {/* Bookability Status Banner Requirement */}
        {activePackagesCount < 1 && (
          <div className="p-4 rounded-xl border flex items-start gap-3 bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <strong>Bookability Requirement:</strong> To be bookable by clients online, your account must have an approved application, an active profile, at least 6–12 portfolio photos, and <strong>at least 1 Active package</strong>.
              <span className="block mt-1 font-semibold">
                Current Active Packages: {activePackagesCount} ⚠️ Needs at least 1 Active package
              </span>
            </div>
          </div>
        )}

        {/* CUSTOM REQUEST TOGGLE */}
        <section className="bg-card rounded-xl border border-border/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-shadow">
          <div>
            <h3 className="font-heading font-semibold text-base">Allow Custom Package Requests</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              When enabled, clients can use your custom calculator to build a tailored photography session. When disabled, clients are limited to selecting fixed packages.
            </p>
          </div>
          <Switch checked={allowCustom} onCheckedChange={handleCustomToggle} />
        </section>

        {/* SECTION 1: FIXED PACKAGES */}
        <section className="bg-card rounded-xl card-shadow border border-border/50 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-heading font-semibold flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" /> Fixed Studio Packages
              </h3>
              <p className="text-xs text-muted-foreground">Add and configure predefined photography packages that clients can select directly.</p>
            </div>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={handleAddDraftPackage}>
              <Plus className="w-3.5 h-3.5" /> Add Draft Package
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {visiblePackages.map((pk) => (
              <div 
                key={pk.id} 
                className={`rounded-xl border p-4 relative flex flex-col justify-between space-y-4 transition-all ${
                  pk.status === "Draft" 
                    ? "bg-card border-dashed border-border" 
                    : "bg-muted/10 border-border hover:border-primary/40"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between h-6">
                    {pk.status === "Active" ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Eye className="w-3 h-3"/> Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <EyeOff className="w-3 h-3"/> Draft
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Package Name</Label>
                    <Input 
                      className="h-8 text-xs font-semibold" 
                      placeholder="Package name" 
                      value={pk.name}
                      onChange={(e) => setPackages(packages.map((p) => p.id === pk.id ? { ...p, name: e.target.value } : p))} 
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Price (₱)</Label>
                    <Input 
                      type="number" 
                      className="h-8 text-xs font-semibold" 
                      value={pk.price}
                      onChange={(e) => setPackages(packages.map((p) => p.id === pk.id ? { ...p, price: Number(e.target.value) } : p))} 
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Short Description</Label>
                    <Input 
                      className="h-8 text-xs" 
                      placeholder="Short description" 
                      value={pk.description}
                      onChange={(e) => setPackages(packages.map((p) => p.id === pk.id ? { ...p, description: e.target.value } : p))} 
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">What's Included (One item per line)</Label>
                    <Textarea 
                      rows={4} 
                      className="text-xs resize-none" 
                      placeholder="Inclusions list..." 
                      value={pk.inclusions}
                      onChange={(e) => setPackages(packages.map((p) => p.id === pk.id ? { ...p, inclusions: e.target.value } : p))} 
                    />
                  </div>
                </div>

                {/* Card Actions */}
                <div className="border-t border-border/50 pt-4 mt-2 flex items-center gap-2">
                  <Button 
                    variant={pk.status === "Active" ? "secondary" : "default"} 
                    className="flex-1 text-xs h-8" 
                    onClick={() => handleStatusChangeClick(pk)}
                  >
                    {pk.status === "Active" ? "Revert to Draft" : "Publish Package"}
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-foreground" 
                      onClick={() => duplicatePackage(pk)} 
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                      onClick={() => setPackageToArchive(pk)} 
                      title="Archive"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2: ADD-ONS */}
        <section className="bg-card rounded-xl card-shadow border border-border/50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-heading font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Optional Add-ons
              </h3>
              <p className="text-xs text-muted-foreground">Configure optional extras clients can append to fixed or custom package requests.</p>
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setIsAddAddonOpen(true)}>
              <Plus className="w-3.5 h-3.5"/> New Add-on
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleAddons.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-muted/20">
                <Switch 
                  checked={a.enabled} 
                  onCheckedChange={(v) => {
                    setAddons(addons.map(item => item.id === a.id ? { ...item, enabled: v } : item));
                    toast.success(`Add-on "${a.name}" ${v ? "enabled" : "disabled"}.`);
                  }} 
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs text-foreground">{a.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{a.description}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-muted-foreground">₱</span>
                  <Input 
                    type="number" 
                    className="w-20 h-8 text-xs" 
                    value={a.price}
                    onChange={(e) => setAddons(addons.map(item => item.id === a.id ? { ...item, price: Number(e.target.value) } : item))} 
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-destructive shrink-0 hover:bg-destructive/10" 
                  onClick={() => setAddonToArchive(a)}
                  title="Archive Add-on"
                >
                  <Archive className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 3: CUSTOM CALCULATOR RATES */}
        {allowCustom && (
          <section className="bg-card rounded-xl card-shadow border border-border/50 p-6 space-y-4 animate-fade-in">
            <div className="space-y-1">
              <h3 className="font-heading font-semibold flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-primary" /> Build-Your-Own Package Calculator Rates
              </h3>
              <p className="text-xs text-muted-foreground">Set up the baseline prices and tier pricing used when clients customize their requests.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Base Session Fee (₱)</Label>
                <Input 
                  type="number" 
                  className="h-9 text-xs" 
                  value={rates.baseFee} 
                  onChange={(e) => setRates({ ...rates, baseFee: Number(e.target.value) })} 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">RAW Files Add-on (₱)</Label>
                <Input 
                  type="number" 
                  className="h-9 text-xs" 
                  value={rates.rawFiles} 
                  onChange={(e) => setRates({ ...rates, rawFiles: Number(e.target.value) })} 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Second Location Fee (₱)</Label>
                <Input 
                  type="number" 
                  className="h-9 text-xs" 
                  value={rates.secondLocation} 
                  onChange={(e) => setRates({ ...rates, secondLocation: Number(e.target.value) })} 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div>
                <Label className="text-xs font-semibold">Photo Count Pricing Tiers</Label>
                <div className="mt-2 space-y-2">
                  {rates.photoTiers.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/10 text-xs">
                      <span className="flex-1 text-muted-foreground">{t.label}</span>
                      <span className="text-muted-foreground">+₱</span>
                      <Input 
                        type="number" 
                        className="w-24 h-7 text-xs font-semibold" 
                        value={t.price}
                        onChange={(e) => setRates({
                          ...rates,
                          photoTiers: rates.photoTiers.map((p, j) => j === i ? { ...p, price: Number(e.target.value) } : p)
                        })} 
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Delivery Duration Tiers</Label>
                <div className="mt-2 space-y-2">
                  {rates.deliveryTiers.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/10 text-xs">
                      <span className="flex-1 text-muted-foreground">{t.label}</span>
                      <span className="text-muted-foreground">+₱</span>
                      <Input 
                        type="number" 
                        className="w-24 h-7 text-xs font-semibold" 
                        value={t.price}
                        onChange={(e) => setRates({
                          ...rates,
                          deliveryTiers: rates.deliveryTiers.map((p, j) => j === i ? { ...p, price: Number(e.target.value) } : p)
                        })} 
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* CONFIRM SAVE MODAL */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm p-6 rounded-xl shadow-2xl border border-border/50 flex flex-col space-y-4 relative">
            <Button variant="ghost" size="icon" onClick={() => setIsSaveModalOpen(false)} className="absolute right-4 top-4 h-6 w-6 rounded-full">
              <X className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Save className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Save Changes?</h3>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to save all changes? This will update your live catalog, fixed packages, add-ons, and custom calculator rates for your clients.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsSaveModalOpen(false)}>Cancel</Button>
              <Button variant="default" size="sm" onClick={confirmSaveConfig}>Yes, Save Changes</Button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM TOGGLE CUSTOM PACKAGE MODAL */}
      {isCustomToggleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm p-6 rounded-xl shadow-2xl border border-border/50 flex flex-col space-y-4 relative">
            <Button variant="ghost" size="icon" onClick={() => setIsCustomToggleModalOpen(false)} className="absolute right-4 top-4 h-6 w-6 rounded-full">
              <X className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${pendingCustomToggle ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                {pendingCustomToggle ? <Wand2 className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-amber-500" />}
              </div>
              <div>
                <h3 className="font-bold text-lg">
                  {pendingCustomToggle ? "Enable Calculator?" : "Disable Calculator?"}
                </h3>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {pendingCustomToggle 
                ? "Clients will be able to build their own tailored photography sessions using your custom calculator rates."
                : "Clients will be restricted to selecting from your fixed packages only. The custom calculator will be hidden from your booking page."}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsCustomToggleModalOpen(false)}>Cancel</Button>
              <Button variant={pendingCustomToggle ? "default" : "destructive"} size="sm" onClick={confirmCustomToggle}>
                {pendingCustomToggle ? "Enable Custom Packages" : "Disable Custom Packages"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* REVERT TO DRAFT MODAL */}
      {packageToDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md p-6 rounded-xl shadow-2xl border border-border/50 flex flex-col space-y-4 relative">
            <Button variant="ghost" size="icon" onClick={() => setPackageToDraft(null)} className="absolute right-4 top-4 h-6 w-6 rounded-full">
              <X className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <Info className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Revert to Draft?</h3>
                <p className="text-xs text-muted-foreground">Hide "{packageToDraft.name}" from new client catalog.</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This package will no longer be visible for new client bookings. Existing bookings or submitted requests for this package will remain unaffected.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setPackageToDraft(null)}>Cancel</Button>
              <Button variant="default" size="sm" onClick={confirmRevertToDraft}>Confirm & Hide</Button>
            </div>
          </div>
        </div>
      )}

      {/* ARCHIVE PACKAGE MODAL */}
      {packageToArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md p-6 rounded-xl shadow-2xl border border-border/50 flex flex-col space-y-4 relative">
            <Button variant="ghost" size="icon" onClick={() => setPackageToArchive(null)} className="absolute right-4 top-4 h-6 w-6 rounded-full">
              <X className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <Archive className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Archive Package?</h3>
                <p className="text-xs text-muted-foreground">Move "{packageToArchive.name}" to archive records.</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Archiving hides this package without deleting transaction history. Historical bookings retain a complete snapshot of this package. You can restore or permanently delete it later from the Archive.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setPackageToArchive(null)}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={confirmArchivePackage}>Yes, Archive Package</Button>
            </div>
          </div>
        </div>
      )}

      {/* ARCHIVE ADD-ON MODAL */}
      {addonToArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md p-6 rounded-xl shadow-2xl border border-border/50 flex flex-col space-y-4 relative">
            <Button variant="ghost" size="icon" onClick={() => setAddonToArchive(null)} className="absolute right-4 top-4 h-6 w-6 rounded-full">
              <X className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <Archive className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Archive Add-on?</h3>
                <p className="text-xs text-muted-foreground">Archive "{addonToArchive.name}".</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This add-on will be hidden from new custom and fixed package selections.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setAddonToArchive(null)}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={confirmArchiveAddon}>Archive Add-on</Button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW ADD-ON MODAL */}
      {isAddAddonOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md p-6 rounded-xl shadow-2xl border border-border/50 flex flex-col space-y-4 relative">
            <Button variant="ghost" size="icon" onClick={() => setIsAddAddonOpen(false)} className="absolute right-4 top-4 h-6 w-6 rounded-full">
              <X className="w-4 h-4" />
            </Button>
            <h3 className="font-bold text-lg">Create Custom Add-on</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Add-on Name</Label>
                <Input 
                  placeholder="e.g. Aerial Drone Coverage" 
                  value={newAddon.name} 
                  onChange={(e) => setNewAddon({ ...newAddon, name: e.target.value })} 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Short Description</Label>
                <Input 
                  placeholder="Brief description..." 
                  value={newAddon.description} 
                  onChange={(e) => setNewAddon({ ...newAddon, description: e.target.value })} 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Price (₱)</Label>
                <Input 
                  type="number" 
                  value={newAddon.price} 
                  onChange={(e) => setNewAddon({ ...newAddon, price: Number(e.target.value) })} 
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsAddAddonOpen(false)}>Cancel</Button>
              <Button variant="default" size="sm" onClick={handleCreateAddon}>Create Add-on</Button>
            </div>
          </div>
        </div>
      )}

      {/* ARCHIVE MANAGEMENT MODAL */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-2xl p-6 rounded-xl shadow-2xl border border-border/50 flex flex-col space-y-4 relative max-h-[85vh] overflow-y-auto">
            <Button variant="ghost" size="icon" onClick={() => setIsArchiveModalOpen(false)} className="absolute right-4 top-4 h-6 w-6 rounded-full">
              <X className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-2">
              <FileBox className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-lg">Archived Packages & Add-ons</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Restore archived items back to active status or permanently delete items that have no conflicting historical bookings.
            </p>

            {/* Archived Packages List */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Archived Packages</h4>
              {archivedPackages.length > 0 ? (
                archivedPackages.map((p) => (
                  <div key={p.id} className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-xs text-foreground">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">₱{p.price.toLocaleString()} • {p.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => restoreItem(p.id, "package")}>
                        <RotateCcw className="w-3 h-3" /> Restore
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => setItemToDeletePermanently({ id: p.id, type: "package", name: p.name })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic bg-muted/10 p-3 rounded-lg text-center">No archived packages.</p>
              )}
            </div>

            {/* Archived Add-ons List */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Archived Add-ons</h4>
              {archivedAddons.length > 0 ? (
                archivedAddons.map((a) => (
                  <div key={a.id} className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-xs text-foreground">{a.name}</p>
                      <p className="text-[11px] text-muted-foreground">₱{a.price.toLocaleString()} • {a.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => restoreItem(a.id, "addon")}>
                        <RotateCcw className="w-3 h-3" /> Restore
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => setItemToDeletePermanently({ id: a.id, type: "addon", name: a.name })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic bg-muted/10 p-3 rounded-lg text-center">No archived add-ons.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PERMANENT DELETE CONFIRMATION MODAL */}
      {itemToDeletePermanently && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm p-6 rounded-xl shadow-2xl border border-border/50 flex flex-col space-y-4 relative">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <h3 className="font-bold text-base">Permanently Delete Item?</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-foreground">"{itemToDeletePermanently.name}"</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setItemToDeletePermanently(null)}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={confirmPermanentDelete}>Permanently Delete</Button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}