import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Plus, Archive, Sparkles, Wand2, Package, Save, Copy,
  Eye, EyeOff, AlertTriangle, X, Info, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api";
import {
  usePhotographerPackages, useCreatePackage, useUpdatePackage, usePublishPackage,
  useRevertPackageToDraft, useArchivePackage,
} from "@/hooks/usePhotographerPackages";
import type { PackageRecord, PackageInput } from "@/services/photographerPackageService";
import {
  usePhotographerAddOns, useCreateAddOn, useUpdateAddOn, useArchiveAddOn,
} from "@/hooks/usePhotographerAddOns";
import type { AddOnRecord, AddOnInput } from "@/services/photographerAddOnService";
import {
  useCustomPackageConfig, useCustomPackageComponents, useUpdateCustomPackageConfig,
  useCreateCustomComponent, useUpdateCustomComponent, useArchiveCustomComponent,
} from "@/hooks/usePhotographerCustomPackage";
import type { CustomComponentType, CustomComponentRecord } from "@/services/photographerCustomPackageService";

const FLAT_OPTION_HINT = "Optional one-off extras clients can toggle on — e.g. \"Include RAW Files\", \"Second Location Coverage\", or anything else you offer.";
const SUGGESTED_TIER_NAMES = ["Edited Photos", "Number of Photographers", "Delivery Speed"];

// --- local draft shape for editable package cards ---
interface PackageDraft {
  name: string;
  price: number;
  description: string;
  inclusionsText: string; // newline-separated, converted to/from included_items
  durationMinutes: number;
  bufferMinutes: number;
}
function draftFromPackage(p: PackageRecord): PackageDraft {
  return {
    name: p.name,
    price: p.price,
    description: p.description,
    inclusionsText: p.includedItems.join("\n"),
    durationMinutes: p.durationMinutes,
    bufferMinutes: p.bufferMinutes,
  };
}
function draftToInput(d: PackageDraft): PackageInput {
  return {
    name: d.name,
    description: d.description || null,
    included_items: d.inclusionsText.split("\n").map((s) => s.trim()).filter(Boolean),
    price: Number(d.price),
    duration_minutes: Number(d.durationMinutes),
    buffer_minutes: Number(d.bufferMinutes) || 0,
  };
}

interface AddOnDraft {
  name: string;
  description: string;
  price: number;
}
function draftFromAddOn(a: AddOnRecord): AddOnDraft {
  return { name: a.name, description: a.description, price: a.price };
}

