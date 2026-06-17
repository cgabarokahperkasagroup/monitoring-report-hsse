# Aturan Kontrol Akses Per-Peran

Dokumen ini merangkum **siapa boleh melihat & mengubah data apa**. Pembatasan
ditegakkan di **level database (Row Level Security / RLS)**, bukan sekadar
tampilan — jadi tetap berlaku walau diakses lewat URL langsung atau dev tools.

## Peran

| Peran | Singkatan | Lingkup akses |
|---|---|---|
| Super Admin | `SUPER_ADMIN` | Semua data |
| Admin | `ADMIN` | Semua data |
| Manajemen / Direksi | `MANAGEMENT` | Semua data |
| Head HSSE | `HEAD_HSSE` | Semua data |
| Viewer | `VIEWER` | Semua data (baca) |
| Operation Head | `OP_HEAD` | **Hanya fleet yang dipimpin** |
| Staff HSSE | `STAFF_HSSE` | **Hanya fleet yang ditangani** |
| Site Manager | `SITE_MGR` | **Hanya site-nya** |
| PIC | `PIC` | **Hanya unit bisnis (BU)-nya** |

> Lima peran teratas = **akses penuh**. Empat peran bawah = **dibatasi**.

## Pembatasan per modul

| Modul / data | Dasar pembatasan |
|---|---|
| Kunjungan (Visits) | OP_HEAD/STAFF_HSSE → fleet · SITE_MGR → site · PIC → BU |
| Temuan (Findings) + progress + closing | Ikut kunjungan induknya |
| Rencana & Kepatuhan Kunjungan | fleet |
| Inspeksi Internal & External | OP_HEAD/STAFF_HSSE → fleet · PIC → BU |
| Temuan Inspeksi + progress + closing | Ikut inspeksi induknya |
| Jadwal & Inspektur Inspeksi Internal | fleet |
| PIS (findings + progress + closing) | OP_HEAD/STAFF_HSSE → fleet *(pencocokan teks, lihat catatan)* |
| Notifikasi | **Pribadi** — tiap user hanya melihat miliknya sendiri |
| Data master (kategori, tipe, perusahaan, fleet, site, unit bisnis) | Terbuka untuk semua (dibutuhkan untuk dropdown) |

Pembatasan berlaku untuk **baca dan tulis** (lihat, buat, ubah, hapus). Mis.
seorang Operation Head tidak bisa membuat/mengubah kunjungan atau inspeksi pada
fleet lain.

## Bagaimana fleet sebuah data ditentukan

- **Kunjungan & inspeksi kapal** menyimpan kolom `fleet_id`, diisi otomatis dari
  fleet kapal yang dipilih saat input (data kapal berasal dari SMS API).
- **Operation Head** terhubung ke fleet lewat `fleets.op_head_user_id`
  (atau `users.fleet_id`); **Staff HSSE** lewat `fleets.hse_officer_id`.
- Pada form input, daftar kapal otomatis terbatas pada fleet milik OP_HEAD/STAFF_HSSE.

## Catatan & batasan

- **PIS** memakai data teks (`fleet_inspector`, `operation_head`). Pencocokan
  mengandalkan `fleet_inspector` berisi persis nama fleet (`Fleet I`..`Fleet VII`)
  atau `operation_head` berisi persis nama lengkap user. Bila format data nyata
  berbeda, aturan PIS perlu disesuaikan.
- Data master sengaja dibiarkan terbuka karena dipakai untuk pilihan dropdown
  dan tidak bersifat sensitif per-fleet.

## Teknis (untuk pengembang)

- RLS aktif lewat view `public.*` yang di-set `security_invoker = true`, dengan
  policy yang memanggil fungsi helper `monitoring-hsse.mh_*` (SECURITY DEFINER).
- Definisi lengkap ada di `supabase/migrations/`:
  - `20260617020247_rls_scoped_visits_fleet_site.sql`
  - `20260617020928_rls_scoped_findings.sql`
  - `20260617022023_rls_scoped_inspections_pis_notifications.sql`
- Uji ulang dengan impersonasi:
  ```sql
  begin;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"<user-uuid>"}', true);
  select count(*) from public.visits;   -- hasil sesuai lingkup peran user
  rollback;
  ```
