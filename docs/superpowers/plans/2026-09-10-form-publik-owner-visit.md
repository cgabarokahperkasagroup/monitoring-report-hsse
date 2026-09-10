# Form Publik Owner Visit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sebuah halaman form di `/owner-visit/form` yang bisa dibuka tanpa login dan mengirim laporan Owner Visit langsung ke tabel `visits` & `findings` yang sudah dipakai aplikasi.

**Architecture:** Halaman publik memanggil dua RPC `SECURITY DEFINER` di schema `public` — satu memberi daftar pilihan (BU, site, kategori), satu menerima seluruh laporan dan menulisnya dalam satu transaksi sebagai `OWNER_VISIT` berstatus `SUBMITTED`. Foto diunggah lebih dulu ke `finding-photos/public-owner-visit/` lewat policy storage khusus `anon`. Role `anon` tidak pernah diberi hak SELECT/INSERT atas tabel mana pun.

**Tech Stack:** React 18 + TypeScript + Vite, react-router-dom v6, Tailwind, `@supabase/supabase-js` v2, Postgres/PL/pgSQL.

Spec: `docs/superpowers/specs/2026-09-10-form-publik-owner-visit-design.md`

## Global Constraints

- **Schema RPC wajib `public`.** PostgREST di proyek ini hanya mengekspos `public` (`admin_delete_user_profile` ada di sana; semua helper `mh_*` di `monitoring-hsse` tidak terpanggil dari klien). Fungsi di `monitoring-hsse` tidak akan bisa dipanggil `supabase.rpc()`.
- **Selalu kualifikasi schema di dalam fungsi.** `public.business_units` adalah tabel milik aplikasi lain; aplikasi ini memakai `public.business_units_mh`. Di dalam RPC, tulis `"monitoring-hsse".business_units` secara eksplisit. Menyebut `business_units` tanpa schema akan mengambil data yang salah.
- **`search_path` fungsi:** `set search_path = 'monitoring-hsse', 'public', 'pg_temp'` pada kedua fungsi.
- **UUID user sistem (dipakai di banyak tempat, harus persis sama):** `00000000-0000-4000-a000-0000000f0001`
- **Prefix URL foto yang sah (persis):** `https://mgxdvnnvruoyhnzgrtur.supabase.co/storage/v1/object/sign/finding-photos/public-owner-visit/`
- **Nilai yang dikunci server-side, tak boleh berasal dari payload:** `visit_type='OWNER_VISIT'`, `status='SUBMITTED'`, `created_by=<user sistem>`, `findings.status='OPEN'`, `findings.source_type='OWNER_VISIT'`, `findings.is_owner_finding=true`, `findings.assigned_to=NULL`.
- **Tenggat otomatis:** CRITICAL 7 hari, HIGH 14, MEDIUM 30, LOW 60 — dihitung dari `visit_date`.
- **Batas ukuran:** nama ≤120, judul ≤200, deskripsi ≤4000, ringkasan ≤4000, agenda ≤4000, ≤30 temuan, ≤10 foto per temuan.
- **Rate limit:** 5 kiriman/IP/jam, 50 kiriman/jam global. Kiriman tanpa header `x-forwarded-for` dicatat `ip = NULL` dan dihitung sebagai satu kelompok bersama.
- **Bahasa antarmuka: Indonesia.** Semua label, pesan error, dan tombol berbahasa Indonesia, mengikuti gaya halaman yang ada.
- **Warna merek:** primer `#1B3A6B`, teks sekunder `#4A5568`. Pakai komponen `Input`, `Textarea`, `Select`, `Button`, `Card` dari `src/components/ui/`.

## Catatan tentang cara verifikasi

Repo ini tidak punya test runner (tidak ada vitest, tidak ada konfigurasi Playwright), dan spec secara eksplisit menempatkan penambahan test framework **di luar lingkup**. Konsekuensinya berbeda per lapisan, dan rencana ini jujur tentang keduanya:

- **Tugas 1–4 (database) benar-benar test-first.** Setiap tugas dimulai dengan pernyataan SQL yang dijalankan lewat MCP `execute_sql` dan **harus gagal** dulu, baru migration ditulis, lalu SQL yang sama dijalankan ulang dan harus lulus. Ini siklus merah-hijau yang sesungguhnya.
- **Tugas 5–9 (frontend) diverifikasi lewat `npm run build` (tsc), `npm run lint`, dan pembuktian di browser** pada Tugas 9. Tidak ada unit test karena tidak ada runner untuk menjalankannya; menuliskan test yang tidak bisa dieksekusi hanya akan jadi hiasan.

Jalankan semua SQL lewat MCP Supabase: `execute_sql` untuk pemeriksaan, `apply_migration` untuk DDL.

## File Structure

| Berkas | Tanggung jawab |
|---|---|
| `supabase/migrations/20260910000100_public_owner_visit_system_user.sql` | User sistem + tabel throttle/audit |
| `supabase/migrations/20260910000200_public_owner_visit_options_rpc.sql` | RPC daftar pilihan |
| `supabase/migrations/20260910000300_public_owner_visit_submit_rpc.sql` | RPC penerima laporan |
| `supabase/migrations/20260910000400_public_owner_visit_storage_policies.sql` | Policy `anon` pada storage |
| `src/utils/imageCompress.ts` | Kompresi foto di browser. Tidak tahu apa-apa soal Supabase |
| `src/services/publicOwnerVisit.ts` | Satu-satunya berkas yang bicara ke Supabase untuk fitur ini: 2 RPC, upload foto, pemetaan pesan error |
| `src/hooks/usePublicOwnerVisitForm.ts` | Seluruh state form, autosave, validasi klien. Tidak merender apa pun |
| `src/components/public/VisitDetailsStep.tsx` | Render langkah 1 |
| `src/components/public/FindingsStep.tsx` | Render langkah 2 |
| `src/components/public/ReviewStep.tsx` | Render langkah 3 |
| `src/pages/PublicOwnerVisitFormPage.tsx` | Merangkai wizard, memanggil service, layar sukses/gagal |
| `src/App.tsx` | Tambah satu rute publik |

Batasnya: komponen langkah hanya menerima nilai dan melaporkan perubahan; hook memegang state dan aturan validasi; service memegang seluruh percakapan dengan Supabase. Halaman tidak tahu bentuk payload RPC, service tidak tahu bentuk UI.

---

### Task 1: User sistem & tabel audit

**Files:**
- Create: `supabase/migrations/20260910000100_public_owner_visit_system_user.sql`

**Interfaces:**
- Produces: baris `"monitoring-hsse".users` dengan id `00000000-0000-4000-a000-0000000f0001`; tabel `"monitoring-hsse".public_form_submissions(id, client_submission_id, ip, user_agent, visit_id, created_at)`. Tugas 3 memakai keduanya.

- [ ] **Step 1: Tulis pemeriksaan yang harus gagal**

Jalankan lewat MCP `execute_sql`:

```sql
select
  (select count(*) from "monitoring-hsse".users
     where id = '00000000-0000-4000-a000-0000000f0001') as system_user,
  (select count(*) from information_schema.tables
     where table_schema = 'monitoring-hsse'
       and table_name = 'public_form_submissions') as audit_table;
```

- [ ] **Step 2: Jalankan dan pastikan gagal**

Harapan: `system_user = 0` dan `audit_table = 0`. Kalau salah satu sudah bernilai 1, migration ini sudah pernah dijalankan — hentikan dan laporkan, jangan menimpa.

- [ ] **Step 3: Terapkan migration**

MCP `apply_migration`, name: `public_owner_visit_system_user`

```sql
-- Pemilik data yang masuk lewat form publik. Tidak punya baris di auth.users,
-- sehingga akun ini mustahil dipakai login. is_active = false menjaganya keluar
-- dari dropdown PIC.
insert into "monitoring-hsse".users (id, full_name, email, role, is_active, must_change_password)
values (
  '00000000-0000-4000-a000-0000000f0001',
  'Owner Visit — Form Publik',
  'owner-visit-form@system.local',
  'VIEWER',
  false,
  false
)
on conflict (id) do nothing;

-- Jejak audit sekaligus dasar rate limit. client_submission_id membuat submit
-- ganda (tombol ditekan dua kali di sinyal lemah) tidak menghasilkan dua kunjungan.
create table "monitoring-hsse".public_form_submissions (
  id                   uuid primary key default gen_random_uuid(),
  client_submission_id uuid not null unique,
  ip                   text,
  user_agent           text,
  visit_id             uuid references "monitoring-hsse".visits(id) on delete set null,
  created_at           timestamptz not null default now()
);

create index public_form_submissions_created_at_idx
  on "monitoring-hsse".public_form_submissions (created_at desc);
create index public_form_submissions_ip_created_at_idx
  on "monitoring-hsse".public_form_submissions (ip, created_at desc);

-- RLS aktif tanpa satu pun policy: tidak ada role klien yang bisa menyentuh tabel
-- ini. Hanya fungsi SECURITY DEFINER (dijalankan sebagai pemilik) yang mengaksesnya.
alter table "monitoring-hsse".public_form_submissions enable row level security;
```

- [ ] **Step 4: Jalankan ulang pemeriksaan Step 1**

