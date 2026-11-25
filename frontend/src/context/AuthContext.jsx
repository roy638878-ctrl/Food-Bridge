import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/client";

const AuthContext = createContext(null);
const USER_CACHE_KEY = "foodbridge_user_cache";

function readCachedUser() {
  try {
    const raw = sessionStorage.getItem(USER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() =>
    localStorage.getItem("foodbridge_token") ? readCachedUser() : null
  );
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem("foodbridge_token")));

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("foodbridge_token");
    if (!token) {
      sessionStorage.removeItem(USER_CACHE_KEY);
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const profile = await apiRequest("/auth/me");
      setUser(profile);
      try {
        sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(profile));
      } catch {
        // ignore storage quota error
      }
    } catch {
      localStorage.removeItem("foodbridge_token");
      sessionStorage.removeItem(USER_CACHE_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const loginSuccess = useCallback(({ token, user: loggedInUser }) => {
    localStorage.setItem("foodbridge_token", token);
    try {
      sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(loggedInUser));
    } catch {
      // ignore storage quota error
    }
    setUser(loggedInUser);
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("foodbridge_token");
    sessionStorage.removeItem(USER_CACHE_KEY);
    setUser(null);
    setLoading(false);
  }, []);

  const value = useMemo(
    () => ({ user, loading, loginSuccess, logout, refreshUser }),
    [user, loading, loginSuccess, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
