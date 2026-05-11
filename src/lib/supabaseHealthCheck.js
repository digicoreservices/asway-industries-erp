import { supabase } from './customSupabaseClient';

export const runComprehensiveHealthCheck = async () => {
  console.log('[HealthCheck] Starting comprehensive Supabase health check...');
  const diagnostics = {
    isConfigured: true, // Assuming true since we use injected envs mostly
    isNetworkReachable: false,
    isAuthWorking: false,
    canAccessSuppliers: false,
    canAccessCustomers: false,
    responseTime: 0,
    errors: [],
    details: []
  };

  const startTime = performance.now();

  try {
    // 1. Check Auth State
    console.log('[HealthCheck] Testing Auth State...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) {
      diagnostics.errors.push(`Auth Error: ${authError.message}`);
    } else {
      diagnostics.isAuthWorking = true;
      diagnostics.details.push('Auth session retrieved successfully.');
      console.log('[HealthCheck] Auth state valid:', !!authData?.session);
    }
    diagnostics.isNetworkReachable = true;

    // 2. Check Suppliers Table
    console.log('[HealthCheck] Testing Suppliers table access...');
    const { error: suppError } = await supabase.from('suppliers').select('id').limit(1);
    if (suppError) {
      diagnostics.errors.push(`Suppliers Table Error: ${suppError.message} (Code: ${suppError.code})`);
    } else {
      diagnostics.canAccessSuppliers = true;
      diagnostics.details.push('Suppliers table is accessible.');
      console.log('[HealthCheck] Suppliers table accessible.');
    }

    // 3. Check Customers Table
    console.log('[HealthCheck] Testing Customers table access...');
    const { error: custError } = await supabase.from('customers').select('id').limit(1);
    if (custError) {
      diagnostics.errors.push(`Customers Table Error: ${custError.message} (Code: ${custError.code})`);
    } else {
      diagnostics.canAccessCustomers = true;
      diagnostics.details.push('Customers table is accessible.');
      console.log('[HealthCheck] Customers table accessible.');
    }

  } catch (err) {
    diagnostics.errors.push(`Unexpected Health Check Error: ${err.message}`);
    console.error('[HealthCheck] Unexpected error:', err);
  } finally {
    diagnostics.responseTime = Math.round(performance.now() - startTime);
    console.log('[HealthCheck] Diagnostics complete:', diagnostics);
  }

  return diagnostics;
};