Harapan: `system_user = 1`, `audit_table = 1`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260910000100_public_owner_visit_system_user.sql
git commit -m "feat(db): user sistem & tabel audit untuk form publik owner visit"
```

---

### Task 2: RPC daftar pilihan

**Files:**
- Create: `supabase/migrations/20260910000200_public_owner_visit_options_rpc.sql`

**Interfaces:**
- Produces: `public.public_owner_visit_options() returns jsonb` — `{ business_units: [{id, code, name}], sites: [{id, name, business_unit_id}], finding_categories: [{id, name}] }`. Tugas 6 memanggilnya.

- [ ] **Step 1: Tulis pemeriksaan yang harus gagal**

```sql
select public.public_owner_visit_options();
```

- [ ] **Step 2: Jalankan dan pastikan gagal**

Harapan: error `42883 function public.public_owner_visit_options() does not exist`.

- [ ] **Step 3: Terapkan migration**

MCP `apply_migration`, name: `public_owner_visit_options_rpc`

```sql
-- Pengganti GRANT SELECT ke anon: anon tidak pernah menyentuh tabel, hanya
-- menerima daftar pilihan yang sudah disaring dan dipangkas kolomnya.
create or replace function public.public_owner_visit_options()
returns jsonb
language sql
stable
security definer
set search_path = 'monitoring-hsse', 'public', 'pg_temp'
as $fn$
  select jsonb_build_object(
    'business_units', coalesce((
      select jsonb_agg(jsonb_build_object('id', b.id, 'code', b.code, 'name', b.name) order by b.name)
      from "monitoring-hsse".business_units b
      where b.is_active
    ), '[]'::jsonb),
    'sites', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'business_unit_id', s.business_unit_id) order by s.name)
      from "monitoring-hsse".sites s
      where s.is_active
    ), '[]'::jsonb),
    'finding_categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.name)
      from "monitoring-hsse".finding_categories c
      where c.is_active
    ), '[]'::jsonb)
  );
$fn$;

revoke execute on function public.public_owner_visit_options() from public;
grant execute on function public.public_owner_visit_options() to anon, authenticated;
```

- [ ] **Step 4: Jalankan ulang dan periksa isinya**

```sql
select
  jsonb_array_length(public.public_owner_visit_options() -> 'business_units')     as bu,
  jsonb_array_length(public.public_owner_visit_options() -> 'sites')              as sites,
  jsonb_array_length(public.public_owner_visit_options() -> 'finding_categories') as cats;
```

Harapan: `bu = 8`, `cats = 6`, `sites` ≥ 0. Semua angka bukan NULL.

- [ ] **Step 5: Pastikan `anon` benar-benar boleh memanggilnya**

```sql
select has_function_privilege('anon', 'public.public_owner_visit_options()', 'execute') as anon_ok;
```

Harapan: `anon_ok = true`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260910000200_public_owner_visit_options_rpc.sql
git commit -m "feat(db): RPC daftar pilihan untuk form publik owner visit"
```

---

### Task 3: RPC penerima laporan

Ini tugas terberat. Kerjakan berurutan; jangan gabungkan langkah.

**Files:**
- Create: `supabase/migrations/20260910000300_public_owner_visit_submit_rpc.sql`

**Interfaces:**
- Consumes: user sistem & `public_form_submissions` dari Tugas 1.
- Produces: `public.submit_public_owner_visit(payload jsonb) returns jsonb` → `{ visit_id: uuid, reference_no: text, duplicate: boolean }`.

  Bentuk payload yang diterima (Tugas 6 membangunnya persis seperti ini):

  ```jsonc
  {
    "client_submission_id": "uuid",       // wajib
    "website": "",                        // honeypot, wajib kosong
    "reporter_name": "Budi",              // wajib
    "reporter_position": "Direktur Operasi",
    "other_participants": ["Ani", "Cak"],
    "business_unit_id": "uuid",           // wajib
    "site_id": "uuid|null",               // site_id atau vessel_external_id wajib salah satu
    "vessel_external_id": 12,
    "vessel_name": "MT Barokah 01",
    "fleet_external_id": 3,
    "visit_date": "2026-09-10",           // wajib
    "start_time": "08:00", "end_time": "11:30",
    "agenda": "...", "summary": "...",
    "findings": [
      { "title": "...", "description": "...", "category": "Safety",
        "priority": "HIGH", "photos": ["https://.../public-owner-visit/ab...jpg"] }
    ]
  }
  ```

- [ ] **Step 1: Tulis pemeriksaan yang harus gagal**

```sql
select public.submit_public_owner_visit('{}'::jsonb);
```

- [ ] **Step 2: Jalankan dan pastikan gagal**

Harapan: error `42883 function public.submit_public_owner_visit(jsonb) does not exist`.

- [ ] **Step 3: Terapkan migration**

MCP `apply_migration`, name: `public_owner_visit_submit_rpc`

