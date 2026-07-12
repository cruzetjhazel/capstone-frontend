import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, Shield, User, Aperture, Pencil, X, Eye, Check, Camera,
  ChevronLeft, ChevronRight, RotateCcw, ArrowRight,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type UserRole = "client" | "studio" | "freelancer" | "admin";
type UserStatus = "active" | "pending" | "suspended";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  joined: string;
  bookings: number;
  status: UserStatus;
  avatarColor: string;
}

const avatarColors = [
  "bg-primary/15 text-primary",
  "bg-accent/15 text-accent",
  "bg-secondary/15 text-secondary",
  "bg-success/15 text-success",
  "bg-warning/15 text-warning",
  "bg-destructive/15 text-destructive",
];

const initialUsers: UserRecord[] = [
  { id: "1", name: "Emily Watson", email: "emily@mail.com", role: "client", joined: "Mar 18, 2026", bookings: 3, status: "active", avatarColor: avatarColors[0] },
  { id: "2", name: "Rivera Studio", email: "marcus@rivera.com", role: "studio", joined: "Feb 5, 2026", bookings: 23, status: "active", avatarColor: avatarColors[1] },
  { id: "3", name: "David Kim", email: "david@mail.com", role: "freelancer", joined: "Mar 12, 2026", bookings: 1, status: "pending", avatarColor: avatarColors[2] },
  { id: "4", name: "Anya Petrova", email: "anya@studio.com", role: "studio", joined: "Jan 22, 2026", bookings: 17, status: "active", avatarColor: avatarColors[3] },
  { id: "5", name: "Leo Chang", email: "leo@freelance.com", role: "freelancer", joined: "Dec 10, 2025", bookings: 31, status: "active", avatarColor: avatarColors[4] },
  { id: "6", name: "Sarah Chen", email: "sarah@mail.com", role: "client", joined: "Mar 1, 2026", bookings: 2, status: "suspended", avatarColor: avatarColors[5] },
  { id: "7", name: "Tom Brennan", email: "tom@mail.com", role: "client", joined: "Feb 28, 2026", bookings: 5, status: "active", avatarColor: avatarColors[0] },
  { id: "8", name: "Alex Morgan", email: "alex@snapbook.com", role: "admin", joined: "Jan 1, 2025", bookings: 0, status: "active", avatarColor: avatarColors[1] },
  { id: "9", name: "Mia Johnson", email: "mia@mail.com", role: "client", joined: "Mar 20, 2026", bookings: 7, status: "active", avatarColor: avatarColors[2] },
  { id: "10", name: "Studio Luxe", email: "info@studioluxe.com", role: "studio", joined: "Nov 15, 2025", bookings: 45, status: "active", avatarColor: avatarColors[3] },
  { id: "11", name: "Jake Wilson", email: "jake@photo.com", role: "freelancer", joined: "Feb 14, 2026", bookings: 12, status: "pending", avatarColor: avatarColors[4] },
  { id: "12", name: "Nina Torres", email: "nina@mail.com", role: "client", joined: "Jan 30, 2026", bookings: 4, status: "active", avatarColor: avatarColors[5] },
  { id: "13", name: "Chris Adams", email: "chris@studio.com", role: "studio", joined: "Dec 1, 2025", bookings: 28, status: "active", avatarColor: avatarColors[0] },
  { id: "14", name: "Lily Park", email: "lily@mail.com", role: "client", joined: "Mar 5, 2026", bookings: 1, status: "suspended", avatarColor: avatarColors[1] },
  { id: "15", name: "Oscar Lee", email: "oscar@freelance.com", role: "freelancer", joined: "Feb 20, 2026", bookings: 9, status: "active", avatarColor: avatarColors[2] },
  { id: "16", name: "Sophia Ray", email: "sophia@mail.com", role: "client", joined: "Mar 22, 2026", bookings: 0, status: "pending", avatarColor: avatarColors[3] },
];

