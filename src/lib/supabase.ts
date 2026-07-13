import { createBrowserClient } from '@supabase/ssr'

import type { Database } from '@/lib/database.types'
import { getPublicEnvironment } from '@/lib/env/public'

const environment = getPublicEnvironment()

export const supabase = createBrowserClient<Database>(
  environment.NEXT_PUBLIC_SUPABASE_URL,
  environment.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
