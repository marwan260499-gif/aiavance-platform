# AIAVANCE Platform

Plataforma SaaS multi-tenant de automatización con IA para negocios locales (peluquerías, clínicas, inmobiliarias).

## Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Estilos:** Tailwind CSS
- **Auth & DB:** Supabase (Auth con magic link, PostgreSQL)
- **SSR Auth:** @supabase/ssr con cookies `getAll`/`setAll`

## Estructura

```
app/
  login/          → Página de login (magic link por email)
  dashboard/      → Página protegida (solo usuarios autenticados)
  auth/callback/  → Handler del redirect de Supabase tras login
lib/
  supabase/
    client.ts     → Cliente browser (createBrowserClient)
    server.ts     → Cliente server (createServerClient + cookies async)
middleware.ts     → Protección de rutas + refresco de sesión
```

## Variables de entorno

Crear `.env.local` con:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Auth flow

1. Usuario introduce email en `/login`
2. Supabase envía magic link al email
3. El link redirige a `/auth/callback?code=...`
4. El callback intercambia el code por sesión y redirige a `/dashboard`
5. El middleware protege `/dashboard` — redirige a `/login` si no hay sesión

## Comandos

```bash
npm run dev    # Desarrollo en http://localhost:3000
npm run build  # Build de producción
npm run start  # Servidor de producción
```
