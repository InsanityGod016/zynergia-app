import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { clearLocalSupabaseSession, supabase } from '@/lib/supabaseClient';
import { clearRememberedPasswordRecovery } from '@/lib/passwordRecovery';
import { queryClientInstance } from '@/lib/query-client';
import { cancelZynergiaNotifications, switchNotificationIdentity } from '@/lib/localNotifications';
import { disconnectPushIdentity } from '@/lib/pushNotifications';

const AuthContext = createContext(null);

function clearScopedClientState(userId) {
  localStorage.removeItem('zynergia_sale_draft_v1');
  sessionStorage.removeItem('zynergia:new-task-draft:v1');
  sessionStorage.removeItem('zynergia_checkout_idempotency');
  sessionStorage.removeItem('zynergia_verification_email');
  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index);
    if (key?.startsWith('zynergia:message-draft:')) sessionStorage.removeItem(key);
  }
  if (userId) {
    localStorage.removeItem(`zynergia_onboarding_draft_${userId}`);
    sessionStorage.removeItem(`zynergia_delete_operation_${userId}`);
    sessionStorage.removeItem(`zynergia_qr_draft_v1_${userId}`);
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const activeUserId = useRef(null);
  const pushIdentityQueue = useRef(Promise.resolve());

  useEffect(() => {
    let sawAuthEvent = false;
    const applySession = nextSession => {
      const nextUserId = nextSession?.user?.id || null;
      const previousUserId = activeUserId.current;
      if (previousUserId !== nextUserId) {
        switchNotificationIdentity(nextUserId).catch(() => {});
        pushIdentityQueue.current = pushIdentityQueue.current
          .catch(() => {})
          .then(async () => {
            if (previousUserId) await disconnectPushIdentity();
          })
          .catch(() => {});
      }
      if (previousUserId && previousUserId !== nextUserId) {
        queryClientInstance.clear();
        clearScopedClientState(previousUserId);
      }
      activeUserId.current = nextUserId;
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setIsAuthenticated(Boolean(nextSession?.user));
      setIsLoadingAuth(false);
    };

    // Read existing session on mount (reads from localStorage, no network request)
    supabase.auth.getSession().then(
      ({ data: { session } }) => {
        if (!sawAuthEvent) applySession(session);
      },
      () => {
        if (!sawAuthEvent) applySession(null);
      },
    );

    // Listen for sign-in / sign-out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      sawAuthEvent = true;
      applySession(session);
      if (session?.user?.id) {
        // Update last_active
        supabase.from('settings')
          .update({ last_active: new Date().toISOString() })
          .eq('user_id', session.user.id)
          .then(() => {}, () => {});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    clearRememberedPasswordRecovery();
    clearScopedClientState(activeUserId.current);
    queryClientInstance.clear();
    await switchNotificationIdentity(null).catch(() => {});
    await cancelZynergiaNotifications().catch(() => {});
    pushIdentityQueue.current = pushIdentityQueue.current
      .catch(() => {})
      .then(() => disconnectPushIdentity())
      .catch(() => {});
    await pushIdentityQueue.current;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('[Auth] Remote sign-out failed; clearing this device session.');
        clearLocalSupabaseSession();
      }
    } catch {
      console.warn('[Auth] Remote sign-out was unreachable; clearing this device session.');
      clearLocalSupabaseSession();
    } finally {
      activeUserId.current = null;
      setSession(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
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
