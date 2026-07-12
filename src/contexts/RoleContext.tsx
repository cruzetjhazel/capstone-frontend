import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { authService } from "@/services/authService";
import type { ApiUser, UserRole } from "@/api/types/auth";

export type { UserRole };

export interface RoleUser {
  id: string | number;
  name: string;
  email: string;
  initials: string;
  role: UserRole;
}

function toRoleUser(user: ApiUser): RoleUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    initials: user.initials ?? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
  };
}

interface RoleContextType {
  user: RoleUser | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<RoleUser>;
  loginAsRole: (role: UserRole) => void;
  logout: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType>({
  user: null,
  role: null,
  isLoading: true,
  login: async () => ({} as RoleUser),
  loginAsRole: () => {},
  logout: async () => {},
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<RoleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authService.fetchCurrentUser()
      .then((u) => setUser(u ? toRoleUser(u) : null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<RoleUser> => {
    const { user: apiUser } = await authService.login(email, password);
    const roleUser = toRoleUser(apiUser);
    setUser(roleUser);
    return roleUser;
  }, []);

  /** Legacy mock login used by Register client flow — no UI change required. */
  const loginAsRole = useCallback((role: UserRole) => {
    const demos: Record<UserRole, RoleUser> = {
      admin: { id: 4, name: "Alex Admin", email: "admin@example.com", initials: "AA", role: "admin" },
      client: { id: 1, name: "Jane Client", email: "client@example.com", initials: "JC", role: "client" },
      studio: { id: 3, name: "HH Production", email: "studio@example.com", initials: "HH", role: "studio" },
      freelancer: { id: 2, name: "Marco Villanueva", email: "freelancer@example.com", initials: "MV", role: "freelancer" },
    };
    setUser(demos[role]);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  return (
    <RoleContext.Provider value={{ user, role: user?.role ?? null, isLoading, login, loginAsRole, logout }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}

export function getRoleDashboardPath(role: UserRole): string {
  switch (role) {
    case "admin": return "/admin";
    case "studio":
    case "freelancer": return "/studio";
    case "client": return "/dashboard";
  }
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case "admin": return "Admin";
    case "studio": return "Photography Studio";
    case "freelancer": return "Freelance Photographer";
    case "client": return "Client";
  }
}
