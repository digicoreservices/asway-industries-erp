import React, { createContext, useContext } from 'react';
import { useAuth as useSupabaseAuth, AuthProvider as SupabaseProvider } from './SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

const AuthWrapperContext = createContext({});

const AuthWrapperProvider = ({ children }) => {
  const auth = useSupabaseAuth();

  const handleLogout = async () => {
    console.log('[AuthProvider] Validating session before logout...');
    
    try {
      // 1. Clear all cached data and localStorage entries related to auth
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
      
      // 2. Validate if session is still valid before attempting logout
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.log('[AuthProvider] Session already invalid or expired. Skipping remote signOut.');
        // Reset state and redirect directly
        window.location.href = '/login?logout=success';
        return { error: null };
      }
      
      // 3. If session is valid, proceed with full logout via Supabase
      return await auth.logout();
    } catch (err) {
      console.warn('[AuthProvider] Unexpected error during logout validation, forcing redirect:', err);
      window.location.href = '/login?logout=success';
      return { error: null };
    }
  };

  // Provide the wrapped logout function alongside standard auth properties
  const value = {
    ...auth,
    logout: handleLogout,
    signOut: handleLogout,
  };

  return (
    <AuthWrapperContext.Provider value={value}>
      {children}
    </AuthWrapperContext.Provider>
  );
};

export const AuthProvider = ({ children }) => {
  return (
    <SupabaseProvider>
      <AuthWrapperProvider>
        {children}
      </AuthWrapperProvider>
    </SupabaseProvider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthWrapperContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};