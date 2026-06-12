-- ============================================================
-- AIAVANCE — Lista blanca de clientes autorizados
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

create table if not exists public.clientes_autorizados (
  id               uuid        primary key default gen_random_uuid(),
  email            text        not null unique,
  nombre           text,
  sistemas_activos text[]      not null default '{}',
  activo           boolean     not null default true,
  created_at       timestamptz not null default now()
);

-- Solo el propio usuario autenticado puede leer su registro.
-- El proxy usa esta query para comprobar si tiene acceso.
alter table public.clientes_autorizados enable row level security;

create policy "usuario ve su propio registro"
  on public.clientes_autorizados for select
  to authenticated
  using (email = auth.email());

-- ── Registro inicial ─────────────────────────────────────────
insert into public.clientes_autorizados (email, nombre, sistemas_activos, activo)
values (
  'contacto@aiavance.es',
  'AIAVANCE Admin',
  array[
    'captacion',
    'seguimiento',
    'reservas',
    'asistencia',
    'resenas',
    'reactivacion',
    'dashboard'
  ],
  true
)
on conflict (email) do nothing;
