import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

// Cliente admin con service role key — bypasa RLS, solo para verificar
// la lista blanca. Nunca se expone al navegador (sin prefijo NEXT_PUBLIC_).
function createAdminClient() {
  return createClient(
    getSupabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Cliente normal con anon key + cookies del usuario para gestionar sesión
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

  // 3. Con sesión + dashboard protegido → verificar lista blanca con cliente admin
  if (user && pathname.startsWith("/dashboard") && !isPublic) {
    const admin = createAdminClient();
    const { data: cliente } = await admin
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
