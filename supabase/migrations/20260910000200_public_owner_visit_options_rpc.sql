-- Pengganti GRANT SELECT ke anon: anon tidak pernah menyentuh tabel, hanya
-- menerima daftar pilihan yang sudah disaring dan dipangkas kolomnya.
create or replace function public.public_owner_visit_options()
returns jsonb
language sql
stable
security definer
set search_path = 'monitoring-hsse', 'public', 'pg_temp'
as $fn$
  select jsonb_build_object(
    'business_units', coalesce((
      select jsonb_agg(jsonb_build_object('id', b.id, 'code', b.code, 'name', b.name) order by b.name)
      from "monitoring-hsse".business_units b
      where b.is_active
    ), '[]'::jsonb),
    'sites', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'business_unit_id', s.business_unit_id) order by s.name)
      from "monitoring-hsse".sites s
      where s.is_active
    ), '[]'::jsonb),
    'finding_categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.name)
      from "monitoring-hsse".finding_categories c
      where c.is_active
    ), '[]'::jsonb)
  );
$fn$;

revoke execute on function public.public_owner_visit_options() from public;
grant execute on function public.public_owner_visit_options() to anon, authenticated;
