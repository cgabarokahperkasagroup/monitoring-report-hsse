-- Tutup akses role anon (pengunjung tanpa login) ke view aplikasi ini.
--
-- Anon key ikut ter-bundle di JavaScript yang ter-deploy, jadi siapa pun bisa
-- memakainya. Sebelum migration ini anon punya SELECT di seluruh 31 view
-- public milik aplikasi, dan 14 di antaranya tidak memakai security_invoker
-- sehingga melewati RLS: direktori staf (public.users: nama, email, peran),
-- penugasan BU, armada, dan kapal bisa dibaca tanpa login.
--
-- Tidak ada fitur aplikasi yang membaca view ini sebelum login: halaman login
-- tidak membaca data, dan form publik Owner Visit memakai RPC SECURITY DEFINER
-- (public_owner_visit_options, submit_public_owner_visit), bukan view.
-- Hak role authenticated tidak diubah di sini.
--
-- View dipilih berdasarkan definisinya yang membaca schema "monitoring-hsse",
-- bukan asal semua view public: proyek Supabase ini dipakai bersama aplikasi
-- lain, dan view milik mereka tidak boleh ikut tersentuh.
--
-- PERHATIAN untuk view baru: default privileges Supabase memberi anon akses ke
-- objek baru di schema public. Setiap view baru aplikasi ini harus diikuti
--   revoke all on public.<view> from anon;
do $$
declare
  v record;
  n int := 0;
begin
  for v in
    select c.relname
    from pg_class c
    join pg_namespace ns on ns.oid = c.relnamespace
    where ns.nspname = 'public'
      and c.relkind = 'v'
      and pg_get_viewdef(c.oid) ilike '%monitoring-hsse%'
  loop
    execute format('revoke all on public.%I from anon', v.relname);
    n := n + 1;
  end loop;
  raise notice 'Akses anon dicabut dari % view aplikasi', n;
end $$;
