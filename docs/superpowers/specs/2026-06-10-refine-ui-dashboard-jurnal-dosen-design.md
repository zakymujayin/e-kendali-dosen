# Refine UI/UX — Dashboard Dosen & Pengisian Jurnal Mengajar

**Tanggal:** 2026-06-10
**Status:** Disetujui (brainstorming)
**Lingkup:** Lapisan UI/UX untuk peran Dosen. Tetap memakai gaya shadcn/ui dan token tema yang ada.

## Tujuan

Membuat dashboard dosen dan alur pengisian jurnal mengajar **lebih mudah digunakan** dan
**enak dipakai di HP maupun desktop**, dengan menyatukan dua antarmuka pengisian yang saat ini
berbeda menjadi satu pengalaman yang konsisten — tanpa mengubah backend/API, skema DB, atau
generator PDF.

## Masalah pada kondisi saat ini

1. **Dua UI pengisian berbeda** membingungkan:
   - `DaftarHadirTable` — editor inline "split view" (daftar pertemuan kiri + form kanan) di
     halaman detail MK `/dashboard/dosen/courses/[courseId]`.
   - `SessionForm` — wizard 3 langkah di `sessions/new` (titik masuk dari alur **Scan QR** dan
     halaman Edit).
2. **`DaftarHadirTable` terlalu padat:** font 9–11px, memakai `<input>/<select>/<textarea>`
   mentah (bukan komponen shadcn), time picker 4 dropdown yang ribet, warna hardcoded
   (`bg-white`, `bg-gray-50`) alih-alih token (`bg-card`, `bg-muted`).
3. **Versi mobile `DaftarHadirTable` ditulis terpisah** dan fiturnya tidak setara desktop.
4. **Dashboard dosen** memakai `<div>` mentah (bukan `Card`), gradient/warna hardcoded, tanpa
   CTA jelas atau sorotan tindakan mendesak ("kelas hari ini", "pertemuan telat").

## Pendekatan terpilih (A): Overview list + editor Sheet

Pertahankan ikhtisar pertemuan (kekuatannya: lihat semua status sekaligus), tetapi pindahkan
pengeditan ke komponen `Sheet` yang lapang dan **identik di HP & desktop**. Form pengisian
diekstrak menjadi satu komponen bersama agar konsisten di semua titik masuk.

Pendekatan yang ditolak:
- **B (split view dirapikan):** tetap kompromi di HP.
- **C (wizard penuh per pertemuan):** terlalu banyak klik, kehilangan editing cepat.

## Desain

### Bagian 1 — Dashboard Dosen (`app/(dashboard)/dashboard/dosen/page.tsx`)

1. **Hero ringkas:** sapaan + semester memakai `Card` dengan aksen `primary` (bukan gradient
   biru hardcoded). 3 statistik (MK Diampu, Pertemuan, Draft) sebagai kartu kecil seragam +
   `Progress` shadcn untuk progres semester.
2. **Panel "Perlu perhatian"** (baru, hanya muncul jika relevan) memakai `Alert` shadcn:
   - Merah: *N pertemuan telat diisi* → tautan ke MK terkait.
   - Kuning: *Kelas hari ini* → tombol cepat "Isi jurnal" bila ada jadwal hari ini.
3. **Grid MK:** kartu per mata kuliah dibangun dengan `Card` shadcn. Aksen warna per-MK
   dipertahankan sebagai garis atas; isi memakai token tema. `Progress` shadcn menggantikan bar
   manual; status memakai varian `Badge`. Klik → halaman detail MK. Layout 1 kolom (HP) / 2
   kolom (desktop).

### Bagian 2 — Pengisian Jurnal (`components/dosen/daftar-hadir-table.tsx`)

1. **Header MK:** judul, kode·SKS·semester·kelas, info jadwal dengan hierarki teks wajar (bukan
   `text-[10px]`). Ringkasan progres pakai `Progress` shadcn + "terisi/total" + tombol **Cetak**.
