import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    // Read existing session on mount (reads from localStorage, no network request)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session?.user);
      setIsLoadingAuth(false);
    });

    // Listen for sign-in / sign-out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session?.user);
      setIsLoadingAuth(false);
      // Update last_active on login
      if (session?.user?.id) {
        supabase.from('settings')
          .update({ last_active: new Date().toISOString() })
          .eq('user_id', session.user.id)
          .then(() => {}).catch(() => {});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    if (user?.id) {
      localStorage.removeItem(`zynergia_onboarding_done_${user.id}`);
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
