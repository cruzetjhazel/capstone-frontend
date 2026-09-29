import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Search, ArchiveRestore, ShieldAlert, X, Users, Camera, UserSquare,
  Loader2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import api, { getApiErrorMessage } from "@/lib/api";

type EntityType = "Freelancer" | "Studio" | "Client";

interface ArchivedAccount {
  id: number;
  name: string;
  email: string;
  type: EntityType;
  joined: string;
}

function unwrapList(payload: any): any[] {
  let cur = payload;
  for (let i = 0; i < 4 && cur && !Array.isArray(cur); i++) {
    cur = cur.data;
  }
  return Array.isArray(cur) ? cur : [];
}

function findMeta(payload: any): { last_page?: number; total?: number } | null {
  let cur = payload;
  for (let i = 0; i < 5 && cur && typeof cur === "object"; i++) {
    if (cur.meta && typeof cur.meta.last_page === "number") return cur.meta;
    if (typeof cur.last_page === "number") return cur;
    cur = cur.data;
  }
  return null;
}

const fromApi = (raw: any): ArchivedAccount => ({
  id: raw.id,
  name: raw.name,
  email: raw.email,
  type:
    raw.account_type === "client"
      ? "Client"
      : raw.photographer_type === "studio"
        ? "Studio"
        : "Freelancer",
  joined: raw.created_at
    ? new Date(raw.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "—",
});

const getTypeIcon = (type: EntityType) => {
  switch (type) {
    case "Studio": return <Camera className="w-4 h-4" />;
    case "Freelancer": return <UserSquare className="w-4 h-4" />;
    default: return <Users className="w-4 h-4" />;
  }
};

export default function AdminArchive() {
  const [accounts, setAccounts] = useState<ArchivedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const [itemToRestore, setItemToRestore] = useState<ArchivedAccount | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError("");

    const params: Record<string, string | number> = { account_status: "deactivated", page };
    if (debouncedSearch) params.search = debouncedSearch;
    if (typeFilter !== "All") params.account_type = typeFilter;

    api.get("/admin/users", { params })
      .then((res) => {
        if (cancelled) return;
        setAccounts(unwrapList(res.data).map(fromApi));
        const meta = findMeta(res.data);
        setLastPage(meta?.last_page ?? 1);
        setTotal(meta?.total ?? 0);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getApiErrorMessage(err, "Failed to load archived accounts."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, typeFilter, page, reloadKey]);

  const confirmRestore = async () => {
    if (!itemToRestore) return;
    setIsRestoring(true);
    try {
      await api.post(`/admin/users/${itemToRestore.id}/reactivate`);
      toast.success(`${itemToRestore.type} "${itemToRestore.name}" successfully restored to active status.`);
      setItemToRestore(null);

      // Stepping back a page if that was the last row on the last page.
      if (page > 1 && accounts.length === 1) setPage(page - 1);
      else setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to restore this account."));
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-up">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <ArchiveRestore className="w-6 h-6 text-primary" />
            Global Archive
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Deactivated accounts. Restoring one reactivates the account and its login access immediately.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-col sm:flex-row gap-4 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-9 h-10"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring sm:w-48"
          >
            <option value="All">All Types</option>
            <option value="client">Clients</option>
            <option value="photographer">Professionals</option>
          </select>
        </div>

        {/* List */}
        <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden">
          <div className="divide-y divide-border/50">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading archived accounts…
              </div>
            )}

            {!isLoading && loadError && (
              <div className="text-center py-16 text-sm text-destructive">
                {loadError}{" "}
                <button className="underline" onClick={() => setReloadKey((k) => k + 1)}>Retry</button>
              </div>
            )}

            {!isLoading && !loadError && accounts.map((item) => (
              <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border/50">
                    {getTypeIcon(item.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{item.name}</p>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-muted border border-border">
                        {item.type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{item.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">ID: {item.id} • Member since {item.joined}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setItemToRestore(item)}>
                    <ArchiveRestore className="w-3.5 h-3.5" /> Restore
                  </Button>
                </div>
              </div>
            ))}

            {!isLoading && !loadError && accounts.length === 0 && (
              <div className="text-center py-16">
                <ShieldAlert className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-foreground">Archive Empty</h3>
                <p className="text-sm text-muted-foreground">No deactivated accounts match your filters.</p>
              </div>
            )}
          </div>

          {!loadError && lastPage > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/20">
              <span className="text-xs text-muted-foreground">
                Page {page} of {lastPage}{total ? ` • ${total} accounts` : ""}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1 || isLoading} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>
                <Button variant="outline" size="sm" disabled={page >= lastPage || isLoading} onClick={() => setPage((p) => p + 1)}>
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      {itemToRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-card border border-border/50 rounded-xl shadow-lg max-w-md w-full p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <ArchiveRestore className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Restore Account?</h3>
                  <p className="text-sm text-muted-foreground">Reactivate this {itemToRestore.type.toLowerCase()}.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2" onClick={() => setItemToRestore(null)} disabled={isRestoring}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              You are about to restore <strong>{itemToRestore.name}</strong>. Their login access and public profile (if applicable) will be reactivated immediately.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setItemToRestore(null)} disabled={isRestoring}>Cancel</Button>
              <Button onClick={confirmRestore} disabled={isRestoring}>
                {isRestoring ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Restoring…
                  </>
                ) : (
                  "Yes, Restore"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
