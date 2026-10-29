-- BkTableros · lista de directores de obra por empresa
-- Proyecto Supabase: beuzmwrhqlmjoplsillf (Cómputo de Obras). Mismo criterio multiempresa que el resto de BkTableros.
-- Reemplaza la lista fija del código (['alex','mariana']). Solo crea la tabla y carga los dos directores actuales.
--
-- Cómo se reconoce a un director en el cronograma (recursos de MS Project):
--   · nombre    → cómo se muestra en el filtro de Inicio. También se reconoce escrito igual en MS Project.
--   · variantes → otras formas en que aparece en MS Project ("Mariana V", "M. Valdez").
--                 Una variante de UNA sola palabra toma todo recurso cuyo primer nombre empieza así:
--                 "alex" reconoce Alex, Alexandra y Alexis.
--   · activo    → false lo saca del filtro sin borrar la fila.

create table public.directores_obra (
  id          uuid        primary key default gen_random_uuid(),
  empresa     text        not null,
  nombre      text        not null,
  variantes   text[]      not null default '{}',
  activo      boolean     not null default true,
  creado      timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  unique (empresa, nombre)
);
alter table public.directores_obra enable row level security;
create policy directores_por_empresa on public.directores_obra for all to authenticated
  using (empresa = public.bk_empresa() or public.bk_es_admin())
  with check (empresa = public.bk_empresa() or public.bk_es_admin());

insert into public.directores_obra (empresa, nombre, variantes) values
  ('bauvek', 'Alexandra Arevalo', array['alex']),
  ('bauvek', 'Mariana Valdez', array['mariana']);
