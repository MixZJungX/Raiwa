import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yvactofmmdiauewmkqnk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2YWN0b2ZtbWRpYXVld21rcW5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTM1MDcsImV4cCI6MjA2ODA2OTUwN30.JnejY9s6rRR75O3h7FqkGzWDkSQTmJ8W4R0cA_MME34'

export const supabase = createClient(supabaseUrl, supabaseKey)