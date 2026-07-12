import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Camera, Plus, Trash2, PackageIcon as Pkg, Wand2, Sparkles } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { addOns as defaultAddOns, defaultCustomRates, formatPrice } from "@/data/photographers";
import { useToast } from "@/hooks/use-toast";

interface EditablePackage {
  name: string;
  price: number;
  description: string;
  inclusions: string;
}

const initialPackages: EditablePackage[] = [
  { name: "Basic", price: 3000, description: "Ideal for small intimate events", inclusions: "Up to 2 hours coverage\n50 edited photos\nOnline gallery\n1 photographer" },
  { name: "Standard", price: 7000, description: "Great for medium-sized celebrations", inclusions: "Up to 5 hours coverage\n200 edited photos\n2 photographers\nSame-day teaser" },
  { name: "Premium", price: 15000, description: "Full-day coverage for grand events", inclusions: "Full-day coverage\n500+ edited photos\n3 photographers\nPre-event shoot" },
];

export default function StudioSettings() {
  const { user } = useRole();
  const { toast } = useToast();
  const isFreelancer = user?.role === "studio" && user?.name && !user.name.toLowerCase().includes("studio");

  const [packages, setPackages] = useState<EditablePackage[]>(initialPackages);
  const [addonRows, setAddonRows] = useState(defaultAddOns.map((a) => ({ ...a, enabled: true })));
  const [rates, setRates] = useState(defaultCustomRates);

  const save = () => toast({ title: "Saved!", description: "Your changes have been updated." });

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-up">
        <div>
          <h1 className="text-2xl font-heading font-bold">{isFreelancer ? "Photographer" : "Studio"} Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your profile, packages, add-ons, and custom-package rates.</p>
        </div>

        {/* Profile */}
        <section className="bg-card rounded-xl card-shadow border border-border/50 p-6 space-y-6">
          <h3 className="font-heading font-semibold flex items-center gap-2"><Camera className="w-4 h-4 text-primary" /> Profile</h3>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <Button variant="outline" size="sm">Change Photo</Button>
              <p className="text-xs text-muted-foreground mt-1">JPG or PNG, max 2MB</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>{isFreelancer ? "Your Name" : "Studio Name"}</Label><Input defaultValue={user?.name || "Rivera Studio"} /></div>
            <div className="space-y-2"><Label>Contact Email</Label><Input defaultValue={user?.email} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input defaultValue="+63 9XX XXX XXXX" /></div>
            <div className="space-y-2"><Label>Location</Label><Input defaultValue="Bulan, Sorsogon" /></div>
          </div>
          <div className="space-y-2"><Label>Bio</Label><Textarea rows={3} defaultValue="Tell clients about your style and experience…" /></div>

          <div className="space-y-2">
            <Label>Specialties</Label>
            <div className="flex flex-wrap gap-2">
              {["Weddings", "Events", "Portraits", "Corporate"].map((s) => (
                <span key={s} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{s}</span>
              ))}
              <button className="px-3 py-1 rounded-full border border-dashed border-border text-xs text-muted-foreground hover:border-primary/30">+ Add</button>
            </div>
          </div>

          <Button onClick={save}>Save Profile</Button>
        </section>

        {/* Packages */}
        <section className="bg-card rounded-xl card-shadow border border-border/50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold flex items-center gap-2"><Pkg className="w-4 h-4 text-primary" /> Fixed Packages</h3>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPackages([...packages, { name: "New Package", price: 1000, description: "", inclusions: "" }])}>
              <Plus className="w-3.5 h-3.5" /> Add Package
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Clients can pick these directly during booking. Each line in "What's Included" becomes a bullet point.</p>

          {packages.map((pk, i) => (
            <div key={i} className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Input className="flex-1" placeholder="Package name" value={pk.name}
                  onChange={(e) => setPackages(packages.map((p, j) => j === i ? { ...p, name: e.target.value } : p))} />
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">₱</span>
                  <Input type="number" className="w-28" value={pk.price}
                    onChange={(e) => setPackages(packages.map((p, j) => j === i ? { ...p, price: Number(e.target.value) } : p))} />
                </div>
                <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => setPackages(packages.filter((_, j) => j !== i))}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <Input placeholder="Short description" value={pk.description}
                onChange={(e) => setPackages(packages.map((p, j) => j === i ? { ...p, description: e.target.value } : p))} />
              <Textarea rows={4} placeholder="What's included (one per line)" value={pk.inclusions}
                onChange={(e) => setPackages(packages.map((p, j) => j === i ? { ...p, inclusions: e.target.value } : p))} />
            </div>
          ))}

          <Button onClick={save}>Save Packages</Button>
        </section>

        {/* Add-ons */}
        <section className="bg-card rounded-xl card-shadow border border-border/50 p-6 space-y-4">
          <h3 className="font-heading font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Optional Add-ons</h3>
          <p className="text-xs text-muted-foreground">Toggle which extras clients can add to their booking and set your prices.</p>

          <div className="space-y-2">
            {addonRows.map((a, i) => (
              <div key={a.name} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                <Switch checked={a.enabled} onCheckedChange={(v) => setAddonRows(addonRows.map((r, j) => j === i ? { ...r, enabled: v } : r))} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{a.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.description}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-sm text-muted-foreground">₱</span>
                  <Input type="number" className="w-24" value={a.price}
                    onChange={(e) => setAddonRows(addonRows.map((r, j) => j === i ? { ...r, price: Number(e.target.value) } : r))} />
                </div>
              </div>
            ))}
          </div>

          <Button onClick={save}>Save Add-ons</Button>
        </section>

        {/* Custom Pricing rates */}
        <section className="bg-card rounded-xl card-shadow border border-border/50 p-6 space-y-4">
          <h3 className="font-heading font-semibold flex items-center gap-2"><Wand2 className="w-4 h-4 text-primary" /> Custom Package Rates</h3>
          <p className="text-xs text-muted-foreground">
            When clients use "Build Your Own", these are the rates they'll see. Each item adds to your base fee.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Base Fee (₱)</Label>
              <Input type="number" value={rates.baseFee} onChange={(e) => setRates({ ...rates, baseFee: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">RAW Files Add-on (₱)</Label>
              <Input type="number" value={rates.rawFiles} onChange={(e) => setRates({ ...rates, rawFiles: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Second Location (₱)</Label>
              <Input type="number" value={rates.secondLocation} onChange={(e) => setRates({ ...rates, secondLocation: Number(e.target.value) })} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Photo Tiers</Label>
            <div className="mt-2 space-y-2">
              {rates.photoTiers.map((t, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-border text-sm">
                  <span className="flex-1 text-muted-foreground">{t.label}</span>
                  <span className="text-xs text-muted-foreground">+₱</span>
                  <Input type="number" className="w-24 h-8" value={t.price}
                    onChange={(e) => setRates({
                      ...rates,
                      photoTiers: rates.photoTiers.map((p, j) => j === i ? { ...p, price: Number(e.target.value) } : p)
                    })} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Delivery Speed Tiers</Label>
            <div className="mt-2 space-y-2">
              {rates.deliveryTiers.map((t, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-border text-sm">
                  <span className="flex-1 text-muted-foreground">{t.label}</span>
                  <span className="text-xs text-muted-foreground">+₱</span>
                  <Input type="number" className="w-24 h-8" value={t.price}
                    onChange={(e) => setRates({
                      ...rates,
                      deliveryTiers: rates.deliveryTiers.map((p, j) => j === i ? { ...p, price: Number(e.target.value) } : p)
                    })} />
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/40 border border-border/50">
            Estimated minimum custom package: <strong className="text-foreground">{formatPrice(rates.baseFee)}</strong>
          </div>

          <Button onClick={save}>Save Pricing</Button>
        </section>
      </div>
    </DashboardLayout>
  );
}
