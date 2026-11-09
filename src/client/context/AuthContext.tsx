import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'vendor' | 'admin';
  campusId: string;
  vendorId?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  requestOtp: (email: string) => Promise<{ ok: boolean; demoCode?: string; message?: string; error?: string }>;
  verifyOtp: (email: string, code: string) => Promise<{ ok: boolean; user?: User; error?: string }>;
  loginAsDemo: (role: 'student' | 'vendor' | 'admin') => Promise<{ ok: boolean; user?: User; error?: string }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = (await res.json()) as any;
      if (res.ok && data.ok && data.user) {
        setUser(data.user);
      } else {
        setUser((prev) => (prev ? prev : null));
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

  const requestOtp = async (email: string) => {
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) {
        return { ok: false, error: data.error?.message || 'Failed to send OTP' };
      }
      return { ok: true, demoCode: data.demoCode, message: data.message };
    } catch {
      return { ok: false, error: 'Network error requesting OTP' };
    }
  };

  const verifyOtp = async (email: string, code: string) => {
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) {
        return { ok: false, error: data.error?.message || 'Invalid or expired OTP' };
      }
      setUser(data.user);
      return { ok: true, user: data.user };
    } catch {
      return { ok: false, error: 'Network error verifying OTP' };
    }
  };

  const loginAsDemo = async (role: 'student' | 'vendor' | 'admin') => {
    try {
      const res = await fetch(`/api/auth/demo/${role}`, {
        method: 'POST',
      });
      const data = (await res.json()) as any;
      if (!res.ok) {
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
        requestOtp,
        verifyOtp,
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
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
