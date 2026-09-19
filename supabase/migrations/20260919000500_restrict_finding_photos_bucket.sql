-- Batasi bucket finding-photos ke pengguna aplikasi ini.
--
-- Proyek Supabase ini dipakai bersama banyak aplikasi dengan auth yang sama,
-- sehingga akun login aplikasi mana pun berstatus `authenticated`. Policy lama
-- hanya menyaring bucket_id, jadi akun aplikasi lain bisa melihat, mengunggah,
-- dan MENGHAPUS seluruh foto temuan (terbukti: 28 dari 28 foto dapat dihapus)
-- serta foto laporan kunjungan.
--
-- Bucket ini hanya dipakai aplikasi ini: seluruh 28 berkas berada di findings/
-- dan owner_id-nya pengguna aplikasi ini (0 dari akun lain).
-- Kode memakai: findings/<id>/{initial,progress,closing}, visit-reports/<id>/,
-- dan public-owner-visit/ (form publik, lewat policy anon terpisah).
--
-- Foto ditampilkan lewat signed URL yang tersimpan di database; URL bertoken
-- tidak melewati RLS, jadi foto yang sudah ada tetap tampil.
--
--   SELECT : pengguna aktif aplikasi (dibutuhkan createSignedUrl saat unggah)
--   INSERT : pengguna aktif aplikasi
--   DELETE : pengguna aktif aplikasi, hanya berkas yang ia unggah sendiri.
--            Aplikasi tidak menghapus berkas dari kode; hak paling sempit ini
--            menutup penghapusan massal tanpa mematikan fitur apa pun.
--            Pemilik dicek lewat owner_id (teks): Storage API kini hanya
--            mengisi owner_id dan membiarkan kolom owner (uuid) NULL, sehingga
--            policy yang hanya memeriksa owner tidak pernah mengenali pengunggah
--            baru. owner tetap diperiksa untuk berkas lama.
-- Policy anon untuk form publik (public-owner-visit/) tidak diubah.

drop policy if exists "Authenticated users can view finding photos" on storage.objects;
drop policy if exists "Authenticated users can upload finding photos" on storage.objects;
drop policy if exists "Authenticated users can delete finding photos" on storage.objects;

create policy "finding photos: lihat pengguna aplikasi"
on storage.objects for select to authenticated
using (bucket_id = 'finding-photos' and "monitoring-hsse".mh_is_app_user());

create policy "finding photos: unggah pengguna aplikasi"
on storage.objects for insert to authenticated
with check (bucket_id = 'finding-photos' and "monitoring-hsse".mh_is_app_user());

create policy "finding photos: hapus milik sendiri"
on storage.objects for delete to authenticated
using (
  bucket_id = 'finding-photos'
  and "monitoring-hsse".mh_is_app_user()
  and (owner_id = auth.uid()::text or owner = auth.uid())
);
