import { Navigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import Logo from "@/components/Logo";
import { ApplicationStatusCard, ApplicationStatusValue } from "@/components/photographer/ApplicationStatusCard";

export default function ApplicationStatus() {
  const { user, isLoading, logout } = useRole();

  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.accountType !== "photographer") return <Navigate to="/" replace />;

  const application = user.application;

  // Persistent, backend-sourced status — not navigation state — so this page
  // renders correctly even after logout/login or a fresh browser session.
  if (!application || application.status === "draft") {
    return <Navigate to="/register?continue=true" replace />;
  }
  if (application.status === "approved") {
    return <Navigate to="/studio" replace />;
  }

  return (
    <div className="min-h-screen flex bg-white relative text-foreground">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-10">
            <Logo />
          </div>
          <ApplicationStatusCard
            status={application.status as ApplicationStatusValue}
            name={user.name}
            email={user.email}
            businessName={application.businessName || "your business"}
            submittedAt={application.submittedAt}
            revisionNotes={application.revisionNotes}
            rejectionReason={application.rejectionReason}
            onSwitchAccount={logout}
          />
        </div>
      </div>
    </div>
  );
}