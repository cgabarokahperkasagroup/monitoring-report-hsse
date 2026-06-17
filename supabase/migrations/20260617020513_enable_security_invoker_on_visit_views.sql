-- Aktifkan RLS-enforcement saat aplikasi mengakses lewat view public.
-- security_invoker = view berjalan sebagai pengguna pemanggil -> RLS base table berlaku.
alter view public.visits set (security_invoker = true);
alter view public.visit_schedules set (security_invoker = true);
alter view public.vessel_visit_compliance set (security_invoker = true);
