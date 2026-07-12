import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { featuredService } from "@/services/featuredService";
import type { PublicProfile } from "@/services/photographerService";

export default function AdminFeatured() {
  const [studios, setStudios] = useState<PublicProfile[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      featuredService.listAvailableStudios() as Promise<PublicProfile[]>,
      featuredService.listFeaturedIds(),
    ]).then(([available, ids]) => {
      setStudios(available);
      setSelected(ids);
    }).finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 10),
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      await featuredService.updateFeaturedIds(selected);
      toast.success("Featured studios updated.");
    } catch {
      toast.error("Failed to update featured studios.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">Featured Studios</h1>
            <p className="text-sm text-muted-foreground">
              Choose which approved studios appear on the homepage. Only admin can edit this list.
            </p>
          </div>
        </div>

        <div className="bg-card rounded-2xl card-shadow border border-border/50 divide-y divide-border">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading studios…</p>
          ) : studios.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No approved studios yet. Approve studio applications first.
            </p>
          ) : (
            studios.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <Checkbox
                  checked={selected.includes(s.id)}
                  onCheckedChange={() => toggle(s.id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.specialty} · {s.location}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="w-3 h-3 fill-accent text-accent" />
                  {s.rating}
                </div>
              </label>
            ))
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{selected.length} studio(s) featured</p>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? "Saving…" : "Save Featured List"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
