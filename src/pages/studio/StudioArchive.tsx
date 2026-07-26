import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Trash2, RotateCcw, ShieldAlert, Archive, AlertTriangle, X, Info, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";

interface ArchivedItem {
  id: string;
  name: string;
  type: "Package" | "Add-on" | "Portfolio Image";
  deletedAt: string;
  date: string;
  isEligibleForDeletion: boolean;
}

export default function StudioArchive() {
  // Mock data reflecting standard system records that use archive-first management
  const [archived, setArchived] = useState<ArchivedItem[]>([
    { 
      id: "AR-001", 
      name: "Basic Wedding Package", 
      type: "Package", 
      deletedAt: "2 days ago", 
      date: "2026-07-20",
      isEligibleForDeletion: true 
    },
    { 
      id: "AR-002", 
      name: "Drone / Aerial Shot Add-on", 
      type: "Add-on", 
      deletedAt: "5 days ago", 
      date: "2026-07-17",
      isEligibleForDeletion: true 
    },
    { 
      id: "AR-003", 
      name: "Prenup_Shoot_04.jpg", 
      type: "Portfolio Image", 
      deletedAt: "1 week ago", 
      date: "2026-07-15",
      isEligibleForDeletion: true 
    }
  ]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");

  // Modal States
  const [itemToRestore, setItemToRestore] = useState<ArchivedItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ArchivedItem | null>(null);

  // Derived Filtered List
  const filteredArchived = archived.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "All" || item.type === typeFilter;
    const matchesDate = !dateFilter || item.date === dateFilter;
    return matchesSearch && matchesType && matchesDate;
  });

  const confirmRestore = () => {
    if (!itemToRestore) return;
    setArchived(archived.filter(item => item.id !== itemToRestore.id));
    toast.success(`"${itemToRestore.name}" has been successfully restored.`);
    setItemToRestore(null);
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    setArchived(archived.filter(item => item.id !== itemToDelete.id));
    toast.success(`"${itemToDelete.name}" was permanently deleted.`);
    setItemToDelete(null);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("All");
    setDateFilter("");
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-up">
        
        {/* Header Section */}
        <div>
          <h1 className="text-2xl font-heading font-bold">Archive Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your archived records. You can safely restore archived records or permanently delete eligible records.
          </p>
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
              className="flex h-9 w-full sm:w-[180px] items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="All">All Record Types</option>
              <option value="Package">Packages</option>
              <option value="Add-on">Add-ons</option>
              <option value="Portfolio Image">Portfolio Images</option>
            </select>

            <Input 
              type="date" 
              className="h-9 w-full sm:w-[160px] text-sm"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          
          {(searchQuery || typeFilter !== "All" || dateFilter) && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7 text-muted-foreground">
                Clear Filters
              </Button>
            </div>
          )}
        </div>

        {/* Archive List */}
        <div className="bg-card rounded-xl border border-border/50 card-shadow overflow-hidden">
          <div className="divide-y divide-border">
            {filteredArchived.map((item) => (
              <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center text-warning shrink-0">
                    <Archive className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.type} • Archived {item.deletedAt} ({item.date})</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => setItemToRestore(item)}>
                    <RotateCcw className="w-3.5 h-3.5" /> Restore
                  </Button>
                  {item.isEligibleForDeletion && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setItemToDelete(item)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {filteredArchived.length === 0 && (
              <div className="text-center py-16 text-muted-foreground text-sm">
                <ShieldAlert className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                {archived.length > 0 ? "No archived records match your filters." : "Your archive is completely empty."}
              </div>
            )}
          </div>
        </div>
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
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2" onClick={() => setItemToRestore(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              You are about to restore the {itemToRestore.type.toLowerCase()} <strong>"{itemToRestore.name}"</strong>. It will be moved back to your active dashboard.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setItemToRestore(null)}>Cancel</Button>
              <Button variant="default" onClick={confirmRestore}>Yes, Restore</Button>
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
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2" onClick={() => setItemToDelete(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Are you sure you want to permanently delete <strong>"{itemToDelete.name}"</strong>? This {itemToRestore?.type.toLowerCase() || 'record'} will be removed from your archive forever.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setItemToDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDelete}>Permanently Delete</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}