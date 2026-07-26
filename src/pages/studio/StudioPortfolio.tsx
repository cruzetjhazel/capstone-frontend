import { DashboardLayout } from "@/components/DashboardLayout";
import { Camera, Plus, Trash2, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { toast } from "react-hot-toast";

interface PortfolioItem {
  id: number;
  title: string;
  category: string;
  imageUrl?: string;
}

// Initialized with 8 items to sit comfortably within the 6-12 required range
const initialPortfolio: PortfolioItem[] = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  title: [
    "Wedding at Sunset", "Downtown Portrait", "Corporate Headshots", "Beach Engagement",
    "Studio Fashion", "Outdoor Family", "Product Flat Lay", "Event Coverage"
  ][i] || `Gallery Item ${i + 1}`,
  category: ["Wedding", "Portrait", "Corporate", "Engagement", "Fashion", "Family", "Product", "Event"][i % 8],
}));

export default function StudioPortfolio() {
  const [items, setItems] = useState<PortfolioItem[]>(initialPortfolio);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDeleteClick = (id: number) => {
    // System prevents deletion if it reduces active portfolio below 6
    if (items.length <= 6) {
      toast.error("You must maintain a minimum of 6 portfolio images.");
      return;
    }
    setItemToDelete(id);
  };

  const confirmDelete = () => {
    if (itemToDelete === null) return;
    
    // Optional cleanup: If the deleted item has a blob URL, revoke it to free up memory
    const item = items.find(i => i.id === itemToDelete);
    if (item?.imageUrl && item.imageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(item.imageUrl);
    }

    setItems(items.filter(item => item.id !== itemToDelete));
    toast.success("Photo removed from portfolio.");
    setItemToDelete(null);
  };

  const triggerFileInput = () => {
    // System enforces a maximum of 12 active portfolio images
    if (items.length >= 12) {
      toast.error("Portfolio limit reached (12 items max).");
      return;
    }
    // Open the system file browser
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a temporary object URL to display the image visually in the browser memory
    const tempImageUrl = URL.createObjectURL(file);

    // Reset input so the same file can be selected again if needed
    e.target.value = "";

    const newItem: PortfolioItem = {
      id: Date.now(),
      title: file.name.split('.')[0] || "New Upload",
      category: "Uncategorized",
      imageUrl: tempImageUrl
    };
    
    // Add the new item at the beginning of the grid
    setItems([newItem, ...items]);
    toast.success(`"${newItem.title}" successfully added to portfolio!`);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-up">
        
        {/* Hidden File Input */}
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
        />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold">Portfolio Showcase</h1>
            <p className="text-muted-foreground mt-1">Manage your active portfolio display (6 to 12 items).</p>
          </div>
          <Button 
            onClick={triggerFileInput}
            disabled={items.length >= 12}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Grid Photo ({items.length}/12)
          </Button>
        </div>

        {/* Dynamic Grid Layout */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className="group relative aspect-square rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-border/50 overflow-hidden hover:card-shadow-hover transition-all duration-200 flex items-center justify-center bg-muted/20">
              
              {/* Display the uploaded image or fallback to the camera icon */}
              {item.imageUrl ? (
                <img 
                  src={item.imageUrl} 
                  alt={item.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <Camera className="w-10 h-10 text-muted-foreground/20" />
              )}
              
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Button 
                  variant="destructive" 
                  size="icon" 
                  className="h-8 w-8 shadow-md" 
                  onClick={() => handleDeleteClick(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Gradient Overlay for Text */}
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                <p className="text-sm font-medium text-white truncate drop-shadow-md">{item.title}</p>
                <p className="text-xs text-white/80 drop-shadow-md">{item.category}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {itemToDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-card border border-border/50 rounded-xl shadow-lg max-w-md w-full p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Delete Image?</h3>
                  <p className="text-sm text-muted-foreground">Remove this photo from your portfolio.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2" onClick={() => setItemToDelete(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Are you sure you want to remove this image? Your portfolio must always maintain at least 6 active images.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setItemToDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDelete}>Yes, Delete It</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}