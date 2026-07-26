// src/lib/pendingApprovals.ts

export interface Application {
  id: string;
  role: "freelancer" | "studio";
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  name: string;
  email: string;
  businessName: string;
  rejectionReason?: string;
}

// 1. Retrieves all applications from LocalStorage
export function getApplications(): Application[] {
  const data = localStorage.getItem("bulan_pending_approvals");
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// 2. Used by AdminVerifications.tsx to list incoming sign-ups
export function listApplications(): Application[] {
  return getApplications();
}

// 3. Used by Register.tsx to submit a new sign-up
export function saveApplication(app: Application) {
  const existing = getApplications();
  
  // Prevent duplicate emails in the queue
  const filtered = existing.filter(item => item.email.toLowerCase() !== app.email.toLowerCase());
  filtered.push(app);
  
  localStorage.setItem("bulan_pending_approvals", JSON.stringify(filtered));
}

// 4. Used by Login.tsx to block pending/rejected users and show status
export function getApplicationByEmail(email: string): Application | null {
  const apps = getApplications();
  return apps.find((app) => app.email.toLowerCase() === email.toLowerCase()) || null;
}

// 5. Added for AdminVerifications.tsx (Fixes the new white screen!)
// This lets admins approve or reject applications and save the result.
export function updateApplicationStatus(
  id: string, 
  status: "pending" | "approved" | "rejected", 
  rejectionReason?: string
) {
  const apps = getApplications();
  
  const updatedApps = apps.map((app) => {
    // We match by ID, but fall back to Email just in case your mock data used emails as IDs
    if (app.id === id || app.email === id) {
      return { 
        ...app, 
        status, 
        rejectionReason: status === "rejected" ? rejectionReason : undefined 
      };
    }
    return app;
  });

  localStorage.setItem("bulan_pending_approvals", JSON.stringify(updatedApps));
}