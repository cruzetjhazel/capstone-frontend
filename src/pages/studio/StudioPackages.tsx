import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Plus, Archive, Sparkles, Wand2, Package, Save, Copy,
  FileBox, Eye, EyeOff, AlertTriangle, X, Info, RotateCcw, Trash2, Loader2,
  Pencil, CheckCircle2, XCircle, ListChecks, PackageX,
} from "lucide-react";
import hotToast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { getApiErrorMessage } from "@/lib/api";
import {
  usePhotographerPackages, useCreatePackage, useUpdatePackage, usePublishPackage,
  useRevertPackageToDraft, useArchivePackage, useRestorePackage, useDeletePackage,
} from "@/hooks/usePhotographerPackages";
import type { PackageRecord, PackageInput } from "@/services/photographerPackageService";
import {
  usePhotographerAddOns, useCreateAddOn, useUpdateAddOn, useArchiveAddOn,
  useRestoreAddOn, useDeleteAddOn,
} from "@/hooks/usePhotographerAddOns";
import type { AddOnRecord, AddOnInput } from "@/services/photographerAddOnService";
import {
  useCustomPackageConfig, useCustomPackageComponents, useUpdateCustomPackageConfig,
  useCreateCustomComponent, useUpdateCustomComponent, useArchiveCustomComponent,
  useRestoreCustomComponent,
} from "@/hooks/usePhotographerCustomPackage";
import type { CustomComponentRecord } from "@/services/photographerCustomPackageService";

// Fixed packages no longer collect a duration in the UI. We still need to send
// something to the API for existing record shapes, so new packages get this
// default and edits simply preserve whatever duration the package already had.
const DEFAULT_DURATION_MINUTES = 60;

