// Deprecated: Local Offline Mode fallback has been completely removed.
// The application now strictly uses Supabase authentication.
import React, { createContext, useContext } from 'react';

const LocalAuthContext = createContext({});

export const LocalAuthProvider = ({ children }) => {
  return (
    <LocalAuthContext.Provider value={{
      isDeprecated: true,
      message: "LocalAuthContext is deprecated and should no longer be used."
    }}>
      {children}
    </LocalAuthContext.Provider>
  );
};

export const useLocalAuth = () => {
  console.warn('useLocalAuth is deprecated. Please use useAuth from AuthProvider.jsx which uses Supabase.');
  return useContext(LocalAuthContext);
};