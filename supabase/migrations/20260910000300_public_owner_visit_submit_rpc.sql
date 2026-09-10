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
                 or datetime_field_overflow
                 or numeric_value_out_of_range then
    raise exception 'OVF_BAD_PAYLOAD: format data tidak valid' using errcode = 'P0001';
  end;

  if v_client_id is null then
    raise exception 'OVF_BAD_PAYLOAD: client_submission_id wajib diisi' using errcode = 'P0001';
  end if;

  -- Serialisasi seluruh pengiriman publik. Tanpa ini, panggilan yang datang
  -- bersamaan sama-sama membaca hitungan lama: rate limit dan pemeriksaan
  -- idempotensi keduanya bisa dilewati hanya dengan konkurensi biasa.
  -- Pada volume yang dibatasi 50 kiriman/jam, serialisasi ini tidak terasa.
  perform pg_advisory_xact_lock(hashtext('ovf:submit'));

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
      if v_photo is null or position(c_photo_prefix in v_photo) <> 1 then
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
