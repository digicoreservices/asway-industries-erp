import { validateSupabaseCredentials } from './supabaseCredentialValidator';

export const testSupabaseConnection = async () => {
  const { isValid, errors } = validateSupabaseCredentials();
  
  if (!isValid) {
    return {
      success: false,
      type: 'configuration',
      message: errors.join(' '),
      status: null
    };
  }

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${url}/auth/v1/health`, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log('Supabase connection is valid and successful.');
      return {
        success: true,
        type: null,
        message: 'Connected successfully',
        status: response.status
      };
    } else {
      return {
        success: false,
        type: 'api_error',
        message: `API returned status: ${response.status}`,
        status: response.status
      };
    }
  } catch (error) {
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return {
        success: false,
        type: 'timeout',
        message: 'Connection timed out (exceeded 10s)',
        status: null
      };
    } else if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
      return {
        success: false,
        type: 'cors_or_network',
        message: 'Network request failed. Possible CORS issue or offline.',
        status: null
      };
    }
    
    return {
      success: false,
      type: 'unknown',
      message: `Unexpected error: ${error.message}`,
      status: null
    };
  }
};