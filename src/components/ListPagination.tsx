import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Client-side pagination over an already-fetched array.
 * - Resets to page 1 whenever `resetKey` changes (filters, search, tab...).
 * - Clamps the page if items disappear (e.g. a notification is marked read
 *   while viewing the "Unread" tab).
 */
export function usePagination<T>(items: T[], pageSize: number, resetKey?: unknown) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );

  return {
    page: safePage,
    setPage,
    totalPages,
    total,
    pageSize,
    pageItems,
    start: total === 0 ? 0 : (safePage - 1) * pageSize + 1,
    end: Math.min(safePage * pageSize, total),
  };
}

type PaginationState = Pick<
  ReturnType<typeof usePagination>,
  "page" | "setPage" | "totalPages" | "total" | "pageSize" | "start" | "end"
>;

/** Compact pager. Renders nothing when everything fits on one page. */
export function Pagination({
  pagination,
  className,
  extra,
}: {
  pagination: PaginationState;
  className?: string;
  /** Optional trailing node, e.g. a "Load older" button. */
  extra?: ReactNode;
}) {
  const { page, setPage, totalPages, total, pageSize, start, end } = pagination;
  if (total <= pageSize && !extra) return null;

  return (
    <div className={cn("flex items-center justify-between gap-3 flex-wrap pt-1", className)}>
      <p className="text-xs text-muted-foreground">
        {total > 0 ? `Showing ${start}–${end} of ${total}` : "No records"}
      </p>
      <div className="flex items-center gap-1.5">
        {extra}
        {totalPages > 1 && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-medium text-muted-foreground px-1.5 tabular-nums">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export interface PillTab<K extends string> {
  key: K;
  label: string;
  count?: number;
}

/** Segmented pill tabs: tinted track, white active pill with brand-colored text. Matches ReportingNav. */
export function PillTabs<K extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: PillTab<K>[];
  value: K;
  onChange: (key: K) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn("inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/50 p-1 max-w-full overflow-x-auto", className)}
    >
      {tabs.map((t) => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold px-4 py-1.5 rounded-full transition-colors",
              active ? "bg-card text-primary shadow-sm" : "text-primary/60 hover:text-primary"
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={cn(
                  "min-w-[1.25rem] px-1.5 rounded-full text-[10px] leading-5 text-center tabular-nums",
                  active ? "bg-primary/10 text-primary" : "bg-primary/10 text-primary/70"
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
