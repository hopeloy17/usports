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