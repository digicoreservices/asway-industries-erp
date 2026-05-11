import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import { Menu, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConnectionStatusBadge from '@/components/ConnectionStatusBadge';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useToast } from '@/components/ui/use-toast';

const DashboardLayout = ({ user, onLogout }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const { toast } = useToast();

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const handleResize = useCallback(() => {
    if (window.innerWidth >= 1024) {
      setSidebarOpen(true);
    } else {
      setSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const handleLogoutClick = async () => {
    try {
      await onLogout();
      // Toast might not be visible long if redirect happens immediately,
      // but it's good to have it here just in case.
      toast({ title: "Success", description: "Logged out successfully" });
    } catch (error) {
      console.warn("Logout error handled in layout:", error);
      toast({ title: "Logged out", description: "You have been logged out" });
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <ErrorBoundary>
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} onLogout={handleLogoutClick} />
      </ErrorBoundary>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="bg-white shadow-sm p-4 flex items-center justify-between lg:justify-end border-b z-10 relative">
          <Button onClick={toggleSidebar} variant="ghost" size="icon" className="text-gray-600 lg:hidden">
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </Button>
          <div className="hidden lg:block ml-auto">
             <ConnectionStatusBadge />
          </div>
          <div className="lg:hidden">
             <ConnectionStatusBadge />
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50/50 p-4">
          <ErrorBoundary>
            <Suspense fallback={
              <div className="flex items-center justify-center h-full w-full">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            }>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;