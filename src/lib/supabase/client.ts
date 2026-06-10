import { createBrowserClient } from '@supabase/ssr';

// Sem genérico Database: compatibilidade com postgrest-js 2.107+ (ver server.ts para detalhes).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createClient() {
  return createBrowserClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
