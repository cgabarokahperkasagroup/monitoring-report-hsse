-- ── Fase 1: rekam fleet pada visit agar RLS per-fleet dapat bekerja ───────────

-- 1. Stabilkan pemetaan fleet SMS (id 1..7) -> fleets monitoring (Fleet I..VII)
alter table "monitoring-hsse".fleets
  add column if not exists fleet_external_id integer;

update "monitoring-hsse".fleets set fleet_external_id = 1 where name = 'Fleet I'   and fleet_external_id is null;
update "monitoring-hsse".fleets set fleet_external_id = 2 where name = 'Fleet II'  and fleet_external_id is null;
update "monitoring-hsse".fleets set fleet_external_id = 3 where name = 'Fleet III' and fleet_external_id is null;
update "monitoring-hsse".fleets set fleet_external_id = 4 where name = 'Fleet IV'  and fleet_external_id is null;
update "monitoring-hsse".fleets set fleet_external_id = 5 where name = 'Fleet V'   and fleet_external_id is null;
update "monitoring-hsse".fleets set fleet_external_id = 6 where name = 'Fleet VI'  and fleet_external_id is null;
update "monitoring-hsse".fleets set fleet_external_id = 7 where name = 'Fleet VII' and fleet_external_id is null;

create unique index if not exists fleets_fleet_external_id_key
  on "monitoring-hsse".fleets (fleet_external_id)
  where fleet_external_id is not null;

-- 2. Kolom fleet pada visits (NULL = visit tanpa keterkaitan fleet, mis. owner/site visit)
alter table "monitoring-hsse".visits
  add column if not exists fleet_id uuid references "monitoring-hsse".fleets(id);

create index if not exists visits_fleet_id_idx on "monitoring-hsse".visits (fleet_id);

-- 3. Backfill data lama: 1 vessel visit (kapal SMS 34 = AHT ROYAL KING SULAIMAN -> Fleet VII)
update "monitoring-hsse".visits
  set fleet_id = (select id from "monitoring-hsse".fleets where fleet_external_id = 7)
  where id = '2cee07df-e261-46e1-8fab-94ddeb008982' and fleet_id is null;

-- 4. Expose kolom baru lewat view public (yang dipakai aplikasi)
create or replace view public.fleets as
  select id, name, business_unit_id, op_head_user_id, hse_officer_id,
         visit_frequency, is_active, created_at, fleet_external_id
  from "monitoring-hsse".fleets;

create or replace view public.visits as
  select id, reference_no, visit_type, business_unit_id, vessel_id, site_id,
         visit_date, start_time, end_time, participants, agenda, summary, status,
         created_by, approved_by, approved_at, rejection_notes, attachments,
         created_at, updated_at, vessel_name, vessel_external_id, fleet_id
  from "monitoring-hsse".visits;
