# Penyederhanaan Jurnal Mengajar Dosen — Model Deklarasi Mandiri

**Tanggal:** 2026-06-11
**Status:** Disetujui (brainstorming)
**Lingkup:** Alur pengisian jurnal mengajar dosen — hapus GPS, foto evidence, pengingat in-app, penanganan kuota daring, dan penguatan alur scan/login. Tetap memakai gaya shadcn/ui yang ada.

## Tujuan

Membuat jurnal mengajar **mudah diisi dosen** sebagai pengganti jurnal kertas yang rawan hilang/terbawa mahasiswa. Memecahkan dua masalah nyata: (1) dosen lupa mengisi jurnal, (2) dosen daring melebihi batas 4 lalu menyembunyikannya karena app memblokir. Tanpa mengubah tujuan inti menjadi sistem audit/kepatuhan.

## Prinsip produk

Jurnal = **deklarasi mandiri dosen**, bukan bukti yang ditegakkan sistem. **"Dosen adalah raja" — app memudahkan, tidak mengawasi/memblokir.** Penegakan aturan adalah ranah GKM (membandingkan manual dengan sistem lain), bukan app. Prinsip teknis: **rekam kebenaran + tandai anomali, jangan blokir** — karena blokir keras justru memicu dosen berbohong dan merusak akurasi jurnal.

## Masalah pada kondisi saat ini

1. **GPS wajib untuk luring** memblokir simpan. Lemah sebagai bukti (hanya tahu lokasi *saat mengisi*, bukan saat *mengajar*; tak bisa bedakan "mengajar lalu isi di rumah" dari "tidak mengajar"), menyulitkan dosen jujur (sinyal dalam gedung), dan menuduh salah dosen yang mengisi belakangan dari rumah. Juga mempersulit sesi pengganti di jam berbeda.
2. **Kuota daring (maks 4)** diblokir keras. Dosen yang daring >4 menyembunyikan kebenaran (menulis 4 saja / menandai luring). App jadi memuat data palsu.
3. **Tidak ada pengingat** untuk dosen yang lupa mengisi.
4. **Alur login setelah scan** tidak mengembalikan dosen ke /scan — memaksa scan ulang.

## Desain

### Bagian 1 — Hapus GPS (UI + validasi saja)

- `components/dosen/session-form-fields.tsx`: hapus panel "Validasi GPS" + tombol "Deteksi Lokasi". Luring tidak lagi membutuhkan field tambahan; daring tetap membutuhkan URL platform.
- `components/dosen/daftar-hadir-table.tsx` (fungsi `simpan`) & `components/dosen/session-form.tsx` (fungsi `save`): hapus syarat `!latitude/!longitude` untuk luring.
- `components/dosen/quick-start-form.tsx`: hapus auto-deteksi GPS.
- **Dibiarkan tak disentuh:** kolom GPS pada `LectureSession` (jadi null), halaman admin Lokasi Kampus, API `/api/campus/validate-gps`. Tidak mengganggu; pembersihan total ditunda (di luar lingkup).

### Bagian 2 — Foto evidence (1 foto, opsional)

- **Pakai ulang infrastruktur yang ada:** model `Document` (relasi ke `LectureSession`) + API `/api/documents`. Tidak membuat model/endpoint baru.
- Tambah komponen unggah foto di form jurnal (`session-form-fields.tsx`). Di HP memicu kamera langsung via `<input type="file" accept="image/*" capture="environment">`, boleh juga dari galeri.
- **1 foto per pertemuan, opsional, tidak pernah memblokir simpan.** Untuk sesi daring, foto = screenshot kelas online.
- **GKM dapat melihat:** foto ditampilkan di monitoring GKM dan halaman detail MK. API `/api/documents` (GET) disesuaikan agar mengizinkan GKM/Dekanat/Admin membaca dokumen sesi (saat ini kemungkinan terbatas pemilik dosen).

### Bagian 3 — Pengingat in-app (dihitung saat dibuka)

- **Ekstrak helper bersama** `lib/jadwal.ts` dari logika "pertemuan ke-N → tanggal perkiraan" yang kini berada di dalam `app/(dashboard)/dashboard/dosen/courses/[courseId]/page.tsx` (fungsi generate jadwal dari awal semester + hari `ScheduleSlot`). Dipakai ulang oleh dashboard agar tidak duplikasi.
- Server menghitung **pertemuan yang tanggal perkiraannya sudah lewat tapi belum ada sesi (DRAFT/PUBLISHED)**, lintas semua MK milik dosen.
- **Ditampilkan di:** (a) alert ringkasan di dashboard dosen `app/(dashboard)/dashboard/dosen/page.tsx` — mis. "3 pertemuan belum diisi" dengan tautan; (b) daftar lonceng notifikasi di `app/(dashboard)/layout-client.tsx`.
- **Dihitung dinamis** — tanpa record `Notification` permanen, tanpa cron/background job.

### Bagian 4 — Kuota daring: rekam + tandai (bukan blokir)

