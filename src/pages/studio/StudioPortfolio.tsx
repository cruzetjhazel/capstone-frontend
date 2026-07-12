import { DashboardLayout } from "@/components/DashboardLayout";
import { Camera, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const portfolio = Array.from({ length: 9 }, (_, i) => ({
  id: i,
  title: ["Wedding at Sunset", "Downtown Portrait", "Corporate Headshots", "Beach Engagement", "Studio Fashion", "Outdoor Family", "Product Flat Lay", "Event Coverage", "Artistic Portrait"][i],
  category: ["Wedding", "Portrait", "Corporate", "Engagement", "Fashion", "Family", "Product", "Event", "Portrait"][i],
}));

export default function StudioPortfolio() {
  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold">Portfolio</h1>
            <p className="text-muted-foreground mt-1">Manage your showcase gallery</p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" /> Add Photo
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {portfolio.map((item) => (
            <div key={item.id} className="group relative aspect-[4/3] rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-border/50 overflow-hidden hover:card-shadow-hover transition-all duration-200 flex items-center justify-center">
              <Camera className="w-10 h-10 text-muted-foreground/20" />
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-foreground/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <p className="text-sm font-medium text-card">{item.title}</p>
                <p className="text-xs text-card/70">{item.category}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
