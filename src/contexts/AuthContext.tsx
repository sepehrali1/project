import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError, callFunction } from "../lib/api";
import { supabase } from "../lib/supabase";
import type { AuthUser, LoginResponse, MeResponse, RegisterResponse } from "../types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchMe(): Promise<AuthUser> {
  const res = await callFunction<MeResponse>("me", { method: "GET" });
  return res.user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session after a page refresh.
  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        if (active) setLoading(false);
        return;
      }
      try {
        const me = await fetchMe();
        if (!active) return;
        if (me.banned) {
          await supabase.auth.signOut();
          setUser(null);
        } else {
          setUser(me);
        }
      } catch (err) {
        // 401 = expired / revoked session; network errors keep the session for a retry.
        if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
          await supabase.auth.signOut();
        }
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    // Keep React state in sync when supabase-js signs out (expired refresh token, other tab, ban).
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setUser(null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await callFunction<LoginResponse>("login", {
      method: "POST",
      body: { email, password },
      authenticated: false,
    });
    // Hand the tokens to the Supabase client so database / storage calls use the same session
    // and the refresh token is renewed automatically.
    const { error } = await supabase.auth.setSession({
      access_token: res.access_token,
      refresh_token: res.refresh_token,
    });
    if (error) throw new ApiError("ایجاد نشست ناموفق بود. دوباره تلاش کنید.", 500);
    setUser(res.user);
  }, []);

  const register = useCallback(
    async (email: string, username: string, password: string) => {
      const res = await callFunction<RegisterResponse>("register", {
        method: "POST",
        body: { email, username, password },
        authenticated: false,
      });
      if (res.email_confirmation_required) {
        return { needsEmailConfirmation: true };
      }
      await login(email, password);
      return { needsEmailConfirmation: false };
    },
    [login]
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      setUser(await fetchMe());
    } catch {
      /* keep the current state */
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshUser }),
    [user, loading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth باید داخل AuthProvider استفاده شود");
  }
  return ctx;
}