2. **Ikhtisar pertemuan** (pengganti list kiri sempit + blok mobile terpisah):
   - Satu komponen responsif: HP daftar 1 kolom; desktop grid 2–3 kolom. Tidak ada lagi blok
     mobile terpisah.
   - Tiap item: `#no`, tanggal, materi (truncate), dan **badge status** jelas — Published (hijau),
     Draft (amber), Telat (merah), Hari ini (kuning), Kosong (abu) — lewat satu helper warna
     konsisten.
   - Klik item → buka **Sheet editor**.
3. **Sheet editor** (pengganti panel kanan + duplikasi mobile):
   - Komponen `Sheet` baru: slide dari kanan (desktop), bottom sheet (HP).
   - Header: "Pertemuan #N / total", navigasi ‹ Sebelumnya / Selanjutnya ›, badge status.
   - Isi = komponen `SessionFormFields` bersama (lihat Bagian 3).
   - Footer sticky: **Simpan** + **Simpan & Publish** + tautan Hapus; tombol full-width di HP.
   - Pertemuan **Published** → tampil read-only ringkas + tautan "Lihat BAP & Detail".
4. **State kosong & selesai:** desktop menampilkan ikhtisar penuh tanpa panel kosong canggung;
   semua terisi → `Alert` sukses "Cetak PDF untuk ditandatangani Kaprodi".

### Bagian 3 — Komponen bersama & konsolidasi

1. **`components/ui/sheet.tsx`** (baru): standar shadcn di atas Radix Dialog yang sudah dipakai
   `dialog.tsx`. Varian sisi `right` & `bottom`.
2. **`SessionFormFields`** (baru, `components/dosen/`): satu sumber kebenaran untuk field jurnal —
   Tanggal, Jam (dua `Input type=time` menggantikan 4 dropdown), Materi (`Textarea`), Metode
   (toggle Luring/Daring bergaya shadcn), panel GPS (Luring) / URL platform + kuota daring
   (Daring) memakai `Alert`, Hadir/Tidak hadir (`Input type=number`) dengan total otomatis.
   Dipakai ulang oleh: Sheet editor (Bagian 2), `sessions/new`, dan halaman Edit.
3. **Konsolidasi wizard:** `sessions/new` (`page.tsx` + `components/dosen/session-form.tsx`) dan
   halaman Edit dibangun ulang memakai `SessionFormFields`. Wizard 3-langkah-paksa diganti
   **satu form bersih** yang sama dengan Sheet editor. Alur Scan QR (`scan-client.tsx` →
   `sessions/new`) tetap berfungsi (parameter quick-start `scheduleSlotId` dipertahankan).
4. **Pembersihan token desain** pada surface di atas: `bg-white`→`bg-card`, `bg-gray-50`→
   `bg-muted`, ukuran teks `text-[10px]/[11px]`→ukuran normal, input mentah → komponen shadcn.
   Warna status (hijau/amber/merah/kuning) dipertahankan karena bermakna, lewat helper konsisten.

## Komponen & batas tanggung jawab

- **`SessionFormFields`** — render & validasi field jurnal; menerima nilai + callback `onChange`;
  tidak tahu cara menyimpan. Dipakai oleh Sheet editor dan halaman wizard.
- **`Sheet`** — kontainer slide-over responsif generik; tidak tahu isi jurnal.
- **`DaftarHadirTable`** — orkestrasi ikhtisar + Sheet + simpan/publish/hapus (memanggil API
  yang sudah ada); mendelegasikan field ke `SessionFormFields`.
- **Dashboard page** — server component; query yang ada dipertahankan, hanya presentasi diubah.

## Verifikasi (wajib, sesuai CLAUDE.md)

- `tsc --noEmit` — nol error.
- `npm run lint` — nol error.
- `npm run build` — nol error, nol warning.
- Cek manual: alur isi/simpan/publish/hapus, deteksi GPS, URL daring + kuota, navigasi
  antar-pertemuan, dan alur Scan QR → quick-start masih berjalan; responsif HP & desktop.

## Di luar lingkup

Dashboard admin/GKM/dekanat, logika API/backend, generator PDF/BAP, skema DB. Murni lapisan
UI/UX dosen.
