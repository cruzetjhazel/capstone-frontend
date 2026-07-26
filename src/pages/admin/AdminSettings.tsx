import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Globe, Bell, Shield, CalendarDays, 
  CheckCircle, AlertTriangle, UserX, 
  Database, AlertCircle, Check, Wrench
} from "lucide-react";
import toast from "react-hot-toast";

export default function AdminSettings() {
  // General State
  const [isConfirmingSave, setIsConfirmingSave] = useState(false);
  
  // Maintenance Mode States
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [pendingMaintenanceState, setPendingMaintenanceState] = useState<boolean | null>(null);
  const [confirmationInput, setConfirmationInput] = useState("");

  const CONFIRMATION_TEXT = "MAINTENANCE";

  const handleSave = () => {
    setIsConfirmingSave(false);
    toast.success("Platform settings successfully updated.");
  };

  const handleReset = () => {
    toast("Settings reset to default values.", { icon: "🔄" });
  };

  // Triggered when clicking the Maintenance Mode switch
  const handleMaintenanceToggleRequest = (checked: boolean) => {
    setPendingMaintenanceState(checked);
    setConfirmationInput("");
  };

  // Executes actual toggle after verification typing
  const confirmMaintenanceToggle = () => {
    if (pendingMaintenanceState !== null && confirmationInput === CONFIRMATION_TEXT) {
      setMaintenanceMode(pendingMaintenanceState);
      toast(
        pendingMaintenanceState 
          ? "Platform set to Maintenance Mode." 
          : "Platform Maintenance Mode disabled.",
        { icon: pendingMaintenanceState ? "⚠️" : "✅" }
      );
      setPendingMaintenanceState(null);
      setConfirmationInput("");
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-up pb-16">
        
        {/* Top Header with Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div>
            <h1 className="text-2xl font-heading font-bold">Platform Settings</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Manage global configurations and system rules.</p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset Defaults
            </Button>
            <Button size="sm" onClick={() => setIsConfirmingSave(true)} className="gap-1.5 shadow-sm">
              <Check className="w-4 h-4" /> Save Changes
            </Button>
          </div>
        </div>

        {/* 1. General Settings */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-heading font-semibold">General Config</h3>
              <p className="text-xs text-muted-foreground">Basic platform information and global access controls.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Platform Name</Label>
              <Input defaultValue="SnapBook Bulan" />
            </div>
            <div className="space-y-2">
              <Label>Support Email</Label>
              <Input defaultValue="support@bulanphotography.com" />
            </div>
            <div className="space-y-2">
              <Label>Booking ID Prefix</Label>
              <Input defaultValue="BK-" />
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-border/50 pt-4">
            <div>
              <Label className="font-semibold text-sm flex items-center gap-2">
                Maintenance Mode
                {maintenanceMode && <span className="text-xs text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded font-mono">ACTIVE</span>}
              </Label>
              <p className="text-xs text-muted-foreground">Temporarily disable platform access for general users.</p>
            </div>
            <Switch 
              checked={maintenanceMode} 
              onCheckedChange={handleMaintenanceToggleRequest} 
            />
          </div>
        </div>

        {/* 2. Notifications */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-heading font-semibold">Admin Alerts</h3>
              <p className="text-xs text-muted-foreground">Configure system event alerts for administrators.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {[
              { label: "New Professional Registration", defaultChecked: true },
              { label: "New Report Submitted", defaultChecked: true },
              { label: "Verification Request Submitted", defaultChecked: true },
              { label: "Booking Cancellation Request", defaultChecked: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-1">
                <Label className="font-normal text-sm">{item.label}</Label>
                <Switch defaultChecked={item.defaultChecked} />
              </div>
            ))}
          </div>
        </div>

        {/* 3. Security & Access */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-heading font-semibold">Security & Access</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Limit Login Attempts</Label>
              <Input type="number" defaultValue="5" />
            </div>
            <div className="space-y-2">
              <Label>Auto-logout Inactivity (Mins)</Label>
              <Input type="number" defaultValue="60" />
            </div>
          </div>
        </div>

        {/* 4. Booking Rules (System Enforced) */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-heading font-semibold">Booking System Rules</h3>
              <p className="text-xs text-muted-foreground">Enforced platform-wide constraints.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Temporary Request Hold (Hours)</Label>
              <Input type="number" defaultValue="24" disabled title="Locked by system rules" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Modification Deadline (Days Before Event)</Label>
              <Input type="number" defaultValue="7" disabled title="Locked by system rules" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 border-t border-border/50 pt-4">
            <div className="flex items-center justify-between py-1">
              <Label className="font-normal text-sm">Allow Custom Package Requests</Label>
              <Switch defaultChecked={true} />
            </div>
            <div className="flex items-center justify-between py-1">
              <Label className="font-normal text-sm">Allow 50% Downpayment Option</Label>
              <Switch defaultChecked={true} />
            </div>
          </div>
        </div>

        {/* 5. Professional Verification Rules */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-heading font-semibold">Verification Controls</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-1">
              <Label className="font-normal text-sm text-muted-foreground">Manual Admin Approval Required</Label>
              <Switch defaultChecked={true} disabled title="Locked by system rules" />
            </div>
          </div>
          
          <div className="border-t border-border/50 pt-4 space-y-3">
            <Label className="font-semibold text-sm">Mandatory Verification Attachments</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Switch id="doc-gov" defaultChecked={true} disabled />
                <Label htmlFor="doc-gov" className="font-normal text-xs text-muted-foreground">Government ID</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="doc-selfie" defaultChecked={true} disabled />
                <Label htmlFor="doc-selfie" className="font-normal text-xs text-muted-foreground">Selfie w/ ID</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="doc-biz" defaultChecked={true} disabled />
                <Label htmlFor="doc-biz" className="font-normal text-xs text-muted-foreground">Business Permit (Studios)</Label>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Moderation & Data Rules */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-heading font-semibold">Moderation & Safety</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Max Evidence File Uploads</Label>
              <Input type="number" defaultValue="3" />
            </div>
            <div className="space-y-2">
              <Label>Max Attachment Size (MB)</Label>
              <Input type="number" defaultValue="5" />
            </div>
            <div className="space-y-2">
              <Label>Max Violations Before Ban</Label>
              <Input type="number" defaultValue="3" />
            </div>
          </div>
        </div>

      </div>

      {/* Maintenance Mode Confirmation Modal (With Typing Input) */}
      {pendingMaintenanceState !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md flex flex-col animate-in zoom-in-95 duration-200 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-500/10 text-amber-600 rounded-full flex items-center justify-center shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-heading">
                  {pendingMaintenanceState ? "Enable Maintenance Mode?" : "Disable Maintenance Mode?"}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {pendingMaintenanceState 
                    ? "Enabling maintenance mode will restrict access to all clients and professionals currently using the platform."
                    : "Disabling maintenance mode will restore public access to bookings and accounts."}
                </p>
              </div>
            </div>

            <div className="space-y-2 border-t border-border/50 pt-4">
              <Label className="text-xs font-semibold">
                To confirm, type <span className="font-mono text-destructive select-all">{CONFIRMATION_TEXT}</span> below:
              </Label>
              <Input 
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder="Type MAINTENANCE"
                className="font-mono text-sm"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setPendingMaintenanceState(null);
                  setConfirmationInput("");
                }}
              >
                Cancel
              </Button>
              <Button 
                variant={pendingMaintenanceState ? "destructive" : "default"}
                className="flex-1"
                disabled={confirmationInput !== CONFIRMATION_TEXT}
                onClick={confirmMaintenanceToggle}
              >
                Confirm State Change
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Global Save Confirmation Modal */}
      {isConfirmingSave && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-card border border-border/50 rounded-xl shadow-2xl w-full max-w-sm flex flex-col animate-in zoom-in-95 duration-200 p-6 space-y-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-1">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-heading">Save Changes?</h3>
              <p className="text-xs text-muted-foreground">
                Are you sure you want to apply these new configurations to the platform? This will affect all current users immediately.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                className="flex-1 text-sm"
                onClick={() => setIsConfirmingSave(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 gap-1.5 text-sm"
                onClick={handleSave}
              >
                <Check className="w-4 h-4" /> Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}