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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Rutas del dashboard accesibles sin login (preview)
  const publicDashboard = ["/dashboard/preview", "/dashboard/configuracion"];
  const isPublic = publicDashboard.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  // 1. Sin sesión + dashboard protegido → login
  if (!user && pathname.startsWith("/dashboard") && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 2. Con sesión + login → dashboard
  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 3. Con sesión + dashboard protegido → comprobar lista blanca
  if (user && pathname.startsWith("/dashboard") && !isPublic) {
    const { data: cliente } = await supabase
      .from("clientes_autorizados")
      .select("id")
      .eq("email", user.email!)
      .eq("activo", true)
      .maybeSingle();

    if (!cliente) {
      return NextResponse.redirect(new URL("/acceso-denegado", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/login"],
};
