// Re-export from service layer — keeps existing page imports working.
export {
  listApplications,
  saveApplication,
  updateApplicationStatus,
  type PendingApplication,
  type ApplicationStatus,
} from "@/services/applicationService";
