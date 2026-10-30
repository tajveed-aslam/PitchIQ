"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, getToken, setToken, type Allowance, type User } from "./api";

interface Session {
  user: User | null;
  allowance: Allowance | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<Session | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [allowance, setAllowance] = useState<Allowance | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setAllowance(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api<{ user: User; allowance: Allowance }>("/me");
      setUser(me.user);
      setAllowance(me.allowance);
    } catch {
      setUser(null);
      setAllowance(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (token: string) => {
      setToken(token);
      await refresh();
    },
    [refresh],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setAllowance(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, allowance, loading, refresh, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useSession(): Session {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useSession must be used inside AuthProvider");
  return ctx;
}

/** For pages behind login: sends visitors to /login and back here afterwards. */
export function useRequireUser(): Session {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!session.loading && !session.user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [session.loading, session.user, router, pathname]);
  return session;
}
