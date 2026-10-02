// Mengimpor Supabase dari CDN JS Delivr
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Ganti nilai ini dengan credentials dari Project Settings > API Supabase kamu
const SUPABASE_URL = 'https://qxswtfnjftzlaeqciwla.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4c3d0Zm5qZnR6bGFlcWNpd2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNDE4MzAsImV4cCI6MjA4NDgxNzgzMH0.rr9Gork-UFu0d08Nl_fQBrLdO9yAGBbpYedsb07YCgw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);