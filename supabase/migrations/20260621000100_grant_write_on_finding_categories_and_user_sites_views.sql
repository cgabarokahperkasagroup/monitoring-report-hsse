-- Sama seperti public.sites: view ini hanya memberi `authenticated` hak SELECT,
-- jadi INSERT/UPDATE/DELETE dari aplikasi gagal diam-diam
-- ("permission denied for view ...") -> tambah tak muncul, hapus balik lagi.
-- Tabel dasar berkebijakan allow_all, cukup teruskan hak tulis di level view.
-- finding_categories = tab "Kategori Temuan" di Master Data.
grant insert, update, delete on public.finding_categories to authenticated;
grant insert, update, delete on public.user_sites to authenticated;
