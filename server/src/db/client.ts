import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load variables from server/.env
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file');
}

// Export the initialized connection to reuse across all query functions
export const supabase = createClient(supabaseUrl, supabaseKey);

// A separate client used ONLY for Supabase Auth calls (sign-up and sign-in, in
// services/authService.ts). Once a supabase-js client signs someone in, it sends that
// student's token on later requests instead of the service-role key, so signing in on the
// shared `supabase` client above would quietly turn every database query after it into that
// student's query. This client never touches tables, and the options below stop it from
// keeping or refreshing a session between calls; each call's result is read and discarded.
export const authClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});