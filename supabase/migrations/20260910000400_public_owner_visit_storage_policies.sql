-- Unggahan dari form publik dikurung ke satu prefix. SELECT diperlukan karena
-- createSignedUrl() menuntutnya; nama berkas diacak 32 karakter agar tidak
-- bisa ditebak.
create policy "public owner visit form uploads"
on storage.objects for insert to anon
with check (bucket_id = 'finding-photos' and name like 'public-owner-visit/%');

create policy "public owner visit form reads"
on storage.objects for select to anon
using (bucket_id = 'finding-photos' and name like 'public-owner-visit/%');
