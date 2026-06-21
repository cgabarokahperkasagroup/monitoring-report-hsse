-- Sisa view master-data yang bisa diedit dari admin Master Data tapi hanya
-- memberi `authenticated` hak SELECT -> write gagal diam-diam
-- ("permission denied for view ..."). Semua tabel dasar berkebijakan allow_all.
grant insert, update, delete on public.external_inspection_types to authenticated;
grant insert, update, delete on public.pis_categories to authenticated;
grant insert, update, delete on public.pis_finding_types to authenticated;
grant insert, update, delete on public.pis_perusahaan to authenticated;
grant insert, update, delete on public.roles to authenticated;
