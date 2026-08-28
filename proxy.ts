import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const TIMEOUT_MS = 5000;

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

// Cliente admin con service role key — bypasa RLS, solo para verificar
// la lista blanca. Nunca se expone al navegador (sin prefijo NEXT_PUBLIC_).
// Un único cliente reutilizado entre invocaciones (no uno por petición).
function createAdminClient() {
  return createClient(
    getSupabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const adminClient = createAdminClient();

// Si Supabase no responde a tiempo (p.ej. un problema de red puntual), esto
// evita que la petición se quede colgada hasta el límite de 300s de Vercel
// — que es exactamente lo que dejaba el dashboard "cargando" para siempre.
// La llamada original sigue en marcha de fondo, solo dejamos de esperarla.
class TimeoutError extends Error {}

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new TimeoutError(`Tiempo de espera agotado (${ms}ms)`)),
      ms
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
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

  const { pathname } = request.nextUrl;

  const publicDashboard = ["/dashboard/preview", "/dashboard/configuracion"];
  const isPublic = publicDashboard.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  let user = null;
  let noSePudoVerificarSesion = false;
  try {
    const {
      data: { user: authUser },
    } = await withTimeout(supabase.auth.getUser(), TIMEOUT_MS);
    user = authUser;
  } catch {
    noSePudoVerificarSesion = true;
  }

  // 0. No se pudo ni comprobar si hay sesión (timeout de red) + ruta
  // protegida → no dejamos pasar, pero sin decir "denegado": no lo sabemos.
  if (noSePudoVerificarSesion && pathname.startsWith("/dashboard") && !isPublic) {
    return NextResponse.redirect(new URL("/verificacion-fallida", request.url));
  }

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
    try {
      const { data: cliente, error } = await withTimeout(
        adminClient
          .from("clientes_autorizados")
          .select("id")
          .eq("email", user.email!)
          .eq("activo", true)
          .maybeSingle(),
        TIMEOUT_MS
      );

      if (error) throw error;

      if (!cliente) {
        return NextResponse.redirect(new URL("/acceso-denegado", request.url));
      }
    } catch {
      // Timeout u otro fallo de red al consultar la lista blanca: no
      // sabemos si tiene permiso o no, así que no le dejamos entrar, pero
      // se lo decimos claro en vez de un "acceso denegado" que sería falso.
      return NextResponse.redirect(new URL("/verificacion-fallida", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/login"],
};
