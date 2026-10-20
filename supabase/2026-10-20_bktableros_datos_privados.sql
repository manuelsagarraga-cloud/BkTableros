-- BkTableros · datos privados, tendencia compartida y links públicos con token
-- Proyecto Supabase: beuzmwrhqlmjoplsillf (Cómputo de Obras). Mismo criterio de acceso que el bucket "pagos":
-- usuarios con app_metadata.empresa = 'bauvek' o app_metadata.role = 'admin'.
-- No borra ni modifica nada existente: solo crea un bucket, dos tablas y una función.

-- ───────── 1. Bucket privado para los cronogramas ─────────
-- Estructura:  xml/<archivo>.xml       original de MS Project (lo usa Cómputo)
--              lite/<archivo>.xml      copia sin TimephasedData (la usa BuildPlan)
--              manifest.json           índice con huella, avisos y fecha de subida
--              Proyectos_Bauvek.xlsx   estado, comitente, ubicación y código de cada obra
insert into storage.buckets (id, name, public)
values ('cronogramas', 'cronogramas', false)
on conflict (id) do nothing;

create policy cronogramas_leer on storage.objects for select to authenticated
  using (bucket_id = 'cronogramas' and (
    (auth.jwt() -> 'app_metadata' ->> 'empresa') = 'bauvek' or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'));
create policy cronogramas_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'cronogramas' and (
    (auth.jwt() -> 'app_metadata' ->> 'empresa') = 'bauvek' or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'));
create policy cronogramas_reemplazar on storage.objects for update to authenticated
  using (bucket_id = 'cronogramas' and (
    (auth.jwt() -> 'app_metadata' ->> 'empresa') = 'bauvek' or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'))
  with check (bucket_id = 'cronogramas');
create policy cronogramas_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'cronogramas' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ───────── 2. Tendencia semanal compartida ─────────
-- Una fila por obra y semana (lunes). La escribe BuildPlan cuando alguien de Bauvek lo abre;
-- si se abre varias veces en la semana, queda la última foto.
create table public.tendencia_obras (
  semana          date        not null,
  archivo         text        not null,
  avance          smallint    not null check (avance between 0 and 100),
  vencidas        integer     not null default 0,
  sin_actualizar  integer     not null default 0,
  hechas          integer     not null default 0,
  total           integer     not null default 0,
  registrado      timestamptz not null default now(),
  registrado_por  uuid                 default auth.uid(),
  primary key (semana, archivo)
);
alter table public.tendencia_obras enable row level security;
create policy tendencia_bauvek on public.tendencia_obras for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'empresa') = 'bauvek' or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'empresa') = 'bauvek' or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ───────── 3. Links públicos (vista cliente y agenda de contratista) ─────────
-- Guardan una foto ya filtrada (sin vencidas, montos ni datos internos) que BuildPlan actualiza
-- cada vez que alguien de Bauvek lo abre. Quien tiene el link solo puede leer esa foto, a través de ver_enlace().
create table public.enlaces_publicos (
  token       uuid        primary key default gen_random_uuid(),
  tipo        text        not null check (tipo in ('cliente', 'contratista')),
  clave       text        not null,          -- archivo XML de la obra, o nombre del contratista
  datos       jsonb       not null default '{}'::jsonb,
  activo      boolean     not null default true,
  creado      timestamptz not null default now(),
  creado_por  uuid                 default auth.uid(),
  actualizado timestamptz not null default now(),
  unique (tipo, clave)
);
alter table public.enlaces_publicos enable row level security;
create policy enlaces_bauvek on public.enlaces_publicos for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'empresa') = 'bauvek' or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'empresa') = 'bauvek' or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Lectura pública por token: devuelve solo la foto de un link activo, nunca la tabla.
create function public.ver_enlace(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('tipo', e.tipo, 'datos', e.datos, 'actualizado', e.actualizado)
  from public.enlaces_publicos e
  where e.token = p_token and e.activo
$$;
revoke all on function public.ver_enlace(uuid) from public;
grant execute on function public.ver_enlace(uuid) to anon, authenticated;
