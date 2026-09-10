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
