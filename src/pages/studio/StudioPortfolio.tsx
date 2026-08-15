import { DashboardLayout } from "@/components/DashboardLayout";
import { Camera, Plus, Archive, AlertTriangle, X, GripVertical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { photographerPortfolioService as studioPortfolioService, type PortfolioImage } from "@/services/photographerPortfolioService";

const MIN_ACTIVE = 6;
const MAX_ACTIVE = 12;

export default function StudioPortfolio() {
  const [items, setItems] = useState<PortfolioImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [itemToArchive, setItemToArchive] = useState<PortfolioImage | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragIndex = useRef<number | null>(null);

  const loadPortfolio = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const all = await studioPortfolioService.list();
      const active = all
        .filter((img) => img.status === "active")
        .sort((a, b) => a.sort_order - b.sort_order);
      setItems(active);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load your portfolio.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, []);

  const triggerFileInput = () => {
    if (items.length >= MAX_ACTIVE) {
      toast.error(`Portfolio limit reached (${MAX_ACTIVE} items max).`);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsUploading(true);
    try {
      const newItem = await studioPortfolioService.upload(file);
      setItems((prev) => [...prev, newItem]);
      toast.success("Photo added to your portfolio.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleArchiveClick = (item: PortfolioImage) => {
    if (items.length <= MIN_ACTIVE) {
      toast.error(`You must maintain a minimum of ${MIN_ACTIVE} portfolio images.`);
      return;
    }
    setItemToArchive(item);
  };

  const confirmArchive = async () => {
    if (!itemToArchive) return;
    const target = itemToArchive;
    setItemToArchive(null);

    try {
      await studioPortfolioService.archive(target.id);
      setItems((prev) => prev.filter((i) => i.id !== target.id));
      toast.success("Photo moved to Safe Archive.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not archive this photo.");
    }
  };

  // Persists the current on-screen order to the backend.
  const persistOrder = async (ordered: PortfolioImage[]) => {
    setIsSavingOrder(true);
    try {
      await studioPortfolioService.reorder(ordered.map((i) => i.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the new order.");
      // Revert to the server's actual order if the save failed.
      loadPortfolio();
    } finally {
      setIsSavingOrder(false);
    }
  };

  const swapItems = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) return;
    const reordered = [...items];
    [reordered[fromIndex], reordered[toIndex]] = [reordered[toIndex], reordered[fromIndex]];
    setItems(reordered);
    persistOrder(reordered);
  };

  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dropIndex: number) => {
    const fromIndex = dragIndex.current;
    dragIndex.current = null;
    if (fromIndex === null || fromIndex === dropIndex) return;
    swapItems(fromIndex, dropIndex);
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
            <p className="text-muted-foreground mt-1">
              Manage your active portfolio display ({MIN_ACTIVE} to {MAX_ACTIVE} items). Drag a photo to reorder — this is the order clients see on your public profile.
            </p>
          </div>
          <Button onClick={triggerFileInput} disabled={items.length >= MAX_ACTIVE || isUploading}>
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Add Grid Photo ({items.length}/{MAX_ACTIVE})
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading your portfolio…
          </div>
        )}

        {!isLoading && loadError && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <Button variant="outline" onClick={loadPortfolio}>Try again</Button>
          </div>
        )}

        {!isLoading && !loadError && (
          <>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 h-4">
              {isSavingOrder && (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving new order…
                </>
              )}
            </p>

            {/* Dynamic Grid Layout */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                  className="group relative aspect-square rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-border/50 overflow-hidden hover:card-shadow-hover transition-all duration-200 flex items-center justify-center bg-muted/20 cursor-grab active:cursor-grabbing"
                >
                  {item.url ? (
                    <img
                      src={item.url}
                      alt={`Portfolio item ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      draggable={false}
                    />
                  ) : (
                    <Camera className="w-10 h-10 text-muted-foreground/20" />
                  )}

                  {/* Drag handle indicator */}
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-black/50 rounded-md p-1">
                    <GripVertical className="w-4 h-4 text-white" />
                  </div>

                  {/* Order position badge */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-black/50 rounded-full px-2 py-0.5">
                    <span className="text-[10px] font-medium text-white">#{index + 1}</span>
                  </div>

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8 shadow-md"
                      onClick={() => handleArchiveClick(item)}
                      title="Move to Safe Archive"
                    >
                      <Archive className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Archive Confirmation Modal */}
      {itemToArchive !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-card border border-border/50 rounded-xl shadow-lg max-w-md w-full p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Move to Safe Archive?</h3>
                  <p className="text-sm text-muted-foreground">Remove this photo from your active showcase.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2" onClick={() => setItemToArchive(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              This photo will move to your Safe Archive — it won't show on your public profile, but you can restore it later. Your active portfolio must always keep at least {MIN_ACTIVE} images.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setItemToArchive(null)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmArchive}>Yes, Archive It</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
