import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Search, Shield, User, Aperture, Eye, Camera,
  RotateCcw, MoreVertical, Mail, Phone, Calendar, Clock, Activity, CheckCircle2,
  AlertCircle, Clock3, FileEdit, XCircle, ChevronLeft, ChevronRight, X
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import toast from "react-hot-toast";

type UserRole = "client" | "studio" | "freelancer" | "admin";
type AccountStatus = "active" | "suspended" | "deactivated";
type ApplicationStatus = "Approved" | "Pending Review" | "Revision Requested" | "Rejected" | "Draft" | "N/A";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  joined: string;
  lastLogin: string;
  bookings: number;
  totalServices?: number;
  status: AccountStatus;
  applicationStatus: ApplicationStatus;
  avatarColor: string;
  recentActivity: string;
}

const avatarColors = [
  "bg-primary/15 text-primary",
  "bg-accent/15 text-accent",
  "bg-secondary/15 text-secondary",
  "bg-emerald-500/15 text-emerald-600",
  "bg-amber-500/15 text-amber-600",
  "bg-destructive/15 text-destructive",
];

const initialUsers: UserRecord[] = [
  { id: "1", name: "Emily Watson", email: "emily@mail.com", phone: "+63 912 345 6789", role: "client", joined: "Mar 18, 2026", lastLogin: "Just now", bookings: 3, status: "active", applicationStatus: "N/A", avatarColor: avatarColors[0], recentActivity: "Booked Rivera Studio for a Wedding" },
  { id: "2", name: "Rivera Studio", email: "marcus@rivera.com", phone: "+63 998 765 4321", role: "studio", joined: "Feb 5, 2026", lastLogin: "2 hours ago", bookings: 23, totalServices: 8, status: "active", applicationStatus: "Approved", avatarColor: avatarColors[1], recentActivity: "Updated service package pricing" },
  { id: "3", name: "David Kim", email: "david@mail.com", phone: "+63 945 123 9876", role: "freelancer", joined: "Mar 12, 2026", lastLogin: "1 day ago", bookings: 1, totalServices: 3, status: "active", applicationStatus: "Pending Review", avatarColor: avatarColors[2], recentActivity: "Uploaded new portfolio images" },
  { id: "5", name: "Sarah Chen", email: "sarah@mail.com", phone: "+63 922 444 5555", role: "client", joined: "Mar 1, 2026", lastLogin: "1 week ago", bookings: 2, status: "suspended", applicationStatus: "N/A", avatarColor: avatarColors[5], recentActivity: "Multiple canceled bookings detected" },
  { id: "6", name: "Alex Morgan", email: "alex@snapbook.com", phone: "+63 911 111 2222", role: "admin", joined: "Jan 1, 2025", lastLogin: "5 mins ago", bookings: 0, status: "active", applicationStatus: "N/A", avatarColor: avatarColors[1], recentActivity: "Approved Rivera Studio's ID documents" },
  { id: "7", name: "Juan Dela Cruz", email: "juan@mail.com", phone: "+63 911 222 3333", role: "client", joined: "Apr 2, 2026", lastLogin: "2 days ago", bookings: 0, status: "active", applicationStatus: "N/A", avatarColor: avatarColors[3], recentActivity: "Signed up" },
  { id: "8", name: "LensCrafters Bulan", email: "contact@lensbulan.com", phone: "+63 944 555 6666", role: "studio", joined: "Mar 20, 2026", lastLogin: "3 hours ago", bookings: 5, totalServices: 4, status: "active", applicationStatus: "Approved", avatarColor: avatarColors[4], recentActivity: "Completed a booking" },
  { id: "9", name: "Maria Clara", email: "maria@mail.com", phone: "+63 977 888 9999", role: "freelancer", joined: "May 1, 2026", lastLogin: "10 mins ago", bookings: 4, totalServices: 2, status: "active", applicationStatus: "Revision Requested", avatarColor: avatarColors[0], recentActivity: "Updated verification documents" },
  { id: "10", name: "John Doe", email: "john.doe@mail.com", phone: "+63 999 000 1111", role: "client", joined: "May 15, 2026", lastLogin: "1 month ago", bookings: 1, status: "deactivated", applicationStatus: "N/A", avatarColor: avatarColors[5], recentActivity: "Account deactivated by user" },
  { id: "11", name: "Sorsogon Shooters", email: "hello@sorsogonshooters.ph", phone: "+63 912 987 6543", role: "studio", joined: "Jan 10, 2026", lastLogin: "1 hour ago", bookings: 45, totalServices: 10, status: "active", applicationStatus: "Approved", avatarColor: avatarColors[2], recentActivity: "Added new team member" },
];

