-- BkTableros · datos privados por empresa, tendencia compartida y links públicos con token
-- Proyecto Supabase: beuzmwrhqlmjoplsillf (Cómputo de Obras).
-- Multiempresa con el mismo criterio que Cómputo: cada usuario ve lo de su empresa
-- (auth.jwt() → app_metadata.empresa) y el rol admin ve todas.
-- No borra ni modifica nada existente: solo crea un bucket, dos tablas, una función auxiliar y la función pública.

-- Empresa del usuario y si es admin (mismo dato que usan las políticas de obras)
create or replace function public.bk_empresa() returns text
language sql stable set search_path = ''
as $$ select (auth.jwt() -> 'app_metadata' ->> 'empresa') $$;
create or replace function public.bk_es_admin() returns boolean
language sql stable set search_path = ''
as $$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false) $$;

-- ───────── 1. Bucket privado para los cronogramas, una carpeta por empresa ─────────
-- <empresa>/xml/<archivo>.xml     original de MS Project (lo usa Cómputo)
-- <empresa>/lite/<archivo>.xml    copia sin TimephasedData (la usa BuildPlan)
-- <empresa>/manifest.json         índice con huella, avisos y fecha de subida
-- <empresa>/proyectos.xlsx        estado, comitente, ubicación y código de cada obra
insert into storage.buckets (id, name, public)
values ('cronogramas', 'cronogramas', false)
on conflict (id) do nothing;

create policy cronogramas_leer on storage.objects for select to authenticated
  using (bucket_id = 'cronogramas' and ((storage.foldername(name))[1] = public.bk_empresa() or public.bk_es_admin()));
create policy cronogramas_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'cronogramas' and ((storage.foldername(name))[1] = public.bk_empresa() or public.bk_es_admin()));
create policy cronogramas_reemplazar on storage.objects for update to authenticated
  using (bucket_id = 'cronogramas' and ((storage.foldername(name))[1] = public.bk_empresa() or public.bk_es_admin()))
  with check (bucket_id = 'cronogramas' and ((storage.foldername(name))[1] = public.bk_empresa() or public.bk_es_admin()));
create policy cronogramas_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'cronogramas' and ((storage.foldername(name))[1] = public.bk_empresa() or public.bk_es_admin()));

-- ───────── 2. Tendencia semanal compartida ─────────
-- Una fila por empresa, obra y semana (lunes). La escribe BuildPlan cuando alguien de la empresa lo abre.
create table public.tendencia_obras (
  empresa         text        not null,
  semana          date        not null,
  archivo         text        not null,
  avance          smallint    not null check (avance between 0 and 100),
  vencidas        integer     not null default 0,
  sin_actualizar  integer     not null default 0,
  hechas          integer     not null default 0,
  total           integer     not null default 0,
  registrado      timestamptz not null default now(),
  registrado_por  uuid                 default auth.uid(),
  primary key (empresa, semana, archivo)
);
alter table public.tendencia_obras enable row level security;
create policy tendencia_por_empresa on public.tendencia_obras for all to authenticated
  using (empresa = public.bk_empresa() or public.bk_es_admin())
  with check (empresa = public.bk_empresa() or public.bk_es_admin());

-- ───────── 3. Links públicos (vista cliente y agenda de contratista) ─────────
-- Guardan una foto ya filtrada (sin vencidas, montos ni datos internos) que BuildPlan actualiza
-- cada vez que alguien de la empresa lo abre. Quien tiene el link solo la puede leer con ver_enlace().
create table public.enlaces_publicos (
  token       uuid        primary key default gen_random_uuid(),
  empresa     text        not null,
  tipo        text        not null check (tipo in ('cliente', 'contratista')),
  clave       text        not null,          -- archivo XML de la obra, o nombre del contratista
  datos       jsonb       not null default '{}'::jsonb,
  activo      boolean     not null default true,
  creado      timestamptz not null default now(),
  creado_por  uuid                 default auth.uid(),
  actualizado timestamptz not null default now(),
  unique (empresa, tipo, clave)
);
alter table public.enlaces_publicos enable row level security;
create policy enlaces_por_empresa on public.enlaces_publicos for all to authenticated
  using (empresa = public.bk_empresa() or public.bk_es_admin())
  with check (empresa = public.bk_empresa() or public.bk_es_admin());

-- Lectura pública por token: la foto del link activo y la marca de su empresa (nombre, logo, color). Nunca la tabla.
create function public.ver_enlace(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'tipo', e.tipo, 'datos', e.datos, 'actualizado', e.actualizado,
    'empresa', jsonb_build_object('id', e.empresa, 'nombre', coalesce(m.nombre, e.empresa), 'logo', m.logo_url, 'color', m.color_primario))
  from public.enlaces_publicos e
  left join public.empresas m on m.id = e.empresa
  where e.token = p_token and e.activo
$$;
revoke all on function public.ver_enlace(uuid) from public;
grant execute on function public.ver_enlace(uuid) to anon, authenticated;