```sql
create or replace function public.submit_public_owner_visit(payload jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = 'monitoring-hsse', 'public', 'pg_temp'
as $fn$
declare
  c_system_user  constant uuid := '00000000-0000-4000-a000-0000000f0001';
  c_photo_prefix constant text :=
    'https://mgxdvnnvruoyhnzgrtur.supabase.co/storage/v1/object/sign/finding-photos/public-owner-visit/';

  v_client_id   uuid;
  v_bu_id       uuid;
  v_site_id     uuid;
  v_vessel_ext  int;
  v_fleet_ext   int;
  v_visit_date  date;
  v_start       time;
  v_end         time;

  v_bu_code     text;
  v_fleet_id    uuid;
  v_vessel_name text;
  v_ip          text;
  v_ua          text;
  v_name        text;
  v_position    text;
  v_agenda      text;
  v_summary     text;
  v_participants text[];

  v_prefix      text;
  v_ref         text;
  v_visit_id    uuid;
  v_seq         int;

  v_findings    jsonb;
  v_find_prefix text;
  v_find_seq    int;
  v_rec         record;
  v_title       text;
  v_desc        text;
  v_category    text;
  v_priority    text;
  v_photos      jsonb;
  v_photo       text;
  v_days        int;
begin
  -- ── Honeypot ─────────────────────────────────────────────────────────────
  -- Pesan sengaja tidak menjelaskan apa pun; bot tidak diberi petunjuk.
  if coalesce(payload ->> 'website', '') <> '' then
    raise exception 'OVF_REJECTED: kiriman ditolak' using errcode = 'P0001';
  end if;

  -- ── Konversi tipe ────────────────────────────────────────────────────────
  -- Dikumpulkan di satu blok supaya nilai yang bentuknya salah menghasilkan
  -- kode error kita sendiri, bukan 22P02 mentah dari Postgres.
  begin
    v_client_id  := nullif(payload ->> 'client_submission_id', '')::uuid;
    v_bu_id      := nullif(payload ->> 'business_unit_id', '')::uuid;
    v_site_id    := nullif(payload ->> 'site_id', '')::uuid;
    v_vessel_ext := nullif(payload ->> 'vessel_external_id', '')::int;
    v_fleet_ext  := nullif(payload ->> 'fleet_external_id', '')::int;
    v_visit_date := nullif(payload ->> 'visit_date', '')::date;
    v_start      := nullif(payload ->> 'start_time', '')::time;
    v_end        := nullif(payload ->> 'end_time', '')::time;
  exception when invalid_text_representation
                 or invalid_datetime_format
                 or datetime_field_overflow then
    raise exception 'OVF_BAD_PAYLOAD: format data tidak valid' using errcode = 'P0001';
  end;

  if v_client_id is null then
    raise exception 'OVF_BAD_PAYLOAD: client_submission_id wajib diisi' using errcode = 'P0001';
  end if;

  -- ── Idempotensi ──────────────────────────────────────────────────────────
  -- Submit kedua dengan id yang sama mengembalikan hasil yang lama, bukan
  -- membuat kunjungan kedua.
  select v.id, v.reference_no
    into v_visit_id, v_ref
  from "monitoring-hsse".public_form_submissions s
  join "monitoring-hsse".visits v on v.id = s.visit_id
  where s.client_submission_id = v_client_id;

  if v_visit_id is not null then
    return jsonb_build_object('visit_id', v_visit_id, 'reference_no', v_ref, 'duplicate', true);
  end if;

  -- ── Rate limit ───────────────────────────────────────────────────────────
  v_ip := nullif(btrim(split_part(
            coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1)), '');
  v_ua := left(coalesce(current_setting('request.headers', true)::json ->> 'user-agent', ''), 500);

  -- "is not distinct from" menyatukan seluruh kiriman tanpa IP ke dalam satu
  -- kelompok, sehingga hilangnya header bukan jalan pintas melewati throttle.
  if (select count(*) from "monitoring-hsse".public_form_submissions
        where created_at > now() - interval '1 hour'
          and ip is not distinct from v_ip) >= 5 then
    raise exception 'OVF_RATE_LIMIT: batas kiriman per jam terlampaui' using errcode = 'P0001';
  end if;

  if (select count(*) from "monitoring-hsse".public_form_submissions
        where created_at > now() - interval '1 hour') >= 50 then
    raise exception 'OVF_RATE_LIMIT: batas kiriman global per jam terlampaui' using errcode = 'P0001';
  end if;

  -- ── Unit bisnis & lokasi ─────────────────────────────────────────────────
  select b.code into v_bu_code
  from "monitoring-hsse".business_units b
  where b.id = v_bu_id and b.is_active;

  if v_bu_code is null then
    raise exception 'OVF_INVALID_BU: unit bisnis tidak dikenali' using errcode = 'P0001';
  end if;

  if v_site_id is not null then
    perform 1 from "monitoring-hsse".sites s
    where s.id = v_site_id and s.business_unit_id = v_bu_id and s.is_active;
    if not found then
      raise exception 'OVF_INVALID_SITE: lokasi tidak dikenali untuk unit bisnis ini' using errcode = 'P0001';
    end if;
  end if;

  if v_site_id is null and v_vessel_ext is null then
    raise exception 'OVF_BAD_PAYLOAD: objek kunjungan wajib dipilih' using errcode = 'P0001';
  end if;

  -- Kapal berasal dari SMS API, bukan tabel vessels lokal: disimpan sebagai
  -- snapshot, sama seperti createVisit() di aplikasi.
  v_vessel_name := left(nullif(btrim(coalesce(payload ->> 'vessel_name', '')), ''), 200);
  if v_fleet_ext is not null then
    select f.id into v_fleet_id
    from "monitoring-hsse".fleets f
    where f.fleet_external_id = v_fleet_ext;
  end if;

  -- ── Tanggal ──────────────────────────────────────────────────────────────
  if v_visit_date is null
     or v_visit_date > current_date
     or v_visit_date < current_date - 90 then
    raise exception 'OVF_INVALID_DATE: tanggal kunjungan di luar rentang yang diizinkan' using errcode = 'P0001';
  end if;

  -- ── Pengisi & peserta ────────────────────────────────────────────────────
  v_name     := btrim(coalesce(payload ->> 'reporter_name', ''));
  v_position := btrim(coalesce(payload ->> 'reporter_position', ''));

  if v_name = '' then
    raise exception 'OVF_BAD_PAYLOAD: nama pengisi wajib diisi' using errcode = 'P0001';
  end if;
  if length(v_name) > 120 or length(v_position) > 120 then
    raise exception 'OVF_TOO_LARGE: nama atau jabatan melebihi 120 karakter' using errcode = 'P0001';
  end if;

  if v_position <> '' then
    v_name := v_name || ' (' || v_position || ')';
  end if;

  v_participants := array[v_name] || coalesce((
    select array_agg(btrim(t.x))
    from jsonb_array_elements_text(
           case when jsonb_typeof(payload -> 'other_participants') = 'array'
                then payload -> 'other_participants' else '[]'::jsonb end) as t(x)
    where btrim(t.x) <> ''
  ), '{}'::text[]);

  v_agenda  := nullif(btrim(coalesce(payload ->> 'agenda', '')), '');
  v_summary := nullif(btrim(coalesce(payload ->> 'summary', '')), '');
  if length(coalesce(v_agenda, '')) > 4000 or length(coalesce(v_summary, '')) > 4000 then
    raise exception 'OVF_TOO_LARGE: agenda atau ringkasan melebihi 4000 karakter' using errcode = 'P0001';
  end if;

  -- ── Temuan: validasi seluruhnya sebelum satu baris pun ditulis ───────────
  v_findings := case when jsonb_typeof(payload -> 'findings') = 'array'
                     then payload -> 'findings' else '[]'::jsonb end;

  if jsonb_array_length(v_findings) > 30 then
    raise exception 'OVF_TOO_LARGE: maksimal 30 temuan per kunjungan' using errcode = 'P0001';
  end if;

  for v_rec in select value as j from jsonb_array_elements(v_findings) loop
    v_title    := btrim(coalesce(v_rec.j ->> 'title', ''));
    v_desc     := btrim(coalesce(v_rec.j ->> 'description', ''));
    v_category := btrim(coalesce(v_rec.j ->> 'category', ''));
    v_priority := upper(btrim(coalesce(v_rec.j ->> 'priority', '')));

    if v_title = '' or v_desc = '' then
      raise exception 'OVF_BAD_PAYLOAD: judul dan deskripsi temuan wajib diisi' using errcode = 'P0001';
    end if;
    if length(v_title) > 200 or length(v_desc) > 4000 then
      raise exception 'OVF_TOO_LARGE: judul atau deskripsi temuan melebihi batas' using errcode = 'P0001';
    end if;
    if v_priority not in ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') then
      raise exception 'OVF_BAD_PAYLOAD: prioritas temuan tidak valid' using errcode = 'P0001';
    end if;

    perform 1 from "monitoring-hsse".finding_categories c
    where c.name = v_category and c.is_active;
    if not found then
      raise exception 'OVF_INVALID_CATEGORY: kategori temuan tidak dikenali' using errcode = 'P0001';
    end if;

    v_photos := case when jsonb_typeof(v_rec.j -> 'photos') = 'array'
                     then v_rec.j -> 'photos' else '[]'::jsonb end;
    if jsonb_array_length(v_photos) > 10 then
      raise exception 'OVF_TOO_LARGE: maksimal 10 foto per temuan' using errcode = 'P0001';
    end if;
    for v_photo in select value from jsonb_array_elements_text(v_photos) loop
      if position(c_photo_prefix in v_photo) <> 1 then
        raise exception 'OVF_BAD_PAYLOAD: tautan foto tidak sah' using errcode = 'P0001';
      end if;
    end loop;
  end loop;

  -- ── Nomor referensi kunjungan ────────────────────────────────────────────
  -- Advisory lock menutup celah nomor kembar saat dua orang submit bersamaan.
  v_prefix := 'VISIT/OWNER/' || v_bu_code || '/' || to_char(v_visit_date, 'YYYYMM') || '/';
  perform pg_advisory_xact_lock(hashtext(v_prefix));

  select coalesce(max(regexp_replace(v.reference_no, '^.*/', '')::int), 0) + 1
    into v_seq
  from "monitoring-hsse".visits v
  where v.reference_no like v_prefix || '%'
    and regexp_replace(v.reference_no, '^.*/', '') ~ '^[0-9]+$';

  v_ref := v_prefix || lpad(v_seq::text, 3, '0');

  insert into "monitoring-hsse".visits (
    reference_no, visit_type, business_unit_id,
    vessel_id, vessel_name, vessel_external_id, fleet_id, site_id,
    visit_date, start_time, end_time, participants, agenda, summary,
    status, created_by, attachments
  ) values (
    v_ref, 'OWNER_VISIT', v_bu_id,
    null, v_vessel_name, v_vessel_ext, v_fleet_id, v_site_id,
    v_visit_date, v_start, v_end, v_participants, v_agenda, v_summary,
    'SUBMITTED', c_system_user, '{}'::text[]
  )
  returning id into v_visit_id;

  -- ── Temuan ───────────────────────────────────────────────────────────────
  v_find_prefix := 'FIND/' || v_bu_code || '/' || to_char(v_visit_date, 'YYYYMM') || '/';
  perform pg_advisory_xact_lock(hashtext(v_find_prefix));

  select coalesce(max(regexp_replace(f.reference_no, '^.*/', '')::int), 0)
    into v_find_seq
  from "monitoring-hsse".findings f
  where f.reference_no like v_find_prefix || '%'
    and regexp_replace(f.reference_no, '^.*/', '') ~ '^[0-9]+$';

  for v_rec in select value as j from jsonb_array_elements(v_findings) loop
    v_priority := upper(btrim(v_rec.j ->> 'priority'));
    v_days := case v_priority
                when 'CRITICAL' then 7
                when 'HIGH'     then 14
                when 'MEDIUM'   then 30
                else 60
              end;
    v_find_seq := v_find_seq + 1;
    v_photos := case when jsonb_typeof(v_rec.j -> 'photos') = 'array'
                     then v_rec.j -> 'photos' else '[]'::jsonb end;

    insert into "monitoring-hsse".findings (
      reference_no, visit_id, business_unit_id, title, description, category, priority,
      source_type, is_owner_finding, assigned_to, target_close_date, status,
      initial_photos, closing_evidence, created_by
    ) values (
      v_find_prefix || lpad(v_find_seq::text, 3, '0'),
      v_visit_id, v_bu_id,
      btrim(v_rec.j ->> 'title'), btrim(v_rec.j ->> 'description'),
      btrim(v_rec.j ->> 'category'), v_priority,
      'OWNER_VISIT', true, null,
      v_visit_date + v_days, 'OPEN',
      coalesce((select array_agg(value) from jsonb_array_elements_text(v_photos)), '{}'::text[]),
      '{}'::text[], c_system_user
    );
  end loop;

  insert into "monitoring-hsse".public_form_submissions (client_submission_id, ip, user_agent, visit_id)
  values (v_client_id, v_ip, v_ua, v_visit_id);

  return jsonb_build_object('visit_id', v_visit_id, 'reference_no', v_ref, 'duplicate', false);
end;
$fn$;

revoke execute on function public.submit_public_owner_visit(jsonb) from public;
grant execute on function public.submit_public_owner_visit(jsonb) to anon, authenticated;
```

- [ ] **Step 4: Buktikan jalur sukses**

```sql
select public.submit_public_owner_visit(jsonb_build_object(
  'client_submission_id', '11111111-1111-4111-a111-111111111111',
  'website', '',
  'reporter_name', 'Uji Coba',
  'reporter_position', 'Direktur',
  'other_participants', jsonb_build_array('Peserta Dua'),
  'business_unit_id', (select id from "monitoring-hsse".business_units where code = 'SHP'),
  'vessel_external_id', 1,
  'vessel_name', 'KAPAL UJI',
  'visit_date', current_date::text,
  'summary', 'Ringkasan uji coba',
  'findings', jsonb_build_array(
    jsonb_build_object('title','Temuan uji','description','Deskripsi uji','category','Safety','priority','HIGH'),
    jsonb_build_object('title','Temuan dua','description','Deskripsi dua','category','Maintenance','priority','CRITICAL')
  )
));
```

Harapan: mengembalikan `{"visit_id": "...", "reference_no": "VISIT/OWNER/SHP/YYYYMM/00N", "duplicate": false}`.

Lalu periksa isinya:

```sql
select v.visit_type, v.status, v.created_by, v.participants, v.vessel_external_id,
       f.reference_no, f.priority, f.is_owner_finding, f.source_type, f.status as f_status,
       f.assigned_to, f.target_close_date - v.visit_date as hari
from "monitoring-hsse".visits v
join "monitoring-hsse".findings f on f.visit_id = v.id
where v.id = (select visit_id from "monitoring-hsse".public_form_submissions
              where client_submission_id = '11111111-1111-4111-a111-111111111111')
order by f.reference_no;
```

