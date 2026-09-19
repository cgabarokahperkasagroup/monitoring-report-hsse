-- Tutup akses akun aplikasi LAIN ke data master aplikasi ini.
--
-- Proyek Supabase ini dipakai bersama banyak aplikasi dengan auth yang sama:
-- setiap akun login di aplikasi mana pun berstatus `authenticated`. Tabel dasar
-- berikut punya RLS aktif, tetapi policy satu-satunya adalah
-- allow_all_* (FOR ALL TO public USING (true) WITH CHECK (true)), dan view
-- public-nya berjalan sebagai pemilik (tanpa security_invoker). Akibatnya akun
-- aplikasi lain dapat membaca direktori staf (users: nama, email, peran), armada,
-- kapal, dan penugasan — dan dapat MENULIS data master lewat view yang punya
-- grant insert/update/delete. Op Head dkk. juga bisa menulis data master yang di
-- UI khusus SUPER_ADMIN (rute /admin/master-data tidak dijaga peran).
--
-- Sesudah migration ini:
--   * BACA  : hanya pengguna aktif aplikasi ini (mh_is_app_user). Khusus users,
--             pengguna juga boleh membaca barisnya sendiri, agar login akun
--             nonaktif tetap mendapat pesan "Akun tidak aktif".
--   * TULIS : data master hanya SUPER_ADMIN, sama dengan UI. Tabel users,
--             user_business_units, fleets, vessels tidak punya policy tulis:
--             hanya service_role (Edge Function admin-*) yang menulisnya, dan
--             service_role melewati RLS.
--   * View  : security_invoker = true, supaya policy tabel dasar berlaku.
--
-- SENGAJA TIDAK DIUBAH: public.mh_business_units. View itu tidak dipakai kode
-- aplikasi ini tetapi dipanggil rutin oleh aplikasi lain (pg_stat_statements,
-- pola WHERE code = $1). Isinya hanya kode & nama unit bisnis. View itu tetap
-- berjalan sebagai pemilik, jadi tidak terpengaruh policy baru di bawah.

create or replace function "monitoring-hsse".mh_is_app_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from "monitoring-hsse".users u
    where u.id = auth.uid() and u.is_active
  )
$fn$;

revoke execute on function "monitoring-hsse".mh_is_app_user() from public;
grant execute on function "monitoring-hsse".mh_is_app_user() to authenticated;


-- ── business_units ──────────────────────────────────────────────
drop policy if exists "allow_all_business_units" on "monitoring-hsse".business_units;
create policy "business_units: baca pengguna aplikasi" on "monitoring-hsse".business_units
  for select to authenticated
  using ("monitoring-hsse".mh_is_app_user());
create policy "business_units: tulis super admin" on "monitoring-hsse".business_units
  for all to authenticated
  using ("monitoring-hsse".mh_is_app_user() and "monitoring-hsse".mh_role() = 'SUPER_ADMIN')
  with check ("monitoring-hsse".mh_is_app_user() and "monitoring-hsse".mh_role() = 'SUPER_ADMIN');

-- ── external_inspection_types ───────────────────────────────────
drop policy if exists "allow_all_external_inspection_types" on "monitoring-hsse".external_inspection_types;
create policy "external_inspection_types: baca pengguna aplikasi" on "monitoring-hsse".external_inspection_types
  for select to authenticated
  using ("monitoring-hsse".mh_is_app_user());
create policy "external_inspection_types: tulis super admin" on "monitoring-hsse".external_inspection_types
  for all to authenticated
  using ("monitoring-hsse".mh_is_app_user() and "monitoring-hsse".mh_role() = 'SUPER_ADMIN')
  with check ("monitoring-hsse".mh_is_app_user() and "monitoring-hsse".mh_role() = 'SUPER_ADMIN');

-- ── finding_categories ──────────────────────────────────────────
drop policy if exists "allow_all_finding_categories" on "monitoring-hsse".finding_categories;
create policy "finding_categories: baca pengguna aplikasi" on "monitoring-hsse".finding_categories
  for select to authenticated
  using ("monitoring-hsse".mh_is_app_user());
create policy "finding_categories: tulis super admin" on "monitoring-hsse".finding_categories
  for all to authenticated
  using ("monitoring-hsse".mh_is_app_user() and "monitoring-hsse".mh_role() = 'SUPER_ADMIN')
  with check ("monitoring-hsse".mh_is_app_user() and "monitoring-hsse".mh_role() = 'SUPER_ADMIN');

-- ── fleets ──────────────────────────────────────────────────────
drop policy if exists "allow_all_fleets" on "monitoring-hsse".fleets;
create policy "fleets: baca pengguna aplikasi" on "monitoring-hsse".fleets
  for select to authenticated
  using ("monitoring-hsse".mh_is_app_user());

-- ── vessels ─────────────────────────────────────────────────────
drop policy if exists "allow_all_vessels" on "monitoring-hsse".vessels;
create policy "vessels: baca pengguna aplikasi" on "monitoring-hsse".vessels
  for select to authenticated
  using ("monitoring-hsse".mh_is_app_user());

-- ── pis_categories ──────────────────────────────────────────────
drop policy if exists "allow_all_pis_categories" on "monitoring-hsse".pis_categories;
create policy "pis_categories: baca pengguna aplikasi" on "monitoring-hsse".pis_categories
  for select to authenticated
  using ("monitoring-hsse".mh_is_app_user());
