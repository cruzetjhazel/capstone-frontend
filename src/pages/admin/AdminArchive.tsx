import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Search, ArchiveRestore, Trash2, ShieldAlert, AlertTriangle, X, Users, Camera, FileText, UserSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

interface ArchivedEntity {
  id: string;
  name: string;
  type: "Freelancer" | "Studio" | "Client" | "Report";
  deletedAt: string;
  reason: string;
}

const initialArchive: ArchivedEntity[] = [
  { id: "ST-092", name: "Pixel Perfect Studio", type: "Studio", deletedAt: "2026-07-18", reason: "Requested account deletion" },
  { id: "FR-012", name: "John Doe Photography", type: "Freelancer", deletedAt: "2026-07-20", reason: "Account deactivated by user" },
  { id: "CL-401", name: "Mark Johnson", type: "Client", deletedAt: "2026-07-15", reason: "Inactivity (2+ years)" },
  { id: "RP-1004", name: "Report #1004 (Resolved)", type: "Report", deletedAt: "2026-07-10", reason: "Automated cleanup of old reports" },
];

export default function AdminArchive() {
  const [archives, setArchives] = useState<ArchivedEntity[]>(initialArchive);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  const [itemToRestore, setItemToRestore] = useState<ArchivedEntity | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ArchivedEntity | null>(null);

  const filteredArchives = archives.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "All" || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const confirmRestore = () => {
    if (!itemToRestore) return;
    setArchives(archives.filter(a => a.id !== itemToRestore.id));
    toast.success(`${itemToRestore.type} "${itemToRestore.name}" successfully restored to active status.`);
    setItemToRestore(null);
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    setArchives(archives.filter(a => a.id !== itemToDelete.id));
    toast.success(`${itemToDelete.type} "${itemToDelete.name}" permanently purged from the database.`);
    setItemToDelete(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Studio": return <Camera className="w-4 h-4" />;
      case "Freelancer": return <UserSquare className="w-4 h-4" />;
      case "Client": return <Users className="w-4 h-4" />;
      case "Report": return <FileText className="w-4 h-4" />;
      default: return <ArchiveRestore className="w-4 h-4" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-up">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <ArchiveRestore className="w-6 h-6 text-primary" />
            Global Archive & Trash
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage soft-deleted accounts, records, and reports. Items here are permanently purged after 90 days.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-col sm:flex-row gap-4 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring sm:w-48"
          >
            <option value="All">All Types</option>
            <option value="Freelancer">Freelancers</option>
            <option value="Studio">Studios</option>
            <option value="Client">Clients</option>
            <option value="Report">Reports</option>
          </select>
        </div>

        {/* Archive List */}
        <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden">
          <div className="divide-y divide-border/50">
            {filteredArchives.map((item) => (
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
                    <p className="text-xs text-muted-foreground mt-1">
                      ID: {item.id} • Deleted: {item.deletedAt}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Reason: {item.reason}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setItemToRestore(item)}>
                    <ArchiveRestore className="w-3.5 h-3.5" /> Restore
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setItemToDelete(item)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {filteredArchives.length === 0 && (
              <div className="text-center py-16">
                <ShieldAlert className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-foreground">Archive Empty</h3>
                <p className="text-sm text-muted-foreground">No deleted records match your filters.</p>
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
                  <ArchiveRestore className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Restore Record?</h3>
                  <p className="text-sm text-muted-foreground">Reactivate this {itemToRestore.type.toLowerCase()}.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2" onClick={() => setItemToRestore(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              You are about to restore <strong>{itemToRestore.name}</strong>. Their data, login capabilities, and public profile (if applicable) will be reactivated immediately.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setItemToRestore(null)}>Cancel</Button>
              <Button onClick={confirmRestore}>Yes, Restore</Button>
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
                  <h3 className="font-bold text-lg text-destructive">Permanently Purge?</h3>
                  <p className="text-sm text-muted-foreground">This action is irreversible.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2" onClick={() => setItemToDelete(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Are you absolute sure you want to permanently destroy the record for <strong>{itemToDelete.name}</strong>? All associated data will be wiped from the database and cannot be recovered.
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