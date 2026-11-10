import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'vendor' | 'admin';
  campusId: string;
  vendorId?: string | null;
}

export interface AuthProvidersInfo {
  demoMode: boolean;
  googleOAuthEnabled: boolean;
  mockGoogleEnabled: boolean;
  turnstileEnabled: boolean;
  turnstileSiteKey: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  providers: AuthProvidersInfo;
  requestOtp: (
    email: string,
    turnstileToken?: string
  ) => Promise<{ ok: boolean; demoCode?: string; message?: string; error?: string }>;
  verifyOtp: (
    email: string,
    code: string,
    turnstileToken?: string
  ) => Promise<{ ok: boolean; user?: User; error?: string }>;
  loginWithMockGoogle: (
    profile: { email: string; name: string },
    turnstileToken?: string
  ) => Promise<{ ok: boolean; user?: User; error?: string }>;
  loginAsDemo: (
    role: 'student' | 'vendor' | 'admin'
  ) => Promise<{ ok: boolean; user?: User; error?: string }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const DEFAULT_PROVIDERS: AuthProvidersInfo = {
  demoMode: true,
  googleOAuthEnabled: false,
  mockGoogleEnabled: true,
  turnstileEnabled: false,
  turnstileSiteKey: null,
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<AuthProvidersInfo>(DEFAULT_PROVIDERS);

  const fetchMe = useCallback(async () => {
    try {
      const [meRes, provRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/auth/providers').catch(() => null),
      ]);
      const data = (await meRes.json()) as { ok?: boolean; user?: User | null };
      if (meRes.ok && data.ok && data.user) {
        setUser(data.user);
      } else {
        setUser((prev) => (prev ? prev : null));
      }
      if (provRes && provRes.ok) {
        const provData = (await provRes.json()) as Partial<AuthProvidersInfo>;
        setProviders({
          demoMode: provData.demoMode ?? true,
          googleOAuthEnabled: provData.googleOAuthEnabled ?? false,
          mockGoogleEnabled: provData.mockGoogleEnabled ?? true,
          turnstileEnabled: provData.turnstileEnabled ?? false,
          turnstileSiteKey: provData.turnstileSiteKey ?? null,
        });
      }
    } catch {
      setUser((prev) => (prev ? prev : null));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const requestOtp = async (email: string, turnstileToken?: string) => {
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, turnstileToken }),
      });
      const data = (await res.json()) as {
        previewCode?: string;
        demoCode?: string;
        message?: string;
        error?: { message?: string };
      };
      if (!res.ok) {
        return { ok: false, error: data.error?.message || 'Failed to send OTP' };
      }
      return {
        ok: true,
        demoCode: data.previewCode ?? data.demoCode,
        message: data.message,
      };
    } catch {
      return { ok: false, error: 'Network error requesting OTP' };
    }
  };

  const verifyOtp = async (email: string, code: string, turnstileToken?: string) => {
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, turnstileToken }),
      });
      const data = (await res.json()) as { user?: User; error?: { message?: string } };
      if (!res.ok || !data.user) {
        return { ok: false, error: data.error?.message || 'Invalid or expired OTP' };
      }
      setUser(data.user);
      return { ok: true, user: data.user };
    } catch {
      return { ok: false, error: 'Network error verifying OTP' };
    }
  };

  const loginWithMockGoogle = async (
    profile: { email: string; name: string },
    turnstileToken?: string
  ) => {
    try {
      const res = await fetch('/api/auth/google/mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, turnstileToken }),
      });
      const data = (await res.json()) as { user?: User; error?: { message?: string } };
      if (!res.ok || !data.user) {
        return { ok: false, error: data.error?.message || 'Google sign-in failed' };
      }
      setUser(data.user);
      return { ok: true, user: data.user };
    } catch {
      return { ok: false, error: 'Network error during Google sign-in' };
    }
  };

  const loginAsDemo = async (role: 'student' | 'vendor' | 'admin') => {
    try {
      const res = await fetch(`/api/auth/demo/${role}`, {
        method: 'POST',
      });
      const data = (await res.json()) as { user?: User; error?: { message?: string } };
      if (!res.ok || !data.user) {
        return { ok: false, error: data.error?.message || 'Demo login failed' };
      }
      setUser(data.user);
      return { ok: true, user: data.user };
    } catch {
      return { ok: false, error: 'Network error in demo login' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  };

  const deleteAccount = async () => {
    try {
      const res = await fetch('/api/auth/delete-account', { method: 'DELETE' });
      if (res.ok) {
        setUser(null);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        providers,
        requestOtp,
        verifyOtp,
        loginWithMockGoogle,
        loginAsDemo,
        logout,
        deleteAccount,
        refreshUser: fetchMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
