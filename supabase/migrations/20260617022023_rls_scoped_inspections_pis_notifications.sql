-- ── Batasi inspeksi, PIS, notifications (semua tabel saat ini kosong) ─────────

-- 1) Rekam fleet pada inspeksi internal & external (pola sama dgn visits)
alter table "monitoring-hsse".internal_inspections add column if not exists fleet_id uuid references "monitoring-hsse".fleets(id);
alter table "monitoring-hsse".external_inspections add column if not exists fleet_id uuid references "monitoring-hsse".fleets(id);
create index if not exists internal_inspections_fleet_id_idx on "monitoring-hsse".internal_inspections(fleet_id);
create index if not exists external_inspections_fleet_id_idx on "monitoring-hsse".external_inspections(fleet_id);

create or replace view public.internal_inspections as
  select id, reference_no, vessel_id, business_unit_id, inspection_date, lead_inspector, status, result,
         total_items_checked, items_satisfactory, items_deficient, notes, approved_by, approved_at,
         created_by, created_at, updated_at, vessel_name, vessel_external_id, fleet_id
  from "monitoring-hsse".internal_inspections;

create or replace view public.external_inspections as
  select id, reference_no, vessel_id, business_unit_id, inspection_type, inspection_date, inspecting_body,
         lead_inspector, port, status, result, total_observations, critical_observations, major_observations,
         minor_observations, validity_date, next_inspection_date, report_no, notes, actions_taken,
         created_by, created_at, updated_at, vessel_name, vessel_external_id, fleet_id
  from "monitoring-hsse".external_inspections;

-- 2) Helper tambahan
create or replace function "monitoring-hsse".mh_my_fleet_names()
returns setof text language sql stable security definer set search_path = '' as $$
  select f.name from "monitoring-hsse".fleets f where f.id in (select "monitoring-hsse".mh_my_fleet_ids())
$$;

create or replace function "monitoring-hsse".mh_full_name()
returns text language sql stable security definer set search_path = '' as $$
  select u.full_name from "monitoring-hsse".users u where u.id = auth.uid()
$$;

