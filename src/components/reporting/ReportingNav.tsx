import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { AlertTriangle, ClipboardList } from "lucide-react";

/**
 * Centralized role-aware routing for the shared reporting feature.
 * Keeping this in one place avoids re-deriving the same ternary
 * in every page that links into the flow.
 */
export function getReportRoute(role: string) {
  return role === "studio" ? "/studio/report-problem" : "/report-problem";
}

export function getReportsRoute(role: string) {
  return role === "studio" ? "/studio/reports" : "/reports";
}

interface ReportingNavProps {
  active: "report" | "reports";
}

/**
 * Small segmented control shown on both the "Report a Problem" and
 * "My Reports" pages so the two feel like one system, without adding
 * a second sidebar entry. Lives entirely inline in the page header.
 */
export function ReportingNav({ active }: ReportingNavProps) {
  const { role } = useRole();
  const navigate = useNavigate();

  const tabs = [
    {
      key: "report" as const,
      label: "Report a Problem",
      icon: AlertTriangle,
      onClick: () => navigate(getReportRoute(role)),
    },
    {
      key: "reports" as const,
      label: "My Reports",
      icon: ClipboardList,
      onClick: () => navigate(getReportsRoute(role)),
    },
  ];

  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted/50 border border-border/40 shrink-0 self-start">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={tab.onClick}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              isActive
                ? "bg-card text-primary border border-border/50 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