const roleConfig: Record<UserRole, { icon: typeof User; label: string; className: string }> = {
  client: { icon: User, label: "Client", className: "bg-accent/10 text-accent" },
  studio: { icon: Aperture, label: "Studio", className: "bg-secondary/10 text-secondary" },
  freelancer: { icon: Camera, label: "Freelancer", className: "bg-primary/10 text-primary" },
  admin: { icon: Shield, label: "Admin", className: "bg-muted text-muted-foreground" },
};

const statusConfig: Record<AccountStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-600",
  suspended: "bg-amber-500/10 text-amber-600",
  deactivated: "bg-destructive/10 text-destructive",
};

const appStatusConfig: Record<ApplicationStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  "Approved": { label: "Approved", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle2 },
  "Pending Review": { label: "Pending", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock3 },
  "Revision Requested": { label: "Revision", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: FileEdit },
  "Rejected": { label: "Rejected", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400", icon: XCircle },
  "Draft": { label: "Draft", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", icon: AlertCircle },
  "N/A": { label: "N/A", className: "text-muted-foreground bg-muted/50", icon: Shield },
};

const tabs = ["All", "Clients", "Freelancers", "Studios", "Admins"] as const;
const tabRoleMap: Record<string, UserRole | null> = {
  All: null, Clients: "client", Freelancers: "freelancer", Studios: "studio", Admins: "admin",
};

const ITEMS_PER_PAGE = 8;

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRecord[]>(initialUsers);
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [viewUser, setViewUser] = useState<UserRecord | null>(null);
  
  const [confirmAction, setConfirmAction] = useState<{ 
    user: UserRecord; 
    type: 'suspend' | 'deactivate' | 'reactivate'
  } | null>(null);
  const [actionReason, setActionReason] = useState("");

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

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const resetFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
    setActiveTab("All");
    setCurrentPage(1);
    toast.success("Filters reset successfully");
  };

  const executeConfirmAction = () => {
    if (!confirmAction) return;
    
    if ((confirmAction.type === 'suspend' || confirmAction.type === 'deactivate') && !actionReason.trim()) {
      toast.error("Please provide a reason for this audit trail.");
      return;
    }

    setUsers((prev) => prev.map((u) => {
      if (u.id === confirmAction.user.id) {
        switch (confirmAction.type) {
          case 'suspend': return { ...u, status: "suspended" };
          case 'deactivate': return { ...u, status: "deactivated" };
          case 'reactivate': return { ...u, status: "active" };
          default: return u;
        }
      }
      return u;
    }));
    
    const actionPastTense = confirmAction.type === 'suspend' ? 'suspended' : confirmAction.type === 'deactivate' ? 'deactivated' : 'reactivated';
    toast.success(`Account for ${confirmAction.user.name} has been ${actionPastTense}.`);
    
    setConfirmAction(null);
    setActionReason("");
  };

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const getActionConfig = (type: string) => {
    switch(type) {
      case 'suspend': return { title: 'Suspend User Account?', btnText: 'Suspend Account', variant: 'destructive' as const };
      case 'deactivate': return { title: 'Deactivate User Account?', btnText: 'Deactivate Account', variant: 'destructive' as const };
      case 'reactivate': return { title: 'Reactivate User Account?', btnText: 'Reactivate Account', variant: 'default' as const };
      default: return { title: 'Confirm Action', btnText: 'Confirm', variant: 'default' as const };
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-up">
        
        {/* Header & Stats Overview */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground">User Management</h1>
            <p className="text-sm text-muted-foreground">Monitor and manage platform accounts, roles, and security statuses.</p>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-card rounded-2xl border border-border/50 p-5 card-shadow space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email address..."
                className="pl-10 h-11 rounded-xl bg-muted/50 border-border/50"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              />
            </div>
            
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full sm:w-[150px] h-11 rounded-xl bg-muted/50 border-border/50">
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
              <SelectTrigger className="w-full sm:w-[150px] h-11 rounded-xl bg-muted/50 border-border/50">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="deactivated">Deactivated</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={resetFilters} className="h-11 rounded-xl gap-2 border-border/50">
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap pt-2 border-t border-border/30">
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

        {/* User List Table */}
        <div className="bg-card rounded-2xl border border-border/40 card-shadow overflow-hidden flex flex-col">
          <div className="grid grid-cols-[2fr_1fr_1.5fr_1fr_1.2fr_1fr_80px] gap-4 px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest border-b border-border/30">
            <span>User</span>
            <span>Role / Type</span>
            <span>Email</span>
            <span>Account Status</span>
            <span>App Status</span>
            <span>Joined</span>
            <span className="text-center">Actions</span>
          </div>

          <div className="flex-1 divide-y divide-border/20">
            {paginatedUsers.map((u) => {
              const rc = roleConfig[u.role];
              const AppStatusIcon = appStatusConfig[u.applicationStatus].icon;
              return (
                <div key={u.id} className="grid grid-cols-[2fr_1fr_1.5fr_1fr_1.2fr_1fr_80px] gap-4 px-6 py-4 items-center transition-colors hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${u.avatarColor} relative`}>
                      {getInitials(u.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${rc.className}`}>
                      {rc.label}
                    </span>
                  </div>

                  <div className="truncate text-sm text-muted-foreground">
                    {u.email}
                  </div>

                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusConfig[u.status]}`}>
                      {u.status}
                    </span>
                  </div>

                  <div>
                    {u.role === 'freelancer' || u.role === 'studio' ? (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${appStatusConfig[u.applicationStatus].className}`}>
                        <AppStatusIcon className="w-3 h-3" />
                        {appStatusConfig[u.applicationStatus].label}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground pl-2">—</span>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground truncate">
                    {u.joined}
                  </div>

                  {/* Actions Dropdown */}
                  <div className="flex items-center justify-center gap-1">
                    <button 
                      onClick={() => setViewUser(u)} 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" 
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    {u.role !== 'admin' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" 
                            title="More Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl">
                          {u.status === 'active' ? (
                            <>
                              <DropdownMenuItem className="cursor-pointer text-amber-600 focus:text-amber-700" onClick={() => setConfirmAction({ user: u, type: 'suspend' })}>
                                Suspend Account
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => setConfirmAction({ user: u, type: 'deactivate' })}>
                                Deactivate Account
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem className="cursor-pointer text-emerald-600 focus:text-emerald-700" onClick={() => setConfirmAction({ user: u, type: 'reactivate' })}>
                              Reactivate Account
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}
            
            {paginatedUsers.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                No user accounts found matching your selected filters.
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-border/30 bg-muted/10">
              <span className="text-xs text-muted-foreground">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} users
              </span>
              
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 rounded-lg px-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="sr-only">Previous</span>
                </Button>
                
                <div className="flex items-center gap-1 mx-1">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors flex items-center justify-center ${
                          currentPage === page 
                            ? "bg-primary text-primary-foreground shadow-sm" 
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 rounded-lg px-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span className="sr-only">Next</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border/50 rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200 m-4 relative flex flex-col">
            <button 
              onClick={() => { setConfirmAction(null); setActionReason(""); }}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-xl font-heading font-bold text-foreground mb-2">
              {getActionConfig(confirmAction.type).title}
            </h3>
            
            <p className="text-sm text-muted-foreground mb-6">
              {confirmAction.type === 'suspend' && `Suspending ${confirmAction.user.name} will block access to logins and receiving new booking requests until reactivated.`}
              {confirmAction.type === 'deactivate' && `Deactivating this account will hide public profiles and services from the marketplace while retaining historical records.`}
              {confirmAction.type === 'reactivate' && `This will restore full platform and operational access for ${confirmAction.user.name}.`}
            </p>
            
            {(confirmAction.type === 'suspend' || confirmAction.type === 'deactivate') && (
              <div className="space-y-3 mb-6">
                <label className="text-sm font-semibold">Reason for Action <span className="text-destructive">*</span></label>
                <Textarea 
                  placeholder="e.g., Policy violation, fraudulent activity, dispute pending..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="resize-none h-24 rounded-xl bg-muted/50 border-border/50"
                />
                <p className="text-xs text-muted-foreground">This reason will be logged permanently in administrative audit logs.</p>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-2">
              <Button variant="outline" onClick={() => { setConfirmAction(null); setActionReason(""); }} className="rounded-xl px-6">
                Cancel
              </Button>
              <Button variant={getActionConfig(confirmAction.type).variant} onClick={executeConfirmAction} className="rounded-xl px-6">
                {getActionConfig(confirmAction.type).btnText}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border/50 rounded-2xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200 m-4 relative flex flex-col max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setViewUser(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-lg font-heading font-bold text-foreground mb-6">User Profile Overview</h3>
            
            {/* User Header */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mb-3 shadow-sm border-2 border-border/50 ${viewUser.avatarColor}`}>
                {getInitials(viewUser.name)}
              </div>
              <h2 className="text-xl font-bold">{viewUser.name}</h2>
              
              <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleConfig[viewUser.role].className}`}>
                  {roleConfig[viewUser.role].label}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusConfig[viewUser.status]}`}>
                  Account: {viewUser.status}
                </span>
                {(viewUser.role === 'freelancer' || viewUser.role === 'studio') && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${appStatusConfig[viewUser.applicationStatus].className}`}>
                    App: {viewUser.applicationStatus}
                  </span>
                )}
              </div>
            </div>

            {/* Profile Grid */}
            <div className="space-y-4 text-sm bg-muted/20 p-5 rounded-xl border border-border/50">
              <div className="grid grid-cols-3 gap-2 border-b border-border/50 pb-3 items-center">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5"><Mail className="w-4 h-4"/> Email</span>
                <span className="col-span-2 font-medium truncate">{viewUser.email}</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 border-b border-border/50 pb-3 items-center">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5"><Phone className="w-4 h-4"/> Phone</span>
                <span className="col-span-2 font-medium">{viewUser.phone}</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 border-b border-border/50 pb-3 items-center">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5"><Calendar className="w-4 h-4"/> Registered</span>
                <span className="col-span-2 font-medium">{viewUser.joined}</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 border-b border-border/50 pb-3 items-center">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5"><Clock className="w-4 h-4"/> Last Active</span>
                <span className="col-span-2 font-medium">{viewUser.lastLogin}</span>
              </div>
              
              {viewUser.role === 'client' ? (
                <div className="grid grid-cols-3 gap-2 border-b border-border/50 pb-3 items-center">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5"><Calendar className="w-4 h-4"/> Total Bookings</span>
                  <span className="col-span-2 font-medium">{viewUser.bookings}</span>
                </div>
              ) : viewUser.role !== 'admin' ? (
                <div className="grid grid-cols-3 gap-2 border-b border-border/50 pb-3 items-center">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5"><Aperture className="w-4 h-4"/> Active Packages</span>
                  <span className="col-span-2 font-medium">{viewUser.totalServices || 0}</span>
                </div>
              ) : null}

              <div className="grid grid-cols-3 gap-2 pt-1">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5"><Activity className="w-4 h-4 text-primary"/> Recent Activity</span>
                <span className="col-span-2 text-foreground">{viewUser.recentActivity}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setViewUser(null)} className="w-full sm:w-auto">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}