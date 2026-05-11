import React, { Suspense, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { useAuth } from '@/contexts/AuthProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Loader2 } from 'lucide-react';
import { runComprehensiveHealthCheck } from '@/lib/supabaseHealthCheck';
import { clearOversizedCache } from '@/lib/cacheCleanup';

// Lazy load layout and components to prevent initial blocking
const Login = React.lazy(() => import('@/components/Login'));
const DashboardLayout = React.lazy(() => import('@/components/DashboardLayout'));
const Dashboard = React.lazy(() => import('@/components/Dashboard'));
const ClientManagement = React.lazy(() => import('@/components/ClientManagement'));
const SupplierManagement = React.lazy(() => import('@/components/SupplierManagement'));
const ItemManagement = React.lazy(() => import('@/components/items/ItemManagement'));
const QuotationManagement = React.lazy(() => import('@/components/quotations/QuotationManagement'));
const OrderReceiptOI = React.lazy(() => import('@/components/OrderReceiptOI'));
const WorkOrder = React.lazy(() => import('@/components/WorkOrder'));
const PurchaseOrderSupplierReceipt = React.lazy(() => import('@/components/PurchaseOrderSupplierReceipt'));
const Manufacturing = React.lazy(() => import('@/components/manufacturing/Manufacturing'));
const Invoice = React.lazy(() => import('@/components/Invoice'));
const Reports = React.lazy(() => import('@/components/Reports'));
const PaymentReceipt = React.lazy(() => import('@/components/PaymentReceipt'));
const SupplierLoadTest = React.lazy(() => import('@/components/SupplierLoadTest'));
const SupplierPaymentManagement = React.lazy(() => import('@/components/SupplierPaymentManagement'));
const PaymentReceiptTypePage = React.lazy(() => import('@/components/SupplierPaymentManagement/PaymentReceiptTypePage'));
const SupplierPaymentReceiptManagementPage = React.lazy(() => import('@/components/SupplierPaymentManagement/SupplierPaymentReceiptManagementPage'));
const CreateSupplierPaymentReceiptForm = React.lazy(() => import('@/components/SupplierPaymentManagement/CreateSupplierPaymentReceiptForm'));
const SearchSupplierPaymentReceipt = React.lazy(() => import('@/components/SupplierPaymentManagement/SearchSupplierPaymentReceipt'));
const AdvancePaymentManagementPage = React.lazy(() => import('@/components/SupplierPaymentManagement/AdvancePaymentManagementPage'));
const SupplierAdvancePaymentReceiptForm = React.lazy(() => import('@/components/SupplierPaymentManagement/SupplierAdvancePaymentReceiptForm'));
const SearchSupplierAdvancePaymentReceipt = React.lazy(() => import('@/components/SupplierPaymentManagement/SearchSupplierAdvancePaymentReceipt'));
const SupplierPaymentDetails = React.lazy(() => import('@/components/SupplierPaymentManagement/SupplierPaymentDetails'));

const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
    <Loader2 className="animate-spin h-12 w-12 text-blue-400 mb-4" />
    <h2 className="text-xl font-semibold">Loading ERP System...</h2>
    <p className="text-gray-400 mt-2 text-sm">Please wait while we set things up</p>
  </div>
);

function App() {
  const { user, signOut, loading } = useAuth();

  useEffect(() => {
    // Perform initial cleanup and health check operations
    try {
      clearOversizedCache();
      runComprehensiveHealthCheck();
    } catch (err) {
      console.warn("Startup operations warning:", err);
    }
  }, []);

  // Display strict loading screen while auth initializes
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <Router>
        <Helmet>
          <title>Asway Industries ERP</title>
          <meta name="description" content="ERP System for Asway Industries Pvt Ltd" />
        </Helmet>
        
        {/* Safely catch lazy loaded component errors */}
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* If user is NOT authenticated, only allow login route */}
            {!user ? (
              <>
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </>
            ) : (
              /* If user IS authenticated, render Dashboard routes */
              <Route path="/" element={<DashboardLayout user={user} onLogout={signOut} />}>
                <Route index element={<Dashboard user={user} />} />
                <Route path="clients" element={<ClientManagement />} />
                <Route path="suppliers" element={<SupplierManagement />} />
                <Route path="items" element={<ItemManagement />} />
                
                {/* Supplier Payment Management Routes */}
                <Route path="supplier-payment" element={<SupplierPaymentManagement />} />
                <Route path="supplier-payment-receipt-type" element={<PaymentReceiptTypePage />} />
                <Route path="supplier-payment-receipt-management" element={<SupplierPaymentReceiptManagementPage />} />
                <Route path="supplier-payment-receipt-management/create" element={<CreateSupplierPaymentReceiptForm />} />
                <Route path="supplier-payment-search" element={<SearchSupplierPaymentReceipt />} />
                <Route path="advance-payment-management" element={<AdvancePaymentManagementPage />} />
                <Route path="advance-payment-management/create" element={<SupplierAdvancePaymentReceiptForm />} />
                <Route path="advance-payment-management/search" element={<SearchSupplierAdvancePaymentReceipt />} />
                <Route path="supplier-payment/payment-details" element={<SupplierPaymentDetails />} />
                
                <Route path="quotations" element={<QuotationManagement />} />
                <Route path="order-receipts" element={<OrderReceiptOI />} />
                <Route path="work-orders" element={<WorkOrder />} />
                <Route path="purchase-orders" element={<PurchaseOrderSupplierReceipt />} />
                <Route path="manufacturing" element={<Manufacturing />} />
                <Route path="invoice" element={<Invoice />} />
                <Route path="payment-receipts" element={<PaymentReceipt />} />
                <Route path="reports" element={<Reports />} />
                <Route path="test-suppliers" element={<SupplierLoadTest />} />
                
                {/* Fallback to root for any unrecognized path inside authenticated context */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            )}
          </Routes>
        </Suspense>
        <Toaster />
      </Router>
    </ErrorBoundary>
  );
}

export default App;