Harapan: `visit_type = OWNER_VISIT`, `status = SUBMITTED`, `created_by = 00000000-0000-4000-a000-0000000f0001`, `participants = {"Uji Coba (Direktur)","Peserta Dua"}`, dua baris temuan dengan `is_owner_finding = true`, `source_type = OWNER_VISIT`, `f_status = OPEN`, `assigned_to = null`, dan `hari` = 14 untuk HIGH serta 7 untuk CRITICAL.

- [ ] **Step 5: Buktikan idempotensi**

Jalankan **persis** perintah `select public.submit_public_owner_visit(...)` dari Step 4 sekali lagi.

Harapan: mengembalikan `reference_no` dan `visit_id` yang sama dengan `"duplicate": true`.

```sql
select count(*) as jumlah_visit
from "monitoring-hsse".visits
where reference_no = '<reference_no dari Step 4>';
```

Harapan: `jumlah_visit = 1`.

- [ ] **Step 6: Buktikan tiap aturan validasi menolak**

Jalankan satu per satu; **semua harus error**, dengan kode yang disebutkan.

```sql
-- OVF_REJECTED (honeypot)
select public.submit_public_owner_visit(jsonb_build_object(
  'client_submission_id', gen_random_uuid(), 'website', 'http://spam',
  'reporter_name','X','business_unit_id',(select id from "monitoring-hsse".business_units where code='SHP'),
  'vessel_external_id',1,'visit_date',current_date::text));

-- OVF_INVALID_BU
select public.submit_public_owner_visit(jsonb_build_object(
  'client_submission_id', gen_random_uuid(), 'reporter_name','X',
  'business_unit_id','22222222-2222-4222-a222-222222222222',
  'vessel_external_id',1,'visit_date',current_date::text));

-- OVF_INVALID_DATE (masa depan)
select public.submit_public_owner_visit(jsonb_build_object(
  'client_submission_id', gen_random_uuid(), 'reporter_name','X',
  'business_unit_id',(select id from "monitoring-hsse".business_units where code='SHP'),
  'vessel_external_id',1,'visit_date',(current_date + 1)::text));

-- OVF_INVALID_DATE (lebih dari 90 hari lalu)
select public.submit_public_owner_visit(jsonb_build_object(
  'client_submission_id', gen_random_uuid(), 'reporter_name','X',
  'business_unit_id',(select id from "monitoring-hsse".business_units where code='SHP'),
  'vessel_external_id',1,'visit_date',(current_date - 91)::text));

-- OVF_BAD_PAYLOAD (objek kunjungan tidak dipilih)
select public.submit_public_owner_visit(jsonb_build_object(
  'client_submission_id', gen_random_uuid(), 'reporter_name','X',
  'business_unit_id',(select id from "monitoring-hsse".business_units where code='SHP'),
  'visit_date',current_date::text));

-- OVF_INVALID_SITE (site milik unit bisnis lain)
select public.submit_public_owner_visit(jsonb_build_object(
  'client_submission_id', gen_random_uuid(), 'reporter_name','X',
  'business_unit_id',(select id from "monitoring-hsse".business_units where code='SHP'),
  'site_id',(select s.id from "monitoring-hsse".sites s
             join "monitoring-hsse".business_units b on b.id = s.business_unit_id
             where b.code <> 'SHP' limit 1),
  'visit_date',current_date::text));
-- Bila query site di atas tidak menemukan baris (belum ada site di luar SHP),
-- lewati kasus ini dan catat alasannya; jangan tandai lulus begitu saja.

-- OVF_BAD_PAYLOAD (prioritas tidak valid)
select public.submit_public_owner_visit(jsonb_build_object(
  'client_submission_id', gen_random_uuid(), 'reporter_name','X',
  'business_unit_id',(select id from "monitoring-hsse".business_units where code='SHP'),
  'vessel_external_id',1,'visit_date',current_date::text,
  'findings', jsonb_build_array(jsonb_build_object(
    'title','T','description','D','category','Safety','priority','URGENT'))));

-- OVF_INVALID_CATEGORY
select public.submit_public_owner_visit(jsonb_build_object(
  'client_submission_id', gen_random_uuid(), 'reporter_name','X',
  'business_unit_id',(select id from "monitoring-hsse".business_units where code='SHP'),
  'vessel_external_id',1,'visit_date',current_date::text,
  'findings', jsonb_build_array(jsonb_build_object(
    'title','T','description','D','category','Kategori Palsu','priority','HIGH'))));

-- OVF_BAD_PAYLOAD (tautan foto di luar prefix yang sah)
select public.submit_public_owner_visit(jsonb_build_object(
  'client_submission_id', gen_random_uuid(), 'reporter_name','X',
  'business_unit_id',(select id from "monitoring-hsse".business_units where code='SHP'),
  'vessel_external_id',1,'visit_date',current_date::text,
  'findings', jsonb_build_array(jsonb_build_object(
    'title','T','description','D','category','Safety','priority','HIGH',
    'photos', jsonb_build_array('https://situs-lain.example/foto.jpg')))));

-- OVF_TOO_LARGE (31 temuan)
select public.submit_public_owner_visit(jsonb_build_object(
  'client_submission_id', gen_random_uuid(), 'reporter_name','X',
  'business_unit_id',(select id from "monitoring-hsse".business_units where code='SHP'),
  'vessel_external_id',1,'visit_date',current_date::text,
  'findings', (select jsonb_agg(jsonb_build_object(
                 'title','T','description','D','category','Safety','priority','HIGH'))
               from generate_series(1,31))));
```

Setelah semua penolakan di atas, pastikan tidak ada satu pun data separuh jadi yang tertinggal:

```sql
select count(*) as sisa
from "monitoring-hsse".visits
where created_by = '00000000-0000-4000-a000-0000000f0001'
  and reference_no <> '<reference_no dari Step 4>';
```

Harapan: `sisa = 0`.

- [ ] **Step 7: Buktikan rate limit menolak kiriman keenam**

```sql
do $$
declare i int;
begin
  for i in 1..4 loop
    perform public.submit_public_owner_visit(jsonb_build_object(
      'client_submission_id', gen_random_uuid(), 'reporter_name','Rate '||i,
      'business_unit_id',(select id from "monitoring-hsse".business_units where code='SHP'),
      'vessel_external_id',1,'vessel_name','KAPAL UJI','visit_date',current_date::text));
  end loop;
end $$;
```

Kiriman Step 4 sudah tercatat satu, jadi setelah blok di atas totalnya lima. Sekarang jalankan satu lagi:

```sql
select public.submit_public_owner_visit(jsonb_build_object(
  'client_submission_id', gen_random_uuid(), 'reporter_name','Rate 6',
  'business_unit_id',(select id from "monitoring-hsse".business_units where code='SHP'),
  'vessel_external_id',1,'visit_date',current_date::text));
```

Harapan: error `OVF_RATE_LIMIT`.

> Catatan: MCP `execute_sql` berjalan tanpa header `x-forwarded-for`, jadi seluruh kiriman uji masuk ke kelompok `ip = NULL` — persis kelompok yang dimaksud aturan tersebut.

- [ ] **Step 8: Bersihkan seluruh data uji**

```sql
delete from "monitoring-hsse".findings
where visit_id in (select id from "monitoring-hsse".visits
                   where created_by = '00000000-0000-4000-a000-0000000f0001');
delete from "monitoring-hsse".public_form_submissions;
delete from "monitoring-hsse".visits
where created_by = '00000000-0000-4000-a000-0000000f0001';

select
  (select count(*) from "monitoring-hsse".visits
     where created_by = '00000000-0000-4000-a000-0000000f0001') as sisa_visit,
  (select count(*) from "monitoring-hsse".public_form_submissions) as sisa_submission;
```

Harapan: keduanya `0`.

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/20260910000300_public_owner_visit_submit_rpc.sql
git commit -m "feat(db): RPC penerima laporan form publik owner visit"
```

---

### Task 4: Policy storage untuk unggahan publik

**Files:**
- Create: `supabase/migrations/20260910000400_public_owner_visit_storage_policies.sql`

**Interfaces:**
- Produces: `anon` boleh INSERT & SELECT pada `storage.objects` di bucket `finding-photos` dengan nama berawalan `public-owner-visit/`. Tugas 6 mengunggah ke sana.

- [ ] **Step 1: Tulis pemeriksaan yang harus gagal**

```sql
select count(*) as policies
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname like 'public owner visit form%';
```

- [ ] **Step 2: Jalankan dan pastikan gagal**

Harapan: `policies = 0`.

- [ ] **Step 3: Terapkan migration**

MCP `apply_migration`, name: `public_owner_visit_storage_policies`

```sql
-- Unggahan dari form publik dikurung ke satu prefix. SELECT diperlukan karena
-- createSignedUrl() menuntutnya; nama berkas diacak 32 karakter agar tidak
-- bisa ditebak.
create policy "public owner visit form uploads"
on storage.objects for insert to anon
with check (bucket_id = 'finding-photos' and name like 'public-owner-visit/%');

create policy "public owner visit form reads"
on storage.objects for select to anon
using (bucket_id = 'finding-photos' and name like 'public-owner-visit/%');
```

- [ ] **Step 4: Jalankan ulang pemeriksaan Step 1**

Harapan: `policies = 2`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260910000400_public_owner_visit_storage_policies.sql
git commit -m "feat(db): policy storage untuk unggahan form publik owner visit"
```

---

### Task 5: Kompresi foto

**Files:**
- Create: `src/utils/imageCompress.ts`

**Interfaces:**
- Produces: `compressImage(file: File, maxEdge?: number, quality?: number): Promise<File>` — Tugas 6 memakainya.

- [ ] **Step 1: Tulis berkasnya**

