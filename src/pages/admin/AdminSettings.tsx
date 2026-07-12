import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Settings, Globe, Bell, Shield, Database } from "lucide-react";

export default function AdminSettings() {
  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-up">
        <div>
          <h1 className="text-2xl font-heading font-bold">Platform Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your platform configuration and preferences.</p>
        </div>

        {/* General Settings */}
        <div className="bg-card rounded-2xl card-shadow border border-border/50 p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-heading font-semibold">General</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Platform Name</Label>
              <Input defaultValue="SnapBook" />
            </div>
            <div className="space-y-2">
              <Label>Support Email</Label>
              <Input defaultValue="support@snapbook.com" />
            </div>
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Input defaultValue="PHP" />
            </div>
            <div className="space-y-2">
              <Label>Time Zone</Label>
              <Input defaultValue="Asia/Manila (GMT+8)" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Platform Description</Label>
            <Textarea defaultValue="SnapBook connects clients with professional photographers — studios and freelancers — for seamless booking and management." rows={3} />
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-card rounded-2xl card-shadow border border-border/50 p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-heading font-semibold">Notifications</h3>
          </div>

          <div className="space-y-4">
            {[
              { label: "Email notifications for new bookings", defaultChecked: true },
              { label: "Email notifications for new user registrations", defaultChecked: true },
              { label: "Email notifications for payment confirmations", defaultChecked: false },
              { label: "SMS alerts for urgent matters", defaultChecked: false },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2">
                <Label className="font-normal text-sm">{item.label}</Label>
                <Switch defaultChecked={item.defaultChecked} />
              </div>
            ))}
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-card rounded-2xl card-shadow border border-border/50 p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-heading font-semibold">Security</h3>
          </div>

          <div className="space-y-4">
            {[
              { label: "Require email verification for new users", defaultChecked: true },
              { label: "Enable two-factor authentication", defaultChecked: false },
              { label: "Auto-suspend accounts after 3 failed login attempts", defaultChecked: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2">
                <Label className="font-normal text-sm">{item.label}</Label>
                <Switch defaultChecked={item.defaultChecked} />
              </div>
            ))}
          </div>
        </div>

        {/* Booking Settings */}
        <div className="bg-card rounded-2xl card-shadow border border-border/50 p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-heading font-semibold">Booking Defaults</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max booking lead time (days)</Label>
              <Input type="number" defaultValue="90" />
            </div>
            <div className="space-y-2">
              <Label>Cancellation window (hours)</Label>
              <Input type="number" defaultValue="48" />
            </div>
          </div>

          <div className="space-y-4">
            {[
              { label: "Auto-confirm bookings from verified clients", defaultChecked: false },
              { label: "Allow same-day bookings", defaultChecked: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2">
                <Label className="font-normal text-sm">{item.label}</Label>
                <Switch defaultChecked={item.defaultChecked} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button size="lg" className="rounded-xl px-8">Save Changes</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
