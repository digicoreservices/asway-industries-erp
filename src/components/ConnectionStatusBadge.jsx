import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

const ConnectionStatusBadge = () => {
  const { connectionState, connectionError, checkConnection } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleRetry = async () => {
    if (checkConnection) {
      setChecking(true);
      await checkConnection();
      setChecking(false);
    }
  };

  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting' || checking;

  return (
    <div className="flex items-center gap-2">
      <div 
        className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
          isConnected ? 'bg-green-100 text-green-800 border-green-200' :
          isConnecting ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
          'bg-red-100 text-red-800 border-red-200'
        }`}
        title={connectionError || ''}
      >
        {isConnected ? <Wifi className="w-3 h-3" /> : 
         isConnecting ? <RefreshCw className="w-3 h-3 animate-spin" /> : 
         <WifiOff className="w-3 h-3" />}
        <span>
          {isConnected ? 'Connected' :
           isConnecting ? 'Retrying...' : 'Disconnected'}
        </span>
      </div>
      {!isConnected && !isConnecting && (
        <Button variant="outline" size="sm" onClick={handleRetry} disabled={checking} className="h-6 text-xs px-2 py-0">
          Reconnect
        </Button>
      )}
    </div>
  );
};

export default ConnectionStatusBadge;