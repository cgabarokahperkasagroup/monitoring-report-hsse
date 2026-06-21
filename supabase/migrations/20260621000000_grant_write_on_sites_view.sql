-- Bug: tambah site tidak muncul; hapus site malah balik lagi setelah refresh.
-- Penyebab: view public.sites hanya memberi role `authenticated` hak SELECT,
-- sehingga INSERT/UPDATE/DELETE dari aplikasi (admin Master Data) ditolak
-- dengan "permission denied for view sites" dan gagal diam-diam.
-- Tabel dasar monitoring-hsse.sites berkebijakan allow_all, jadi cukup
-- meneruskan hak tulis di level view, menyamai pola public.business_units_mh.
grant insert, update, delete on public.sites to authenticated;
