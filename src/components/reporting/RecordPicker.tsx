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
          <span className={cn("truncate text-left", !selected && "text-muted-foreground")}>
            {selected ? selected.label : placeholder}
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
                  {options.map((opt) => (
                    <CommandItem
                      key={opt.value}
                      value={`${opt.label} ${opt.description ?? ""} #${opt.value}`}
                      onSelect={() => {
                        onSelect(opt);
                        setOpen(false);
                      }}
                      className="flex items-start gap-2"
                    >
                      <Check
                        className={cn(
                          "w-4 h-4 mt-0.5 shrink-0 text-primary",
                          selected?.value === opt.value ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{opt.label}</p>
                        {opt.description && (
                          <p className="truncate text-xs text-muted-foreground">{opt.description}</p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