- **Hapus blokir kuota** yang ada di `simpan` (`daftar-hadir-table.tsx`) dan `save` (`session-form.tsx`). Sesi daring ke-5+ boleh disimpan.
- **Tanda "melebihi kuota daring (>4)" muncul di tiga tempat:**
  - *Form dosen* (`session-form-fields.tsx`): saat metode daring dipilih & jumlah daring tercatat ≥ `MAX_DARING`, tampil info "sesi daring ke-N, melebihi kuota 4" — informatif, tetap bisa simpan.
  - *Monitoring GKM* (`app/(dashboard)/dashboard/gkm/monitoring/`): penanda + jumlah daring melebihi kuota per dosen/MK.
  - *Output cetak* (`lib/daftar-hadir-pdf.ts` dan/atau `lib/bkd-report.ts`): catatan jumlah daring, mis. "Daring: 6× (melebihi kuota 4)".

### Bagian 5 — Penguatan alur scan / login

- **Login sekali (callbackUrl):**
  - `proxy.ts`: saat redirect ke login, bawa tujuan asli **lengkap dengan query** → `/login?callbackUrl=<pathname+search>`.
  - `app/login/page.tsx`: baca `callbackUrl` (via `useSearchParams`); setelah login sukses arahkan ke sana, jika kosong baru ke `/dashboard`. **Validasi hanya path internal** (diawali `/`) untuk cegah open-redirect.
- **Entry via QR → default luring:**
  - QR di-generate dengan penanda `…/scan?via=qr` (`app/(dashboard)/dashboard/admin/qr/qr-client.tsx`).
  - `app/(dashboard)/scan/scan-client.tsx` membaca `via=qr` → saat lanjut ke form, pra-pilih metode **Tatap Muka**. **Default lunak, dapat diubah** (boleh ganti ke daring/Praktikum/Seminar). Penanda diteruskan sebagai parameter ke route form.
- **Entry terpadu & konfirmasi jelas:** `scan-client.tsx` selalu menampilkan MK milik dosen, dengan kelas yang sedang berlangsung (hasil `smart-match`) **disorot otomatis** di atas; pilihan lain (untuk sesi pengganti di jam berbeda) di bawah. Kartu konfirmasi memuat nama MK, kelas, jam, ruang dengan jelas; sediakan cara menandai **sesi pengganti** (`sessionType=PENGGANTI`) dan menyetel tanggal/jam sebenarnya. Dropdown manual hanya berisi MK milik dosen (bukan seluruh katalog).

## Model mental terpadu

Ada **satu form jurnal**. Dosen selalu sampai ke sana dengan cara yang sama (dari MK miliknya sendiri, kelas aktif disorot otomatis). QR hanya pintasan membuka `/scan` saat di kelas — bukan gerbang; halaman yang sama bisa dibuka dengan membuka app langsung (untuk daring). Luring/daring/pengganti hanyalah pilihan di dalam form. Lokasi tidak lagi relevan. Identitas selalu dari akun login (tidak pernah memilih nama).

## Komponen & batas tanggung jawab

- **`SessionFormFields`** — render field jurnal (termasuk unggah 1 foto opsional + info tanda daring); menerima nilai + `onChange`; tidak tahu cara menyimpan.
- **`DaftarHadirTable` / `SessionForm`** — orkestrasi simpan/publish (tanpa blokir GPS, tanpa blokir kuota daring); memanggil API yang ada.
- **`lib/jadwal.ts`** (baru) — satu-satunya sumber pemetaan pertemuan→tanggal; dipakai halaman detail MK dan pengingat dashboard.
- **`scan-client.tsx`** — entry terpadu + baca `via=qr`; mendelegasikan pengisian ke form.
- **`proxy.ts` + `login/page.tsx`** — preservasi callbackUrl.
- **Dashboard dosen + lonceng** — menampilkan pengingat (presentasi atas hasil hitungan server).

## Verifikasi

- `tsc --noEmit`, `npm run lint`, `npm run build` — nol error, nol warning.
- Uji manual:
  - Isi sesi luring **tanpa** langkah GPS — bisa simpan & publish.
  - Isi sesi daring: pilih daring → URL platform → unggah 1 foto (kamera HP) → simpan.
  - Rekam sesi daring ke-5 — **bisa** disimpan dan **tertandai** "melebihi kuota" di form, monitoring GKM, dan output cetak.
  - Scan QR saat belum login → diarahkan login → setelah login **langsung** ke `/scan` (tidak scan ulang); penanda `via=qr` bertahan → metode terpra-pilih Tatap Muka.
  - GKM membuka monitoring → dapat melihat foto evidence sesi.
  - Pengingat muncul di dashboard & lonceng untuk pertemuan yang tanggalnya lewat tapi belum diisi.
  - Sesi pengganti di jam berbeda: pilih MK dari daftar dosen, tandai PENGGANTI, set tanggal/jam — tersimpan benar.

## Di luar lingkup (non-goals)

Presensi sisi mahasiswa; workflow approval/TTD Kaprodi/GKM; keterkaitan RPS; deteksi telat/penalti jam; penghapusan kolom GPS dari DB, halaman admin kampus, atau API validate-gps; push notification HP (PWA push). Murni penyederhanaan & kemudahan alur jurnal dosen.
