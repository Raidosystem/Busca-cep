import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mplubqkoubwewvbtjbyb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wbHVicWtvdWJ3ZXd2YnRqYnliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NzYxNzYsImV4cCI6MjA3NTM1MjE3Nn0.t2pK7ZIg_RQRIuQV_4wCp39RWB4Mw27ZZzy3AjDxYnU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})
