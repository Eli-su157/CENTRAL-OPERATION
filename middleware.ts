import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Modo demo: bypassa autenticação para visualização da UI
  if (process.env.NEXT_PUBLIC_DEMO === 'true') {
    const pathname = request.nextUrl.pathname;
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/app', request.url));
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresha sessão sem expor dados sensíveis ao client
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Rota protegida: redireciona para login se não autenticado
  if (!user && pathname.startsWith('/app')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Usuário autenticado tentando acessar a página de auth: redireciona para /app
  if (user && pathname === '/') {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
