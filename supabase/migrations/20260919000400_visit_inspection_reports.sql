-- Isian laporan inspeksi per kunjungan (checklist Y/N, keterangan, diskusi,
-- keluhan, URL foto kunjungan & foto daftar hadir).
--
-- Sebelumnya isian ini HANYA disimpan di sessionStorage browser: hilang saat
-- tab ditutup, tidak terlihat pengguna lain, dan halaman cetak hanya berfungsi
-- di tab yang sama — padahal UI menyatakan "Data otomatis tersimpan". Foto
-- disimpan sebagai base64 di sessionStorage dan bisa melampaui kuota browser.
--
-- Satu baris per kunjungan. `data` mengikuti bentuk VesselInspectionData di
-- src/data/vesselInspectionConstants.ts; foto disimpan sebagai URL Storage
-- (bucket finding-photos, folder visit-reports/<visit_id>/), bukan base64.
create table "monitoring-hsse".visit_inspection_reports (
  visit_id   uuid primary key references "monitoring-hsse".visits(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_by uuid references "monitoring-hsse".users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Pencatat & waktu diisi server, tidak bisa diklaim dari klien.
create or replace function "monitoring-hsse".visit_inspection_reports_stamp()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end
$fn$;

create trigger visit_inspection_reports_stamp
  before insert or update on "monitoring-hsse".visit_inspection_reports
  for each row execute function "monitoring-hsse".visit_inspection_reports_stamp();

-- Akses mengikuti kunjungannya persis (mh_visit_in_scope: privileged, fleet
-- untuk OP_HEAD/STAFF_HSSE, site untuk SITE_MGR, BU untuk PIC), dan hanya untuk
-- pengguna aktif aplikasi ini. Tidak ada policy DELETE: baris ikut terhapus
-- bersama kunjungannya (on delete cascade).
alter table "monitoring-hsse".visit_inspection_reports enable row level security;

create policy "visit_inspection_reports: baca sesuai lingkup kunjungan"
  on "monitoring-hsse".visit_inspection_reports
  for select to authenticated
  using ("monitoring-hsse".mh_is_app_user() and "monitoring-hsse".mh_visit_in_scope(visit_id));

create policy "visit_inspection_reports: isi sesuai lingkup kunjungan"
  on "monitoring-hsse".visit_inspection_reports
  for insert to authenticated
  with check ("monitoring-hsse".mh_is_app_user() and "monitoring-hsse".mh_visit_in_scope(visit_id));

create policy "visit_inspection_reports: ubah sesuai lingkup kunjungan"
  on "monitoring-hsse".visit_inspection_reports
  for update to authenticated
  using ("monitoring-hsse".mh_is_app_user() and "monitoring-hsse".mh_visit_in_scope(visit_id))
  with check ("monitoring-hsse".mh_is_app_user() and "monitoring-hsse".mh_visit_in_scope(visit_id));

revoke all on "monitoring-hsse".visit_inspection_reports from anon;
grant select, insert, update on "monitoring-hsse".visit_inspection_reports to authenticated;

-- View di public mengikuti pola aplikasi ini: security_invoker agar RLS di atas
-- berlaku, dan tidak pernah terbuka untuk anon.
create view public.visit_inspection_reports
  with (security_invoker = true) as
  select visit_id, data, updated_by, updated_at
  from "monitoring-hsse".visit_inspection_reports;

revoke all on public.visit_inspection_reports from anon;
grant select, insert, update on public.visit_inspection_reports to authenticated;

-- Muat ulang cache skema PostgREST agar view baru langsung bisa dipakai.
notify pgrst, 'reload schema';
