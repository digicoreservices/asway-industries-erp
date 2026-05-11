import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Lock, User, AlertCircle, RefreshCw, WifiOff, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthProvider';
import { testSupabaseConnection } from '@/lib/supabaseConnectionTest';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [connCheckLoading, setConnCheckLoading] = useState(true);
  const [connError, setConnError] = useState(null);
  
  const { toast } = useToast();
  const { login } = useAuth();

  const verifyConnection = async () => {
    setConnCheckLoading(true);
    setConnError(null);
    const result = await testSupabaseConnection();
    if (!result.success) {
      setConnError("Supabase connection failed. Please verify your API key in the environment configuration. Contact your administrator if the issue persists.");
    }
    setConnCheckLoading(false);
  };

  useEffect(() => {
    // Check if redirected from logout
    const params = new URLSearchParams(window.location.search);
    if (params.get('logout') === 'success') {
      setSuccessMsg("You have been logged out successfully.");
      toast({ title: "Logged out", description: "You have been logged out successfully." });
      
      // Clean up URL
      window.history.replaceState({}, document.title, '/login');
    }

    // Clear any stale session data on mount to ensure a clean slate
    const cleanupLocalState = () => {
      try {
        // Find and remove supabase auth tokens from local storage
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
            localStorage.removeItem(key);
          }
        });
        sessionStorage.clear();
      } catch (err) {
        console.warn("Failed to clear local storage on login mount", err);
      }
    };
    
    cleanupLocalState();
    verifyConnection();
  }, [toast]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (connError) {
      toast({ title: 'Connection Error', description: 'Please wait until connection is restored.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const { error } = await login(formData.email, formData.password);

    if (error) {
      let displayMessage = error.message || "An unexpected error occurred.";
      
      if (displayMessage.includes('Invalid login credentials')) {
        displayMessage = "Invalid credentials. Please verify your email and password.";
      } else if (displayMessage.includes('Network') || displayMessage.includes('Failed to fetch') || displayMessage.includes('Timeout')) {
        displayMessage = "Network or timeout error. Cannot reach the authentication server.";
      } else if (displayMessage.includes('User not found')) {
        displayMessage = "No user found with this email address.";
      }

      setErrorMsg(displayMessage);
    } else {
      toast({ title: "Login Successful! 🎉", description: `Welcome back!` });
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    if (errorMsg || successMsg) {
      setErrorMsg(null);
      setSuccessMsg(null);
    }
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 login-bg">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative">
        <Card className="glass-effect border-white/20">
          <CardHeader className="text-center pb-2 flex flex-col items-center">
            <img 
              src="https://horizons-cdn.hostinger.com/7e57f563-480c-4c56-a918-bfd63fc92533/617ae01a58ce0c1a58c0f89d71efa3f9.png" 
              alt="ASWAY Industries Private Limited Logo" 
              className="h-16 w-auto mb-4 object-contain"
            />
            <h1 className="font-bold text-2xl tracking-wide text-white">ERP System</h1>
            <p className="text-sm text-white/60 mt-1">Please sign in to continue</p>
          </CardHeader>
          <CardContent className="pt-4">
            
            {connError && (
              <Alert variant="destructive" className="mb-4 bg-red-500/20 text-red-100 border border-red-500/50 flex flex-col items-start">
                <div className="flex items-center justify-between w-full mb-2">
                  <div className="flex items-start">
                    <WifiOff className="h-4 w-4 shrink-0 mt-0.5" />
                    <AlertDescription className="text-sm ml-2 font-medium">{connError}</AlertDescription>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={verifyConnection} 
                  disabled={connCheckLoading}
                  className="text-xs h-7 border-red-500/50 hover:bg-red-500/30 w-full"
                >
                  {connCheckLoading ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                  Retry Connection
                </Button>
              </Alert>
            )}

            {errorMsg && !connError && (
              <Alert variant="destructive" className="mb-4 bg-red-500/20 text-red-100 border border-red-500/50 flex flex-col items-start">
                <div className="flex items-center w-full">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <AlertDescription className="text-sm ml-2 font-medium">{errorMsg}</AlertDescription>
                </div>
              </Alert>
            )}

            {successMsg && !errorMsg && !connError && (
              <Alert className="mb-4 bg-green-500/20 text-green-100 border border-green-500/50 flex flex-col items-start">
                <div className="flex items-center w-full">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <AlertDescription className="text-sm ml-2 font-medium">{successMsg}</AlertDescription>
                </div>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/90">Email Address</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                  <Input
                    id="email" name="email" type="email" placeholder="name@example.com"
                    value={formData.email} onChange={handleChange} disabled={loading || connCheckLoading || !!connError}
                    className="pl-10 bg-black/20 border-white/20 text-white placeholder:text-white/40 h-11" required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/90">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                  <Input
                    id="password" name="password" type="password" placeholder="Enter your password"
                    value={formData.password} onChange={handleChange} disabled={loading || connCheckLoading || !!connError}
                    className="pl-10 bg-black/20 border-white/20 text-white placeholder:text-white/40 h-11" required
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white" 
                  disabled={loading || connCheckLoading || !!connError}
                >
                  {loading || connCheckLoading ? (
                    <span className="flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Authenticating...</span>
                  ) : 'Sign In'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;