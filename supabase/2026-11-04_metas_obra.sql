-- BkTableros · metas internas por rubro
-- Proyecto Supabase: beuzmwrhqlmjoplsillf (Cómputo de Obras). Mismo criterio multiempresa que el resto de BkTableros.
-- Solo crea la tabla: no toca datos existentes.
--
-- Una meta = "estos rubros tienen que estar listos en tal fecha". BuildPlan calcula el resto desde el cronograma:
--   · rubros     → valores del campo Rubro de MS Project (como aparecen en el XML)
--   · alcance    → 'todo' | 'base' | 'adic' (obra base / adicionales, misma regla del N° Item)
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
