import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hgtmnmyiafflmpthcfkl.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'sb_publishable_eYqO2OMiPNKhoqqybTr7Xg_u86khqSr'

export const supabase = createClient(supabaseUrl, supabaseKey)
