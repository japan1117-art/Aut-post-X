import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

export function db() {
  const env = getEnv();
  return createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