```ts
/**
 * Kecilkan foto kamera HP sebelum diunggah. Foto 4–8 MB dari kamera ponsel
 * hampir pasti gagal terunggah di sinyal pelabuhan; hasil kompresi umumnya
 * di bawah 500 KB.
 *
 * Mengembalikan berkas aslinya bila kompresi tidak menguntungkan atau gagal —
 * form tidak boleh berhenti hanya karena satu foto tidak bisa dikecilkan.
 */
export async function compressImage(file: File, maxEdge = 1600, quality = 0.8): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))

    if (scale === 1 && file.size <= 500 * 1024) {
      bitmap.close()
      return file
    }

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    )
    if (!blob || blob.size >= file.size) return file

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg' })
  } catch {
    return file
  }
}
```

- [ ] **Step 2: Verifikasi tipe & lint**

```bash
npm run build && npm run lint
```

Harapan: tsc selesai tanpa error, lint tanpa error baru.

- [ ] **Step 3: Commit**

```bash
git add src/utils/imageCompress.ts
git commit -m "feat: util kompresi foto di browser"
```

---

### Task 6: Service — dua RPC, unggah foto, pemetaan error

**Files:**
- Create: `src/services/publicOwnerVisit.ts`

**Interfaces:**
- Consumes: `compressImage` (Tugas 5); `supabaseClient` dari `src/lib/supabase.ts`; RPC dari Tugas 2–3; policy storage dari Tugas 4.
- Produces — dipakai Tugas 7, 8, 9:
  - `type OwnerVisitOptions = { business_units: OptionBU[]; sites: OptionSite[]; finding_categories: OptionCategory[] }`
  - `type OptionBU = { id: string; code: string; name: string }`
  - `type OptionSite = { id: string; name: string; business_unit_id: string }`
  - `type OptionCategory = { id: string; name: string }`
  - `type FindingPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'`
  - `type SubmitPayload` (bentuk lengkap di kode)
  - `fetchOwnerVisitOptions(): Promise<OwnerVisitOptions>`
  - `uploadFindingPhoto(file: File): Promise<string>`
  - `submitPublicOwnerVisit(payload: SubmitPayload): Promise<{ visit_id: string; reference_no: string; duplicate: boolean }>`
  - `friendlyError(message: string): string`
  - `DUE_DAYS: Record<FindingPriority, number>`

- [ ] **Step 1: Tulis berkasnya**

```ts
import { supabaseClient } from '@/lib/supabase'
import { compressImage } from '@/utils/imageCompress'

export type FindingPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export interface OptionBU { id: string; code: string; name: string }
export interface OptionSite { id: string; name: string; business_unit_id: string }
export interface OptionCategory { id: string; name: string }

export interface OwnerVisitOptions {
  business_units: OptionBU[]
  sites: OptionSite[]
  finding_categories: OptionCategory[]
}

export interface SubmitFinding {
  title: string
  description: string
  category: string
  priority: FindingPriority
  photos: string[]
}

export interface SubmitPayload {
  client_submission_id: string
  website: string
  reporter_name: string
  reporter_position: string
  other_participants: string[]
  business_unit_id: string
  site_id: string | null
  vessel_external_id: number | null
  vessel_name: string | null
  fleet_external_id: number | null
  visit_date: string
  start_time: string | null
  end_time: string | null
  agenda: string | null
  summary: string | null
  findings: SubmitFinding[]
}

export interface SubmitResult {
  visit_id: string
  reference_no: string
  duplicate: boolean
}

/** Tenggat otomatis per prioritas, dalam hari. Cerminan aturan yang sama di RPC. */
export const DUE_DAYS: Record<FindingPriority, number> = {
  CRITICAL: 7, HIGH: 14, MEDIUM: 30, LOW: 60,
}

const PHOTO_BUCKET = 'finding-photos'
const PHOTO_FOLDER = 'public-owner-visit'
const SIGNED_URL_TTL = 60 * 60 * 24 * 365

// Klien di-generic ke schema 'monitoring-hsse', sedangkan kedua RPC ini hidup di
// 'public' dan tidak ada di database.types.ts. Satu cast di sini menahan
// ketidaknyamanan itu agar tidak menyebar ke pemanggil.
type RpcCall = (fn: string, args?: Record<string, unknown>)
  => Promise<{ data: unknown; error: { message: string } | null }>
const rpc = supabaseClient.rpc.bind(supabaseClient) as unknown as RpcCall

export async function fetchOwnerVisitOptions(): Promise<OwnerVisitOptions> {
  const { data, error } = await rpc('public_owner_visit_options')
  if (error) throw new Error(error.message)
  const opts = data as Partial<OwnerVisitOptions> | null
  return {
    business_units: opts?.business_units ?? [],
    sites: opts?.sites ?? [],
    finding_categories: opts?.finding_categories ?? [],
  }
}

/** Kompres lalu unggah satu foto; mengembalikan URL bertanda tangan. */
export async function uploadFindingPhoto(file: File): Promise<string> {
  const compressed = await compressImage(file)
  const random = crypto.randomUUID().replace(/-/g, '')
  const path = `${PHOTO_FOLDER}/${random}.jpg`

  const { error: upErr } = await supabaseClient.storage
    .from(PHOTO_BUCKET)
    .upload(path, compressed, { upsert: false, contentType: compressed.type })
  if (upErr) throw new Error(upErr.message)

  const { data, error: signErr } = await supabaseClient.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL)
  if (signErr || !data?.signedUrl) throw new Error(signErr?.message ?? 'Gagal membuat tautan foto')

  return data.signedUrl
}

export async function submitPublicOwnerVisit(payload: SubmitPayload): Promise<SubmitResult> {
  const { data, error } = await rpc('submit_public_owner_visit', { payload })
  if (error) throw new Error(error.message)
  return data as SubmitResult
}

const ERROR_MESSAGES: Record<string, string> = {
  OVF_RATE_LIMIT: 'Terlalu banyak kiriman dari perangkat ini. Coba lagi dalam 1 jam.',
  OVF_INVALID_BU: 'Unit bisnis atau lokasi tidak dikenali. Muat ulang halaman.',
  OVF_INVALID_SITE: 'Unit bisnis atau lokasi tidak dikenali. Muat ulang halaman.',
  OVF_INVALID_DATE: 'Tanggal kunjungan tidak valid (maksimal 90 hari ke belakang, tidak boleh di masa depan).',
  OVF_INVALID_CATEGORY: 'Kategori temuan tidak dikenali. Muat ulang halaman.',
  OVF_TOO_LARGE: 'Isian melebihi batas. Persingkat deskripsi atau kurangi temuan.',
  OVF_BAD_PAYLOAD: 'Ada isian yang belum lengkap atau tidak valid. Periksa kembali.',
  OVF_REJECTED: 'Kiriman ditolak.',
}

/** Ubah pesan mentah dari Postgres menjadi kalimat yang dimengerti pengisi. */
export function friendlyError(message: string): string {
  const code = message.match(/OVF_[A-Z_]+/)?.[0]
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code]
  return 'Gagal mengirim. Data Anda tersimpan di perangkat — tekan Coba Lagi.'
}
```

- [ ] **Step 2: Verifikasi tipe & lint**

```bash
npm run build && npm run lint
```

Harapan: tanpa error.

- [ ] **Step 3: Commit**

```bash
git add src/services/publicOwnerVisit.ts
git commit -m "feat: service form publik owner visit (RPC, unggah foto, pesan error)"
```

---

### Task 7: Hook — state, autosave, validasi klien

**Files:**
- Create: `src/hooks/usePublicOwnerVisitForm.ts`

**Interfaces:**
- Consumes: tipe dari `src/services/publicOwnerVisit.ts` (Tugas 6).
- Produces — dipakai Tugas 8 & 9:
  - `interface FindingDraft { key: string; title: string; description: string; category: string; priority: FindingPriority; photoUrls: string[] }`
  - `interface FormState { reporter_name, reporter_position, other_participants, business_unit_id, target: 'VESSEL' | 'SITE', site_id, vessel_external_id, vessel_name, fleet_external_id, visit_date, start_time, end_time, agenda, summary, findings: FindingDraft[] }`
  - `usePublicOwnerVisitForm()` → `{ form, setField, addFinding, updateFinding, removeFinding, errors, validateStep, clearDraft, clientSubmissionId, buildPayload }`
  - `validateStep(step: 1 | 2): boolean` — mengisi `errors` dan mengembalikan lolos/tidak
  - `buildPayload(website: string): SubmitPayload`

- [ ] **Step 1: Tulis berkasnya**

