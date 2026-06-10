import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Sem genérico Database: evita incompatibilidade de tipos com postgrest-js 2.107+.
// O schema manual do projeto não inclui Relationships, necessário para o type checker v2.107+.
// A segurança é garantida via RLS no Supabase, não pelo tipo TypeScript.
export async function createClient() {
  const cookieStore = await cookies();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignorado quando chamado de Server Component (sem escrita de cookies)
          }
        },
      },
    }
  );
}
