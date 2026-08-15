import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Mail, Phone, MapPin, Search, Plus, User, UserCheck, X, AlertCircle, Info, Edit2, Archive, AlertTriangle, UserPlus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  usePhotographerClients,
  useCreateWalkInClient,
  useUpdateWalkInClient,
  useArchiveWalkInClient,
} from "@/hooks/usePhotographerClients";
import {
  WALK_IN_SOURCES,
  sourceLabel,
  type ClientRecord,
  type WalkInSource,
} from "@/services/photographerClientService";

export default function StudioClients() {
  const { toast } = useToast();
  const { data: clients = [], isLoading, isError } = usePhotographerClients();
  const createWalkIn = useCreateWalkInClient();
  const updateWalkIn = useUpdateWalkInClient();
  const archiveWalkIn = useArchiveWalkInClient();

  const [search, setSearch] = useState("");

  // Add / Edit Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  // Archive Modal States
  const [isArchiveConfirming, setIsArchiveConfirming] = useState(false);
  const [clientToArchive, setClientToArchive] = useState<ClientRecord | null>(null);

  // Form States
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newSource, setNewSource] = useState<WalkInSource>("walk_in");

  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email?.toLowerCase().includes(q) ?? false) ||
      (c.phone?.includes(search) ?? false)
    );
  });

  const resetForm = () => {
    setNewName("");
    setNewPhone("");
    setNewEmail("");
    setNewLocation("");
    setNewSource("walk_in");
    setEditingClientId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client: ClientRecord) => {
    setEditingClientId(client.id);
    setNewName(client.name);
    setNewPhone(client.phone ?? "");
    setNewEmail(client.email ?? "");
    setNewLocation(client.location ?? "");
    setNewSource((client.source as WalkInSource) || "walk_in");
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      toast({ title: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setIsConfirming(true);
  };

  const executeSaveClient = async () => {
    const input = {
      name: newName.trim(),
      phone: newPhone.trim(),
      email: newEmail.trim() || null,
      location: newLocation.trim() || null,
      source: newSource,
    };

    try {
      if (editingClientId) {
        await updateWalkIn.mutateAsync({ id: editingClientId, input });
        toast({ title: `Client ${input.name}'s profile updated successfully!` });
      } else {
        await createWalkIn.mutateAsync(input);
        toast({ title: `Walk-in client ${input.name} successfully recorded!` });
      }
      resetForm();
      setIsConfirming(false);
      setIsModalOpen(false);
    } catch {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
      setIsConfirming(false);
    }
  };

  const confirmArchive = (client: ClientRecord) => {
    setClientToArchive(client);
    setIsArchiveConfirming(true);
  };

  const executeArchive = async () => {
    if (!clientToArchive) return;
    try {
      await archiveWalkIn.mutateAsync(clientToArchive.id);
      toast({ title: `${clientToArchive.name} has been archived successfully.` });
    } catch {
      toast({ title: "Failed to archive client. Please try again.", variant: "destructive" });
    } finally {
      setIsArchiveConfirming(false);
      setClientToArchive(null);
    }
  };

  const isSaving = createWalkIn.isPending || updateWalkIn.isPending;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-up">

        {/* Top Header Actions Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Clients</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your client directory, platform connections, and transaction histories.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search name, phone, email..."
                className="pl-9 h-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Button
              type="button"
              onClick={handleOpenAdd}
              className="h-10 px-4 font-medium flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Walk-in Client
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading clients...
          </div>
        )}

        {isError && !isLoading && (
          <div className="text-center py-16 bg-card rounded-xl border border-border/50">
            <AlertCircle className="w-8 h-8 text-destructive/70 mx-auto mb-2" />
            <p className="text-sm font-medium text-muted-foreground">
              Couldn't load your client directory. Please try again.
            </p>
          </div>
        )}

        {/* Directory Grid Matrix */}
        {!isLoading && !isError && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="bg-card rounded-xl card-shadow border border-border/50 p-5 hover:card-shadow-hover transition-all duration-200 flex flex-col justify-between h-full min-h-[220px]"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-11 h-11 rounded-full flex items-center justify-center font-heading font-bold text-base shrink-0",
                        client.type === "registered" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground border"
                      )}>
                        {client.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-heading font-semibold text-sm line-clamp-1">{client.name}</h3>
                        <div className="mt-0.5">
                          {client.type === "registered" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-200/50">
                              <UserCheck className="w-2.5 h-2.5" /> Registered Client
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-medium bg-muted/60 px-1.5 py-0.5 rounded border">
                              <User className="w-2.5 h-2.5" /> Walk-in Client
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                        client.status === "active"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                      )}>
                        {client.status}
                      </span>

                      {/* Action buttons strictly for Walk-in clients */}
                      {client.type === "walk-in" && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(client)}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                            title="Edit Walk-in Client"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => confirmArchive(client)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                            title="Archive Client"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{client.email ?? "No email provided"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{client.phone ?? "No phone provided"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{client.location ?? "Not specified"}</span>
                    </div>

                    <div className="h-6 pt-1 flex items-center">
                      {client.type === "walk-in" ? (
                        <div className="text-[11px] text-muted-foreground/80 flex items-center gap-1">
                          <span className="font-medium">Origin:</span>
                          <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{sourceLabel(client.source)}</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-muted-foreground/80 flex items-center gap-1">
                          <span className="font-medium">Origin:</span>
                          <span className="bg-primary/5 text-primary px-1.5 py-0.5 rounded text-[10px]">Platform</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between mt-auto">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Bookings</p>
                    <p className="font-semibold text-sm mt-0.5">{client.bookings}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Revenue</p>
                    <p className="font-heading font-bold text-primary mt-0.5">₱{client.spent.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}

            {filteredClients.length === 0 && (
              <div className="col-span-full text-center py-12 bg-card rounded-xl border border-border/50 flex flex-col items-center justify-center p-6">
                <AlertCircle className="w-8 h-8 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No matching active clients discovered.</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">Refine your active search query or record a new offline walk-in booking record.</p>
              </div>
            )}
          </div>
        )}

        {/* Modal Overlay: Add / Edit Walk-in Client Form */}
        {isModalOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">

              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/40">
                <div>
                  <h2 className="text-base font-heading font-bold">
                    {editingClientId ? "Edit Walk-in Client" : "Record Walk-in Client"}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {editingClientId ? "Update the details of your manual client record." : "Log offline external inquiries into your workspace."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-5 space-y-4">

                {!editingClientId && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-3 rounded-lg flex gap-2">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-800 dark:text-blue-300">
                      <strong>Note:</strong> Manually recorded walk-in clients do not automatically receive a platform account. This is for your personal tracking only.
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="client-name" className="text-xs font-semibold">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="client-name"
                    required
                    placeholder="e.g. Maria Santos"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="client-phone" className="text-xs font-semibold">
                    Phone Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="client-phone"
                    type="tel"
                    required
                    placeholder="e.g. +63 9XX XXX XXXX"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="client-email" className="text-xs font-semibold">
                    Email Address <span className="text-muted-foreground font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="client-email"
                    type="email"
                    placeholder="e.g. maria@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="client-location" className="text-xs font-semibold">
                    Location / General Area <span className="text-muted-foreground font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="client-location"
                    placeholder="e.g. Bulan, Sorsogon"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Inbound Booking Lead Source</Label>
                  <Select
                    value={newSource}
                    onValueChange={(val) => setNewSource(val as WalkInSource)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select channel source" />
                    </SelectTrigger>
                    <SelectContent>
                      {WALK_IN_SOURCES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-border mt-5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    className="h-9 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!newName.trim() || !newPhone.trim()}
                    className="h-9 text-xs font-semibold px-4"
                  >
                    {editingClientId ? "Update Profile" : "Save Profile Record"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Action Confirmation Modal for Add/Edit */}
        {isConfirming && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-5 text-center space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <UserPlus className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg">
                  {editingClientId ? "Confirm Update" : "Confirm Client Entry"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Are you sure you want to {editingClientId ? "update the details for" : "add"} <strong>{newName}</strong>?
                  {!editingClientId && " This action will generate a manual record."}
                </p>
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <Button variant="outline" onClick={() => setIsConfirming(false)} className="w-full" disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={executeSaveClient} className="w-full" disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingClientId ? "Confirm Update" : "Confirm Addition")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Action Confirmation Modal for Archiving */}
        {isArchiveConfirming && clientToArchive && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-5 text-center space-y-4">
              <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg">Archive Walk-in Client</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Are you sure you want to archive <strong>{clientToArchive.name}</strong>? They will be hidden from your active directory, but historical records will be preserved.
                </p>
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <Button variant="outline" onClick={() => setIsArchiveConfirming(false)} className="w-full" disabled={archiveWalkIn.isPending}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={executeArchive} className="w-full" disabled={archiveWalkIn.isPending}>
                  {archiveWalkIn.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Archive Client"}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}