# Form Publik Owner Visit — Desain

Tanggal: 2026-09-10
Status: disetujui, siap dibuatkan rencana implementasi

## Masalah

Owner/Direksi mengisi laporan kunjungan sambil berada di lokasi. Saat ini pencatatan
harus lewat aplikasi yang menuntut login, sehingga laporan baru masuk setelah
kunjungan selesai — sering kali diketik ulang oleh staf dari catatan tangan.

Yang dibutuhkan: satu tautan yang bisa langsung dibuka dan diisi di HP tanpa login,
dengan data yang masuk ke sistem Owner Visit yang sudah ada.

## Keputusan yang sudah diambil

| Pertanyaan | Keputusan |
|---|---|
| Pengamanan tautan | Link publik terbuka, tanpa token maupun PIN |
| Alur setelah kirim | Masuk sistem sebagai kunjungan menunggu approval |
| Isi form | Header kunjungan + temuan + foto |
| PIC & tenggat temuan | Otomatis dari prioritas; admin menyesuaikan saat approve |
| Pendekatan teknis | RPC `SECURITY DEFINER` di Postgres (bukan Edge Function, bukan policy insert anon) |

### Konsekuensi link terbuka

Siapa pun yang mengetahui URL dapat mengirim data. Ini keputusan sadar pemilik
produk. Desain menanggungnya dengan tiga lapis: status masuk `SUBMITTED` sehingga
selalu melewati verifikasi manusia sebelum jadi data resmi, rate limit per IP, dan
honeypot untuk bot. Nilai-nilai yang menentukan makna data (tipe kunjungan, status,
pembuat, penanda temuan owner) dikunci di dalam RPC dan tidak bisa disetir payload.

## Arsitektur

```
┌─ Publik (tanpa login) ─────────┐        ┌─ Supabase ───────────────────┐
│ /owner-visit/form              │        │                              │
│                                │  rpc   │ public_owner_visit_options() │
│ 1. muat opsi ──────────────────┼───────▶│   SECURITY DEFINER, anon     │
│    (BU, site, kategori)        │        │   → BU + site + kategori     │
│                                │        │                              │
│ 2. daftar kapal ───────────────┼──▶ SMS API (token sudah client-side)  │
│                                │        │                              │
│ 3. upload foto ────────────────┼───────▶│ storage: finding-photos/     │
│                                │        │   public-owner-visit/*       │
│                                │  rpc   │                              │
│ 4. submit ─────────────────────┼───────▶│ submit_public_owner_visit()  │
│                                │        │   SECURITY DEFINER, anon     │
│ 5. layar sukses + no. referensi│◀───────┤   1 transaksi                │
└────────────────────────────────┘        └──────────────┬───────────────┘
                                                         ▼
                                   Muncul di /visits (menunggu approve)
                                   → Approve → /owner-findings
```

### Integrasi ke sistem yang sudah ada

RPC menulis ke tabel `visits` dan `findings` yang sama dengan yang dipakai aplikasi,
memakai pola `reference_no` yang identik (`VISIT/OWNER/<BU>/<YYYYMM>/<seq>`). Karena
itu tidak ada perubahan pada halaman `/visits`, `/owner-findings`, dashboard, maupun
laporan — data mengalir ke sana lewat query yang sudah berjalan.

### Atribusi pengisi

`visits.created_by` dan `findings.created_by` keduanya `NOT NULL` dengan FK ke
`monitoring-hsse.users`. Tabel itu tidak punya FK ke `auth.users`, sehingga sebuah
baris user sistem bisa dibuat tanpa akun login.

Identitas pengisi sebenarnya direkam di `visits.participants[0]` sebagai nama dan
jabatan yang ia ketik sendiri.

### Kenapa status `SUBMITTED`

Tombol Approve/Reject di `src/pages/VisitDetailPage.tsx:86` hanya muncul ketika
`visit.status === 'SUBMITTED'`. Jika submission publik ditulis sebagai `DRAFT`, ia
akan mendarat di sistem tanpa cara untuk memprosesnya.

## Halaman form publik

Rute `/owner-visit/form`, didaftarkan di luar `AppLayout` dan di luar `PublicRoute` —
mengikuti pola `visits/:id/print` yang sudah ada. Tanpa sidebar, tanpa header, tanpa
redirect; dapat dibuka baik dalam keadaan login maupun tidak.

