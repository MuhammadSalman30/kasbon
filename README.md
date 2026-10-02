# Kasbon

Web app buat catat utang piutang pribadi. Next.js 16 (App Router) + TypeScript strict + Tailwind v4 + Supabase + Lucide.

**Demo:** (https://kasbon-two.vercel.app/)

## Setup

1. `npm install`
2. Bikin project Supabase, lalu jalanin isi `supabase/migrations/20260101000000_create_debts.sql` di SQL Editor (atau `supabase db push`).
3. Salin `.env.example` ke `.env.local`, isi URL & anon key.
4. Di Supabase > Auth > Providers > Email, matiin "Confirm email" biar demo bisa langsung login (opsional).
5. `npm run dev` -> http://localhost:3000

## Library tambahan

- `@supabase/ssr` - session auth lewat cookie biar API route & proxy bisa baca user.
- `zod` - satu schema validasi dipakai di client (form) dan server (API), jadi aturan gak bisa beda.

## Test RLS (wajib dicoba)

```bash
# tanpa login (anon) -> harus 401/kosong
curl "$URL/rest/v1/debts?select=*" -H "apikey: $ANON_KEY"
# login sebagai user A, coba baca/ubah baris user B -> [] / 0 row
curl "$URL/rest/v1/debts?id=eq.<ID_USER_B>" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A"
curl -X DELETE "$URL/rest/v1/debts?id=eq.<ID_USER_B>" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_A"
```

## Approach

RLS dibikin per-operasi (SELECT/INSERT/UPDATE/DELETE) khusus role `authenticated` dengan `user_id = auth.uid()`, plus `FORCE ROW LEVEL SECURITY` dan `REVOKE` buat `anon`, jadi keamanan gak bergantung ke API route. `user_id` default `auth.uid()` dan API gak pernah percaya input user buat kolom itu. "Tandai lunas" disimpan sebagai `settled_at` di DB dan idempotent (klik 2x gak geser timestamp pertama). Uang disimpan `bigint` Rupiah utuh, diformat dengan `Intl.NumberFormat("id-ID")`.

## Catatan desain

- Kolom "Tanggal" di form disimpan ke `due_date`; kalau kosong, UI pakai `created_at`.
- Summary & Net cuma ngitung entry yang **belum lunas**.

## Trade-off (kalau ada 1 hari lagi)

Search by nama, sort, group per orang, bar chart; ganti `confirm()` hapus dengan dialog custom + undo toast; optimistic update; test otomatis buat `formatRupiah`/`relativeTime` dan RLS.

merapihkan form input pada modal "catat baru", terutama pada bagian currency rupiah (format agar tidak bingung)

merapihkan tampilan

## Time spent

Total ±9 jam, dikerjakan dalam 2 hari.

- Setup Next.js + Supabase + env: 1 jam
- Migration + RLS + tes lewat curl: 2 jam
- API routes + validasi zod: 2 jam
- UI dashboard + form: 3 jam
- Deploy Vercel, debug env, README, Loom: 1 jam

Pakai AI assistant buat scaffolding awal dan draft kode. Setelah itu semua
saya baca, ubah, dan tes sendiri. Bagian yang paling lama saya pelajari
adalah RLS dan vercel, karena sebelumnya belum pernah tes RLS dan deploy ke vercel.