create policy "pis_categories: tulis super admin" on "monitoring-hsse".pis_categories
  for all to authenticated
  using ("monitoring-hsse".mh_is_app_user() and "monitoring-hsse".mh_role() = 'SUPER_ADMIN')
  with check ("monitoring-hsse".mh_is_app_user() and "monitoring-hsse".mh_role() = 'SUPER_ADMIN');

-- ── pis_finding_types ───────────────────────────────────────────
drop policy if exists "allow_all_pis_finding_types" on "monitoring-hsse".pis_finding_types;
create policy "pis_finding_types: baca pengguna aplikasi" on "monitoring-hsse".pis_finding_types
  for select to authenticated
  using ("monitoring-hsse".mh_is_app_user());
create policy "pis_finding_types: tulis super admin" on "monitoring-hsse".pis_finding_types
  for all to authenticated
  using ("monitoring-hsse".mh_is_app_user() and "monitoring-hsse".mh_role() = 'SUPER_ADMIN')
  with check ("monitoring-hsse".mh_is_app_user() and "monitoring-hsse".mh_role() = 'SUPER_ADMIN');

-- ── pis_perusahaan ──────────────────────────────────────────────
drop policy if exists "allow_all_pis_perusahaan" on "monitoring-hsse".pis_perusahaan;
create policy "pis_perusahaan: baca pengguna aplikasi" on "monitoring-hsse".pis_perusahaan
  for select to authenticated
  using ("monitoring-hsse".mh_is_app_user());
create policy "pis_perusahaan: tulis super admin" on "monitoring-hsse".pis_perusahaan
  for all to authenticated
  using ("monitoring-hsse".mh_is_app_user() and "monitoring-hsse".mh_role() = 'SUPER_ADMIN')
  with check ("monitoring-hsse".mh_is_app_user() and "monitoring-hsse".mh_role() = 'SUPER_ADMIN');

-- ── roles ───────────────────────────────────────────────────────
drop policy if exists "allow_all_roles" on "monitoring-hsse".roles;
create policy "roles: baca pengguna aplikasi" on "monitoring-hsse".roles
  for select to authenticated
  using ("monitoring-hsse".mh_is_app_user());
create policy "roles: tulis super admin" on "monitoring-hsse".roles
  for all to authenticated
  using ("monitoring-hsse".mh_is_app_user() and "monitoring-hsse".mh_role() = 'SUPER_ADMIN')
  with check ("monitoring-hsse".mh_is_app_user() and "monitoring-hsse".mh_role() = 'SUPER_ADMIN');

-- ── sites ───────────────────────────────────────────────────────
drop policy if exists "allow_all_sites" on "monitoring-hsse".sites;
create policy "sites: baca pengguna aplikasi" on "monitoring-hsse".sites
  for select to authenticated
  using ("monitoring-hsse".mh_is_app_user());
create policy "sites: tulis super admin" on "monitoring-hsse".sites
  for all to authenticated
  using ("monitoring-hsse".mh_is_app_user() and "monitoring-hsse".mh_role() = 'SUPER_ADMIN')
  with check ("monitoring-hsse".mh_is_app_user() and "monitoring-hsse".mh_role() = 'SUPER_ADMIN');

-- ── user_business_units ─────────────────────────────────────────
drop policy if exists "allow_all_user_business_units" on "monitoring-hsse".user_business_units;
create policy "user_business_units: baca pengguna aplikasi" on "monitoring-hsse".user_business_units
  for select to authenticated
  using ("monitoring-hsse".mh_is_app_user());

-- ── user_sites ──────────────────────────────────────────────────
drop policy if exists "allow_all_user_sites" on "monitoring-hsse".user_sites;
create policy "user_sites: baca pengguna aplikasi" on "monitoring-hsse".user_sites
  for select to authenticated
  using ("monitoring-hsse".mh_is_app_user());
create policy "user_sites: tulis super admin" on "monitoring-hsse".user_sites
  for all to authenticated
  using ("monitoring-hsse".mh_is_app_user() and "monitoring-hsse".mh_role() = 'SUPER_ADMIN')
  with check ("monitoring-hsse".mh_is_app_user() and "monitoring-hsse".mh_role() = 'SUPER_ADMIN');

-- ── users ───────────────────────────────────────────────────────
drop policy if exists "allow_all_users" on "monitoring-hsse".users;
create policy "users: baca pengguna aplikasi" on "monitoring-hsse".users
  for select to authenticated
  using ("monitoring-hsse".mh_is_app_user() or id = auth.uid());

-- ── view: berlakukan policy tabel dasar ──────────────────────────────
alter view public.business_units_mh set (security_invoker = true);
alter view public.external_inspection_types set (security_invoker = true);
alter view public.finding_categories set (security_invoker = true);
alter view public.fleets set (security_invoker = true);
alter view public.mh_vessels set (security_invoker = true);
alter view public.pis_categories set (security_invoker = true);
alter view public.pis_finding_types set (security_invoker = true);
alter view public.pis_perusahaan set (security_invoker = true);
alter view public.roles set (security_invoker = true);
alter view public.sites set (security_invoker = true);
alter view public.user_business_units set (security_invoker = true);
alter view public.user_sites set (security_invoker = true);
alter view public.users set (security_invoker = true);