create or replace function "monitoring-hsse".mh_internal_insp_in_scope(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select "monitoring-hsse".mh_is_privileged() or exists (
    select 1 from "monitoring-hsse".internal_inspections i
    where i.id = p_id and (
      ("monitoring-hsse".mh_role() in ('OP_HEAD','STAFF_HSSE') and i.fleet_id in (select "monitoring-hsse".mh_my_fleet_ids()))
      or ("monitoring-hsse".mh_role() = 'PIC' and "monitoring-hsse".mh_has_bu(i.business_unit_id))
    ))
$$;

create or replace function "monitoring-hsse".mh_external_insp_in_scope(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select "monitoring-hsse".mh_is_privileged() or exists (
    select 1 from "monitoring-hsse".external_inspections i
    where i.id = p_id and (
      ("monitoring-hsse".mh_role() in ('OP_HEAD','STAFF_HSSE') and i.fleet_id in (select "monitoring-hsse".mh_my_fleet_ids()))
      or ("monitoring-hsse".mh_role() = 'PIC' and "monitoring-hsse".mh_has_bu(i.business_unit_id))
    ))
$$;

create or replace function "monitoring-hsse".mh_insp_finding_in_scope(p_finding uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select case
      when f.internal_inspection_id is not null then "monitoring-hsse".mh_internal_insp_in_scope(f.internal_inspection_id)
      when f.external_inspection_id is not null then "monitoring-hsse".mh_external_insp_in_scope(f.external_inspection_id)
      else "monitoring-hsse".mh_is_privileged()
    end
    from "monitoring-hsse".inspection_findings f where f.id = p_finding
  ), false)
$$;

create or replace function "monitoring-hsse".mh_pis_in_scope(p_pis uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select "monitoring-hsse".mh_is_privileged() or exists (
    select 1 from "monitoring-hsse".pis_findings p
    where p.id = p_pis and "monitoring-hsse".mh_role() in ('OP_HEAD','STAFF_HSSE') and (
      p.fleet_inspector in (select "monitoring-hsse".mh_my_fleet_names())
      or p.operation_head = "monitoring-hsse".mh_full_name()
    ))
$$;

grant execute on function
  "monitoring-hsse".mh_my_fleet_names(),
  "monitoring-hsse".mh_full_name(),
  "monitoring-hsse".mh_internal_insp_in_scope(uuid),
  "monitoring-hsse".mh_external_insp_in_scope(uuid),
  "monitoring-hsse".mh_insp_finding_in_scope(uuid),
  "monitoring-hsse".mh_pis_in_scope(uuid)
to authenticated, anon;

-- 3a) internal_inspections
drop policy if exists allow_all_internal_inspections on "monitoring-hsse".internal_inspections;
create policy ii_select on "monitoring-hsse".internal_inspections for select to authenticated using (
  "monitoring-hsse".mh_is_privileged()
  or ("monitoring-hsse".mh_role() in ('OP_HEAD','STAFF_HSSE') and fleet_id in (select "monitoring-hsse".mh_my_fleet_ids()))
  or ("monitoring-hsse".mh_role() = 'PIC' and "monitoring-hsse".mh_has_bu(business_unit_id))
);
create policy ii_insert on "monitoring-hsse".internal_inspections for insert to authenticated with check (
  "monitoring-hsse".mh_is_privileged()
  or ("monitoring-hsse".mh_role() in ('OP_HEAD','STAFF_HSSE') and fleet_id in (select "monitoring-hsse".mh_my_fleet_ids()))
  or ("monitoring-hsse".mh_role() = 'PIC' and "monitoring-hsse".mh_has_bu(business_unit_id))
);
create policy ii_update on "monitoring-hsse".internal_inspections for update to authenticated
using (
  "monitoring-hsse".mh_is_privileged()
  or ("monitoring-hsse".mh_role() in ('OP_HEAD','STAFF_HSSE') and fleet_id in (select "monitoring-hsse".mh_my_fleet_ids()))
  or ("monitoring-hsse".mh_role() = 'PIC' and "monitoring-hsse".mh_has_bu(business_unit_id))
)
with check (
  "monitoring-hsse".mh_is_privileged()
  or ("monitoring-hsse".mh_role() in ('OP_HEAD','STAFF_HSSE') and fleet_id in (select "monitoring-hsse".mh_my_fleet_ids()))
  or ("monitoring-hsse".mh_role() = 'PIC' and "monitoring-hsse".mh_has_bu(business_unit_id))
);
create policy ii_delete on "monitoring-hsse".internal_inspections for delete to authenticated using (
  "monitoring-hsse".mh_is_privileged()
  or ("monitoring-hsse".mh_role() in ('OP_HEAD','STAFF_HSSE') and fleet_id in (select "monitoring-hsse".mh_my_fleet_ids()))
  or ("monitoring-hsse".mh_role() = 'PIC' and "monitoring-hsse".mh_has_bu(business_unit_id))
);

-- 3b) external_inspections
drop policy if exists allow_all_external_inspections on "monitoring-hsse".external_inspections;
create policy ei_select on "monitoring-hsse".external_inspections for select to authenticated using (
  "monitoring-hsse".mh_is_privileged()
  or ("monitoring-hsse".mh_role() in ('OP_HEAD','STAFF_HSSE') and fleet_id in (select "monitoring-hsse".mh_my_fleet_ids()))
  or ("monitoring-hsse".mh_role() = 'PIC' and "monitoring-hsse".mh_has_bu(business_unit_id))
);
create policy ei_insert on "monitoring-hsse".external_inspections for insert to authenticated with check (
  "monitoring-hsse".mh_is_privileged()
  or ("monitoring-hsse".mh_role() in ('OP_HEAD','STAFF_HSSE') and fleet_id in (select "monitoring-hsse".mh_my_fleet_ids()))
  or ("monitoring-hsse".mh_role() = 'PIC' and "monitoring-hsse".mh_has_bu(business_unit_id))
);
create policy ei_update on "monitoring-hsse".external_inspections for update to authenticated
using (
  "monitoring-hsse".mh_is_privileged()
  or ("monitoring-hsse".mh_role() in ('OP_HEAD','STAFF_HSSE') and fleet_id in (select "monitoring-hsse".mh_my_fleet_ids()))
  or ("monitoring-hsse".mh_role() = 'PIC' and "monitoring-hsse".mh_has_bu(business_unit_id))
)
with check (
  "monitoring-hsse".mh_is_privileged()
  or ("monitoring-hsse".mh_role() in ('OP_HEAD','STAFF_HSSE') and fleet_id in (select "monitoring-hsse".mh_my_fleet_ids()))
  or ("monitoring-hsse".mh_role() = 'PIC' and "monitoring-hsse".mh_has_bu(business_unit_id))
);
create policy ei_delete on "monitoring-hsse".external_inspections for delete to authenticated using (
  "monitoring-hsse".mh_is_privileged()
  or ("monitoring-hsse".mh_role() in ('OP_HEAD','STAFF_HSSE') and fleet_id in (select "monitoring-hsse".mh_my_fleet_ids()))
  or ("monitoring-hsse".mh_role() = 'PIC' and "monitoring-hsse".mh_has_bu(business_unit_id))
);