```ts
import { useCallback, useEffect, useState } from 'react'
import type { FindingPriority, SubmitPayload } from '@/services/publicOwnerVisit'

const DRAFT_KEY = 'owner-visit-public-draft-v1'
const SUBMISSION_KEY = 'owner-visit-public-submission-id-v1'

export interface FindingDraft {
  key: string
  title: string
  description: string
  category: string
  priority: FindingPriority
  photoUrls: string[]
}

export interface FormState {
  reporter_name: string
  reporter_position: string
  other_participants: string
  business_unit_id: string
  target: 'VESSEL' | 'SITE'
  site_id: string
  vessel_external_id: string
  vessel_name: string
  fleet_external_id: string
  visit_date: string
  start_time: string
  end_time: string
  agenda: string
  summary: string
  findings: FindingDraft[]
}

function emptyForm(): FormState {
  return {
    reporter_name: '', reporter_position: '', other_participants: '',
    business_unit_id: '', target: 'VESSEL',
    site_id: '', vessel_external_id: '', vessel_name: '', fleet_external_id: '',
    visit_date: new Date().toISOString().slice(0, 10),
    start_time: '', end_time: '', agenda: '', summary: '',
    findings: [],
  }
}

export function newFindingDraft(): FindingDraft {
  return {
    key: crypto.randomUUID(),
    title: '', description: '', category: '', priority: 'HIGH', photoUrls: [],
  }
}

function loadDraft(): FormState {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return emptyForm()
    return { ...emptyForm(), ...(JSON.parse(raw) as Partial<FormState>) }
  } catch {
    return emptyForm()
  }
}

/**
 * Id kiriman bertahan di localStorage sepanjang satu laporan. Kalau submit
 * gagal di tengah jalan dan pengisi menekan Coba Lagi, id yang sama membuat
 * RPC mengembalikan kunjungan yang sudah terbentuk, bukan membuat yang kedua.
 */
function loadSubmissionId(): string {
  try {
    const existing = localStorage.getItem(SUBMISSION_KEY)
    if (existing) return existing
    const fresh = crypto.randomUUID()
    localStorage.setItem(SUBMISSION_KEY, fresh)
    return fresh
  } catch {
    return crypto.randomUUID()
  }
}

export function usePublicOwnerVisitForm() {
  const [form, setForm] = useState<FormState>(loadDraft)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [clientSubmissionId, setClientSubmissionId] = useState<string>(loadSubmissionId)

  // Autosave: sinyal putus atau HP mati tidak berarti mengetik ulang.
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
    } catch {
      /* kuota penuh atau mode privat — biarkan, form tetap jalan */
    }
  }, [form])

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      // Memilih kapal mengunci BU ke Shipping; berpindah objek membersihkan sisa pilihan lama.
      if (key === 'target') {
        next.site_id = ''
        next.vessel_external_id = ''
        next.vessel_name = ''
        next.fleet_external_id = ''
      }
      return next
    })
  }, [])

  const addFinding = useCallback(() => {
    setForm(prev => ({ ...prev, findings: [...prev.findings, newFindingDraft()] }))
  }, [])

  const updateFinding = useCallback((key: string, patch: Partial<FindingDraft>) => {
    setForm(prev => ({
      ...prev,
      findings: prev.findings.map(f => (f.key === key ? { ...f, ...patch } : f)),
    }))
  }, [])

  const removeFinding = useCallback((key: string) => {
    setForm(prev => ({ ...prev, findings: prev.findings.filter(f => f.key !== key) }))
  }, [])

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY)
      localStorage.removeItem(SUBMISSION_KEY)
    } catch {
      /* abaikan */
    }
    setForm(emptyForm())
    setErrors({})
    setClientSubmissionId(crypto.randomUUID())
  }, [])

  // Cerminan aturan server, supaya kesalahan ketahuan sebelum data dikirim.
  const validateStep = useCallback((step: 1 | 2): boolean => {
    const e: Record<string, string> = {}
    const today = new Date().toISOString().slice(0, 10)

    if (step === 1) {
      if (!form.reporter_name.trim()) e.reporter_name = 'Nama pengisi wajib diisi'
      else if (form.reporter_name.trim().length > 120) e.reporter_name = 'Maksimal 120 karakter'
      if (form.reporter_position.trim().length > 120) e.reporter_position = 'Maksimal 120 karakter'
      if (!form.business_unit_id) e.business_unit_id = 'Unit bisnis wajib dipilih'
      if (form.target === 'VESSEL' && !form.vessel_external_id) e.vessel_external_id = 'Kapal wajib dipilih'
      if (form.target === 'SITE' && !form.site_id) e.site_id = 'Lokasi wajib dipilih'
      if (!form.visit_date) e.visit_date = 'Tanggal kunjungan wajib diisi'
      else if (form.visit_date > today) e.visit_date = 'Tanggal tidak boleh di masa depan'
      if (form.agenda.length > 4000) e.agenda = 'Maksimal 4000 karakter'
      if (form.summary.length > 4000) e.summary = 'Maksimal 4000 karakter'
    }

    if (step === 2) {
      if (form.findings.length > 30) e.findings = 'Maksimal 30 temuan per kunjungan'
      form.findings.forEach((f, i) => {
        if (!f.title.trim()) e[`finding_${i}_title`] = 'Judul wajib diisi'
        else if (f.title.trim().length > 200) e[`finding_${i}_title`] = 'Maksimal 200 karakter'
        if (!f.description.trim()) e[`finding_${i}_description`] = 'Deskripsi wajib diisi'
        else if (f.description.trim().length > 4000) e[`finding_${i}_description`] = 'Maksimal 4000 karakter'
        if (!f.category) e[`finding_${i}_category`] = 'Kategori wajib dipilih'
        if (f.photoUrls.length > 10) e[`finding_${i}_photos`] = 'Maksimal 10 foto'
      })
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }, [form])

  const buildPayload = useCallback((website: string): SubmitPayload => ({
    client_submission_id: clientSubmissionId,
    website,
    reporter_name: form.reporter_name.trim(),
    reporter_position: form.reporter_position.trim(),
    other_participants: form.other_participants
      .split(',').map(s => s.trim()).filter(Boolean),
    business_unit_id: form.business_unit_id,
    site_id: form.target === 'SITE' ? form.site_id || null : null,
    vessel_external_id: form.target === 'VESSEL' && form.vessel_external_id
      ? Number(form.vessel_external_id) : null,
    vessel_name: form.target === 'VESSEL' ? form.vessel_name || null : null,
    fleet_external_id: form.target === 'VESSEL' && form.fleet_external_id
      ? Number(form.fleet_external_id) : null,
    visit_date: form.visit_date,
    start_time: form.start_time || null,
    end_time: form.end_time || null,
    agenda: form.agenda.trim() || null,
    summary: form.summary.trim() || null,
    findings: form.findings.map(f => ({
      title: f.title.trim(),
      description: f.description.trim(),
      category: f.category,
      priority: f.priority,
      photos: f.photoUrls,
    })),
  }), [form, clientSubmissionId])

  return {
    form, setField, addFinding, updateFinding, removeFinding,
    errors, validateStep, clearDraft, clientSubmissionId, buildPayload,
  }
}
```

- [ ] **Step 2: Verifikasi tipe & lint**

```bash
npm run build && npm run lint
```

Harapan: tanpa error.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePublicOwnerVisitForm.ts
git commit -m "feat: hook state, autosave & validasi form publik owner visit"
```

---

### Task 8: Tiga komponen langkah

**Files:**
- Create: `src/components/public/VisitDetailsStep.tsx`
- Create: `src/components/public/FindingsStep.tsx`
- Create: `src/components/public/ReviewStep.tsx`

**Interfaces:**
- Consumes: `FormState`, `FindingDraft` (Tugas 7); `OwnerVisitOptions`, `DUE_DAYS`, `uploadFindingPhoto` (Tugas 6); `useShips`, `shipOptions`, `findShipById` dari `src/hooks/useShips.ts`.
- Produces: tiga komponen dengan props seperti di kode di bawah; Tugas 9 merangkainya.

- [ ] **Step 1: `VisitDetailsStep.tsx`**

```tsx
import { useEffect } from 'react'
import { Input, Textarea, Select } from '@/components/ui/input'
import { useShips, shipOptions, findShipById } from '@/hooks/useShips'
import type { FormState } from '@/hooks/usePublicOwnerVisitForm'
import type { OwnerVisitOptions } from '@/services/publicOwnerVisit'
import { cn } from '@/lib/utils'

interface Props {
  form: FormState
  options: OwnerVisitOptions
  errors: Record<string, string>
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void
}

