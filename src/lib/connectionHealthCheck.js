import { supabase } from './customSupabaseClient';

/**
 * Verifies connectivity to the Supabase servers.
 * It performs a lightweight operation to check if the network and configuration are valid.
 * @returns {Promise<{isHealthy: boolean, error: Error | null}>}
 */
export const checkSupabaseConnection = async () => {
  try {
    // Attempting a lightweight call to verify connectivity
    const { error } = await supabase.auth.getSession();
    
    if (error && (error.message === 'Failed to fetch' || error.message === 'Network request failed' || error instanceof TypeError)) {
      throw error;
    }
    
    return { isHealthy: true, error: null };
  } catch (error) {
    console.error('[HealthCheck] Supabase connection failed:', error.message);
    return { isHealthy: false, error };
  }
};