-- 3c) internal_inspection_schedules (punya fleet_id)
drop policy if exists allow_all_internal_inspection_schedules on "monitoring-hsse".internal_inspection_schedules;
create policy iis_select on "monitoring-hsse".internal_inspection_schedules for select to authenticated using (
  "monitoring-hsse".mh_is_privileged() or fleet_id in (select "monitoring-hsse".mh_my_fleet_ids())
);
create policy iis_insert on "monitoring-hsse".internal_inspection_schedules for insert to authenticated with check (
  "monitoring-hsse".mh_is_privileged() or fleet_id in (select "monitoring-hsse".mh_my_fleet_ids())
);
create policy iis_update on "monitoring-hsse".internal_inspection_schedules for update to authenticated
using ("monitoring-hsse".mh_is_privileged() or fleet_id in (select "monitoring-hsse".mh_my_fleet_ids()))
with check ("monitoring-hsse".mh_is_privileged() or fleet_id in (select "monitoring-hsse".mh_my_fleet_ids()));
create policy iis_delete on "monitoring-hsse".internal_inspection_schedules for delete to authenticated using (
  "monitoring-hsse".mh_is_privileged() or fleet_id in (select "monitoring-hsse".mh_my_fleet_ids())
);

-- 3d) internal_inspection_inspectors (junction)
drop policy if exists allow_all_internal_inspection_inspectors on "monitoring-hsse".internal_inspection_inspectors;
create policy iii_select on "monitoring-hsse".internal_inspection_inspectors for select to authenticated using (
  "monitoring-hsse".mh_internal_insp_in_scope(inspection_id) or user_id = auth.uid()
);
create policy iii_insert on "monitoring-hsse".internal_inspection_inspectors for insert to authenticated with check (
  "monitoring-hsse".mh_internal_insp_in_scope(inspection_id)
);
create policy iii_delete on "monitoring-hsse".internal_inspection_inspectors for delete to authenticated using (
  "monitoring-hsse".mh_internal_insp_in_scope(inspection_id)
);

