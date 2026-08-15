import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Trash2, RotateCcw, ShieldAlert, Archive, AlertTriangle, X, Info, Search, Filter, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api";

import { usePhotographerPackages, useRestorePackage, useDeletePackage } from "@/hooks/usePhotographerPackages";
import { usePhotographerAddOns, useRestoreAddOn, useDeleteAddOn } from "@/hooks/usePhotographerAddOns";
import { useCustomPackageComponents, useRestoreCustomComponent } from "@/hooks/usePhotographerCustomPackage";
import { usePhotographerClients, useRestoreWalkInClient, useDeleteWalkInClient } from "@/hooks/usePhotographerClients";
import { studioPortfolioService, type PortfolioImage } from "@/services/studioPortfolioService";

type ItemType = "Package" | "Add-on" | "Calculator Tier" | "Portfolio Image" | "Client";

// Matches the `--days` value the `archive:purge` scheduled command runs with.
// Keep these in sync if you change the retention window server-side.
const RETENTION_DAYS = 90;

// Normalized shape every archived record (regardless of source) gets mapped into for display.
interface ArchivedItem {
  key: string;
  name: string;
  subtitle?: string;
  type: ItemType;
  archivedAt: string | null;
  canDelete: boolean;
  onRestore: () => Promise<void>;
  onDelete?: () => Promise<void>;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "Unknown archive date";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function daysUntilPurge(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const purgeDate = new Date(iso);
  purgeDate.setDate(purgeDate.getDate() + RETENTION_DAYS);
  return Math.ceil((purgeDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function StudioArchive() {
  // --- Packages ---
  const { data: packages = [], isLoading: packagesLoading } = usePhotographerPackages();
  const restorePackage = useRestorePackage();
  const deletePackage = useDeletePackage();

  // --- Add-ons ---
  const { data: addons = [], isLoading: addonsLoading } = usePhotographerAddOns();
  const restoreAddOn = useRestoreAddOn();
  const deleteAddOn = useDeleteAddOn();

  // --- Custom package calculator tiers (restore-only — no permanent delete exists for these) ---
  const { data: components = [], isLoading: componentsLoading } = useCustomPackageComponents();
  const restoreComponent = useRestoreCustomComponent();

  // --- Clients (only walk-ins are archivable; registered clients are derived from bookings) ---
  const { data: clients = [], isLoading: clientsLoading } = usePhotographerClients();
  const restoreWalkIn = useRestoreWalkInClient();
  const deleteWalkIn = useDeleteWalkInClient();

  // --- Portfolio images (plain service, not a react-query hook — matches StudioPortfolio.tsx) ---
  const [portfolioImages, setPortfolioImages] = useState<PortfolioImage[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(true);

  const loadPortfolio = async () => {
    setPortfolioLoading(true);
    try {
      setPortfolioImages(await studioPortfolioService.list());
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't load archived portfolio images."));
    } finally {
      setPortfolioLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, []);

  const isLoading = packagesLoading || addonsLoading || componentsLoading || clientsLoading || portfolioLoading;

  // --- Build the unified archived list ---
  const archived: ArchivedItem[] = useMemo(() => {
    const items: ArchivedItem[] = [];

    packages
      .filter((p) => p.status === "archived")
      .forEach((p) => {
        items.push({
          key: `package-${p.id}`,
          name: p.name,
          subtitle: `₱${p.price.toLocaleString()}`,
          type: "Package",
          // `archivedAt` isn't confirmed on PackageRecord yet — falls back to
          // null (shown as "Unknown archive date") until the backend/service
          // patch lands. See chat notes.
          archivedAt: (p as { archivedAt?: string | null }).archivedAt ?? null,
          canDelete: true,
          onRestore: async () => {
            await restorePackage.mutateAsync(p.id);
            toast.success(`"${p.name}" restored as a Draft.`);
          },
          onDelete: async () => {
            await deletePackage.mutateAsync(p.id);
            toast.success(`"${p.name}" was permanently deleted.`);
          },
        });
      });

    addons
      .filter((a) => a.status === "archived")
      .forEach((a) => {
        items.push({
          key: `addon-${a.id}`,
          name: a.name,
          subtitle: `₱${a.price.toLocaleString()}`,
          type: "Add-on",
          archivedAt: (a as { archivedAt?: string | null }).archivedAt ?? null,
          canDelete: true,
          onRestore: async () => {
            await restoreAddOn.mutateAsync(a.id);
            toast.success(`"${a.name}" restored to your active add-ons.`);
          },
          onDelete: async () => {
            await deleteAddOn.mutateAsync(a.id);
            toast.success(`"${a.name}" was permanently deleted.`);
          },
        });
      });

    components
      .filter((c) => c.status === "archived")
      .forEach((c) => {
        items.push({
          key: `component-${c.id}`,
          name: c.label,
          subtitle: c.tierName ?? "Add-on option",
          type: "Calculator Tier",
          archivedAt: null, // exempt from the retention purge — restore-only, no destroy endpoint
          canDelete: false,
          onRestore: async () => {
            await restoreComponent.mutateAsync(c.id);
            toast.success(`"${c.label}" restored.`);
          },
        });
      });

    clients
      .filter((c) => c.type === "walk-in" && c.status === "archived")
      .forEach((c) => {
        items.push({
          key: `client-${c.id}`,
          name: c.name,
          subtitle: c.phone ?? c.email ?? undefined,
          type: "Client",
          archivedAt: c.archivedAt,
          canDelete: true,
          onRestore: async () => {
            await restoreWalkIn.mutateAsync(c.id);
            toast.success(`"${c.name}" restored to your active client list.`);
          },
          onDelete: async () => {
            await deleteWalkIn.mutateAsync(c.id);
            toast.success(`"${c.name}" was permanently deleted.`);
          },
        });
      });

    portfolioImages
      .filter((img) => img.status === "archived")
      .forEach((img) => {
        items.push({
          key: `portfolio-${img.id}`,
          name: `Portfolio Image #${img.id}`,
          type: "Portfolio Image",
          archivedAt: img.archived_at,
          canDelete: true,
          onRestore: async () => {
            await studioPortfolioService.restore(img.id);
            setPortfolioImages((prev) => prev.map((i) => (i.id === img.id ? { ...i, status: "active" } : i)));
            toast.success("Photo restored to your active portfolio.");
          },
          onDelete: async () => {
            await studioPortfolioService.destroy(img.id);
            setPortfolioImages((prev) => prev.filter((i) => i.id !== img.id));
            toast.success("Photo permanently deleted.");
          },
        });
      });

    return items;
  }, [packages, addons, components, clients, portfolioImages]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | ItemType>("All");

  const filteredArchived = archived.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "All" || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Single-item Modal States
  const [itemToRestore, setItemToRestore] = useState<ArchivedItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ArchivedItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const confirmRestore = async () => {
    if (!itemToRestore) return;
    setIsSubmitting(true);
    try {
      await itemToRestore.onRestore();
      setItemToRestore(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't restore this record."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete?.onDelete) return;
    setIsSubmitting(true);
    try {
      await itemToDelete.onDelete();
      setItemToDelete(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't permanently delete this record. It may have historical bookings attached."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk Action States
  const [bulkAction, setBulkAction] = useState<"restore" | "delete" | null>(null);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  const bulkDeletableItems = filteredArchived.filter((i) => i.canDelete && i.onDelete);
  const bulkSkippedCount = filteredArchived.length - bulkDeletableItems.length;

  const runBulkAction = async () => {
    if (!bulkAction) return;
    const targets = bulkAction === "restore" ? filteredArchived : bulkDeletableItems;
    if (targets.length === 0) {
      setBulkAction(null);
      return;
    }

    setIsBulkSubmitting(true);
    const results = await Promise.allSettled(
      targets.map((item) => (bulkAction === "restore" ? item.onRestore() : item.onDelete!()))
    );
    setIsBulkSubmitting(false);
    setBulkAction(null);

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - succeeded;

    if (failed === 0) {
      toast.success(bulkAction === "restore" ? `Restored ${succeeded} record(s).` : `Permanently deleted ${succeeded} record(s).`);
    } else {
      toast.error(`${succeeded} succeeded, ${failed} failed. Some records may have dependencies preventing the action.`);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("All");
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-up">

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Safe Archive</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Every archived package, add-on, calculator tier, portfolio image, and walk-in client lives here. Restore them or permanently delete the ones that are eligible.
            </p>
            <p className="text-xs text-muted-foreground/80 mt-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Records are automatically deleted permanently {RETENTION_DAYS} days after being archived.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setBulkAction("restore")}
              disabled={filteredArchived.length === 0}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restore All
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-destructive hover:bg-destructive/10"
              onClick={() => setBulkAction("delete")}
              disabled={bulkDeletableItems.length === 0}
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete All
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl border border-border/50 p-4 card-shadow space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold mb-2">
            <Filter className="w-4 h-4" /> Filter Archives
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search record name..."
                className="pl-9 h-9 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="flex h-9 w-full sm:w-[200px] items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "All" | ItemType)}
            >
              <option value="All">All Record Types</option>
              <option value="Package">Packages</option>
              <option value="Add-on">Add-ons</option>
              <option value="Calculator Tier">Calculator Tiers</option>
              <option value="Portfolio Image">Portfolio Images</option>
              <option value="Client">Clients</option>
            </select>
          </div>

          {(searchQuery || typeFilter !== "All") && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7 text-muted-foreground">
                Clear Filters
              </Button>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your archive...
          </div>
        )}

        {/* Archive List */}
        {!isLoading && (
          <div className="bg-card rounded-xl border border-border/50 card-shadow overflow-hidden">
            <div className="divide-y divide-border">
              {filteredArchived.map((item) => {
                const daysLeft = item.canDelete ? daysUntilPurge(item.archivedAt) : null;
                return (
                  <div key={item.key} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center text-warning shrink-0">
                        <Archive className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.type}{item.subtitle ? ` • ${item.subtitle}` : ""} • Archived {formatDateTime(item.archivedAt)}
                        </p>
                        {daysLeft !== null && (
                          <p className={`text-[11px] mt-0.5 font-medium ${daysLeft <= 14 ? "text-destructive" : "text-muted-foreground/70"}`}>
                            {daysLeft <= 0 ? "Pending permanent deletion" : `Auto-deletes in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => setItemToRestore(item)}>
                        <RotateCcw className="w-3.5 h-3.5" /> Restore
                      </Button>
                      {item.canDelete && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setItemToDelete(item)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredArchived.length === 0 && (
                <div className="text-center py-16 text-muted-foreground text-sm">
                  <ShieldAlert className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                  {archived.length > 0 ? "No archived records match your filters." : "Your archive is completely empty."}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Restore Confirmation Modal */}
      {itemToRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-card border border-border/50 rounded-xl shadow-lg max-w-md w-full p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Info className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Restore Record?</h3>
                  <p className="text-sm text-muted-foreground">Make this record active again.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2" onClick={() => setItemToRestore(null)} disabled={isSubmitting}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              You are about to restore the {itemToRestore.type.toLowerCase()} <strong>"{itemToRestore.name}"</strong>. It will be moved back to your active dashboard.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setItemToRestore(null)} disabled={isSubmitting}>Cancel</Button>
              <Button variant="default" onClick={confirmRestore} disabled={isSubmitting}>
                {isSubmitting ? "Restoring..." : "Yes, Restore"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-card border border-border/50 rounded-xl shadow-lg max-w-md w-full p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Permanently Delete?</h3>
                  <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2" onClick={() => setItemToDelete(null)} disabled={isSubmitting}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Are you sure you want to permanently delete <strong>"{itemToDelete.name}"</strong>? This {itemToDelete.type.toLowerCase()} will be removed from your archive forever.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setItemToDelete(null)} disabled={isSubmitting}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={isSubmitting}>
                {isSubmitting ? "Deleting..." : "Permanently Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Confirmation Modal */}
      {bulkAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-card border border-border/50 rounded-xl shadow-lg max-w-md w-full p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bulkAction === "delete" ? "bg-destructive/10" : "bg-blue-500/10"}`}>
                  {bulkAction === "delete" ? (
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  ) : (
                    <Info className="w-5 h-5 text-blue-500" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg">
                    {bulkAction === "delete" ? "Permanently Delete All?" : "Restore All?"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {bulkAction === "delete" ? "This action cannot be undone." : "Every filtered record will become active again."}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2" onClick={() => setBulkAction(null)} disabled={isBulkSubmitting}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              {bulkAction === "delete" ? (
                <>
                  <p>
                    You are about to permanently delete <strong>{bulkDeletableItems.length}</strong> record(s) matching your current filters.
                  </p>
                  {bulkSkippedCount > 0 && (
                    <p className="text-xs bg-muted/40 rounded-md p-2">
                      {bulkSkippedCount} calculator tier(s) will be skipped — those can only be restored, not permanently deleted.
                    </p>
                  )}
                </>
              ) : (
                <p>
                  You are about to restore <strong>{filteredArchived.length}</strong> record(s) matching your current filters back to active status.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setBulkAction(null)} disabled={isBulkSubmitting}>Cancel</Button>
              <Button
                variant={bulkAction === "delete" ? "destructive" : "default"}
                onClick={runBulkAction}
                disabled={isBulkSubmitting}
              >
                {isBulkSubmitting ? "Processing..." : bulkAction === "delete" ? "Permanently Delete All" : "Restore All"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
