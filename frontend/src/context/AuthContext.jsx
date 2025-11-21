// src/context/AuthContext.jsx
// -------------------------------------------------------------
// Central authentication provider for the Omics Platform.
// Handles:
// - Fetching authenticated user (/api/auth/me/)
// - Login (/api/auth/login/)
// - Logout (/api/auth/logout/)
// - CSRF cookie management
// - Safe handling of backend errors (500/403)
// -------------------------------------------------------------

import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

// -------------------------------------------------------------
// Helper: Extract CSRF token from cookie
// -------------------------------------------------------------
function getCsrfToken() {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // -----------------------------------------------------------
  // Fetch current user from backend
  // -----------------------------------------------------------
  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me/", {
        credentials: "include",
      });

      if (!res.ok) {
        setUser(null);
        return;
      }

      const data = await res.json();

      // Backend sometimes returns { detail: "Not authenticated" }
      if (!data || data.detail) {
        setUser(null);
        return;
      }

      setUser(data);
    } catch {
      setUser(null);
    }
  };

  // -----------------------------------------------------------
  // Initial load
  // -----------------------------------------------------------
  useEffect(() => {
    async function init() {
      await fetchUser();
      setInitializing(false);
    }
    init();
  }, []);

  // -----------------------------------------------------------
  // Login handler
  // -----------------------------------------------------------
  const login = async (username, password) => {
    const csrf = getCsrfToken();

    const res = await fetch("/api/auth/login/", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRFToken": csrf } : {}),
      },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Login failed:", text);
      throw new Error("Login failed");
    }

    await fetchUser();
  };

  // -----------------------------------------------------------
  // Logout handler
  // -----------------------------------------------------------
  const logout = async () => {
    const csrf = getCsrfToken();

    await fetch("/api/auth/logout/", {
      method: "POST",
      credentials: "include",
      headers: csrf ? { "X-CSRFToken": csrf } : {},
    });

    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook for all components
export function useAuth() {
  return useContext(AuthContext);
}
