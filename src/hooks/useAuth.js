import { useAuth as useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

const useAuth = () => {
  const { user, signIn, signOut, loading } = useSupabaseAuth();
  
  const login = async (credentials) => {
    const { email, password } = credentials;
    if (!email || !password) {
      console.error("Email and password are required for login.");
      return;
    }
    await signIn(email, password);
  };
  
  return { user, login, logout: signOut, loading };
};

export default useAuth;