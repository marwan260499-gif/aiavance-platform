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

  const forwardedHost = request.headers.get("x-forwarded-host");
  const base = forwardedHost
    ? `https://${forwardedHost}`
    : (process.env.NEXT_PUBLIC_SITE_URL ?? origin);

  // ── DEBUG ──────────────────────────────────────────────────────────────
  console.log("[auth/callback] ---- INICIO ----");
  console.log("[auth/callback] url completa   :", request.url);
  console.log("[auth/callback] origin          :", origin);
  console.log("[auth/callback] x-forwarded-host:", forwardedHost);
  console.log("[auth/callback] base calculada  :", base);
  console.log("[auth/callback] code presente   :", !!code);
  console.log("[auth/callback] code (primeros 20):", code?.slice(0, 20) ?? "null");
  console.log("[auth/callback] next            :", next);
  console.log("[auth/callback] NEXT_PUBLIC_SITE_URL:", process.env.NEXT_PUBLIC_SITE_URL ?? "NO DEFINIDA");
  console.log("[auth/callback] SUPABASE_URL calculada:", getSupabaseUrl());
  console.log("[auth/callback] headers completos:", Object.fromEntries(request.headers.entries()));
  // ───────────────────────────────────────────────────────────────────────

  if (code) {
    const cookieStore = await cookies();

    console.log("[auth/callback] cookies entrantes:", cookieStore.getAll().map((c) => c.name));

    const supabase = createServerClient(
      getSupabaseUrl(),
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            console.log("[auth/callback] setAll llamado con cookies:", cookiesToSet.map((c) => c.name));
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    console.log("[auth/callback] exchangeCodeForSession completado");
    console.log("[auth/callback] error:", error ? JSON.stringify(error) : "null");
    console.log("[auth/callback] user obtenido:", data?.user?.email ?? "null");

    if (!error) {
      console.log("[auth/callback] redirigiendo a:", `${base}${next}`);
      return NextResponse.redirect(`${base}${next}`);
    }
  } else {
    console.log("[auth/callback] NO hay code en la URL — redirigiendo a error");
  }

  console.log("[auth/callback] redirigiendo a login con error");
  return NextResponse.redirect(`${base}/login?error=auth_callback_failed`);
}
