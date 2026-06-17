-- ── Tutup kebocoran findings: finding ikut scope visit induknya ──────────────

-- Apakah visit p_visit terlihat oleh user saat ini (logika identik dgn policy visits).
create or replace function "monitoring-hsse".mh_visit_in_scope(p_visit uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select "monitoring-hsse".mh_is_privileged()
    or exists (
      select 1 from "monitoring-hsse".visits v
      where v.id = p_visit and (
        ("monitoring-hsse".mh_role() in ('OP_HEAD','STAFF_HSSE') and v.fleet_id in (select "monitoring-hsse".mh_my_fleet_ids()))
        or ("monitoring-hsse".mh_role() = 'SITE_MGR' and "monitoring-hsse".mh_has_site(v.site_id))
        or ("monitoring-hsse".mh_role() = 'PIC' and "monitoring-hsse".mh_has_bu(v.business_unit_id))
      )
    )
$$;

create or replace function "monitoring-hsse".mh_finding_in_scope(p_finding uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select "monitoring-hsse".mh_visit_in_scope(
    (select f.visit_id from "monitoring-hsse".findings f where f.id = p_finding))
$$;

grant execute on function
  "monitoring-hsse".mh_visit_in_scope(uuid),
  "monitoring-hsse".mh_finding_in_scope(uuid)
to authenticated, anon;

-- ── findings ────────────────────────────────────────────────────────────────
drop policy if exists allow_all_findings on "monitoring-hsse".findings;
create policy findings_select on "monitoring-hsse".findings for select to authenticated
  using ("monitoring-hsse".mh_visit_in_scope(visit_id));
create policy findings_insert on "monitoring-hsse".findings for insert to authenticated
  with check ("monitoring-hsse".mh_visit_in_scope(visit_id));
create policy findings_update on "monitoring-hsse".findings for update to authenticated
  using ("monitoring-hsse".mh_visit_in_scope(visit_id))
  with check ("monitoring-hsse".mh_visit_in_scope(visit_id));
create policy findings_delete on "monitoring-hsse".findings for delete to authenticated
  using ("monitoring-hsse".mh_visit_in_scope(visit_id));

-- ── finding_progress_entries (anak findings) ────────────────────────────────
drop policy if exists allow_all_finding_progress_entries on "monitoring-hsse".finding_progress_entries;
create policy fpe_select on "monitoring-hsse".finding_progress_entries for select to authenticated
  using ("monitoring-hsse".mh_finding_in_scope(finding_id));
create policy fpe_insert on "monitoring-hsse".finding_progress_entries for insert to authenticated
  with check ("monitoring-hsse".mh_finding_in_scope(finding_id));
create policy fpe_update on "monitoring-hsse".finding_progress_entries for update to authenticated
  using ("monitoring-hsse".mh_finding_in_scope(finding_id))
  with check ("monitoring-hsse".mh_finding_in_scope(finding_id));
create policy fpe_delete on "monitoring-hsse".finding_progress_entries for delete to authenticated
  using ("monitoring-hsse".mh_finding_in_scope(finding_id));

-- ── finding_closing_requests (anak findings) ────────────────────────────────
drop policy if exists allow_all_finding_closing_requests on "monitoring-hsse".finding_closing_requests;
create policy fcr_select on "monitoring-hsse".finding_closing_requests for select to authenticated
  using ("monitoring-hsse".mh_finding_in_scope(finding_id));
create policy fcr_insert on "monitoring-hsse".finding_closing_requests for insert to authenticated
  with check ("monitoring-hsse".mh_finding_in_scope(finding_id));
create policy fcr_update on "monitoring-hsse".finding_closing_requests for update to authenticated
  using ("monitoring-hsse".mh_finding_in_scope(finding_id))
  with check ("monitoring-hsse".mh_finding_in_scope(finding_id));
create policy fcr_delete on "monitoring-hsse".finding_closing_requests for delete to authenticated
  using ("monitoring-hsse".mh_finding_in_scope(finding_id));

-- ── Aktifkan enforcement lewat view public ──────────────────────────────────
alter view public.findings set (security_invoker = true);
alter view public.finding_progress_entries set (security_invoker = true);
alter view public.finding_closing_requests set (security_invoker = true);
