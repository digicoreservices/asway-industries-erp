export const runAuthDiagnostics = async () => {
  const url = import.meta.env.VITE_SUPABASE_URL || 'https://htdiuxyyscaojuaoryvj.supabase.co';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdWJhYmFzZSIsInJlZiI6Imh0ZGl1eHl5c2Nhb2p1YW9yeXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NjgxNjAsImV4cCI6MjA3NTA0NDE2MH0.ydsOymOapA5ZF192ycMegqbvPshSZh3HfOmNS7-ZSNQ';
  
  const results = {
    hasConfig: !!url && !!key,
    isReachable: false,
    hasCorsIssue: false,
    details: [],
  };

  if (!results.hasConfig) {
    results.details.push('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment variables.');
    return results;
  }

  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    
    results.isReachable = true;
    results.details.push(`Auth endpoint reachable. Status: ${response.status}`);
  } catch (error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      results.hasCorsIssue = true; 
      results.details.push('Network request failed. This often indicates a CORS issue, an invalid URL, or you are offline.');
    } else {
      results.details.push(`Unexpected fetch error: ${error.message}`);
    }
  }

  return results;
};