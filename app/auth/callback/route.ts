import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // En Vercel, x-forwarded-host contiene el hostname real del cliente.
  // Usarlo evita que origin apunte a una URL interna del servidor.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const base = forwardedHost
    ? `https://${forwardedHost}`
    : (process.env.NEXT_PUBLIC_SITE_URL ?? origin);

  if (code) {
    const cookieStore = await cookies();

    // Cliente propio sin try/catch para que los errores de escritura de
    // cookies no queden silenciados como ocurre en el cliente compartido.
    const supabase = createServerClient(
      getSupabaseUrl(),
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${base}${next}`);
    }

    console.error("[auth/callback] exchangeCodeForSession error:", error.message);
  }

  return NextResponse.redirect(`${base}/login?error=auth_callback_failed`);
}
