import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  const forwardedHost = request.headers.get("x-forwarded-host");
  const base = forwardedHost
    ? `https://${forwardedHost}`
    : (process.env.NEXT_PUBLIC_SITE_URL ?? origin);

  if (code) {
    // Creamos el redirect ANTES del exchange para poder escribir
    // las cookies de sesión directamente sobre esa respuesta.
    // Si usamos cookieStore.set() de next/headers, Next.js no garantiza
    // que esas cookies vayan incluidas en un NextResponse.redirect().
    const redirectResponse = NextResponse.redirect(`${base}${next}`);

    const supabase = createServerClient(
      getSupabaseUrl(),
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              redirectResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return redirectResponse;
    }

    console.error("[auth/callback] exchangeCodeForSession error:", JSON.stringify(error));
  }

  return NextResponse.redirect(`${base}/login?error=auth_callback_failed`);
}
