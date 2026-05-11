import React, { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Activity, Wifi, WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ConnectionStatus = () => {
  const { connectionState, lastConnected, checkConnection } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

  const handleTestConnection = async () => {
    setIsChecking(true);
    await checkConnection();
    setIsChecking(false);
  };

  const getStatusIcon = () => {
    if (connectionState === 'connecting' || isChecking) return <RefreshCw className="h-3 w-3 animate-spin text-blue-400" />;
    if (connectionState === 'connected') return <Wifi className="h-3 w-3 text-green-400" />;
    if (connectionState === 'error') return <AlertTriangle className="h-3 w-3 text-yellow-400" />;
    return <WifiOff className="h-3 w-3 text-red-400" />;
  };

  const getStatusText = () => {
    if (connectionState === 'connecting' || isChecking) return 'Checking connection...';
    if (connectionState === 'connected') return 'Connected';
    if (connectionState === 'error') return 'Connection Error';
    return 'Disconnected';
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-2 mt-6 p-4 rounded-lg bg-black/10 border border-white/5">
      <div className="flex items-center space-x-2 text-xs text-white/70">
        {getStatusIcon()}
        <span>{getStatusText()}</span>
        {connectionState === 'connected' && lastConnected && (
          <span className="text-white/40 ml-2">
            (Last: {lastConnected.toLocaleTimeString()})
          </span>
        )}
      </div>
      
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleTestConnection}
        disabled={isChecking || connectionState === 'connecting'}
        className="text-xs h-7 px-3 text-white/60 hover:text-white hover:bg-white/10"
      >
        Test Connection
      </Button>
    </div>
  );
};

export default ConnectionStatus;