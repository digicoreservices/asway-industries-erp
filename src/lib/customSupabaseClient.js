import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htdiuxyyscaojuaoryvj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZGl1eHl5c2Nhb2p1YW9yeXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NjgxNjAsImV4cCI6MjA3NTA0NDE2MH0.ydsOymOapA5ZF192ycMegqbvPshSZh3HfOmNS7-ZSNQ';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