const roleConfig: Record<UserRole, { icon: typeof User; label: string; className: string }> = {
  client: { icon: User, label: "Client", className: "bg-accent/10 text-accent" },
  studio: { icon: Aperture, label: "Studio", className: "bg-secondary/10 text-secondary" },
  freelancer: { icon: Camera, label: "Freelancer", className: "bg-primary/10 text-primary" },
  admin: { icon: Shield, label: "Admin", className: "bg-muted text-muted-foreground" },
};

const statusConfig: Record<UserStatus, string> = {
  active: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  suspended: "bg-destructive/10 text-destructive",
};

const tabs = ["All", "Clients", "Freelancer", "Studios", "Admins"] as const;
const tabRoleMap: Record<string, UserRole | null> = {
  All: null, Clients: "client", Freelancer: "freelancer", Studios: "studio", Admins: "admin",
};

const ITEMS_PER_PAGE = 8;

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRecord[]>(initialUsers);
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [viewUser, setViewUser] = useState<UserRecord | null>(null);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRecord | null>(null);
  const [approveUser, setApproveUser] = useState<UserRecord | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "" as string, status: "" as string });

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const tabRole = tabRoleMap[activeTab];
      if (tabRole && u.role !== tabRole) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [users, activeTab, roleFilter, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const resetFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
    setActiveTab("All");
    setCurrentPage(1);
  };

  const handleEdit = (u: UserRecord) => {
    setEditForm({ name: u.name, email: u.email, role: u.role, status: u.status });
    setEditUser(u);
  };

  const handleSaveEdit = () => {
    if (!editUser) return;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === editUser.id
          ? { ...u, name: editForm.name, email: editForm.email, role: editForm.role as UserRole, status: editForm.status as UserStatus }
          : u
      )
    );
    setEditUser(null);
    toast.success("User updated successfully");
  };

  const handleDelete = () => {
    if (!deleteUser) return;
    setUsers((prev) => prev.filter((u) => u.id !== deleteUser.id));
    setDeleteUser(null);
    toast.success("User deleted permanently");
  };

  const handleApprove = () => {
    if (!approveUser) return;
    setUsers((prev) => prev.map((u) => (u.id === approveUser.id ? { ...u, status: "active" as const } : u)));
    setApproveUser(null);
    toast.success("User approved successfully");
  };

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      const first = [1, 2];
      const last = [totalPages - 1, totalPages];
      const middle = new Set<number>();
      for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages, currentPage + 1); i++) middle.add(i);
      const all = new Set([...first, ...middle, ...last]);
      const sorted = Array.from(all).sort((a, b) => a - b);
      for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i] - sorted[i - 1] > 1) pages.push("...");
        pages.push(sorted[i]);
      }
    }
    return pages.map((p, i) =>
      typeof p === "string" ? (
        <span key={`ellipsis-${i}`} className="px-2 py-1 text-sm text-muted-foreground">…</span>
      ) : (
        <button
          key={p}
          onClick={() => setCurrentPage(p)}
          className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${
            currentPage === p
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/30 text-muted-foreground hover:bg-muted/60"
          }`}
        >
          {p}
        </button>
      )
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-up">
        {/* Filter + Search Section */}
        <div className="bg-card rounded-2xl border border-border/50 p-5 card-shadow space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-10 h-11 rounded-xl bg-muted/50 border-border/50"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[150px] h-11 rounded-xl bg-muted/50 border-border/50">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="freelancer">Freelancer</SelectItem>
                <SelectItem value="studio">Studio</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[140px] h-11 rounded-xl bg-muted/50 border-border/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={resetFilters} className="h-11 rounded-xl gap-2 border-border/50">
              <RotateCcw className="w-4 h-4" />
              Reset Filters
            </Button>
          </div>

          {/* Role tabs */}
          <div className="flex gap-2 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{paginatedUsers.length}</span> of{" "}
          <span className="font-semibold text-foreground">{filteredUsers.length}</span> users
        </p>

        {/* Table */}
        <div className="bg-card rounded-2xl border border-border/40 card-shadow overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[2fr_1fr_1.2fr_0.8fr_1fr_1.2fr] gap-4 px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest border-b border-border/30">
            <span>User</span>
            <span>Role</span>
            <span>Date Joined</span>
            <span className="text-center">Bookings</span>
            <span>Status</span>
            <span className="text-center">Actions</span>
          </div>

          {/* User rows */}
          {paginatedUsers.map((u) => {
            const rc = roleConfig[u.role];
            const showApprove = u.status === "pending" || u.status === "suspended";
            return (
              <div
                key={u.id}
                className="grid grid-cols-[2fr_1fr_1.2fr_0.8fr_1fr_1.2fr] gap-4 px-6 py-4 items-center border-b border-border/20 last:border-b-0 hover:bg-muted/30 transition-colors"
              >
                {/* User */}
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${u.avatarColor}`}>
                    {getInitials(u.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </div>

                {/* Role */}
                <div className="flex items-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${rc.className}`}>
                    {rc.label}
                  </span>
                </div>

                {/* Joined */}
                <p className="text-sm text-muted-foreground">{u.joined}</p>

                {/* Bookings */}
                <p className="text-sm font-semibold text-center">{u.bookings}</p>

                {/* Status */}
                <div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize ${statusConfig[u.status]}`}>
                    {u.status}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setViewUser(u)}
                    className="w-9 h-9 rounded-full flex items-center justify-center bg-blue-100 text-blue-500 hover:bg-blue-200 transition-colors dark:bg-blue-500/15 dark:hover:bg-blue-500/25"
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(u)}
                    className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-100 text-amber-600 hover:bg-amber-200 transition-colors dark:bg-amber-500/15 dark:hover:bg-amber-500/25"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {showApprove ? (
                    <button
                      onClick={() => setApproveUser(u)}
                      className="w-9 h-9 rounded-full flex items-center justify-center bg-green-100 text-green-600 hover:bg-green-200 transition-colors dark:bg-green-500/15 dark:hover:bg-green-500/25"
                      title="Approve"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setDeleteUser(u)}
                      className="w-9 h-9 rounded-full flex items-center justify-center bg-red-100 text-red-500 hover:bg-red-200 transition-colors dark:bg-red-500/15 dark:hover:bg-red-500/25"
                      title="Delete"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {paginatedUsers.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              No users found matching your filters.
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-xl gap-1.5 h-10 px-4 bg-muted/40 text-muted-foreground hover:bg-muted/60 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1 mx-1">
              {renderPageNumbers()}
            </div>
            <Button
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-xl gap-1.5 h-10 px-5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewUser} onOpenChange={(open) => !open && setViewUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>Detailed user information.</DialogDescription>
          </DialogHeader>
          {viewUser && (
            <div className="space-y-5 py-2">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold ${viewUser.avatarColor}`}>
                  {getInitials(viewUser.name)}
                </div>
                <div>
                  <p className="font-semibold text-lg">{viewUser.name}</p>
                  <p className="text-sm text-muted-foreground">{viewUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Role</p>
                  <p className="text-sm font-medium capitalize">{viewUser.role}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <p className="text-sm font-medium capitalize">{viewUser.status}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Date Joined</p>
                  <p className="text-sm font-medium">{viewUser.joined}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Total Bookings</p>
                  <p className="text-sm font-medium">{viewUser.bookings}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewUser(null)} className="rounded-xl">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm((f) => ({ ...f, role: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="freelancer">Freelancer</SelectItem>
                    <SelectItem value="studio">Studio</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSaveEdit} className="rounded-xl">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong>{deleteUser?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)} className="rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} className="rounded-xl">Delete Permanently</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation */}
      <Dialog open={!!approveUser} onOpenChange={(open) => !open && setApproveUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve User</DialogTitle>
            <DialogDescription>
              Approve <strong>{approveUser?.name}</strong> and set their status to active?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveUser(null)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleApprove} className="rounded-xl bg-success text-success-foreground hover:bg-success/90">
              Approve User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