export function VisitDetailsStep({ form, options, errors, setField }: Props) {
  const { ships, loading: shipsLoading } = useShips()
  const shippingBU = options.business_units.find(b => b.code === 'SHP')
  const sites = options.sites.filter(s => s.business_unit_id === form.business_unit_id)
  const today = new Date().toISOString().slice(0, 10)

  // 'VESSEL' adalah pilihan awal, jadi tombolnya mungkin tidak pernah diklik.
  // Tanpa ini business_unit_id tetap kosong dan validasi menolak tanpa ada
  // field yang terlihat untuk diperbaiki.
  useEffect(() => {
    if (form.target === 'VESSEL' && shippingBU && form.business_unit_id !== shippingBU.id) {
      setField('business_unit_id', shippingBU.id)
    }
  }, [form.target, form.business_unit_id, shippingBU, setField])

  function handleTarget(target: 'VESSEL' | 'SITE') {
    setField('target', target)
    // Kunjungan kapal selalu milik unit bisnis Shipping.
    if (target === 'VESSEL' && shippingBU) setField('business_unit_id', shippingBU.id)
  }

  function handleShip(vesselId: string) {
    setField('vessel_external_id', vesselId)
    const ship = findShipById(ships, vesselId)
    setField('vessel_name', ship?.name ?? '')
    setField('fleet_external_id', ship ? String(ship.fleet.id) : '')
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        id="reporter_name" label="Nama pengisi" required
        value={form.reporter_name} error={errors.reporter_name}
        onChange={e => setField('reporter_name', e.target.value)}
        placeholder="Nama lengkap Anda"
      />
      <Input
        id="reporter_position" label="Jabatan"
        value={form.reporter_position} error={errors.reporter_position}
        onChange={e => setField('reporter_position', e.target.value)}
        placeholder="Mis. Direktur Operasi"
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-[#4A5568]">
          Objek kunjungan<span className="text-red-500 ml-1">*</span>
        </span>
        <div className="grid grid-cols-2 gap-3">
          {(['VESSEL', 'SITE'] as const).map(t => (
            <button
              key={t} type="button" onClick={() => handleTarget(t)}
              className={cn(
                'px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                form.target === t
                  ? 'border-[#1B3A6B] bg-[#1B3A6B]/5 text-[#1B3A6B]'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              )}
            >
              {t === 'VESSEL' ? 'Kapal' : 'Lokasi / Site'}
            </button>
          ))}
        </div>
      </div>

      {form.target === 'VESSEL' ? (
        <Select
          id="vessel" label="Kapal" required searchable
          value={form.vessel_external_id} error={errors.vessel_external_id}
          onChange={e => handleShip(e.target.value)}
          options={shipOptions(ships)}
          placeholder={shipsLoading ? 'Memuat daftar kapal…' : 'Pilih kapal'}
        />
      ) : (
        <>
          <Select
            id="business_unit" label="Unit Bisnis" required
            value={form.business_unit_id} error={errors.business_unit_id}
            onChange={e => { setField('business_unit_id', e.target.value); setField('site_id', '') }}
            options={options.business_units.map(b => ({ value: b.id, label: b.name }))}
            placeholder="Pilih unit bisnis"
          />
          <Select
            id="site" label="Lokasi" required searchable
            value={form.site_id} error={errors.site_id}
            onChange={e => setField('site_id', e.target.value)}
            options={sites.map(s => ({ value: s.id, label: s.name }))}
            placeholder={form.business_unit_id ? 'Pilih lokasi' : 'Pilih unit bisnis dulu'}
            disabled={!form.business_unit_id}
          />
        </>
      )}

      <Input
        id="visit_date" label="Tanggal kunjungan" type="date" required max={today}
        value={form.visit_date} error={errors.visit_date}
        onChange={e => setField('visit_date', e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          id="start_time" label="Jam mulai" type="time"
          value={form.start_time} onChange={e => setField('start_time', e.target.value)}
        />
        <Input
          id="end_time" label="Jam selesai" type="time"
          value={form.end_time} onChange={e => setField('end_time', e.target.value)}
        />
      </div>

      <Input
        id="other_participants" label="Peserta lain"
        value={form.other_participants}
        onChange={e => setField('other_participants', e.target.value)}
        hint="Pisahkan dengan koma"
        placeholder="Ani, Budi, Cak"
      />
      <Textarea
        id="agenda" label="Agenda" value={form.agenda} error={errors.agenda}
        onChange={e => setField('agenda', e.target.value)}
      />
      <Textarea
        id="summary" label="Ringkasan kunjungan" value={form.summary} error={errors.summary}
        onChange={e => setField('summary', e.target.value)}
      />
    </div>
  )
}
```

- [ ] **Step 2: `FindingsStep.tsx`**

```tsx
import { useState } from 'react'
import { Plus, Trash2, ImagePlus, X } from 'lucide-react'
import { Input, Textarea, Select } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { FindingDraft } from '@/hooks/usePublicOwnerVisitForm'
import type { FindingPriority, OwnerVisitOptions } from '@/services/publicOwnerVisit'
import { DUE_DAYS, uploadFindingPhoto } from '@/services/publicOwnerVisit'

interface Props {
  findings: FindingDraft[]
  options: OwnerVisitOptions
  errors: Record<string, string>
  visitDate: string
  addFinding: () => void
  updateFinding: (key: string, patch: Partial<FindingDraft>) => void
  removeFinding: (key: string) => void
}

const PRIORITIES: { value: FindingPriority; label: string }[] = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
]

function dueDateText(visitDate: string, priority: FindingPriority): string {
  const days = DUE_DAYS[priority]
  if (!visitDate) return `Target penyelesaian otomatis: ${days} hari.`
  const d = new Date(visitDate)
  d.setDate(d.getDate() + days)
  const formatted = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  return `Target penyelesaian otomatis: ${days} hari — ${formatted}. PIC & tenggat final ditetapkan admin saat verifikasi.`
}

export function FindingsStep({
  findings, options, errors, visitDate, addFinding, updateFinding, removeFinding,
}: Props) {
  // Status unggah per temuan: satu foto gagal tidak boleh menggugurkan laporan.
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [uploadError, setUploadError] = useState<Record<string, string>>({})

  async function handlePhotos(key: string, files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(u => ({ ...u, [key]: true }))
    setUploadError(e => ({ ...e, [key]: '' }))

    const current = findings.find(f => f.key === key)?.photoUrls ?? []
    const uploaded: string[] = []
    let failed = 0

    for (const file of Array.from(files)) {
      if (current.length + uploaded.length >= 10) break
      try {
        uploaded.push(await uploadFindingPhoto(file))
      } catch {
        failed += 1
      }
    }

    updateFinding(key, { photoUrls: [...current, ...uploaded] })
    setUploading(u => ({ ...u, [key]: false }))
    if (failed > 0) {
      setUploadError(e => ({
        ...e,
        [key]: `${failed} foto gagal diunggah. Coba pilih ulang, atau lanjut tanpa foto itu.`,
      }))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {findings.length === 0 && (
        <p className="text-sm text-gray-500 px-4 py-6 text-center border border-dashed border-gray-300 rounded-xl">
          Belum ada temuan. Kunjungan tanpa temuan tetap bisa dikirim.
        </p>
      )}

      {errors.findings && <p className="text-xs text-red-600">{errors.findings}</p>}

      {findings.map((f, i) => (
        <div key={f.key} className="rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#1B3A6B]">Temuan {i + 1}</span>
            <button
              type="button" onClick={() => removeFinding(f.key)}
              className="text-gray-400 hover:text-red-600 p-1" aria-label={`Hapus temuan ${i + 1}`}
            >
              <Trash2 size={16} />
            </button>
          </div>

          <Input
            id={`finding_${i}_title`} label="Judul" required
            value={f.title} error={errors[`finding_${i}_title`]}
            onChange={e => updateFinding(f.key, { title: e.target.value })}
          />
          <Textarea
            id={`finding_${i}_description`} label="Deskripsi" required
            value={f.description} error={errors[`finding_${i}_description`]}
            onChange={e => updateFinding(f.key, { description: e.target.value })}
          />
          <Select
            id={`finding_${i}_category`} label="Kategori" required
            value={f.category} error={errors[`finding_${i}_category`]}
            onChange={e => updateFinding(f.key, { category: e.target.value })}
            options={options.finding_categories.map(c => ({ value: c.name, label: c.name }))}
            placeholder="Pilih kategori"
          />
          <Select
            id={`finding_${i}_priority`} label="Prioritas" required
            value={f.priority}
            onChange={e => updateFinding(f.key, { priority: e.target.value as FindingPriority })}
            options={PRIORITIES.map(p => ({ value: p.value, label: p.label }))}
          />
          <p className="text-xs text-gray-500 -mt-1">{dueDateText(visitDate, f.priority)}</p>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#4A5568]">Foto</span>
            {f.photoUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {f.photoUrls.map(url => (
                  <div key={url} className="relative">
                    <img src={url} alt="" className="h-20 w-20 object-cover rounded-lg border border-gray-200" />
                    <button
                      type="button" aria-label="Hapus foto"
                      onClick={() => updateFinding(f.key, { photoUrls: f.photoUrls.filter(u => u !== url) })}
                      className="absolute -top-1.5 -right-1.5 bg-white border border-gray-300 rounded-full p-0.5 shadow-sm"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="inline-flex w-fit items-center gap-2 px-3 py-2 text-sm rounded-lg border border-[#1B3A6B] text-[#1B3A6B] cursor-pointer hover:bg-[#1B3A6B]/5">
              <ImagePlus size={16} />
              {uploading[f.key] ? 'Mengunggah…' : 'Tambah foto'}
              <input
                type="file" accept="image/*" multiple capture="environment" className="hidden"
                disabled={uploading[f.key]}
                onChange={e => { void handlePhotos(f.key, e.target.files); e.target.value = '' }}
              />
            </label>
            {uploadError[f.key] && <p className="text-xs text-red-600">{uploadError[f.key]}</p>}
            {errors[`finding_${i}_photos`] && (
              <p className="text-xs text-red-600">{errors[`finding_${i}_photos`]}</p>
            )}
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addFinding} className="w-fit">
        <Plus size={16} /> Tambah temuan
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: `ReviewStep.tsx`**

```tsx
import type { FormState } from '@/hooks/usePublicOwnerVisitForm'
import type { OwnerVisitOptions } from '@/services/publicOwnerVisit'

interface Props {
  form: FormState
  options: OwnerVisitOptions
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 text-right">{value || '—'}</span>
    </div>
  )
}

export function ReviewStep({ form, options }: Props) {
  const bu = options.business_units.find(b => b.id === form.business_unit_id)
  const site = options.sites.find(s => s.id === form.site_id)
  const objek = form.target === 'VESSEL' ? form.vessel_name : site?.name ?? ''

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-semibold text-[#1B3A6B] mb-1">Data Kunjungan</h3>
        <Row label="Pengisi" value={[form.reporter_name, form.reporter_position && `(${form.reporter_position})`].filter(Boolean).join(' ')} />
        <Row label="Unit Bisnis" value={bu?.name ?? ''} />
        <Row label={form.target === 'VESSEL' ? 'Kapal' : 'Lokasi'} value={objek} />
        <Row label="Tanggal" value={form.visit_date} />
        <Row label="Jam" value={[form.start_time, form.end_time].filter(Boolean).join(' – ')} />
        <Row label="Peserta lain" value={form.other_participants} />
        <Row label="Agenda" value={form.agenda} />
        <Row label="Ringkasan" value={form.summary} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[#1B3A6B] mb-1">
          Temuan ({form.findings.length})
        </h3>
        {form.findings.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">Tidak ada temuan.</p>
        ) : (
          form.findings.map((f, i) => (
            <div key={f.key} className="py-3 border-b border-gray-100 last:border-0">
              <p className="text-sm font-medium text-gray-800">{i + 1}. {f.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{f.category} · {f.priority} · {f.photoUrls.length} foto</p>
              <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{f.description}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verifikasi tipe & lint**

```bash
npm run build && npm run lint
```

Harapan: tanpa error.

- [ ] **Step 5: Commit**

```bash
git add src/components/public/
git commit -m "feat: komponen tiga langkah form publik owner visit"
```

---

### Task 9: Halaman, rute, dan pembuktian menyeluruh

**Files:**
- Create: `src/pages/PublicOwnerVisitFormPage.tsx`
- Modify: `src/App.tsx` (import baru di antara import halaman lain; satu `<Route>` baru di sebelah rute `visits/:id/print`)

**Interfaces:**
- Consumes: seluruh keluaran Tugas 5–8.
- Produces: rute `/owner-visit/form` yang dapat diakses tanpa login.

- [ ] **Step 1: Tulis `PublicOwnerVisitFormPage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Crown, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VisitDetailsStep } from '@/components/public/VisitDetailsStep'
import { FindingsStep } from '@/components/public/FindingsStep'
import { ReviewStep } from '@/components/public/ReviewStep'
import { usePublicOwnerVisitForm } from '@/hooks/usePublicOwnerVisitForm'
import {
  fetchOwnerVisitOptions, submitPublicOwnerVisit, friendlyError,
  type OwnerVisitOptions,
} from '@/services/publicOwnerVisit'

const EMPTY_OPTIONS: OwnerVisitOptions = { business_units: [], sites: [], finding_categories: [] }
const STEP_LABELS = ['Data Kunjungan', 'Temuan', 'Tinjau & Kirim']

export default function PublicOwnerVisitFormPage() {
  const {
    form, setField, addFinding, updateFinding, removeFinding,
    errors, validateStep, clearDraft, buildPayload,
  } = usePublicOwnerVisitForm()

  const [options, setOptions] = useState<OwnerVisitOptions>(EMPTY_OPTIONS)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [reference, setReference] = useState<string | null>(null)
  // Honeypot: manusia tidak pernah melihat kolom ini, bot mengisinya.
  const [website, setWebsite] = useState('')

  useEffect(() => {
    fetchOwnerVisitOptions()
      .then(setOptions)
      .catch(() => setOptionsError('Gagal memuat pilihan. Periksa koneksi lalu muat ulang halaman.'))
  }, [])

  function goNext() {
    if (step === 1 && !validateStep(1)) return
    if (step === 2 && !validateStep(2)) return
    setStep(s => (s === 1 ? 2 : 3))
    window.scrollTo({ top: 0 })
  }

  function goBack() {
    setStep(s => (s === 3 ? 2 : 1))
    window.scrollTo({ top: 0 })
  }

  async function handleSubmit() {
    if (!validateStep(1) || !validateStep(2)) {
      setSubmitError('Ada isian yang belum lengkap. Kembali ke langkah sebelumnya untuk memperbaikinya.')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const result = await submitPublicOwnerVisit(buildPayload(website))
      // Draft baru dibuang setelah server memastikan data tersimpan.
      setReference(result.reference_no)
      clearDraft()
    } catch (err) {
      setSubmitError(friendlyError(err instanceof Error ? err.message : String(err)))
    } finally {
      setSubmitting(false)
    }
  }

  if (reference) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <CheckCircle2 size={48} className="text-green-600 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-[#1B3A6B]">Laporan terkirim</h1>
          <p className="text-sm text-gray-600 mt-2">
            Laporan Anda sudah masuk ke sistem dan menunggu verifikasi.
          </p>
          <p className="mt-4 text-xs text-gray-500">Nomor referensi</p>
          <p className="font-mono text-sm font-semibold text-[#1B3A6B] break-all">{reference}</p>
          <Button
            className="mt-6 w-full justify-center"
            onClick={() => { setReference(null); setStep(1) }}
          >
            Isi kunjungan lain
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1B3A6B] text-white px-4 py-5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Crown size={24} className="text-amber-300 shrink-0" />
          <div>
            <h1 className="font-bold text-base leading-tight">Form Owner Visit</h1>
            <p className="text-xs text-white/70">Barokah Perkasa Group</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 flex flex-col gap-4">
        <ol className="flex items-center gap-2 text-xs">
          {STEP_LABELS.map((label, i) => (
            <li
              key={label}
              className={
                'flex-1 py-1.5 text-center rounded-lg ' +
                (step === i + 1
                  ? 'bg-[#1B3A6B] text-white font-medium'
                  : step > i + 1
                    ? 'bg-[#1B3A6B]/10 text-[#1B3A6B]'
                    : 'bg-gray-100 text-gray-400')
              }
            >
              {i + 1}. {label}
            </li>
          ))}
        </ol>

        {optionsError && (
          <p className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {optionsError}
          </p>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
          {step === 1 && (
            <VisitDetailsStep form={form} options={options} errors={errors} setField={setField} />
          )}
          {step === 2 && (
            <FindingsStep
              findings={form.findings} options={options} errors={errors}
              visitDate={form.visit_date}
              addFinding={addFinding} updateFinding={updateFinding} removeFinding={removeFinding}
            />
          )}
          {step === 3 && <ReviewStep form={form} options={options} />}

          <input
            type="text" tabIndex={-1} autoComplete="off" aria-hidden="true"
            className="hidden" value={website} onChange={e => setWebsite(e.target.value)}
          />
        </div>

        {submitError && (
          <p className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {submitError}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 pb-8">
          {step > 1 ? (
            <Button variant="ghost" onClick={goBack} disabled={submitting}>
              <ArrowLeft size={16} /> Kembali
            </Button>
          ) : <span />}

          {step < 3 ? (
            <Button onClick={goNext}>
              Lanjut <ArrowRight size={16} />
            </Button>
          ) : (
            <Button onClick={() => void handleSubmit()} loading={submitting}>
              <Send size={16} /> {submitError ? 'Coba Lagi' : 'Kirim Laporan'}
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 pb-6">
          Isian tersimpan otomatis di perangkat ini sampai berhasil dikirim.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Daftarkan rute di `src/App.tsx`**

Tambahkan import setelah baris `import PrintVisitReportPage from '@/pages/PrintVisitReportPage'`:

```tsx
import PublicOwnerVisitFormPage from '@/pages/PublicOwnerVisitFormPage'
```

Tambahkan rute tepat sebelum baris `{/* Print report — outside AppLayout, no sidebar/header */}`:

```tsx
{/* Form publik Owner Visit — tanpa login, di luar AppLayout & PublicRoute */}
<Route path="/owner-visit/form" element={<PublicOwnerVisitFormPage />} />
```

Rute ini sengaja **tidak** dibungkus `PublicRoute`: pembungkus itu melempar pengguna yang sudah login ke dashboard, sedangkan form ini harus terbuka bagi siapa pun.

- [ ] **Step 3: Verifikasi tipe & lint**

```bash
npm run build && npm run lint
```

Harapan: tanpa error.

- [ ] **Step 4: Buka form di browser**

Buat `.claude/launch.json` bila belum ada:

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "vite", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 5173 }
  ]
}
```

Jalankan `preview_start` dengan `{name: "vite"}`, lalu `navigate` ke `http://localhost:5173/owner-visit/form`.

Harapan: form tampil tanpa sidebar dan tanpa dilempar ke `/login`. Periksa `read_console_messages` — tidak boleh ada error.

- [ ] **Step 5: Isi dan kirim satu laporan sungguhan**

Lewat browser: isi nama pengisi, pilih Kapal, pilih satu kapal, biarkan tanggal hari ini, lanjut; tambah satu temuan (judul, deskripsi, kategori Safety, prioritas HIGH), lanjut; tekan Kirim.

Harapan: muncul layar sukses berisi nomor referensi berpola `VISIT/OWNER/SHP/<YYYYMM>/<NNN>`. Catat nomor itu.

- [ ] **Step 6: Buktikan data benar-benar masuk ke menu Owner Visit**

Periksa di database:

```sql
select v.reference_no, v.visit_type, v.status, v.vessel_name,
       f.reference_no as finding_ref, f.is_owner_finding, f.status as finding_status
from "monitoring-hsse".visits v
left join "monitoring-hsse".findings f on f.visit_id = v.id
where v.reference_no = '<nomor referensi dari Step 5>';
```

Harapan: `visit_type = OWNER_VISIT`, `status = SUBMITTED`, `is_owner_finding = true`, `finding_status = OPEN`.

Lalu di browser, masuk sebagai admin dan buka `/visits`. Harapan: kunjungan itu ada di daftar. Buka detailnya — tombol **Approve** dan **Reject** terlihat. Tekan Approve. Buka `/owner-findings` — temuan dari form tadi muncul di sana.

Ini pembuktian tujuan utama: data dari form publik masuk ke menu Owner Visit.

- [ ] **Step 7: Buktikan autosave**

Buka `/owner-visit/form` di tab baru, isi nama pengisi, lalu muat ulang halaman (F5).

Harapan: nama yang tadi diketik masih ada.

- [ ] **Step 8: Bersihkan data uji**

```sql
delete from "monitoring-hsse".findings
where visit_id = (select id from "monitoring-hsse".visits where reference_no = '<nomor referensi>');
delete from "monitoring-hsse".public_form_submissions
where visit_id = (select id from "monitoring-hsse".visits where reference_no = '<nomor referensi>');
delete from "monitoring-hsse".visits where reference_no = '<nomor referensi>';
```

Hapus juga foto uji dari bucket bila ada yang diunggah.

- [ ] **Step 9: Commit**

```bash
git add src/pages/PublicOwnerVisitFormPage.tsx src/App.tsx .claude/launch.json
git commit -m "feat: halaman form publik owner visit di /owner-visit/form"
```

---

## Setelah semua tugas selesai

Tautan yang dibagikan ke Owner/Direksi adalah `<domain-aplikasi>/owner-visit/form`.

Karena rute ini di luar `ProtectedRoute`, pastikan hosting mengarahkan seluruh path ke `index.html` (perilaku bawaan Vite SPA). Jika hosting memakai konfigurasi rewrite manual, `/owner-visit/form` harus ikut tercakup — kalau tidak, membuka tautan itu langsung akan menghasilkan 404 dari server sebelum React sempat berjalan.
