import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    getSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: usar getUser() y no getSession().
  // getSession() lee solo la cookie local sin verificar con Supabase.
  // getUser() verifica el token con el servidor, que es lo que necesitamos
  // para que el refresco de sesión escriba cookies actualizadas en supabaseResponse.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const publicDashboard = ["/dashboard/preview", "/dashboard/configuracion"];
  const isPublic = publicDashboard.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (!user && pathname.startsWith("/dashboard") && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Devolver siempre supabaseResponse (no NextResponse.next())
  // para que las cookies de sesión actualizadas vayan en la respuesta.
  return supabaseResponse;
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/login"],
};
