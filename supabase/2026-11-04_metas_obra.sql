-- BkTableros · metas internas por rubro
-- Proyecto Supabase: beuzmwrhqlmjoplsillf (Cómputo de Obras). Mismo criterio multiempresa que el resto de BkTableros.
-- Solo crea la tabla: no toca datos existentes.
--
-- Una meta = "estas tareas tienen que estar listas en tal fecha". BuildPlan calcula el resto desde el cronograma.
-- (Primera versión por rubros; abajo se cambia a tareas del cronograma.)
--   · fecha      → fecha comprometida; null = sin fecha (por ejemplo, rubros frenados por el cliente)
--   · suspendida → true la muestra en gris y no cuenta como atrasada
-- No cambia el semáforo contractual ni se muestra en los links de cliente o contratista.
-- Leen todos los usuarios de la empresa; crean, editan y borran solo los admin.

create table public.metas_obra (
  id          uuid        primary key default gen_random_uuid(),
  empresa     text        not null,
  archivo     text        not null,
  nombre      text        not null check (length(trim(nombre)) > 0),
  rubros      text[]      not null default '{}',
  alcance     text        not null default 'todo' check (alcance in ('todo','base','adic')),
  fecha       date,
  suspendida  boolean     not null default false,
  nota        text,
  creado      timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index metas_obra_empresa_archivo on public.metas_obra (empresa, archivo);

alter table public.metas_obra enable row level security;
create policy metas_leer on public.metas_obra for select to authenticated
  using (empresa = public.bk_empresa() or public.bk_es_admin());
create policy metas_crear on public.metas_obra for insert to authenticated
  with check (public.bk_es_admin());
create policy metas_editar on public.metas_obra for update to authenticated
  using (public.bk_es_admin()) with check (public.bk_es_admin());
create policy metas_borrar on public.metas_obra for delete to authenticated
  using (public.bk_es_admin());

-- ───────── 2026-11-04 (tarde): las metas se arman con tareas del cronograma, no con rubros ─────────
-- tareas = [{uid, nombre, wbs}] de MS Project (macrotareas o tareas). El UID se conserva entre guardados
-- del .xml; si no aparece, BuildPlan la busca por nombre. La tabla estaba vacía.
alter table public.metas_obra add column tareas jsonb not null default '[]'::jsonb;
alter table public.metas_obra drop column rubros;
alter table public.metas_obra drop column alcance;
