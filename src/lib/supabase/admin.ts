import { createClient } from '@supabase/supabase-js';

// Cliente com service role — bypassa RLS. Usar SOMENTE em server actions/route handlers.
// Não usa genérico Database para evitar incompatibilidade de tipos com postgrest-js 2.107+.
// O isolamento de segurança é feito via RLS nas políticas, não pelo tipo aqui.
export function createAdminClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
