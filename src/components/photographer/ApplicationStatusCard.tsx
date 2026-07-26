import { Link } from "react-router-dom";
import { Clock, CheckCircle2, FileEdit, AlertTriangle, ShieldAlert, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ApplicationStatusValue = "pending_review" | "revision_requested" | "rejected";

export type ApplicationStatusCardProps = {
  status: ApplicationStatusValue;
  name: string;
  email: string;
  businessName: string;
  submittedAt: string | null;
  revisionNotes: string | null;
  rejectionReason: string | null;
  /** Omit to hide the "switch account" action (e.g. when reached via a protected route, not the login form). */
  onSwitchAccount?: () => void;
};

export function ApplicationStatusCard({
  status, name, email, businessName, submittedAt, revisionNotes, rejectionReason, onSwitchAccount,
}: ApplicationStatusCardProps) {
  if (status === "pending_review") {
    return (
      <div className="space-y-6">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center">
          <Clock className="w-7 h-7 text-amber-600 dark:text-amber-400 animate-pulse" />
        </div>
        <div>
          <h2 className="text-2xl font-heading font-bold mb-1">Review in progress</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Hi <span className="font-semibold text-foreground">{name}</span>, your application for{" "}
            <strong className="text-foreground">{businessName}</strong> is currently being verified.
          </p>
        </div>
        <div className="p-4 border border-border bg-muted/30 rounded-xl space-y-2.5 text-xs">
          <div className="flex justify-between items-center border-b border-border/60 pb-2">
            <span className="text-muted-foreground">Application Status</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              Pending Review
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Submitted on</span>
            <span className="font-medium">
              {submittedAt ? new Date(submittedAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—"}
            </span>
          </div>
        </div>
        <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 text-[11px] text-muted-foreground leading-relaxed flex gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span>
            Administrators are reviewing your government ID and credentials. You will receive an email
            confirmation at <strong>{email}</strong> as soon as your account is approved!
          </span>
        </div>
        <div className="space-y-2.5 pt-2">
          {onSwitchAccount && (
            <Button variant="outline" className="w-full text-xs gap-2" onClick={onSwitchAccount}>
              <RefreshCw className="w-3.5 h-3.5" /> Sign in as a different user
            </Button>
          )}
          <Button asChild className="w-full">
            <Link to="/">Go back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (status === "revision_requested") {
    return (
      <div className="space-y-6">
        <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center">
          <FileEdit className="w-7 h-7 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-heading font-bold mb-1">Revision Requested</h2>
          <p className="text-muted-foreground text-sm">
            The Administrator reviewed your application for{" "}
            <span className="font-semibold text-foreground">{businessName}</span> and requested corrections
            before approval.
          </p>
        </div>
        <div className="p-4 border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl space-y-2 text-xs">
          <h4 className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-blue-600" /> Action Required:
          </h4>
          <p className="text-muted-foreground leading-relaxed italic">
            "{revisionNotes || "Please re-upload a clearer copy of your Government ID and verify your social media links."}"
          </p>
        </div>
        <div className="space-y-2.5 pt-2">
          <Button asChild className="w-full">
            <Link to={`/register?edit=true&email=${email}`}>
              Update Application & Resubmit <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          {onSwitchAccount && (
            <Button variant="outline" className="w-full text-xs" onClick={onSwitchAccount}>
              Sign in as a different user
            </Button>
          )}
        </div>
      </div>
    );
  }

  // status === "rejected"
  return (
    <div className="space-y-6">
      <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
        <ShieldAlert className="w-7 h-7 text-destructive" />
      </div>
      <div>
        <h2 className="text-2xl font-heading font-bold mb-1 text-destructive">Application Unsuccessful</h2>
        <p className="text-muted-foreground text-sm">
          We reviewed your credentials for <span className="font-semibold text-foreground">{businessName}</span>,
          but unfortunately, it was rejected.
        </p>
      </div>
      <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-xl space-y-2 text-xs">
        <h4 className="font-semibold text-destructive flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> Feedback from Admin:
        </h4>
        <p className="text-muted-foreground leading-relaxed italic">
          "{rejectionReason || "Your uploaded verification documents could not be verified."}"
        </p>
      </div>
      <div className="space-y-2.5 pt-2">
        <Button asChild className="w-full" variant="destructive">
          <Link to={`/register?retry=true&email=${email}`}>
            Submit New Application <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
        {onSwitchAccount && (
          <Button variant="outline" className="w-full text-xs" onClick={onSwitchAccount}>
            Try signing into another account
          </Button>
        )}
      </div>
    </div>
  );
}