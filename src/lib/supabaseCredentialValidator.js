export const validateSupabaseCredentials = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const errors = [];

  if (!url) {
    errors.push("VITE_SUPABASE_URL is missing.");
  } else if (!url.startsWith('https://')) {
    errors.push("VITE_SUPABASE_URL must start with https://");
  }

  if (!key) {
    errors.push("VITE_SUPABASE_ANON_KEY is missing.");
  } else if (!key.startsWith('eyJ')) {
    errors.push("VITE_SUPABASE_ANON_KEY must be a valid JWT (starts with 'eyJ').");
  }

  if (errors.length > 0) {
    console.error("Supabase Credential Validation Failed:");
    errors.forEach(err => console.error(`- ${err}`));
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};