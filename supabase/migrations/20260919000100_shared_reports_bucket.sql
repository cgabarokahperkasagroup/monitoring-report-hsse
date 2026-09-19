-- Berkas laporan untuk fitur "Laporan Shareable Link".
--
-- Tombol Generate Link membuat PDF/Excel, menyimpannya di sini, lalu membagikan
-- signed URL 24 jam. Bucket tetap privat: penerima link tidak butuh akses
-- apa pun ke bucket ini — tanda tangan di URL itulah izinnya, dan Supabase
-- menolak URL itu sendiri setelah kedaluwarsa.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shared-reports',
  'shared-reports',
  false,
  20 * 1024 * 1024,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do nothing;

-- Hanya peran berakses penuh (sama dengan yang boleh melihat kartu Shareable
-- Link di UI), dan hanya ke folder bernama id-nya sendiri. SELECT diperlukan
-- karena createSignedUrl() menuntutnya; dibatasi ke folder sendiri agar satu
-- pengguna tidak bisa menandatangani berkas milik pengguna lain.
create policy "shared reports privileged upload own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'shared-reports'
  and (storage.foldername(name))[1] = auth.uid()::text
  and "monitoring-hsse".mh_is_privileged()
);

create policy "shared reports privileged read own folder"
on storage.objects for select to authenticated
using (
  bucket_id = 'shared-reports'
  and (storage.foldername(name))[1] = auth.uid()::text
  and "monitoring-hsse".mh_is_privileged()
);