Bentuknya wizard tiga langkah, bukan satu halaman panjang: form ini diisi sambil
berdiri di lokasi lewat HP, dan satu layar berisi header ditambah sejumlah temuan
beserta foto membuat pengisi kehilangan posisi saat menggulir.

### Langkah 1 — Data Kunjungan

| Field | Wajib | Catatan |
|---|---|---|
| Nama pengisi | ya | masuk ke `participants[0]` |
| Jabatan | tidak | digabung menjadi `"Budi (Direktur Operasi)"` |
| Unit Bisnis | ya | 8 BU dari RPC options |
| Objek kunjungan | ya | pilih Kapal atau Site |
| → Kapal | | dropdown SMS API; memilih kapal mengunci BU ke Shipping dan mengisi `fleet_id` lewat `fleet_external_id`, mengikuti `src/pages/CreateVisitPage.tsx:76` |
| → Site | | dropdown site tersaring per BU |
| Tanggal kunjungan | ya | default hari ini |
| Jam mulai / selesai | tidak | |
| Peserta lain | tidak | dipisah koma, ikut ke `participants` |
| Agenda | tidak | |
| Ringkasan kunjungan | tidak | |

### Langkah 2 — Temuan

Kartu berulang; boleh nol temuan, karena kunjungan tanpa temuan itu sah.

Tiap kartu: Judul (wajib), Deskripsi (wajib), Kategori (wajib, 6 kategori dari RPC),
Prioritas (wajib, default `HIGH` sesuai posisi Owner Visit sebagai prioritas
tertinggi), Foto (banyak, opsional).

Di bawah prioritas ditampilkan keterangan tenggat yang dihitung otomatis, misalnya
"Target penyelesaian otomatis: 14 hari — 24 Sep 2026. PIC & tenggat final ditetapkan
admin saat verifikasi." Pengisi tahu tenggat itu ada tanpa harus memutuskannya.

### Langkah 3 — Tinjau & Kirim

Ringkasan seluruh isian, lalu tombol Kirim. Setelah sukses: layar konfirmasi berisi
nomor referensi dan tombol "Isi kunjungan lain".

### Dua hal yang membuat form ini layak dipakai di lapangan

1. **Autosave ke `localStorage`** pada tiap perubahan. Sinyal putus, HP mati, atau
   browser tertutup tidak berarti mengetik ulang. Draft dihapus hanya setelah kirim
   berhasil.
2. **Kompresi foto di browser** sebelum upload: foto kamera HP 4–8 MB dikecilkan ke
   sekitar 1600px sisi terpanjang dengan kualitas JPEG 80% (umumnya di bawah 500 KB)
   memakai `canvas`. Tanpa ini, mengunggah lima foto di sinyal lemah akan gagal.

### Struktur file

```
src/pages/PublicOwnerVisitFormPage.tsx   orkestrasi wizard + submit
src/components/public/VisitDetailsStep.tsx
src/components/public/FindingsStep.tsx
src/components/public/ReviewStep.tsx
src/hooks/usePublicOwnerVisitForm.ts     state, autosave, validasi klien
src/services/publicOwnerVisit.ts         panggilan 2 RPC + upload foto
src/utils/imageCompress.ts
```

Pemecahan ini menjaga tiap berkas punya satu tanggung jawab: langkah wizard hanya
merender dan melaporkan perubahan, hook memegang seluruh state dan aturan validasi,
service memegang seluruh percakapan dengan Supabase. Halaman tidak tahu bentuk
payload RPC; service tidak tahu bentuk UI.

## Database

Lima migration, mengikuti pola migration yang sudah ada di `supabase/migrations/`.

### 1. User sistem

Satu baris di `monitoring-hsse.users` dengan UUID tetap:
`full_name = 'Owner Visit — Form Publik'`, `role = 'VIEWER'`, `is_active = false`,
`email = 'owner-visit-form@system.local'`. Tanpa baris di `auth.users` sehingga
mustahil dipakai login; `is_active = false` menjaganya keluar dari dropdown PIC.

### 2. Tabel `monitoring-hsse.public_form_submissions`

Kolom: `id`, `client_submission_id` (UNIQUE), `ip`, `user_agent`, `visit_id`,
`created_at`. Dipakai untuk throttling sekaligus jejak audit siapa mengirim apa dan
kapan. RLS aktif; `anon` tidak diberi hak apa pun atas tabel ini — hanya RPC
(`SECURITY DEFINER`) yang menulis dan membacanya.