export default function StudioPackages() {
  const { toast } = useToast();

  // --- Packages ---
  const { data: packages = [], isLoading: packagesLoading } = usePhotographerPackages();
  const createPackage = useCreatePackage();
  const updatePackage = useUpdatePackage();
  const publishPackage = usePublishPackage();
  const revertPackage = useRevertPackageToDraft();
  const archivePackageMut = useArchivePackage();

  const [packageDrafts, setPackageDrafts] = useState<Record<string, PackageDraft>>({});
  useEffect(() => {
    setPackageDrafts((prev) => {
      const next = { ...prev };
      for (const p of packages) {
        if (!next[p.id]) next[p.id] = draftFromPackage(p);
      }
      return next;
    });
  }, [packages]);

  const [packageToArchive, setPackageToArchive] = useState<PackageRecord | null>(null);
  const [packageToDraft, setPackageToDraft] = useState<PackageRecord | null>(null);

  // --- Add-ons ---
  const { data: addons = [], isLoading: addonsLoading } = usePhotographerAddOns();
  const createAddOn = useCreateAddOn();
  const updateAddOn = useUpdateAddOn();
  const archiveAddOnMut = useArchiveAddOn();

  const [addonDrafts, setAddonDrafts] = useState<Record<string, AddOnDraft>>({});
  useEffect(() => {
    setAddonDrafts((prev) => {
      const next = { ...prev };
      for (const a of addons) {
        if (!next[a.id]) next[a.id] = draftFromAddOn(a);
      }
      return next;
    });
  }, [addons]);

  const [addonToArchive, setAddonToArchive] = useState<AddOnRecord | null>(null);
  const [isAddAddonOpen, setIsAddAddonOpen] = useState(false);
  const [newAddon, setNewAddon] = useState({ name: "", description: "", price: 1000 });

  // --- Custom package config + components ---
  const { data: customConfig, isLoading: configLoading } = useCustomPackageConfig();
  const { data: components = [], isLoading: componentsLoading } = useCustomPackageComponents();
  const updateConfig = useUpdateCustomPackageConfig();
  const createComponent = useCreateCustomComponent();
  const updateComponentMut = useUpdateCustomComponent();
  const archiveComponentMut = useArchiveCustomComponent();

  const [configDraft, setConfigDraft] = useState<{ enabled: boolean; baseFee: number }>({ enabled: false, baseFee: 0 });
  useEffect(() => {
    if (customConfig) setConfigDraft({ enabled: customConfig.enabled, baseFee: customConfig.baseFee ?? 0 });
  }, [customConfig]);

  const [pendingCustomToggle, setPendingCustomToggle] = useState<boolean | null>(null);
  // Naming + first option for a brand-new tier being created
  const [newTierDraft, setNewTierDraft] = useState<{ tierName: string; options: { label: string; price: number }[] }>({
    tierName: "",
    options: [{ label: "", price: 0 }],
  });
  // One draft per existing tier name, for adding its next option (max 4 total)
  const [newOptionDrafts, setNewOptionDrafts] = useState<Record<string, { label: string; price: number }>>({});
  const [newFlatDraft, setNewFlatDraft] = useState({ label: "", price: 0 });

  const [componentEdits, setComponentEdits] = useState<Record<string, { label: string; price: number }>>({});

  const visiblePackages = packages.filter((p) => p.status !== "archived");
  const visibleAddons = addons.filter((a) => a.status !== "archived");
  const activePackagesCount = packages.filter((p) => p.status === "published").length;

  const errToast = (err: unknown, fallback: string) =>
    toast({ title: getApiErrorMessage(err, fallback), variant: "destructive" });

  // --- Package handlers ---
  const handleAddDraftPackage = async () => {
    try {
      await createPackage.mutateAsync({
        name: "Untitled Package Draft",
        description: "Package short description...",
        included_items: [],
        price: 2500,
        duration_minutes: 60,
        buffer_minutes: 0,
      });
      toast({ title: "New draft package added. Edit details below." });
    } catch (err) {
      errToast(err, "Couldn't create the package.");
    }
  };

  const duplicatePackage = async (pkg: PackageRecord) => {
    const draft = packageDrafts[pkg.id] ?? draftFromPackage(pkg);
    try {
      await createPackage.mutateAsync({
        ...draftToInput(draft),
        name: `${draft.name} (Copy)`,
      });
      toast({ title: `Duplicated "${pkg.name}" as a new draft.` });
    } catch (err) {
      errToast(err, "Couldn't duplicate the package.");
    }
  };

  const savePackage = async (pkg: PackageRecord) => {
    const draft = packageDrafts[pkg.id];
    if (!draft) return;
    if (!draft.name.trim() || !draft.durationMinutes) {
      toast({ title: "Name and session duration are required.", variant: "destructive" });
      return;
    }
    try {
      await updatePackage.mutateAsync({ id: pkg.id, input: draftToInput(draft) });
      toast({ title: `"${draft.name}" saved.` });
    } catch (err) {
      errToast(err, "Couldn't save the package.");
    }
  };

  const handleStatusChangeClick = async (pkg: PackageRecord) => {
    try {
      if (pkg.status === "published") {
        setPackageToDraft(pkg);
      } else {
        await publishPackage.mutateAsync(pkg.id);
        toast({ title: `"${pkg.name}" is now Published & visible to clients!` });
      }
    } catch (err) {
      errToast(err, "Couldn't publish the package.");
    }
  };

  const confirmRevertToDraft = async () => {
    if (!packageToDraft) return;
    try {
      await revertPackage.mutateAsync(packageToDraft.id);
      toast({ title: `"${packageToDraft.name}" moved to Drafts and hidden from new clients.` });
    } catch (err) {
      errToast(err, "Couldn't revert the package to draft.");
    } finally {
      setPackageToDraft(null);
    }
  };

  const confirmArchivePackage = async () => {
    if (!packageToArchive) return;
    try {
      await archivePackageMut.mutateAsync(packageToArchive.id);
      toast({ title: `"${packageToArchive.name}" has been moved to Archive.` });
    } catch (err) {
      errToast(err, "Couldn't archive the package.");
    } finally {
      setPackageToArchive(null);
    }
  };

  // --- Add-on handlers ---
  const handleCreateAddon = async () => {
    if (!newAddon.name.trim()) {
      toast({ title: "Please enter an add-on name.", variant: "destructive" });
      return;
    }
    try {
      await createAddOn.mutateAsync({
        name: newAddon.name,
        description: newAddon.description || null,
        price: Number(newAddon.price),
      });
      setNewAddon({ name: "", description: "", price: 1000 });
      setIsAddAddonOpen(false);
      toast({ title: "Custom add-on created successfully!" });
    } catch (err) {
      errToast(err, "Couldn't create the add-on.");
    }
  };

  const saveAddOn = async (addon: AddOnRecord) => {
    const draft = addonDrafts[addon.id];
    if (!draft) return;
    const input: AddOnInput = { name: draft.name, description: draft.description || null, price: Number(draft.price) };
    try {
      await updateAddOn.mutateAsync({ id: addon.id, input });
      toast({ title: `Add-on "${draft.name}" saved.` });
    } catch (err) {
      errToast(err, "Couldn't save the add-on.");
    }
  };

  const confirmArchiveAddon = async () => {
    if (!addonToArchive) return;
    try {
      await archiveAddOnMut.mutateAsync(addonToArchive.id);
      toast({ title: `Add-on "${addonToArchive.name}" archived.` });
    } catch (err) {
      errToast(err, "Couldn't archive the add-on.");
    } finally {
      setAddonToArchive(null);
    }
  };

  // --- Custom package config ---
  const handleCustomToggle = (checked: boolean) => {
    setPendingCustomToggle(checked);
  };

  const confirmCustomToggle = async () => {
    if (pendingCustomToggle === null) return;
    try {
      await updateConfig.mutateAsync({
        enabled: pendingCustomToggle,
        base_fee: pendingCustomToggle ? Number(configDraft.baseFee) || 0 : null,
      });
      toast({
        title: pendingCustomToggle
          ? "Custom package calculator enabled for clients."
          : "Custom package calculator disabled. Clients can only select fixed packages.",
      });
    } catch (err) {
      errToast(err, "Couldn't update the custom package setting.");
    } finally {
      setPendingCustomToggle(null);
    }
  };

  const saveBaseFee = async () => {
    try {
      await updateConfig.mutateAsync({ enabled: configDraft.enabled, base_fee: Number(configDraft.baseFee) || 0 });
      toast({ title: "Base session fee saved." });
    } catch (err) {
      errToast(err, "Couldn't save the base fee.");
    }
  };

  // --- Custom package components ---
  const tierGroups: Record<string, CustomComponentRecord[]> = {};
  for (const c of components) {
    if (c.type === "tier_option" && c.status !== "archived" && c.tierName) {
      (tierGroups[c.tierName] ??= []).push(c);
    }
  }
  const flatOptions = components.filter((c) => c.type === "flat_option" && c.status !== "archived");

  const addOptionToTier = async (tierName: string) => {
    const draft = newOptionDrafts[tierName];
    if (!draft?.label.trim()) {
      toast({ title: "Please enter a label for this option.", variant: "destructive" });
      return;
    }
    if ((tierGroups[tierName]?.length ?? 0) >= 4) {
      toast({ title: "Each tier can have at most 4 options.", variant: "destructive" });
      return;
    }
    try {
      await createComponent.mutateAsync({ type: "tier_option", tier_name: tierName, label: draft.label.trim(), price_addition: Number(draft.price) || 0 });
      setNewOptionDrafts((prev) => ({ ...prev, [tierName]: { label: "", price: 0 } }));
      toast({ title: "Option added." });
    } catch (err) {
      errToast(err, "Couldn't add this option.");
    }
  };

  const addNewTierOptionRow = () => {
    setNewTierDraft((prev) => (prev.options.length >= 4 ? prev : { ...prev, options: [...prev.options, { label: "", price: 0 }] }));
  };

  const removeNewTierOptionRow = (index: number) => {
    setNewTierDraft((prev) => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));
  };

  const updateNewTierOption = (index: number, patch: Partial<{ label: string; price: number }>) => {
    setNewTierDraft((prev) => ({ ...prev, options: prev.options.map((o, i) => (i === index ? { ...o, ...patch } : o)) }));
  };

  const addNewTier = async () => {
    const name = newTierDraft.tierName.trim();
    if (!name) {
      toast({ title: "Please name this tier.", variant: "destructive" });
      return;
    }
    if (tierGroups[name]) {
      toast({ title: "A tier with this name already exists — add options to it below instead.", variant: "destructive" });
      return;
    }
    const filledOptions = newTierDraft.options.filter((o) => o.label.trim());
    if (filledOptions.length === 0) {
      toast({ title: "Please add at least one option.", variant: "destructive" });
      return;
    }
    try {
      for (const opt of filledOptions) {
        await createComponent.mutateAsync({ type: "tier_option", tier_name: name, label: opt.label.trim(), price_addition: Number(opt.price) || 0 });
      }
      setNewTierDraft({ tierName: "", options: [{ label: "", price: 0 }] });
      toast({ title: `Tier "${name}" created with ${filledOptions.length} option${filledOptions.length > 1 ? "s" : ""}.` });
    } catch (err) {
      errToast(err, "Couldn't create this tier — some options may have been saved before the error.");
    }
  };

  const addFlatOption = async () => {
    if (!newFlatDraft.label.trim()) {
      toast({ title: "Please enter a label for this add-on.", variant: "destructive" });
      return;
    }
    try {
      await createComponent.mutateAsync({ type: "flat_option", label: newFlatDraft.label.trim(), price_addition: Number(newFlatDraft.price) || 0 });
      setNewFlatDraft({ label: "", price: 0 });
      toast({ title: "Add-on added." });
    } catch (err) {
      errToast(err, "Couldn't add this add-on.");
    }
  };

  const startEditComponent = (c: CustomComponentRecord) => {
    setComponentEdits((prev) => ({ ...prev, [c.id]: { label: c.label, price: c.priceAddition } }));
  };

  const saveComponent = async (c: CustomComponentRecord) => {
    const edit = componentEdits[c.id];
    if (!edit) return;
    try {
      await updateComponentMut.mutateAsync({
        id: c.id,
        input: { type: c.type, tier_name: c.tierName, label: edit.label.trim(), price_addition: Number(edit.price) || 0 },
      });
      setComponentEdits((prev) => {
        const next = { ...prev };
        delete next[c.id];
        return next;
      });
      toast({ title: "Tier updated." });
    } catch (err) {
      errToast(err, "Couldn't update this tier.");
    }
  };

  const archiveComponent = async (c: CustomComponentRecord) => {
    try {
      await archiveComponentMut.mutateAsync(c.id);
      toast({ title: `"${c.label}" archived.` });
    } catch (err) {
      errToast(err, "Couldn't archive this tier.");
    }
  };

  const isLoading = packagesLoading || addonsLoading || configLoading || componentsLoading;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-up pb-12">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Services & Packages</h1>
            <p className="text-sm text-muted-foreground mt-1">Configure your service catalogs, custom calculator rates, and optional add-ons.</p>
          </div>
          <Link to="/studio/archive">
            <Button variant="outline" className="gap-2 h-9 text-xs">
              <Archive className="w-4 h-4" />
              Safe Archive
            </Button>
          </Link>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading your catalog...
          </div>
        )}

        {!isLoading && (
        <>
        {/* Bookability Status Banner Requirement */}
        {activePackagesCount < 1 && (
          <div className="p-4 rounded-xl border flex items-start gap-3 bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <strong>Bookability Requirement:</strong> To be bookable by clients online, your account must have an approved application, an active profile, at least 6–12 portfolio photos, and <strong>at least 1 Published package</strong>.
              <span className="block mt-1 font-semibold">
                Current Published Packages: {activePackagesCount} ⚠️ Needs at least 1 Published package
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
          <Switch checked={configDraft.enabled} onCheckedChange={handleCustomToggle} />
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
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={handleAddDraftPackage} disabled={createPackage.isPending}>
              <Plus className="w-3.5 h-3.5" /> Add Draft Package
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {visiblePackages.map((pk) => {
              const draft = packageDrafts[pk.id] ?? draftFromPackage(pk);
              const setDraft = (patch: Partial<PackageDraft>) =>
                setPackageDrafts((prev) => ({ ...prev, [pk.id]: { ...draft, ...patch } }));
              const saving = updatePackage.isPending;

              return (
                <div
                  key={pk.id}
                  className={`rounded-xl border p-4 relative flex flex-col justify-between space-y-4 transition-all ${
                    pk.status === "draft"
                      ? "bg-card border-dashed border-border"
                      : "bg-muted/10 border-border hover:border-primary/40"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between h-6">
                      {pk.status === "published" ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <Eye className="w-3 h-3"/> Published
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
                        value={draft.name}
                        onChange={(e) => setDraft({ name: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Price (₱)</Label>
                        <Input
                          type="number"
                          className="h-8 text-xs font-semibold"
                          value={draft.price === 0 ? "" : draft.price}
                          onChange={(e) => setDraft({ price: e.target.value === "" ? 0 : Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Duration (min)</Label>
                        <Input
                          type="number"
                          className="h-8 text-xs font-semibold"
                          value={draft.durationMinutes === 0 ? "" : draft.durationMinutes}
                          onChange={(e) => setDraft({ durationMinutes: e.target.value === "" ? 0 : Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Buffer Time After Session (min)</Label>
                      <Input
                        type="number"
                        className="h-8 text-xs"
                        value={draft.bufferMinutes === 0 ? "" : draft.bufferMinutes}
                        onChange={(e) => setDraft({ bufferMinutes: e.target.value === "" ? 0 : Number(e.target.value) })}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Short Description</Label>
                      <Input
                        className="h-8 text-xs"
                        placeholder="Short description"
                        value={draft.description}
                        onChange={(e) => setDraft({ description: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">What's Included (One item per line)</Label>
                      <Textarea
                        rows={4}
                        className="text-xs resize-none"
                        placeholder="Inclusions list..."
                        value={draft.inclusionsText}
                        onChange={(e) => setDraft({ inclusionsText: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="border-t border-border/50 pt-4 mt-2 space-y-2">
                    <Button
                      variant="outline"
                      className="w-full text-xs h-8 gap-1.5"
                      onClick={() => savePackage(pk)}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save Changes
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={pk.status === "published" ? "secondary" : "default"}
                        className="flex-1 text-xs h-8"
                        onClick={() => handleStatusChangeClick(pk)}
                      >
                        {pk.status === "published" ? "Revert to Draft" : "Publish Package"}
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
                </div>
              );
            })}
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

          <div className="grid grid-cols-1 gap-3">
            {visibleAddons.map((a) => {
              const draft = addonDrafts[a.id] ?? draftFromAddOn(a);
              const setDraft = (patch: Partial<AddOnDraft>) =>
                setAddonDrafts((prev) => ({ ...prev, [a.id]: { ...draft, ...patch } }));

              return (
                <div key={a.id} className="flex flex-wrap items-center gap-3 p-3.5 rounded-xl border border-border bg-muted/20">
                  <div className="flex-1 min-w-[160px] space-y-1">
                    <Input
                      className="h-8 text-xs font-medium"
                      value={draft.name}
                      onChange={(e) => setDraft({ name: e.target.value })}
                      placeholder="Add-on name"
                    />
                    <Input
                      className="h-7 text-[11px] text-muted-foreground"
                      value={draft.description}
                      onChange={(e) => setDraft({ description: e.target.value })}
                      placeholder="Short description"
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground">₱</span>
                    <Input
                      type="number"
                      className="w-20 h-8 text-xs"
                      value={draft.price === 0 ? "" : draft.price}
                      onChange={(e) => setDraft({ price: e.target.value === "" ? 0 : Number(e.target.value) })}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={() => saveAddOn(a)}
                    disabled={updateAddOn.isPending}
                  >
                    <Save className="w-3.5 h-3.5" /> Save
                  </Button>
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
              );
            })}
          </div>
        </section>

        {/* SECTION 3: CUSTOM CALCULATOR RATES */}
        {configDraft.enabled && (
          <section className="bg-card rounded-xl card-shadow border border-border/50 p-6 space-y-5 animate-fade-in">
            <div className="space-y-1">
              <h3 className="font-heading font-semibold flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-primary" /> Build-Your-Own Package Calculator Rates
              </h3>
              <p className="text-xs text-muted-foreground">Set up the base session fee and the tiers/add-ons used when clients customize their requests.</p>
            </div>

            <div className="flex items-end gap-2">
              <div className="space-y-1.5 flex-1 max-w-xs">
                <Label className="text-xs">Base Session Fee (₱)</Label>
                <Input
                  type="number"
                  className="h-9 text-xs"
                  value={configDraft.baseFee === 0 ? "" : configDraft.baseFee}
                  onChange={(e) => setConfigDraft((prev) => ({ ...prev, baseFee: e.target.value === "" ? 0 : Number(e.target.value) }))}
                />
              </div>
              <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5" onClick={saveBaseFee} disabled={updateConfig.isPending}>
                <Save className="w-3.5 h-3.5" /> Save
              </Button>
            </div>

            {/* Existing tier groups */}
            {Object.entries(tierGroups).map(([tierName, options]) => (
              <div key={tierName} className="pt-2 border-t border-border/50 first:border-t-0 first:pt-0">
                <Label className="text-xs font-semibold">{tierName}</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5 mb-1">Clients pick one option from this tier. {options.length}/4 options.</p>
                <div className="mt-2 space-y-2">
                  {options.map((c) => {
                    const editing = componentEdits[c.id];
                    return (
                      <div key={c.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/10 text-xs">
                        {editing ? (
                          <>
                            <Input className="flex-1 h-7 text-xs" value={editing.label}
                              onChange={(e) => setComponentEdits((prev) => ({ ...prev, [c.id]: { ...editing, label: e.target.value } }))} />
                            <span className="text-muted-foreground">+₱</span>
                            <Input type="number" className="w-24 h-7 text-xs font-semibold" value={editing.price === 0 ? "" : editing.price}
                              onChange={(e) => setComponentEdits((prev) => ({ ...prev, [c.id]: { ...editing, price: e.target.value === "" ? 0 : Number(e.target.value) } }))} />
                            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => saveComponent(c)} disabled={updateComponentMut.isPending}>Save</Button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-muted-foreground cursor-pointer" onClick={() => startEditComponent(c)}>{c.label}</span>
                            <span className="font-semibold">+₱{c.priceAddition.toLocaleString()}</span>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => archiveComponent(c)} title="Archive">
                              <Archive className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  })}

                  {options.length < 4 && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-border text-xs">
                      <Input
                        className="flex-1 h-7 text-xs"
                        placeholder="e.g. 100+ photos"
                        value={newOptionDrafts[tierName]?.label ?? ""}
                        onChange={(e) => setNewOptionDrafts((prev) => ({ ...prev, [tierName]: { label: e.target.value, price: prev[tierName]?.price ?? 0 } }))}
                      />
                      <span className="text-muted-foreground">+₱</span>
                      <Input
                        type="number"
                        className="w-24 h-7 text-xs"
                        value={newOptionDrafts[tierName]?.price ? newOptionDrafts[tierName].price : ""}
                        onChange={(e) => setNewOptionDrafts((prev) => ({ ...prev, [tierName]: { label: prev[tierName]?.label ?? "", price: e.target.value === "" ? 0 : Number(e.target.value) } }))}
                      />
                      <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => addOptionToTier(tierName)} disabled={createComponent.isPending}>
                        <Plus className="w-3 h-3" /> Add Option
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Create a new tier */}
            <div className="pt-2 border-t border-border/50">
              <Label className="text-xs font-semibold">Add a New Tier</Label>
              <p className="text-[11px] text-muted-foreground mt-0.5 mb-1">
                Name a category clients choose one option from, then add its first option. You can add up to 3 more after creating it. A few common ones to start with:
              </p>
              {SUGGESTED_TIER_NAMES.filter((name) => !tierGroups[name]).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {SUGGESTED_TIER_NAMES.filter((name) => !tierGroups[name]).map((name) => (
                    <button
                      key={name}
                      type="button"
                      className="text-[11px] px-2 py-1 rounded-full border border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground transition-colors"
                      onClick={() => setNewTierDraft((prev) => ({ ...prev, tierName: name }))}
                    >
                      + {name}
                    </button>
                  ))}
                </div>
              )}
              <div className="p-2.5 rounded-lg border border-dashed border-border space-y-2">
                <Input
                  className="h-7 text-xs max-w-xs"
                  placeholder="Tier name, e.g. Album Style"
                  value={newTierDraft.tierName}
                  onChange={(e) => setNewTierDraft((prev) => ({ ...prev, tierName: e.target.value }))}
                />
                {newTierDraft.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <Input
                      className="flex-1 h-7 text-xs"
                      placeholder={i === 0 ? "e.g. Leather Bound" : "Another option..."}
                      value={opt.label}
                      onChange={(e) => updateNewTierOption(i, { label: e.target.value })}
                    />
                    <span className="text-muted-foreground">+₱</span>
                    <Input
                      type="number"
                      className="w-24 h-7 text-xs"
                      value={opt.price === 0 ? "" : opt.price}
                      onChange={(e) => updateNewTierOption(i, { price: e.target.value === "" ? 0 : Number(e.target.value) })}
                    />
                    {newTierDraft.options.length > 1 && (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => removeNewTierOptionRow(i)} title="Remove option">
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[11px] gap-1"
                    onClick={addNewTierOptionRow}
                    disabled={newTierDraft.options.length >= 4}
                  >
                    <Plus className="w-3 h-3" /> Add Option ({newTierDraft.options.length}/4)
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={addNewTier} disabled={createComponent.isPending}>
                    <Plus className="w-3 h-3" /> Create Tier
                  </Button>
                </div>
              </div>
            </div>

            {/* Flat add-ons */}
            <div className="pt-2 border-t border-border/50">
              <Label className="text-xs font-semibold">Add-ons (RAW Files, Second Location, etc.)</Label>
              <p className="text-[11px] text-muted-foreground mt-0.5 mb-1">{FLAT_OPTION_HINT}</p>
              <div className="mt-2 space-y-2">
                {flatOptions.map((c) => {
                  const editing = componentEdits[c.id];
                  return (
                    <div key={c.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/10 text-xs">
                      {editing ? (
                        <>
                          <Input className="flex-1 h-7 text-xs" value={editing.label}
                            onChange={(e) => setComponentEdits((prev) => ({ ...prev, [c.id]: { ...editing, label: e.target.value } }))} />
                          <span className="text-muted-foreground">+₱</span>
                          <Input type="number" className="w-24 h-7 text-xs font-semibold" value={editing.price === 0 ? "" : editing.price}
                            onChange={(e) => setComponentEdits((prev) => ({ ...prev, [c.id]: { ...editing, price: e.target.value === "" ? 0 : Number(e.target.value) } }))} />
                          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => saveComponent(c)} disabled={updateComponentMut.isPending}>Save</Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-muted-foreground cursor-pointer" onClick={() => startEditComponent(c)}>{c.label}</span>
                          <span className="font-semibold">+₱{c.priceAddition.toLocaleString()}</span>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => archiveComponent(c)} title="Archive">
                            <Archive className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  );
                })}
                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-border text-xs">
                  <Input className="flex-1 h-7 text-xs" placeholder="e.g. Include RAW Files"
                    value={newFlatDraft.label} onChange={(e) => setNewFlatDraft((prev) => ({ ...prev, label: e.target.value }))} />
                  <span className="text-muted-foreground">+₱</span>
                  <Input type="number" className="w-24 h-7 text-xs" value={newFlatDraft.price === 0 ? "" : newFlatDraft.price}
                    onChange={(e) => setNewFlatDraft((prev) => ({ ...prev, price: e.target.value === "" ? 0 : Number(e.target.value) }))} />
                  <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={addFlatOption} disabled={createComponent.isPending}>
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}
        </>
        )}
      </div>

      {/* CONFIRM TOGGLE CUSTOM PACKAGE MODAL */}
      {pendingCustomToggle !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm p-6 rounded-xl shadow-2xl border border-border/50 flex flex-col space-y-4 relative">
            <Button variant="ghost" size="icon" onClick={() => setPendingCustomToggle(null)} className="absolute right-4 top-4 h-6 w-6 rounded-full">
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
              <Button variant="outline" size="sm" onClick={() => setPendingCustomToggle(null)}>Cancel</Button>
              <Button variant={pendingCustomToggle ? "default" : "destructive"} size="sm" onClick={confirmCustomToggle} disabled={updateConfig.isPending}>
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
              <Button variant="default" size="sm" onClick={confirmRevertToDraft} disabled={revertPackage.isPending}>Confirm & Hide</Button>
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
              <Button variant="destructive" size="sm" onClick={confirmArchivePackage} disabled={archivePackageMut.isPending}>Yes, Archive Package</Button>
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
              <Button variant="destructive" size="sm" onClick={confirmArchiveAddon} disabled={archiveAddOnMut.isPending}>Archive Add-on</Button>
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
                  value={newAddon.price === 0 ? "" : newAddon.price}
                  onChange={(e) => setNewAddon({ ...newAddon, price: e.target.value === "" ? 0 : Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsAddAddonOpen(false)}>Cancel</Button>
              <Button variant="default" size="sm" onClick={handleCreateAddon} disabled={createAddOn.isPending}>Create Add-on</Button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}