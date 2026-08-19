-- ============================================================
-- AIAVANCE — Schema inicial
-- Ejecutar en Supabase → SQL Editor (en orden)
-- ============================================================

-- ==================== TABLAS ====================

-- empresas: tenant principal. user_id vincula la empresa al usuario autenticado.
create table if not exists public.empresas (
  id                 uuid        primary key default gen_random_uuid(),
  user_id            uuid        not null references auth.users(id) on delete cascade,
  nombre_negocio     text        not null,
  sector             text,
  ubicacion          text,
  servicios          jsonb       not null default '[]'::jsonb,
  precios            jsonb       not null default '{}'::jsonb,
  horario            jsonb       not null default '{}'::jsonb,
  phone_number_id    text,
  system_prompt      text,
  estado             text        not null default 'activo'
                                 check (estado in ('activo', 'inactivo')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.leads (
  id                   uuid        primary key default gen_random_uuid(),
  empresa_id           uuid        not null references public.empresas(id) on delete cascade,
  nombre               text,
  email                text,
  telefono             text,
  canal                text        not null default 'web'
                                   check (canal in ('whatsapp', 'email', 'web', 'instagram', 'otro')),
  estado               text        not null default 'nuevo'
                                   check (estado in ('nuevo', 'contactado', 'calificado', 'convertido', 'perdido')),
  qualification_score  integer     not null default 0
                                   check (qualification_score between 0 and 100),
  created_at           timestamptz not null default now(),
  last_message_at      timestamptz,
  metadata             jsonb       not null default '{}'::jsonb,
  updated_at           timestamptz not null default now()
);

create table if not exists public.conversaciones (
  id          uuid        primary key default gen_random_uuid(),
  lead_id     uuid        not null references public.leads(id) on delete cascade,
  empresa_id  uuid        not null references public.empresas(id) on delete cascade,
  estado      text        not null default 'activa'
                          check (estado in ('activa', 'cerrada', 'en_espera', 'handoff')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.mensajes (
  id              uuid        primary key default gen_random_uuid(),
  conversacion_id uuid        not null references public.conversaciones(id) on delete cascade,
  autor           text        not null check (autor in ('lead', 'ia', 'agente')),
  contenido       text        not null,
  canal_enviado   text        check (canal_enviado in ('whatsapp', 'email', 'web', 'instagram', 'otro')),
  timestamp       timestamptz not null default now(),
  leido           boolean     not null default false,
  intencion       text
);

create table if not exists public.citas (
  id                       uuid        primary key default gen_random_uuid(),
  empresa_id               uuid        not null references public.empresas(id) on delete cascade,
  lead_id                  uuid        not null references public.leads(id) on delete cascade,
  google_calendar_event_id text,
  fecha_hora               timestamptz not null,
  duracion_min             integer     not null default 60,
  confirmada               boolean     not null default false,
  asistio                  boolean,
  notas                    text,
  created_at               timestamptz not null default now()
);

create table if not exists public.handoffs (
  id                uuid        primary key default gen_random_uuid(),
  empresa_id        uuid        not null references public.empresas(id) on delete cascade,
  conversacion_id   uuid        not null references public.conversaciones(id) on delete cascade,
  lead_id           uuid        not null references public.leads(id) on delete cascade,
  motivo_escalacion text        not null,
  estado            text        not null default 'pendiente'
                                check (estado in ('pendiente', 'en_progreso', 'resuelto')),
  created_at        timestamptz not null default now(),
  resuelto_at       timestamptz,
  notas             text
);

-- ==================== ÍNDICES ====================

create index if not exists idx_empresas_user_id           on public.empresas(user_id);
create index if not exists idx_leads_empresa_id           on public.leads(empresa_id);
create index if not exists idx_leads_estado               on public.leads(estado);
create index if not exists idx_conversaciones_empresa_id  on public.conversaciones(empresa_id);
create index if not exists idx_conversaciones_lead_id     on public.conversaciones(lead_id);
create index if not exists idx_mensajes_conversacion_id   on public.mensajes(conversacion_id);
create index if not exists idx_mensajes_timestamp         on public.mensajes(timestamp);
create index if not exists idx_citas_empresa_id           on public.citas(empresa_id);
create index if not exists idx_citas_fecha_hora           on public.citas(fecha_hora);
create index if not exists idx_handoffs_empresa_id        on public.handoffs(empresa_id);
create index if not exists idx_handoffs_estado            on public.handoffs(estado);

-- ==================== TRIGGER updated_at ====================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_empresas_updated_at
  before update on public.empresas
  for each row execute procedure public.handle_updated_at();

create trigger trg_leads_updated_at
  before update on public.leads
  for each row execute procedure public.handle_updated_at();

create trigger trg_conversaciones_updated_at
  before update on public.conversaciones
  for each row execute procedure public.handle_updated_at();

-- ==================== RLS ====================

alter table public.empresas      enable row level security;
alter table public.leads         enable row level security;
alter table public.conversaciones enable row level security;
alter table public.mensajes      enable row level security;
alter table public.citas         enable row level security;
alter table public.handoffs      enable row level security;

-- Función auxiliar: devuelve los IDs de empresa del usuario actual.
-- security definer permite usarla en políticas sin coste de recursión.
create or replace function public.mis_empresas()
returns setof uuid
language sql
security definer
stable
as $$
  select id from public.empresas where user_id = auth.uid();
$$;

-- --- empresas ---
create policy "empresas: select propio"
  on public.empresas for select
  using (user_id = auth.uid());

create policy "empresas: insert propio"
  on public.empresas for insert
  with check (user_id = auth.uid());

create policy "empresas: update propio"
  on public.empresas for update
  using (user_id = auth.uid());

create policy "empresas: delete propio"
  on public.empresas for delete
  using (user_id = auth.uid());

-- --- leads ---
create policy "leads: select"
  on public.leads for select
  using (empresa_id in (select public.mis_empresas()));

create policy "leads: insert"
  on public.leads for insert
  with check (empresa_id in (select public.mis_empresas()));

create policy "leads: update"
  on public.leads for update
  using (empresa_id in (select public.mis_empresas()));

create policy "leads: delete"
  on public.leads for delete
  using (empresa_id in (select public.mis_empresas()));

-- --- conversaciones ---
create policy "conversaciones: select"
  on public.conversaciones for select
  using (empresa_id in (select public.mis_empresas()));

create policy "conversaciones: insert"
  on public.conversaciones for insert
  with check (empresa_id in (select public.mis_empresas()));

create policy "conversaciones: update"
  on public.conversaciones for update
  using (empresa_id in (select public.mis_empresas()));

create policy "conversaciones: delete"
  on public.conversaciones for delete
  using (empresa_id in (select public.mis_empresas()));

-- --- mensajes (va via conversaciones → empresa) ---
create policy "mensajes: select"
  on public.mensajes for select
  using (
    conversacion_id in (
      select id from public.conversaciones
      where empresa_id in (select public.mis_empresas())
    )
  );

create policy "mensajes: insert"
  on public.mensajes for insert
  with check (
    conversacion_id in (
      select id from public.conversaciones
      where empresa_id in (select public.mis_empresas())
    )
  );

create policy "mensajes: update"
  on public.mensajes for update
  using (
    conversacion_id in (
      select id from public.conversaciones
      where empresa_id in (select public.mis_empresas())
    )
  );

-- --- citas ---
create policy "citas: select"
  on public.citas for select
  using (empresa_id in (select public.mis_empresas()));

create policy "citas: insert"
  on public.citas for insert
  with check (empresa_id in (select public.mis_empresas()));

create policy "citas: update"
  on public.citas for update
  using (empresa_id in (select public.mis_empresas()));

create policy "citas: delete"
  on public.citas for delete
  using (empresa_id in (select public.mis_empresas()));

-- --- handoffs ---
create policy "handoffs: select"
  on public.handoffs for select
  using (empresa_id in (select public.mis_empresas()));

create policy "handoffs: insert"
  on public.handoffs for insert
  with check (empresa_id in (select public.mis_empresas()));

create policy "handoffs: update"
  on public.handoffs for update
  using (empresa_id in (select public.mis_empresas()));

create policy "handoffs: delete"
  on public.handoffs for delete
  using (empresa_id in (select public.mis_empresas()));
