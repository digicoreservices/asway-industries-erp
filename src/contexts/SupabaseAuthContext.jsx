import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { testSupabaseConnection } from '@/lib/supabaseConnectionTest';
import { withTimeout } from '@/lib/utils';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionState, setConnectionState] = useState('connecting');
  const [connectionError, setConnectionError] = useState(null);
  const [lastConnected, setLastConnected] = useState(null);

  const checkConnection = useCallback(async () => {
    setConnectionState('connecting');
    setConnectionError(null);
    const result = await testSupabaseConnection();
    
    if (result.success) {
      setConnectionState('connected');
      setLastConnected(new Date());
    } else {
      setConnectionState('error');
      setConnectionError(result.message);
    }
    return result;
  }, []);

  const delay = (ms) => new Promise(res => setTimeout(ms, res));

  const fetchSessionWithRetry = async (retries = 3) => {
    const delays = [1000, 2000, 4000];
    for (let i = 0; i < retries; i++) {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          10000,
          'Initial Auth Session'
        );
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        console.warn(`[AuthContext] Auth session fetch failed (attempt ${i + 1}):`, error.message);
        if (i === retries - 1) return { data: null, error };
        await delay(delays[i]);
      }
    }
  };

  useEffect(() => {
    if (!supabase) {
      console.error('[AuthContext] Supabase client is not initialized.');
      setConnectionState('error');
      setConnectionError('Supabase client not initialized');
      setLoading(false);
      return;
    }

    let mounted = true;

    const initAuth = async () => {
      try {
        const connStatus = await checkConnection();
        
        if (!connStatus.success) {
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        const { data, error } = await fetchSessionWithRetry();
        
        if (error) throw error;
        
        if (mounted) {
          setUser(data?.session?.user ?? null);
        }
      } catch (error) {
        console.error('[AuthContext] Final session fetch failed:', error.message || error);
        if (mounted) {
          setUser(null);
          setConnectionState('error');
          setConnectionError(error.message || 'Failed to authenticate');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: subscriptionData } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setLoading(false);
        if (event === 'SIGNED_IN') {
          setConnectionState('connected');
          setLastConnected(new Date());
          setConnectionError(null);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    });

    return () => {
      mounted = false;
      if (subscriptionData?.subscription) {
        subscriptionData.subscription.unsubscribe();
      }
    };
  }, [checkConnection]);

  const login = async (email, password) => {
    if (connectionState !== 'connected') {
      const conn = await checkConnection();
      if (!conn.success) {
        return { error: new Error('Cannot reach authentication server. ' + conn.message) };
      }
    }
    
    return await withTimeout(
      supabase.auth.signInWithPassword({ email: email.trim(), password }),
      15000,
      'Sign In'
    );
  };

  const signup = async (email, password) => {
    if (connectionState !== 'connected') {
      const conn = await checkConnection();
      if (!conn.success) {
        return { error: new Error('Cannot reach authentication server. ' + conn.message) };
      }
    }

    return await withTimeout(
      supabase.auth.signUp({ email: email.trim(), password }),
      15000,
      'Sign Up'
    );
  };

  const logout = async () => {
    console.log('[AuthContext] Starting Supabase logout flow...');
    
    // Clear local auth state BEFORE calling signOut
    setUser(null);
    
    try {
      console.log('[AuthContext] Calling supabase.auth.signOut()...');
      const { error } = await withTimeout(
        supabase.auth.signOut(),
        10000,
        'Sign Out'
      );
      
      if (error) {
        console.warn('[AuthContext] Supabase signOut error (often 403 if session already invalid):', error.message);
      } else {
        console.log('[AuthContext] Supabase signOut successful.');
      }
    } catch (err) {
      console.warn('[AuthContext] Caught exception during signOut:', err);
    }
    
    // Always redirect to login regardless of backend success/failure
    console.log('[AuthContext] Redirecting to login page...');
    window.location.href = '/login?logout=success';
    
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{ 
      user,
      currentUser: user, 
      loading, 
      login,
      signIn: login, 
      signup,
      signUp: signup,
      logout,
      signOut: logout, 
      connectionState, 
      connectionError,
      lastConnected, 
      checkConnection 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a Supabase AuthProvider');
  }
  return context;
};