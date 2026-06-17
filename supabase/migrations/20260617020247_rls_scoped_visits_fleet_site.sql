-- ── Fase 2: RLS ber-scope untuk visits / visit_schedules / vessel_visit_compliance ──
-- Helper SECURITY DEFINER (bypass RLS internal -> hindari rekursi), search_path terkunci.

create or replace function "monitoring-hsse".mh_role()
returns text language sql stable security definer set search_path = '' as $$
  select u.role from "monitoring-hsse".users u where u.id = auth.uid()
$$;

create or replace function "monitoring-hsse".mh_is_privileged()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select u.role = any (array['SUPER_ADMIN','ADMIN','MANAGEMENT','HEAD_HSSE','VIEWER'])
       from "monitoring-hsse".users u where u.id = auth.uid()),
    false)
$$;

-- Semua fleet yang menjadi tanggung jawab user (OP_HEAD memimpin / STAFF_HSSE menangani / users.fleet_id).
create or replace function "monitoring-hsse".mh_my_fleet_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select f.id from "monitoring-hsse".fleets f where f.op_head_user_id = auth.uid()
  union
  select f.id from "monitoring-hsse".fleets f where f.hse_officer_id = auth.uid()
  union
  select u.fleet_id from "monitoring-hsse".users u where u.id = auth.uid() and u.fleet_id is not null
$$;

create or replace function "monitoring-hsse".mh_has_site(p_site uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_site is not null and exists (
    select 1 from "monitoring-hsse".user_sites us
    where us.user_id = auth.uid() and us.site_id = p_site)
$$;

create or replace function "monitoring-hsse".mh_has_bu(p_bu uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_bu is not null and exists (
    select 1 from "monitoring-hsse".user_business_units ub
    where ub.user_id = auth.uid() and ub.business_unit_id = p_bu)
$$;

grant execute on function
  "monitoring-hsse".mh_role(),
  "monitoring-hsse".mh_is_privileged(),
  "monitoring-hsse".mh_my_fleet_ids(),
  "monitoring-hsse".mh_has_site(uuid),
  "monitoring-hsse".mh_has_bu(uuid)
to authenticated, anon;

-- ── visits: ganti allow_all dengan policy ber-scope per peran ────────────────
drop policy if exists allow_all_visits on "monitoring-hsse".visits;

create policy visits_select on "monitoring-hsse".visits for select to authenticated using (
  "monitoring-hsse".mh_is_privileged()
  or ("monitoring-hsse".mh_role() in ('OP_HEAD','STAFF_HSSE') and fleet_id in (select "monitoring-hsse".mh_my_fleet_ids()))
  or ("monitoring-hsse".mh_role() = 'SITE_MGR' and "monitoring-hsse".mh_has_site(site_id))
  or ("monitoring-hsse".mh_role() = 'PIC' and "monitoring-hsse".mh_has_bu(business_unit_id))
);

create policy visits_insert on "monitoring-hsse".visits for insert to authenticated with check (
  "monitoring-hsse".mh_is_privileged()
  or ("monitoring-hsse".mh_role() in ('OP_HEAD','STAFF_HSSE') and fleet_id in (select "monitoring-hsse".mh_my_fleet_ids()))
  or ("monitoring-hsse".mh_role() = 'SITE_MGR' and "monitoring-hsse".mh_has_site(site_id))
  or ("monitoring-hsse".mh_role() = 'PIC' and "monitoring-hsse".mh_has_bu(business_unit_id))
);

create policy visits_update on "monitoring-hsse".visits for update to authenticated
using (
  "monitoring-hsse".mh_is_privileged()
  or ("monitoring-hsse".mh_role() in ('OP_HEAD','STAFF_HSSE') and fleet_id in (select "monitoring-hsse".mh_my_fleet_ids()))
  or ("monitoring-hsse".mh_role() = 'SITE_MGR' and "monitoring-hsse".mh_has_site(site_id))
  or ("monitoring-hsse".mh_role() = 'PIC' and "monitoring-hsse".mh_has_bu(business_unit_id))
)
with check (
  "monitoring-hsse".mh_is_privileged()
  or ("monitoring-hsse".mh_role() in ('OP_HEAD','STAFF_HSSE') and fleet_id in (select "monitoring-hsse".mh_my_fleet_ids()))
  or ("monitoring-hsse".mh_role() = 'SITE_MGR' and "monitoring-hsse".mh_has_site(site_id))
  or ("monitoring-hsse".mh_role() = 'PIC' and "monitoring-hsse".mh_has_bu(business_unit_id))
);

create policy visits_delete on "monitoring-hsse".visits for delete to authenticated using (
  "monitoring-hsse".mh_is_privileged()
  or ("monitoring-hsse".mh_role() in ('OP_HEAD','STAFF_HSSE') and fleet_id in (select "monitoring-hsse".mh_my_fleet_ids()))
  or ("monitoring-hsse".mh_role() = 'SITE_MGR' and "monitoring-hsse".mh_has_site(site_id))
  or ("monitoring-hsse".mh_role() = 'PIC' and "monitoring-hsse".mh_has_bu(business_unit_id))
);

-- ── visit_schedules: fleet-scope (OP_HEAD/STAFF_HSSE), privileged lihat semua ──
drop policy if exists allow_all_visit_schedules on "monitoring-hsse".visit_schedules;

create policy vs_select on "monitoring-hsse".visit_schedules for select to authenticated using (
  "monitoring-hsse".mh_is_privileged() or fleet_id in (select "monitoring-hsse".mh_my_fleet_ids())
);
create policy vs_insert on "monitoring-hsse".visit_schedules for insert to authenticated with check (
  "monitoring-hsse".mh_is_privileged() or fleet_id in (select "monitoring-hsse".mh_my_fleet_ids())
);
create policy vs_update on "monitoring-hsse".visit_schedules for update to authenticated
using ("monitoring-hsse".mh_is_privileged() or fleet_id in (select "monitoring-hsse".mh_my_fleet_ids()))
with check ("monitoring-hsse".mh_is_privileged() or fleet_id in (select "monitoring-hsse".mh_my_fleet_ids()));
create policy vs_delete on "monitoring-hsse".visit_schedules for delete to authenticated using (
  "monitoring-hsse".mh_is_privileged() or fleet_id in (select "monitoring-hsse".mh_my_fleet_ids())
);

-- ── vessel_visit_compliance: fleet-scope ────────────────────────────────────
drop policy if exists allow_all_vessel_visit_compliance on "monitoring-hsse".vessel_visit_compliance;

create policy vvc_select on "monitoring-hsse".vessel_visit_compliance for select to authenticated using (
  "monitoring-hsse".mh_is_privileged() or fleet_id in (select "monitoring-hsse".mh_my_fleet_ids())
);
create policy vvc_insert on "monitoring-hsse".vessel_visit_compliance for insert to authenticated with check (
  "monitoring-hsse".mh_is_privileged() or fleet_id in (select "monitoring-hsse".mh_my_fleet_ids())
);
create policy vvc_update on "monitoring-hsse".vessel_visit_compliance for update to authenticated
using ("monitoring-hsse".mh_is_privileged() or fleet_id in (select "monitoring-hsse".mh_my_fleet_ids()))
with check ("monitoring-hsse".mh_is_privileged() or fleet_id in (select "monitoring-hsse".mh_my_fleet_ids()));
create policy vvc_delete on "monitoring-hsse".vessel_visit_compliance for delete to authenticated using (
  "monitoring-hsse".mh_is_privileged() or fleet_id in (select "monitoring-hsse".mh_my_fleet_ids())
);
