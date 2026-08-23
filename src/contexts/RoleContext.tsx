import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import api from "@/lib/api";
import { AUTH_TOKEN_KEY } from "@/config/env";

export type AccountType = "client" | "photographer" | "administrator";
export type AccountStatus = "active" | "suspended" | "deactivated";
export type ApplicationStatus = "draft" | "pending_review" | "revision_requested" | "approved" | "rejected";
export type PhotographerType = "freelancer" | "studio";

// Coarse role kept for backward compatibility with existing route guards.
// Both freelancer and studio photographers currently share the "studio" dashboard route.
export type Role = "client" | "studio" | "admin";

export type PhotographerApplicationInfo = {
  status: ApplicationStatus;
  photographerType: PhotographerType;
  businessName: string | null;
  submittedAt: string | null;
  revisionNotes: string | null;
  rejectionReason: string | null;
};

export type User = {
  id: string;
  name: string;
  email: string;
  accountType: AccountType;
  accountStatus: AccountStatus;
  role: Role;
  application: PhotographerApplicationInfo | null;
  profilePhotoUrl: string | null;
};

type RoleContextType = {
  user: User | null;
  role: Role | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  setUserFromRegistration: (rawUser: any, token?: string) => Promise<void>;
  logout: () => void;
  refreshApplication: () => Promise<void>;
  refreshProfilePhoto: (url: string | null) => void;
  // One-shot flag consumed by ProtectedRoute so it can tell "user just clicked
  // Logout" apart from "unauthenticated visitor hit a guarded route" — the two
  // cases were both showing an auth toast on top of the logout success toast.
  consumeJustLoggedOut: () => boolean;
};



const RoleContext = createContext<RoleContextType | undefined>(undefined);
const USER_STORAGE_KEY = "app_user";

export const getRoleDashboardPath = (role: string) => {
  if (role === "admin") return "/admin";
  if (role === "studio") return "/studio";
  return "/dashboard";
};

/** Status-aware post-login/post-registration destination. Prefer this over getRoleDashboardPath. */
export const getPostLoginPath = (user: User): string => {
  if (user.accountType === "administrator") return "/admin";
  if (user.accountType === "client") return "/dashboard";

  // photographer
  const status = user.application?.status;
  if (status === "approved") return "/studio";
  if (!status || status === "draft") return "/register?continue=true";
  return "/photographer/status"; // pending_review, revision_requested, rejected
};

function deriveRole(accountType: AccountType): Role {
  if (accountType === "administrator") return "admin";
  if (accountType === "photographer") return "studio";
  return "client";
}

async function fetchApplication(): Promise<PhotographerApplicationInfo | null> {
  try {
    const res = await api.get("/photographer/application");
    const app = res.data?.data ?? res.data;
    if (!app) return null;
    return {
      status: app.status,
      photographerType: app.photographer_type,
      businessName: app.business_name ?? null,
      submittedAt: app.submitted_at ?? null,
      revisionNotes: app.revision_notes ?? null,
      rejectionReason: app.rejection_reason ?? null,
    };
  } catch {
    return null;
  }
}

async function fetchProfilePhoto(accountType: AccountType): Promise<string | null> {
  try {
    const path = accountType === "photographer" ? "/photographer/profile" : "/client/profile";
    const res = await api.get(path);
    const profile = res.data?.data ?? res.data;
    return profile?.profile_photo_url ?? null;
  } catch {
    return null;
  }
}

async function buildUser(rawUser: any): Promise<User> {
  const accountType = rawUser.account_type as AccountType;
  const application = accountType === "photographer" ? await fetchApplication() : null;
  const profilePhotoUrl = accountType !== "administrator" ? await fetchProfilePhoto(accountType) : null;

  return {
    id: String(rawUser.id),
    name: rawUser.name,
    email: rawUser.email,
    accountType,
    accountStatus: rawUser.account_status as AccountStatus,
    role: deriveRole(accountType),
    application,
    profilePhotoUrl,
  };
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const justLoggedOutRef = useRef(false);

  // On app load: if a token exists, ask the backend who we are (source of truth),
  // rather than trusting whatever was last cached in localStorage.
  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.get("/auth/me");
        const rawUser = res.data?.data ?? res.data;
        const nextUser = await buildUser(rawUser);
        setUser(nextUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
      } catch {
        // Token invalid/expired/account no longer active — clear stale session
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    // Throws on invalid credentials OR suspended/deactivated account —
    // the backend enforces this in AuthController::login before issuing a token.
    const res = await api.post("/auth/login", { email, password });
    const payload = res.data?.data ?? res.data;

    localStorage.setItem(AUTH_TOKEN_KEY, payload.token);

    const nextUser = await buildUser(payload.user);
    setUser(nextUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    return nextUser;
  };

  const logout = () => {
    justLoggedOutRef.current = true;
    api.post("/auth/logout").catch(() => {});
    setUser(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  const consumeJustLoggedOut = () => {
    const wasJustLoggedOut = justLoggedOutRef.current;
    justLoggedOutRef.current = false;
    return wasJustLoggedOut;
  };

  // Takes the raw backend user object (as returned by UserResource) plus the
  // token issued at registration, and builds a full User the same way login() does —
  // so freshly registered accounts get accountType/accountStatus/application populated
  // instead of a partial object.
  const setUserFromRegistration = async (rawUser: any, token?: string) => {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    }
    const nextUser = await buildUser(rawUser);
    setUser(nextUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
  };

  const refreshApplication = async () => {
    if (!user || user.accountType !== "photographer") return;
    const application = await fetchApplication();
    const nextUser = { ...user, application };
    setUser(nextUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
  };

  const refreshProfilePhoto = (url: string | null) => {
    if (!user) return;
    const nextUser = { ...user, profilePhotoUrl: url };
    setUser(nextUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
  };

  return (
    <RoleContext.Provider
      value={{ user, role: user?.role || null, isLoading, login, setUserFromRegistration, logout, refreshApplication, refreshProfilePhoto, consumeJustLoggedOut }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) throw new Error("useRole must be used within a RoleProvider");
  return context;
};