### 3. RPC `public_owner_visit_options()`

Mengembalikan `jsonb` berisi `{ business_units[], sites[], finding_categories[] }`,
hanya kolom yang diperlukan (`id`, `name`, `code`, `business_unit_id`) dan hanya baris
aktif. Ini menggantikan `GRANT SELECT` ke `anon`: anon tidak pernah menyentuh tabel,
hanya menerima daftar pilihan yang sudah disaring.

### 4. RPC `submit_public_owner_visit(payload jsonb)`

Mengembalikan `jsonb { reference_no, visit_id }`.

Nilai yang dikunci di dalam fungsi dan tidak dapat disetir payload:

```
visit_type        = 'OWNER_VISIT'       findings.status           = 'OPEN'
status            = 'SUBMITTED'         findings.source_type      = 'OWNER_VISIT'
created_by        = <user sistem>       findings.is_owner_finding = true
approved_by       = NULL                findings.assigned_to      = NULL
target_close_date = visit_date + (CRITICAL 7 | HIGH 14 | MEDIUM 30 | LOW 60) hari
```

Validasi sebelum insert; jika ada yang gagal, `RAISE EXCEPTION` membatalkan seluruh
transaksi sehingga tidak ada data separuh jadi:

- BU wajib ada dan aktif; site (jika diisi) wajib milik BU tersebut
- `visit_date` tidak boleh di masa depan dan tidak lebih lama dari 90 hari
- kategori wajib ada di `finding_categories` dan aktif
- prioritas wajib salah satu dari `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`
- batas ukuran: nama ≤120, judul ≤200, deskripsi ≤4000, ringkasan ≤4000 karakter,
  maksimal 30 temuan, maksimal 10 foto per temuan
- URL foto wajib berawalan persis
  `<VITE_SUPABASE_URL>/storage/v1/object/sign/finding-photos/public-owner-visit/`,
  mencegah penyisipan tautan sembarangan ke dalam laporan
- honeypot: field tersembunyi `website` wajib kosong
- rate limit dari header `x-forwarded-for` (diambil alamat pertama pada daftar):
  maksimal 5 kiriman per IP per jam dan 50 kiriman per jam secara global. Bila header
  itu tidak ada, kiriman dicatat dengan `ip = NULL` dan dihitung sebagai satu
  kelompok bersama — batas 5 per jam tetap berlaku untuk seluruh kiriman tanpa IP,
  sehingga ketiadaan header tidak menjadi jalan pintas melewati throttle

`reference_no` dibuat di dalam transaksi dengan
`pg_advisory_xact_lock(hashtext(prefix))`. Versi client-side yang ada sekarang
(`src/hooks/useVisitsData.ts:178`) dapat menghasilkan nomor kembar bila dua orang
submit bersamaan; di dalam RPC hal itu tertutup.

Kedua fungsi memakai `SECURITY DEFINER` dengan `SET search_path` eksplisit (menutup
pembajakan search_path), `REVOKE EXECUTE FROM PUBLIC`, lalu
`GRANT EXECUTE TO anon, authenticated`.

`search_path` disetel ke `monitoring-hsse, public, pg_temp` sehingga kedua fungsi
membaca `monitoring-hsse.business_units` secara langsung. Ini penting: di schema
`public` terdapat tabel `business_units` milik aplikasi lain, dan aplikasi ini
memakai view `public.business_units_mh`. Menyebut nama tabel tanpa kualifikasi
schema di dalam fungsi akan mengambil data yang salah.

### 5. Policy storage

Bucket `finding-photos` (sudah ada, private): `anon` boleh `INSERT` dan `SELECT`
hanya pada objek berawalan `public-owner-visit/`. `SELECT` diperlukan karena
`createSignedUrl` menuntutnya.

Konsekuensi yang diterima: pemegang anon key dapat melihat daftar isi folder tersebut.
Nama file diacak 32 karakter sehingga tidak dapat ditebak, dan folder ini hanya berisi
foto temuan owner visit. Jika kelak dinilai terlalu longgar, jalan keluarnya adalah
menyimpan path saja lalu menandatangani URL di sisi aplikasi saat ditampilkan;
perubahan itu menyentuh cara temuan menampilkan foto, jadi berada di luar lingkup ini.

## Penanganan error

RPC melempar `RAISE EXCEPTION` dengan `ERRCODE = 'P0001'` dan pesan berawalan kode
mesin. Klien memetakan kode itu ke kalimat yang dimengerti pengisi.

