// src/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase credentials missing! Check your .env file and ensure Vite has been restarted.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)