-- 3e) inspection_findings (anak inspeksi internal/external)
drop policy if exists allow_all_inspection_findings on "monitoring-hsse".inspection_findings;
create policy if_select on "monitoring-hsse".inspection_findings for select to authenticated using (
  "monitoring-hsse".mh_is_privileged()
  or (internal_inspection_id is not null and "monitoring-hsse".mh_internal_insp_in_scope(internal_inspection_id))
  or (external_inspection_id is not null and "monitoring-hsse".mh_external_insp_in_scope(external_inspection_id))
);
create policy if_insert on "monitoring-hsse".inspection_findings for insert to authenticated with check (
  "monitoring-hsse".mh_is_privileged()
  or (internal_inspection_id is not null and "monitoring-hsse".mh_internal_insp_in_scope(internal_inspection_id))
  or (external_inspection_id is not null and "monitoring-hsse".mh_external_insp_in_scope(external_inspection_id))
);
create policy if_update on "monitoring-hsse".inspection_findings for update to authenticated
using (
  "monitoring-hsse".mh_is_privileged()
  or (internal_inspection_id is not null and "monitoring-hsse".mh_internal_insp_in_scope(internal_inspection_id))
  or (external_inspection_id is not null and "monitoring-hsse".mh_external_insp_in_scope(external_inspection_id))
)
with check (
  "monitoring-hsse".mh_is_privileged()
  or (internal_inspection_id is not null and "monitoring-hsse".mh_internal_insp_in_scope(internal_inspection_id))
  or (external_inspection_id is not null and "monitoring-hsse".mh_external_insp_in_scope(external_inspection_id))
);
create policy if_delete on "monitoring-hsse".inspection_findings for delete to authenticated using (
  "monitoring-hsse".mh_is_privileged()
  or (internal_inspection_id is not null and "monitoring-hsse".mh_internal_insp_in_scope(internal_inspection_id))
  or (external_inspection_id is not null and "monitoring-hsse".mh_external_insp_in_scope(external_inspection_id))
);

-- 3f) inspection_finding_progress + closing (anak inspection_findings)
drop policy if exists allow_all_inspection_finding_progress on "monitoring-hsse".inspection_finding_progress;
create policy ifp_select on "monitoring-hsse".inspection_finding_progress for select to authenticated
  using ("monitoring-hsse".mh_insp_finding_in_scope(finding_id));
create policy ifp_insert on "monitoring-hsse".inspection_finding_progress for insert to authenticated
  with check ("monitoring-hsse".mh_insp_finding_in_scope(finding_id));
create policy ifp_update on "monitoring-hsse".inspection_finding_progress for update to authenticated
  using ("monitoring-hsse".mh_insp_finding_in_scope(finding_id))
  with check ("monitoring-hsse".mh_insp_finding_in_scope(finding_id));
create policy ifp_delete on "monitoring-hsse".inspection_finding_progress for delete to authenticated
  using ("monitoring-hsse".mh_insp_finding_in_scope(finding_id));

drop policy if exists allow_all_inspection_finding_closing_requests on "monitoring-hsse".inspection_finding_closing_requests;
create policy ifcr_select on "monitoring-hsse".inspection_finding_closing_requests for select to authenticated
  using ("monitoring-hsse".mh_insp_finding_in_scope(finding_id));
create policy ifcr_insert on "monitoring-hsse".inspection_finding_closing_requests for insert to authenticated
  with check ("monitoring-hsse".mh_insp_finding_in_scope(finding_id));
create policy ifcr_update on "monitoring-hsse".inspection_finding_closing_requests for update to authenticated
  using ("monitoring-hsse".mh_insp_finding_in_scope(finding_id))
  with check ("monitoring-hsse".mh_insp_finding_in_scope(finding_id));
create policy ifcr_delete on "monitoring-hsse".inspection_finding_closing_requests for delete to authenticated
  using ("monitoring-hsse".mh_insp_finding_in_scope(finding_id));

-- 3g) PIS findings (text-based; OP_HEAD/STAFF_HSSE via fleet name / operation_head)
drop policy if exists allow_all_pis_findings on "monitoring-hsse".pis_findings;
create policy pf_select on "monitoring-hsse".pis_findings for select to authenticated using (
  "monitoring-hsse".mh_is_privileged()
  or ("monitoring-hsse".mh_role() in ('OP_HEAD','STAFF_HSSE')
      and (fleet_inspector in (select "monitoring-hsse".mh_my_fleet_names()) or operation_head = "monitoring-hsse".mh_full_name()))
);
create policy pf_insert on "monitoring-hsse".pis_findings for insert to authenticated with check (
  "monitoring-hsse".mh_is_privileged()
  or ("monitoring-hsse".mh_role() in ('OP_HEAD','STAFF_HSSE')
      and (fleet_inspector in (select "monitoring-hsse".mh_my_fleet_names()) or operation_head = "monitoring-hsse".mh_full_name()))
);
create policy pf_update on "monitoring-hsse".pis_findings for update to authenticated
using (
  "monitoring-hsse".mh_is_privileged()
  or ("monitoring-hsse".mh_role() in ('OP_HEAD','STAFF_HSSE')
      and (fleet_inspector in (select "monitoring-hsse".mh_my_fleet_names()) or operation_head = "monitoring-hsse".mh_full_name()))
)
with check (
  "monitoring-hsse".mh_is_privileged()
  or ("monitoring-hsse".mh_role() in ('OP_HEAD','STAFF_HSSE')
      and (fleet_inspector in (select "monitoring-hsse".mh_my_fleet_names()) or operation_head = "monitoring-hsse".mh_full_name()))
);
create policy pf_delete on "monitoring-hsse".pis_findings for delete to authenticated using (
  "monitoring-hsse".mh_is_privileged()
  or ("monitoring-hsse".mh_role() in ('OP_HEAD','STAFF_HSSE')
      and (fleet_inspector in (select "monitoring-hsse".mh_my_fleet_names()) or operation_head = "monitoring-hsse".mh_full_name()))
);

