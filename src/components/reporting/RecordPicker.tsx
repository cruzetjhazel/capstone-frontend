import { useState } from "react";
import { Check, ChevronDown, Loader2, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface PickerOption {
  /** The real database id, sent to the API. Never shown to the user. */
  value: string;
  /** Recognizable name shown in the list and in the closed field. */
  label: string;
  /** Second line: date, status, amount, etc. */
  description?: string;
  /** Profile photo URL (only used when showAvatar is on). */
  avatarUrl?: string | null;
  /** Name used for the avatar initials (defaults to label). */
  avatarName?: string;
  /** Small status pill shown on the right. */
  badge?: string;
  badgeTone?: "success" | "warning" | "danger" | "neutral";
}

const BADGE_TONES = {
  success: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
  warning: "text-amber-600 bg-amber-500/10 border-amber-500/20",
  danger: "text-red-600 bg-red-500/10 border-red-500/20",
  neutral: "text-muted-foreground bg-muted border-border/50",
};

function PickerAvatar({ url, name, size = "sm" }: { url?: string | null; name: string; size?: "sm" | "md" }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-bold text-primary",
        size === "md" ? "h-9 w-9 text-xs" : "h-6 w-6 text-[10px]",
      )}
    >
      {url && !failed ? (
        <img src={url} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        initials || "?"
      )}
    </span>
  );
}

interface RecordPickerProps {
  selected: PickerOption | null;
  options: PickerOption[];
  onSelect: (option: PickerOption | null) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
  disabled?: boolean;
  /** Pass this to search on the server (e.g. photographers). Without it the list is filtered locally. */
  onSearchChange?: (query: string) => void;
  /** Show a profile avatar on the left of each option and the selected value. */
  showAvatar?: boolean;
}

export function RecordPicker({
  selected,
  options,
  onSelect,
  placeholder,
  searchPlaceholder = "Search...",
  emptyText = "Nothing found.",
  loading = false,
  disabled = false,
  onSearchChange,
  showAvatar = false,
}: RecordPickerProps) {
  const [open, setOpen] = useState(false);
  const serverSearch = !!onSearchChange;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onSearchChange?.("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:bg-muted"
        >
          <span className="flex min-w-0 items-center gap-2">
            {showAvatar && selected && <PickerAvatar url={selected.avatarUrl} name={selected.avatarName ?? selected.label} />}
            <span className={cn("truncate text-left", !selected && "text-muted-foreground")}>
              {selected ? selected.label : placeholder}
            </span>
          </span>
          <span className="flex items-center gap-1 shrink-0">
            {selected && !disabled && (
              <span
                role="button"
                aria-label="Clear selection"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(null);
                }}
                className="p-0.5 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="p-0 w-[var(--radix-popover-trigger-width)]">
        <Command shouldFilter={!serverSearch}>
          <CommandInput placeholder={searchPlaceholder} onValueChange={onSearchChange} />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </div>
            ) : (
              <>
                <CommandEmpty>{emptyText}</CommandEmpty>
                <CommandGroup>
                  {options.map((opt) => {
                    const isSelected = selected?.value === opt.value;
                    return (
                      <CommandItem
                        key={opt.value}
                        value={`${opt.label} ${opt.description ?? ""} #${opt.value}`}
                        onSelect={() => {
                          onSelect(opt);
                          setOpen(false);
                        }}
                        className="flex items-center gap-3 rounded-lg px-2.5 py-2 data-[selected=true]:bg-primary/10 data-[selected=true]:text-foreground"
                      >
                        {showAvatar && <PickerAvatar url={opt.avatarUrl} name={opt.avatarName ?? opt.label} size="md" />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{opt.label}</p>
                          {opt.description && (
                            <p className="truncate text-xs text-muted-foreground">{opt.description}</p>
                          )}
                        </div>
                        {opt.badge && (
                          <span
                            className={cn(
                              "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                              BADGE_TONES[opt.badgeTone ?? "neutral"],
                            )}
                          >
                            {opt.badge}
                          </span>
                        )}
                        <Check className={cn("h-4 w-4 shrink-0 text-primary", isSelected ? "opacity-100" : "opacity-0")} />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
