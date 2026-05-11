import React from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { Button } from '@/components/ui/button';
import { Database, HardDrive } from 'lucide-react';

const AuthToggle = () => {
  const { authMode, toggleAuthMode } = useAuth();
  const isDev = import.meta.env.DEV;

  if (!isDev) return null;

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={toggleAuthMode}
      className="fixed top-4 right-4 z-50 bg-white/90 shadow-md border-gray-200 text-xs"
    >
      {authMode === 'supabase' ? (
        <><Database className="w-3 h-3 mr-2 text-green-600" /> Supabase Mode</>
      ) : (
        <><HardDrive className="w-3 h-3 mr-2 text-yellow-600" /> Local Mode</>
      )}
    </Button>
  );
};

export default AuthToggle;