| Kode | Yang dilihat pengisi |
|---|---|
| `OVF_RATE_LIMIT` | "Terlalu banyak kiriman dari perangkat ini. Coba lagi dalam 1 jam." |
| `OVF_INVALID_BU` / `OVF_INVALID_SITE` | "Unit bisnis atau lokasi tidak dikenali. Muat ulang halaman." |
| `OVF_INVALID_DATE` | "Tanggal kunjungan tidak valid (maksimal 90 hari ke belakang, tidak boleh di masa depan)." |
| `OVF_INVALID_CATEGORY` | "Kategori temuan tidak dikenali. Muat ulang halaman." |
| `OVF_TOO_LARGE` | "Isian melebihi batas. Persingkat deskripsi atau kurangi temuan." |
| `OVF_REJECTED` | "Kiriman ditolak." (honeypot; bot tidak diberi petunjuk) |
| lainnya / kegagalan jaringan | "Gagal mengirim. Data Anda tersimpan di perangkat — tekan Coba Lagi." |

Tiga kegagalan nyata di lapangan dan penanganannya:

1. **Sinyal putus saat submit.** Draft `localStorage` tidak pernah dihapus sebelum RPC
   mengembalikan sukses. Layar error menampilkan tombol Coba Lagi yang mengirim ulang
   payload yang sama.
2. **Tekan Kirim dua kali**, lazim ketika loading terasa lambat. Payload membawa
   `client_submission_id` (UUID dibuat browser). Kolom itu `UNIQUE`; bila sudah ada,
   RPC mengembalikan `reference_no` yang lama alih-alih membuat kunjungan kedua.
   Tombol juga dinonaktifkan selama pengiriman, tetapi penjaga sesungguhnya ada di
   database, bukan di tombol.
3. **Satu foto gagal diunggah.** Unggahan dilakukan per foto sebelum submit, dengan
   status per foto. Yang gagal dapat diulang atau dibuang lewat "Lanjut tanpa foto
   ini"; satu foto rusak tidak menggugurkan seluruh laporan.

Validasi klien mencerminkan aturan server (wajib isi, panjang maksimum, jumlah temuan)
supaya kesalahan ketahuan sebelum data dikirim. Server tetap penentu akhir.

## Verifikasi

Repo ini belum punya infrastruktur test: tidak ada vitest, tidak ada berkas `.spec.ts`,
dan `playwright` terpasang sebagai devDependency tanpa konfigurasi maupun pemakaian.
Verifikasi karena itu dilakukan dalam dua lapis yang bisa dijalankan apa adanya.

**Lapis SQL** — pernyataan `SELECT` terhadap database yang menguji RPC secara langsung:

- jalur sukses: visit dan N findings terbentuk, `reference_no` sesuai pola,
  `visit_type = 'OWNER_VISIT'`, `status = 'SUBMITTED'`, `is_owner_finding = true`,
  `target_close_date` sesuai prioritas
- satu kasus per aturan validasi: BU tidak dikenal, site milik BU lain, tanggal di masa
  depan, tanggal lebih dari 90 hari lalu, kategori nonaktif, 31 temuan, honeypot terisi
- rate limit: kiriman keenam dari IP yang sama dalam satu jam ditolak
- idempotensi: `client_submission_id` yang sama dikirim dua kali menghasilkan satu
  visit dan `reference_no` yang sama

Tiap kasus membersihkan datanya sendiri.

**Lapis browser** — menjalankan dev server, mengisi form lewat browser sampai layar
sukses, lalu membuktikan kunjungan itu muncul di `/visits` dengan tombol Approve
aktif dan, setelah di-approve, temuannya tampil di `/owner-findings`. Ini yang
membuktikan tujuan utama tercapai: data dari form publik benar-benar masuk ke menu
Owner Visit.

## Di luar lingkup

- **Menambahkan vitest atau konfigurasi Playwright.** Itu keputusan untuk seluruh
  repo, bukan sesuatu yang pantas diselipkan lewat satu fitur.
- **Menyimpan path foto dan menandatangani URL saat ditampilkan.** Menyentuh cara
  seluruh temuan menampilkan foto.
- **Menu admin untuk mengelola tautan form** (mencabut, membuat token). Tidak relevan
  selama tautan bersifat terbuka.
- **Notifikasi otomatis saat submission masuk.** Verifikasi mengandalkan daftar
  kunjungan yang sudah ada.
