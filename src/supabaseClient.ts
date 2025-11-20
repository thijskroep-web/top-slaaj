import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dzgcjsjhikrsleyacblb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6Z2Nqc2poaWtyc2xleWFjYmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NDU2MjQsImV4cCI6MjA3NzEyMTYyNH0.9NPGCW4rh_HMTwluhDNaOFVl1Vt2GbqmdG-ksfLPCzQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