-- 3h) PIS progress + closing (anak pis_findings)
drop policy if exists allow_all_pis_progress_entries on "monitoring-hsse".pis_progress_entries;
create policy ppe_select on "monitoring-hsse".pis_progress_entries for select to authenticated
  using ("monitoring-hsse".mh_pis_in_scope(pis_finding_id));
create policy ppe_insert on "monitoring-hsse".pis_progress_entries for insert to authenticated
  with check ("monitoring-hsse".mh_pis_in_scope(pis_finding_id));
create policy ppe_update on "monitoring-hsse".pis_progress_entries for update to authenticated
  using ("monitoring-hsse".mh_pis_in_scope(pis_finding_id))
  with check ("monitoring-hsse".mh_pis_in_scope(pis_finding_id));
create policy ppe_delete on "monitoring-hsse".pis_progress_entries for delete to authenticated
  using ("monitoring-hsse".mh_pis_in_scope(pis_finding_id));

drop policy if exists allow_all_pis_closing_requests on "monitoring-hsse".pis_closing_requests;
create policy pcr_select on "monitoring-hsse".pis_closing_requests for select to authenticated
  using ("monitoring-hsse".mh_pis_in_scope(pis_finding_id));
create policy pcr_insert on "monitoring-hsse".pis_closing_requests for insert to authenticated
  with check ("monitoring-hsse".mh_pis_in_scope(pis_finding_id));
create policy pcr_update on "monitoring-hsse".pis_closing_requests for update to authenticated
  using ("monitoring-hsse".mh_pis_in_scope(pis_finding_id))
  with check ("monitoring-hsse".mh_pis_in_scope(pis_finding_id));
create policy pcr_delete on "monitoring-hsse".pis_closing_requests for delete to authenticated
  using ("monitoring-hsse".mh_pis_in_scope(pis_finding_id));

-- 3i) notifications (inbox pribadi: hanya milik user sendiri)
drop policy if exists allow_all_notifications on "monitoring-hsse".notifications;
create policy notif_select on "monitoring-hsse".notifications for select to authenticated using (user_id = auth.uid());
create policy notif_insert on "monitoring-hsse".notifications for insert to authenticated with check (true);
create policy notif_update on "monitoring-hsse".notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notif_delete on "monitoring-hsse".notifications for delete to authenticated using (user_id = auth.uid());

-- 4) Aktifkan enforcement lewat view public
alter view public.internal_inspections set (security_invoker = true);
alter view public.external_inspections set (security_invoker = true);
alter view public.internal_inspection_schedules set (security_invoker = true);
alter view public.internal_inspection_inspectors set (security_invoker = true);
alter view public.inspection_findings set (security_invoker = true);
alter view public.inspection_finding_progress set (security_invoker = true);
alter view public.inspection_finding_closing_requests set (security_invoker = true);
alter view public.pis_findings set (security_invoker = true);
alter view public.pis_progress_entries set (security_invoker = true);
alter view public.pis_closing_requests set (security_invoker = true);
alter view public.notifications set (security_invoker = true);