// ---------- toast notifications ----------
// A thin wrapper around react-hot-toast that keeps the familiar
// `toast({ title, variant })` call shape everywhere in this file, but renders
// a compact, icon-led toast with a subtle slide/fade instead of plain text.
type ToastVariant = "success" | "destructive";
function toast({ title, variant = "success" }: { title: string; variant?: ToastVariant }) {
  const isError = variant === "destructive";
  hotToast.custom(
    (t) => (
      <div
        className={`flex items-center gap-2.5 w-full max-w-sm rounded-lg border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm transition-all duration-200 ${
          t.visible ? "animate-in slide-in-from-top-2 fade-in" : "animate-out fade-out slide-out-to-right-2"
        } ${isError ? "bg-destructive text-destructive-foreground border-destructive/40" : "bg-emerald-600 text-white border-emerald-500/40"}`}
      >
        {isError ? <XCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
        <span className="flex-1 leading-snug">{title}</span>
        <button onClick={() => hotToast.dismiss(t.id)} className="shrink-0 opacity-70 hover:opacity-100 transition-opacity">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    ),
    { duration: isError ? 4500 : 3000 }
  );
}

// ---------- shared modal shell ----------
function ModalShell({
  title, icon, onClose, children, maxWidth = "max-w-md", busy = false,
}: {
  title: string;
  icon?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  busy?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`bg-card w-full ${maxWidth} p-6 rounded-xl shadow-2xl border border-border/50 flex flex-col space-y-4 relative max-h-[85vh] overflow-y-auto`}>
        {!busy && (
          <Button variant="ghost" size="icon" onClick={onClose} className="absolute right-4 top-4 h-6 w-6 rounded-full">
            <X className="w-4 h-4" />
          </Button>
        )}
        <div className="flex items-center gap-2 pr-8">
          {icon}
          <h3 className="font-bold text-lg">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------- package form (create / edit) ----------
interface PackageFormState {
  name: string;
  price: number;
  description: string;
  inclusionsText: string;
}
function emptyPackageForm(): PackageFormState {
  return { name: "", price: 2500, description: "", inclusionsText: "" };
}
function packageFormFromRecord(p: PackageRecord): PackageFormState {
  return { name: p.name, price: p.price, description: p.description, inclusionsText: p.includedItems.join("\n") };
}

function PackageFormModal({
  mode, initial, existingDurationMinutes, onClose, onSubmit, isSaving,
}: {
  mode: "create" | "edit";
  initial: PackageFormState;
  existingDurationMinutes?: number;
  onClose: () => void;
  onSubmit: (input: PackageInput) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<PackageFormState>(initial);
  const set = (patch: Partial<PackageFormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    onSubmit({
      name: form.name.trim(),
      description: form.description || null,
      included_items: form.inclusionsText.split("\n").map((s) => s.trim()).filter(Boolean),
      price: Number(form.price) || 0,
      duration_minutes: existingDurationMinutes ?? DEFAULT_DURATION_MINUTES,
      buffer_minutes: 0,
    });
  };

  return (
    <ModalShell
      title={mode === "create" ? "Add Fixed Package" : "Edit Package"}
      icon={<Package className="w-5 h-5 text-primary" />}
      onClose={onClose}
      busy={isSaving}
    >
      <div className="space-y-1">
        <Label className="text-xs">Package Name</Label>
        <Input className="h-9 text-sm font-semibold" placeholder="Package name" value={form.name} onChange={(e) => set({ name: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Price (₱)</Label>
        <Input type="number" className="h-9 text-sm font-semibold" value={form.price === 0 ? "" : form.price} onChange={(e) => set({ price: e.target.value === "" ? 0 : Number(e.target.value) })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Short Description</Label>
        <Input className="h-9 text-sm" placeholder="Short description" value={form.description} onChange={(e) => set({ description: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">What's Included (one item per line)</Label>
        <Textarea rows={5} className="text-sm resize-none" placeholder="Inclusions list..." value={form.inclusionsText} onChange={(e) => set({ inclusionsText: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>Cancel</Button>
        <Button size="sm" onClick={handleSubmit} disabled={isSaving || !form.name.trim()} className="gap-1.5">
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {mode === "create" ? "Create Package" : "Save Changes"}
        </Button>
      </div>
    </ModalShell>
  );
}

// ---------- add-on form (create / edit) ----------
interface AddOnFormState {
  name: string;
  description: string;
  price: number;
}
function emptyAddOnForm(): AddOnFormState {
  return { name: "", description: "", price: 1000 };
}
function addOnFormFromRecord(a: AddOnRecord): AddOnFormState {
  return { name: a.name, description: a.description, price: a.price };
}

function AddOnFormModal({
  mode, initial, onClose, onSubmit, isSaving,
}: {
  mode: "create" | "edit";
  initial: AddOnFormState;
  onClose: () => void;
  onSubmit: (input: AddOnInput) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<AddOnFormState>(initial);
  const set = (patch: Partial<AddOnFormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    onSubmit({ name: form.name.trim(), description: form.description || null, price: Number(form.price) || 0 });
  };

  return (
    <ModalShell
      title={mode === "create" ? "Add Add-on" : "Edit Add-on"}
      icon={<Sparkles className="w-5 h-5 text-primary" />}
      onClose={onClose}
      busy={isSaving}
    >
      <div className="space-y-1">
        <Label className="text-xs">Add-on Name</Label>
        <Input className="h-9 text-sm font-medium" placeholder="Add-on name" value={form.name} onChange={(e) => set({ name: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Short Description</Label>
        <Input className="h-9 text-sm" placeholder="Short description" value={form.description} onChange={(e) => set({ description: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Price (₱)</Label>
        <Input type="number" className="h-9 text-sm font-semibold" value={form.price === 0 ? "" : form.price} onChange={(e) => set({ price: e.target.value === "" ? 0 : Number(e.target.value) })} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>Cancel</Button>
        <Button size="sm" onClick={handleSubmit} disabled={isSaving || !form.name.trim()} className="gap-1.5">
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {mode === "create" ? "Create Add-on" : "Save Changes"}
        </Button>
      </div>
    </ModalShell>
  );
}

export default function StudioPackages() {
  // --- Packages ---
  const { data: packages = [], isLoading: packagesLoading } = usePhotographerPackages();
  const createPackage = useCreatePackage();
  const updatePackage = useUpdatePackage();
  const publishPackage = usePublishPackage();
  const revertPackage = useRevertPackageToDraft();
  const archivePackageMut = useArchivePackage();
  const restorePackageMut = useRestorePackage();
  const deletePackageMut = useDeletePackage();

  // --- Add-ons ---
  const { data: addons = [], isLoading: addonsLoading } = usePhotographerAddOns();
  const createAddOn = useCreateAddOn();
  const updateAddOn = useUpdateAddOn();
  const archiveAddOnMut = useArchiveAddOn();
  const restoreAddOnMut = useRestoreAddOn();
  const deleteAddOnMut = useDeleteAddOn();

  // --- Custom package config + components ---
  const { data: customConfig, isLoading: configLoading } = useCustomPackageConfig();
  const { data: components = [], isLoading: componentsLoading } = useCustomPackageComponents();
  const updateConfig = useUpdateCustomPackageConfig();
  const createComponent = useCreateCustomComponent();
  const updateComponentMut = useUpdateCustomComponent();
  const archiveComponentMut = useArchiveCustomComponent();
  const restoreComponentMut = useRestoreCustomComponent();

  // --- modal state ---
  const [packageModal, setPackageModal] = useState<{ mode: "create" | "edit"; source?: PackageRecord; initial: PackageFormState } | null>(null);
  const [addOnModal, setAddOnModal] = useState<{ mode: "create" | "edit"; source?: AddOnRecord; initial: AddOnFormState } | null>(null);
  const [customDrawerOpen, setCustomDrawerOpen] = useState(false);

  const [packageToDraft, setPackageToDraft] = useState<PackageRecord | null>(null);
  const [pendingCustomToggle, setPendingCustomToggle] = useState<boolean | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [itemToDeletePermanently, setItemToDeletePermanently] = useState<{ id: string; type: "package" | "addon"; name: string } | null>(null);

  const visiblePackages = packages.filter((p) => p.status !== "archived");
  const archivedPackages = packages.filter((p) => p.status === "archived");
  const visibleAddons = addons.filter((a) => a.status !== "archived");
  const archivedAddons = addons.filter((a) => a.status === "archived");
  const archivedComponents = components.filter((c) => c.status === "archived");
  const activePackagesCount = packages.filter((p) => p.status === "published").length;

  const errToast = (err: unknown, fallback: string) =>
    toast({ title: getApiErrorMessage(err, fallback), variant: "destructive" });

  // --- package actions ---
  const submitPackageForm = async (input: PackageInput) => {
    if (!packageModal) return;
    try {
      if (packageModal.mode === "create") {
        await createPackage.mutateAsync(input);
        toast({ title: `"${input.name}" created as a Draft.` });
      } else if (packageModal.source) {
        await updatePackage.mutateAsync({ id: packageModal.source.id, input });
        toast({ title: `"${input.name}" updated.` });
      }
      setPackageModal(null);
    } catch (err) {
      errToast(err, "Couldn't save this package.");
    }
  };

  const openDuplicatePackage = (pkg: PackageRecord) => {
    const base = packageFormFromRecord(pkg);
    setPackageModal({ mode: "create", initial: { ...base, name: `${base.name} (Copy)` } });
  };

  const handleStatusChangeClick = async (pkg: PackageRecord) => {
    if (publishPackage.isPending || revertPackage.isPending) return;
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

  const handleArchivePackage = async (pkg: PackageRecord) => {
    try {
      await archivePackageMut.mutateAsync(pkg.id);
      toast({ title: `"${pkg.name}" archived.` });
    } catch (err) {
      errToast(err, "Couldn't archive this package.");
    }
  };

  // --- add-on actions ---
  const submitAddOnForm = async (input: AddOnInput) => {
    if (!addOnModal) return;
    try {
      if (addOnModal.mode === "create") {
        await createAddOn.mutateAsync(input);
        toast({ title: `"${input.name}" created.` });
      } else if (addOnModal.source) {
        await updateAddOn.mutateAsync({ id: addOnModal.source.id, input });
        toast({ title: `"${input.name}" updated.` });
      }
      setAddOnModal(null);
    } catch (err) {
      errToast(err, "Couldn't save this add-on.");
    }
  };

  const handleArchiveAddOn = async (addon: AddOnRecord) => {
    try {
      await archiveAddOnMut.mutateAsync(addon.id);
      toast({ title: `"${addon.name}" archived.` });
    } catch (err) {
      errToast(err, "Couldn't archive this add-on.");
    }
  };

  // --- restore / permanent delete (packages & add-ons) ---
  const restoreItem = async (id: string, type: "package" | "addon") => {
    try {
      if (type === "package") {
        await restorePackageMut.mutateAsync(id);
        toast({ title: "Package restored as a Draft." });
      } else {
        await restoreAddOnMut.mutateAsync(id);
        toast({ title: "Add-on restored to active list." });
      }
    } catch (err) {
      errToast(err, "Couldn't restore the item.");
    }
  };

  const confirmPermanentDelete = async () => {
    if (!itemToDeletePermanently) return;
    try {
      if (itemToDeletePermanently.type === "package") {
        await deletePackageMut.mutateAsync(itemToDeletePermanently.id);
      } else {
        await deleteAddOnMut.mutateAsync(itemToDeletePermanently.id);
      }
      toast({ title: `Permanently deleted ${itemToDeletePermanently.name}.` });
    } catch (err) {
      errToast(err, "Couldn't permanently delete this item. It may have historical bookings attached.");
    } finally {
      setItemToDeletePermanently(null);
    }
  };

  // --- custom package config toggle ---
  const confirmCustomToggle = async () => {
    if (pendingCustomToggle === null) return;
    try {
      await updateConfig.mutateAsync({
        enabled: pendingCustomToggle,
        base_fee: pendingCustomToggle ? Number(customConfig?.baseFee ?? 0) : null,
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
          <Button variant="outline" className="gap-2 h-9 text-xs" onClick={() => setIsArchiveModalOpen(true)}>
            <FileBox className="w-4 h-4" />
            View Archive ({archivedPackages.length + archivedAddons.length + archivedComponents.length})
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading your catalog...
          </div>
        )}

        {!isLoading && (
        <>
        {/* Bookability Status Banner */}
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

        {/* CUSTOM PACKAGE SUMMARY */}
        <section className="bg-card rounded-xl border border-border/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-shadow transition-shadow hover:shadow-md">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Wand2 className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-semibold text-base">Custom Package Calculator</h3>
                {customConfig?.enabled ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Enabled
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Disabled
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground max-w-2xl">
                {customConfig?.enabled
                  ? `Base fee ₱${Number(customConfig.baseFee ?? 0).toLocaleString()} · ${components.filter((c) => c.status !== "archived").length} rate component${components.filter((c) => c.status !== "archived").length === 1 ? "" : "s"}.`
                  : "Clients can only select fixed packages."}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 shrink-0 transition-transform active:scale-95" onClick={() => setCustomDrawerOpen(true)}>
            <Wand2 className="w-3.5 h-3.5" /> Configure Custom Package
          </Button>
        </section>

        {/* SECTION 1: FIXED PACKAGES */}
        <section className="bg-card rounded-xl card-shadow border border-border/50 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-heading font-semibold flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" /> Fixed Studio Packages
              </h3>
              <p className="text-xs text-muted-foreground">Predefined photography packages that clients can select directly.</p>
            </div>
            <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => setPackageModal({ mode: "create", initial: emptyPackageForm() })}>
              <Plus className="w-3.5 h-3.5" /> Add Fixed Package
            </Button>
          </div>

          {visiblePackages.length === 0 ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground bg-muted/10 p-6 rounded-lg text-center">
              <PackageX className="w-6 h-6 opacity-60" />
              <p className="text-xs italic">No fixed packages yet. Click "Add Fixed Package" to create one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {visiblePackages.map((pk) => (
                <div key={pk.id} className={`rounded-xl border p-4 flex flex-col justify-between gap-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${pk.status === "draft" ? "bg-card border-dashed border-border" : "bg-muted/10 border-border hover:border-primary/40"}`}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      {pk.status === "published" ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Published
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <EyeOff className="w-3 h-3" /> Draft
                        </span>
                      )}
                      <span className="text-sm font-bold text-foreground">₱{pk.price.toLocaleString()}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{pk.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{pk.description}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <ListChecks className="w-3 h-3" /> {pk.includedItems.length} inclusion{pk.includedItems.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="border-t border-border/50 pt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="flex-1 text-xs h-8 gap-1.5" onClick={() => setPackageModal({ mode: "edit", source: pk, initial: packageFormFromRecord(pk) })}>
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </Button>
                      <Button
                        variant={pk.status === "published" ? "secondary" : "default"}
                        className="flex-1 text-xs h-8 gap-1.5"
                        disabled={publishPackage.isPending || revertPackage.isPending}
                        onClick={() => handleStatusChangeClick(pk)}
                      >
                        {(publishPackage.isPending || revertPackage.isPending) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {pk.status === "published" ? "Revert to Draft" : "Publish"}
                      </Button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openDuplicatePackage(pk)} title="Duplicate">
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleArchivePackage(pk)} title="Archive">
                        <Archive className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 2: ADD-ONS */}
        <section className="bg-card rounded-xl card-shadow border border-border/50 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-heading font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Optional Add-ons
              </h3>
              <p className="text-xs text-muted-foreground">Optional extras clients can append to fixed or custom package requests.</p>
            </div>
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setAddOnModal({ mode: "create", initial: emptyAddOnForm() })}>
              <Plus className="w-3.5 h-3.5" /> Add Add-on
            </Button>
          </div>

          {visibleAddons.length === 0 ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground bg-muted/10 p-6 rounded-lg text-center">
              <Sparkles className="w-6 h-6 opacity-60" />
              <p className="text-xs italic">No add-ons yet. Click "Add Add-on" to create one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visibleAddons.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-muted/20 transition-all duration-200 hover:shadow-md hover:border-primary/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{a.description}</p>
                  </div>
                  <span className="text-xs font-semibold shrink-0">₱{a.price.toLocaleString()}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setAddOnModal({ mode: "edit", source: a, initial: addOnFormFromRecord(a) })} title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleArchiveAddOn(a)} title="Archive">
                      <Archive className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        </>
        )}
      </div>

      {/* ADD / EDIT FIXED PACKAGE MODAL */}
      {packageModal && (
        <PackageFormModal
          mode={packageModal.mode}
          initial={packageModal.initial}
          existingDurationMinutes={packageModal.source?.durationMinutes}
          onClose={() => setPackageModal(null)}
          onSubmit={submitPackageForm}
          isSaving={createPackage.isPending || updatePackage.isPending}
        />
      )}

      {/* ADD / EDIT ADD-ON MODAL */}
      {addOnModal && (
        <AddOnFormModal
          mode={addOnModal.mode}
          initial={addOnModal.initial}
          onClose={() => setAddOnModal(null)}
          onSubmit={submitAddOnForm}
          isSaving={createAddOn.isPending || updateAddOn.isPending}
        />
      )}

      {/* CONFIGURE CUSTOM PACKAGE DRAWER */}
      {customDrawerOpen && (
        <CustomPackageDrawer
          customConfig={customConfig}
          components={components}
          onClose={() => setCustomDrawerOpen(false)}
          onToggleEnabled={(checked) => setPendingCustomToggle(checked)}
          updateConfig={updateConfig}
          createComponent={createComponent}
          updateComponentMut={updateComponentMut}
          archiveComponentMut={archiveComponentMut}
          errToast={errToast}
        />
      )}

      {/* CONFIRM TOGGLE CUSTOM PACKAGE MODAL */}
      {pendingCustomToggle !== null && (
        <ModalShell title={pendingCustomToggle ? "Enable Calculator?" : "Disable Calculator?"}
          icon={pendingCustomToggle ? <Wand2 className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-amber-500" />}
          onClose={() => setPendingCustomToggle(null)}
          busy={updateConfig.isPending}
        >
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
        </ModalShell>
      )}

      {/* REVERT TO DRAFT MODAL */}
      {packageToDraft && (
        <ModalShell title="Revert to Draft?" icon={<Info className="w-5 h-5 text-amber-500" />} onClose={() => setPackageToDraft(null)}>
          <p className="text-xs text-muted-foreground">Hide "{packageToDraft.name}" from new client catalog.</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This package will no longer be visible for new client bookings. Existing bookings or submitted requests for this package will remain unaffected.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setPackageToDraft(null)}>Cancel</Button>
            <Button variant="default" size="sm" onClick={confirmRevertToDraft} disabled={revertPackage.isPending}>Confirm & Hide</Button>
          </div>
        </ModalShell>
      )}

      {/* ARCHIVE MANAGEMENT MODAL */}
      {isArchiveModalOpen && (
        <ModalShell title="Archived Items" icon={<FileBox className="w-5 h-5 text-primary" />} onClose={() => setIsArchiveModalOpen(false)} maxWidth="max-w-2xl">
          <p className="text-xs text-muted-foreground">
            Restore archived items back to active status, or permanently delete packages/add-ons that have no conflicting historical bookings. Archived calculator tiers can only be restored, not permanently deleted.
          </p>

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

          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Archived Calculator Tiers</h4>
            {archivedComponents.length > 0 ? (
              archivedComponents.map((c) => (
                <div key={c.id} className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-xs text-foreground">{c.label}</p>
                    <p className="text-[11px] text-muted-foreground">+₱{c.priceAddition.toLocaleString()} • {c.tierName ?? "Add-on"}</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={async () => {
                    try {
                      await restoreComponentMut.mutateAsync(c.id);
                      toast({ title: `"${c.label}" restored.` });
                    } catch (err) {
                      errToast(err, "Couldn't restore this tier.");
                    }
                  }}>
                    <RotateCcw className="w-3 h-3" /> Restore
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic bg-muted/10 p-3 rounded-lg text-center">No archived tiers.</p>
            )}
          </div>
        </ModalShell>
      )}

      {/* PERMANENT DELETE CONFIRMATION MODAL */}
      {itemToDeletePermanently && (
        <ModalShell title="Permanently Delete Item?" icon={<AlertTriangle className="w-5 h-5 text-destructive" />} onClose={() => setItemToDeletePermanently(null)} maxWidth="max-w-sm">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to permanently delete <strong className="text-foreground">"{itemToDeletePermanently.name}"</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setItemToDeletePermanently(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={confirmPermanentDelete}>Permanently Delete</Button>
          </div>
        </ModalShell>
      )}
    </DashboardLayout>
  );
}

// ---------- Configure Custom Package drawer ----------
function CustomPackageDrawer({
  customConfig, components, onClose, onToggleEnabled,
  updateConfig, createComponent, updateComponentMut, archiveComponentMut,
  errToast,
}: {
  customConfig: { enabled: boolean; baseFee: number | null } | undefined;
  components: CustomComponentRecord[];
  onClose: () => void;
  onToggleEnabled: (checked: boolean) => void;
  updateConfig: ReturnType<typeof useUpdateCustomPackageConfig>;
  createComponent: ReturnType<typeof useCreateCustomComponent>;
  updateComponentMut: ReturnType<typeof useUpdateCustomComponent>;
  archiveComponentMut: ReturnType<typeof useArchiveCustomComponent>;
  errToast: (err: unknown, fallback: string) => void;
}) {
  const [baseFee, setBaseFee] = useState<number>(customConfig?.baseFee ?? 0);
  useEffect(() => setBaseFee(customConfig?.baseFee ?? 0), [customConfig?.baseFee]);
  const baseFeeDirty = Number(baseFee) !== Number(customConfig?.baseFee ?? 0);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingFields, setEditingFields] = useState<{ label: string; price: number }>({ label: "", price: 0 });

  const [addOptionTier, setAddOptionTier] = useState<string | null>(null);
  const [newOption, setNewOption] = useState({ label: "", price: 0 });

  const [showNewTierForm, setShowNewTierForm] = useState(false);
  const [newTier, setNewTier] = useState<{ tierName: string; options: { label: string; price: number }[] }>({
    tierName: "", options: [{ label: "", price: 0 }],
  });
  const [isCreatingTier, setIsCreatingTier] = useState(false);

  const [showFlatForm, setShowFlatForm] = useState(false);
  const [newFlat, setNewFlat] = useState({ label: "", price: 0 });

  const tierGroups: Record<string, CustomComponentRecord[]> = {};
  for (const c of components) {
    if (c.type === "tier_option" && c.status !== "archived" && c.tierName) (tierGroups[c.tierName] ??= []).push(c);
  }
  const flatOptions = components.filter((c) => c.type === "flat_option" && c.status !== "archived");

  const saveBaseFee = async () => {
    try {
      await updateConfig.mutateAsync({ enabled: customConfig?.enabled ?? false, base_fee: Number(baseFee) || 0 });
      toast({ title: "Base session fee updated." });
    } catch (err) {
      errToast(err, "Couldn't update the base fee.");
    }
  };

  const startEdit = (c: CustomComponentRecord) => {
    setEditingId(c.id);
    setEditingFields({ label: c.label, price: c.priceAddition });
  };
  const saveEdit = async (c: CustomComponentRecord) => {
    if (!editingFields.label.trim()) {
      toast({ title: "Label is required.", variant: "destructive" });
      return;
    }
    try {
      await updateComponentMut.mutateAsync({
        id: c.id,
        input: { type: c.type, tier_name: c.tierName, label: editingFields.label.trim(), price_addition: Number(editingFields.price) || 0 },
      });
      toast({ title: `"${editingFields.label.trim()}" updated.` });
      setEditingId(null);
    } catch (err) {
      errToast(err, "Couldn't update this item.");
    }
  };
  const archiveItem = async (c: CustomComponentRecord) => {
    try {
      await archiveComponentMut.mutateAsync(c.id);
      toast({ title: `"${c.label}" archived.` });
    } catch (err) {
      errToast(err, "Couldn't archive this item.");
    }
  };

  const submitAddOption = async (tierName: string) => {
    if (!newOption.label.trim()) {
      toast({ title: "Please enter a label for this option.", variant: "destructive" });
      return;
    }
    if ((tierGroups[tierName]?.length ?? 0) >= 4) {
      toast({ title: "Each tier can have at most 4 options.", variant: "destructive" });
      return;
    }
    try {
      await createComponent.mutateAsync({ type: "tier_option", tier_name: tierName, label: newOption.label.trim(), price_addition: Number(newOption.price) || 0 });
      toast({ title: `Option added to "${tierName}".` });
      setNewOption({ label: "", price: 0 });
      setAddOptionTier(null);
    } catch (err) {
      errToast(err, "Couldn't add this option.");
    }
  };

  const updateNewTierOption = (index: number, patch: Partial<{ label: string; price: number }>) => {
    setNewTier((prev) => ({ ...prev, options: prev.options.map((o, i) => (i === index ? { ...o, ...patch } : o)) }));
  };
  const addNewTierOptionRow = () => setNewTier((prev) => (prev.options.length >= 4 ? prev : { ...prev, options: [...prev.options, { label: "", price: 0 }] }));
  const removeNewTierOptionRow = (index: number) => setNewTier((prev) => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));

  const submitNewTier = async () => {
    const name = newTier.tierName.trim();
    if (!name) {
      toast({ title: "Please name this tier.", variant: "destructive" });
      return;
    }
    if (tierGroups[name]) {
      toast({ title: "A tier with this name already exists — add options to it instead.", variant: "destructive" });
      return;
    }
    const filled = newTier.options.filter((o) => o.label.trim());
    if (filled.length === 0) {
      toast({ title: "Please add at least one option.", variant: "destructive" });
      return;
    }
    setIsCreatingTier(true);
    try {
      for (const opt of filled) {
        await createComponent.mutateAsync({ type: "tier_option", tier_name: name, label: opt.label.trim(), price_addition: Number(opt.price) || 0 });
      }
      toast({ title: `Tier "${name}" created.` });
      setNewTier({ tierName: "", options: [{ label: "", price: 0 }] });
      setShowNewTierForm(false);
    } catch (err) {
      errToast(err, "Couldn't create this tier.");
    } finally {
      setIsCreatingTier(false);
    }
  };

  const submitFlatOption = async () => {
    if (!newFlat.label.trim()) {
      toast({ title: "Please enter a label for this extra.", variant: "destructive" });
      return;
    }
    try {
      await createComponent.mutateAsync({ type: "flat_option", label: newFlat.label.trim(), price_addition: Number(newFlat.price) || 0 });
      toast({ title: `"${newFlat.label.trim()}" added.` });
      setNewFlat({ label: "", price: 0 });
      setShowFlatForm(false);
    } catch (err) {
      errToast(err, "Couldn't add this extra.");
    }
  };

  return (
    <ModalShell title="Configure Custom Package" icon={<Wand2 className="w-5 h-5 text-primary" />} onClose={onClose} maxWidth="max-w-2xl">
      {/* Enable toggle */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border/50 bg-muted/10">
        <div>
          <p className="text-sm font-semibold">Allow Custom Package Requests</p>
          <p className="text-xs text-muted-foreground mt-0.5">Clients can build a tailored session using the calculator below.</p>
        </div>
        <Switch checked={customConfig?.enabled ?? false} onCheckedChange={onToggleEnabled} />
      </div>

      {/* Base fee */}
      <div className="space-y-1.5">
        <Label className="text-xs">Base Session Fee (₱)</Label>
        <div className="flex items-center gap-2">
          <Input type="number" className="h-9 text-sm flex-1" value={baseFee === 0 ? "" : baseFee} onChange={(e) => setBaseFee(e.target.value === "" ? 0 : Number(e.target.value))} />
          <Button size="sm" variant={baseFeeDirty ? "default" : "outline"} className="h-9 text-xs gap-1" disabled={!baseFeeDirty || updateConfig.isPending} onClick={saveBaseFee}>
            {updateConfig.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
          </Button>
        </div>
      </div>

      {/* Tier groups */}
      <div className="space-y-4 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between pt-2">
          <Label className="text-xs font-semibold">Rate Tiers</Label>
          <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => setShowNewTierForm((v) => !v)}>
            <Plus className="w-3 h-3" /> Add Tier
          </Button>
        </div>

        {Object.entries(tierGroups).map(([tierName, options]) => (
          <div key={tierName} className="pt-2">
            <Label className="text-xs font-semibold">{tierName}</Label>
            <p className="text-[11px] text-muted-foreground mt-0.5 mb-1">Clients pick one option from this tier. {options.length}/4 options.</p>
            <div className="space-y-2">
              {options.map((c) => (
                <div key={c.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/10 text-xs">
                  {editingId === c.id ? (
                    <>
                      <Input className="flex-1 h-7 text-xs" value={editingFields.label} onChange={(e) => setEditingFields((prev) => ({ ...prev, label: e.target.value }))} />
                      <span className="text-muted-foreground">+₱</span>
                      <Input type="number" className="w-24 h-7 text-xs font-semibold" value={editingFields.price === 0 ? "" : editingFields.price} onChange={(e) => setEditingFields((prev) => ({ ...prev, price: e.target.value === "" ? 0 : Number(e.target.value) }))} />
                      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setEditingId(null)}>Cancel</Button>
                      <Button size="sm" className="h-7 text-[11px] gap-1" onClick={() => saveEdit(c)} disabled={updateComponentMut.isPending}>
                        <Save className="w-3 h-3" /> Save
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-muted-foreground cursor-pointer" onClick={() => startEdit(c)}>{c.label}</span>
                      <span className="font-semibold">+₱{c.priceAddition.toLocaleString()}</span>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => startEdit(c)} title="Edit"><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => archiveItem(c)} title="Archive"><Archive className="w-3.5 h-3.5" /></Button>
                    </>
                  )}
                </div>
              ))}

              {addOptionTier === tierName ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-primary/40 text-xs">
                  <Input className="flex-1 h-7 text-xs" placeholder="e.g. 100+ photos" value={newOption.label} onChange={(e) => setNewOption((prev) => ({ ...prev, label: e.target.value }))} />
                  <span className="text-muted-foreground">+₱</span>
                  <Input type="number" className="w-24 h-7 text-xs" value={newOption.price === 0 ? "" : newOption.price} onChange={(e) => setNewOption((prev) => ({ ...prev, price: e.target.value === "" ? 0 : Number(e.target.value) }))} />
                  <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setAddOptionTier(null)}>Cancel</Button>
                  <Button size="sm" className="h-7 text-[11px] gap-1" onClick={() => submitAddOption(tierName)} disabled={createComponent.isPending}>
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </div>
              ) : options.length < 4 && (
                <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => { setAddOptionTier(tierName); setNewOption({ label: "", price: 0 }); }}>
                  <Plus className="w-3 h-3" /> Add Option
                </Button>
              )}
            </div>
          </div>
        ))}

        {showNewTierForm && (
          <div className="pt-2 border-t border-border/50 space-y-2">
            <Input className="h-8 text-xs font-semibold" placeholder="Tier name (e.g. Edited Photos)" value={newTier.tierName} onChange={(e) => setNewTier((prev) => ({ ...prev, tierName: e.target.value }))} />
            {newTier.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <Input className="flex-1 h-7 text-xs" placeholder="Option label" value={opt.label} onChange={(e) => updateNewTierOption(i, { label: e.target.value })} />
                <span className="text-muted-foreground">+₱</span>
                <Input type="number" className="w-24 h-7 text-xs" value={opt.price === 0 ? "" : opt.price} onChange={(e) => updateNewTierOption(i, { price: e.target.value === "" ? 0 : Number(e.target.value) })} />
                {newTier.options.length > 1 && (
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => removeNewTierOptionRow(i)}><X className="w-3.5 h-3.5" /></Button>
                )}
              </div>
            ))}
            {newTier.options.length < 4 && (
              <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1" onClick={addNewTierOptionRow}>
                <Plus className="w-3 h-3" /> Add Option ({newTier.options.length}/4)
              </Button>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowNewTierForm(false)} disabled={isCreatingTier}>Cancel</Button>
              <Button size="sm" className="h-8 text-xs gap-1" onClick={submitNewTier} disabled={isCreatingTier}>
                {isCreatingTier ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Create Tier
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Flat options */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between pt-2">
          <div>
            <Label className="text-xs font-semibold">Custom Calculator Extras</Label>
            <p className="text-[11px] text-muted-foreground mt-0.5">Optional one-off extras clients can toggle on for their custom session.</p>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => setShowFlatForm((v) => !v)}>
            <Plus className="w-3 h-3" /> Add Extra
          </Button>
        </div>
        <div className="space-y-2">
          {flatOptions.map((c) => (
            <div key={c.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/10 text-xs">
              {editingId === c.id ? (
                <>
                  <Input className="flex-1 h-7 text-xs" value={editingFields.label} onChange={(e) => setEditingFields((prev) => ({ ...prev, label: e.target.value }))} />
                  <span className="text-muted-foreground">+₱</span>
                  <Input type="number" className="w-24 h-7 text-xs font-semibold" value={editingFields.price === 0 ? "" : editingFields.price} onChange={(e) => setEditingFields((prev) => ({ ...prev, price: e.target.value === "" ? 0 : Number(e.target.value) }))} />
                  <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setEditingId(null)}>Cancel</Button>
                  <Button size="sm" className="h-7 text-[11px] gap-1" onClick={() => saveEdit(c)} disabled={updateComponentMut.isPending}>
                    <Save className="w-3 h-3" /> Save
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-muted-foreground cursor-pointer" onClick={() => startEdit(c)}>{c.label}</span>
                  <span className="font-semibold">+₱{c.priceAddition.toLocaleString()}</span>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => startEdit(c)} title="Edit"><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => archiveItem(c)} title="Archive"><Archive className="w-3.5 h-3.5" /></Button>
                </>
              )}
            </div>
          ))}
          {flatOptions.length === 0 && !showFlatForm && (
            <p className="text-[11px] text-muted-foreground italic">No custom extras yet.</p>
          )}
          {showFlatForm && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-primary/40 text-xs">
              <Input className="flex-1 h-7 text-xs" placeholder="e.g. Include RAW Files" value={newFlat.label} onChange={(e) => setNewFlat((prev) => ({ ...prev, label: e.target.value }))} />
              <span className="text-muted-foreground">+₱</span>
              <Input type="number" className="w-24 h-7 text-xs" value={newFlat.price === 0 ? "" : newFlat.price} onChange={(e) => setNewFlat((prev) => ({ ...prev, price: e.target.value === "" ? 0 : Number(e.target.value) }))} />
              <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setShowFlatForm(false)}>Cancel</Button>
              <Button size="sm" className="h-7 text-[11px] gap-1" onClick={submitFlatOption} disabled={createComponent.isPending}>
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
      </div>
    </ModalShell>
  );
}
