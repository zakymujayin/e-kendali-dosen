import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import bcrypt from "bcryptjs"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const password = await bcrypt.hash("password123", 12)

  // === HAPUS DATA LAMA (dari anak ke induk) ===
  await prisma.scheduleSlot.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.document.deleteMany()
  await prisma.lectureSession.deleteMany()
  await prisma.teachingLoad.deleteMany()
  await prisma.course.deleteMany()
  await prisma.campusLocation.deleteMany()
  await prisma.user.deleteMany()
  await prisma.prodi.deleteMany()
  await prisma.faculty.deleteMany()
  await prisma.semester.deleteMany()

  // === FAKULTAS ===
  const faculty = await prisma.faculty.create({
    data: {
      name: "Fakultas Ushuluddin dan Adab",
      code: "FUDA",
      campusLocations: {
        create: [
          {
            latitude: -6.179804987824055,
            longitude: 106.15377364402957,
            radiusMeters: 300,
            label: "Kampus Utama",
            isActive: true,
          },
          {
            latitude: -6.181234,
            longitude: 106.155678,
            radiusMeters: 200,
            label: "Gedung B",
            isActive: true,
          },
        ],
      },
    },
  })

  // === PRODI ===
  const iat = await prisma.prodi.create({
    data: { name: "Ilmu Al-Qur'an dan Tafsir", code: "IAT", facultyId: faculty.id, kaprodiNama: "Dr. H. Hasan Basri, M.Ag", kaprodiNip: "196809152000031001" },
  })

  const ih = await prisma.prodi.create({
    data: { name: "Ilmu Hadis", code: "IH", facultyId: faculty.id, kaprodiNama: "Prof. Dr. Syamsuddin, M.A", kaprodiNip: "196505122000031001" },
  })

  const spi = await prisma.prodi.create({
    data: { name: "Sejarah Peradaban Islam", code: "SPI", facultyId: faculty.id, kaprodiNama: "Drs. Ahmad Syarif, M.Pd", kaprodiNip: "196712102000031001" },
  })

  const bsa = await prisma.prodi.create({
    data: { name: "Bahasa dan Sastra Arab", code: "BSA", facultyId: faculty.id, kaprodiNama: "Dr. H. Muhammad Taufik, Lc., M.A", kaprodiNip: "196803142000031001" },
  })

  const afi = await prisma.prodi.create({
    data: { name: "Aqidah dan Filsafat Islam", code: "AFI", facultyId: faculty.id, kaprodiNama: "Dr. H. Rahmat Hidayat, M.Ag", kaprodiNip: "197003142000031001" },
  })

  const ipii = await prisma.prodi.create({
    data: { name: "Ilmu Perpustakaan dan Informasi Islam", code: "IPII", facultyId: faculty.id, kaprodiNama: "Dr. Hj. Siti Maryam, S.IP., M.Si", kaprodiNip: "196809212000031001" },
  })

  // === SEMESTER ===
  const semester = await prisma.semester.create({
    data: {
      name: "Ganjil 2025/2026",
      year: "2025/2026",
      term: "Ganjil",
      isActive: true,
      startDate: new Date("2025-09-01"),
      endDate: new Date("2026-01-31"),
    },
  })

  // === USER ===
  const admin = await prisma.user.create({
    data: { username: "admin", name: "Admin", email: "admin@example.com", password, role: "ADMIN" },
  })

  const dekanat = await prisma.user.create({
    data: { username: "dekanat", name: "Prof. Dr. H. Abdul Malik, M.Ag", email: "dekanat@example.com", password, role: "DEKANAT", nidn: "196207121990" },
  })

  // IAT
  const ali = await prisma.user.create({
    data: { username: "ali", name: "Dr. Ali Imron, M.Ag", email: "ali@example.com", password, role: "DOSEN", nidn: "197503142000", prodiId: iat.id },
  })

  const maryam = await prisma.user.create({
    data: { username: "maryam", name: "Maryam Al-Farisi, Lc., M.A", email: "maryam@example.com", password, role: "DOSEN", nidn: "2001089201", prodiId: iat.id },
  })

  const gkmIat = await prisma.user.create({
    data: { username: "gkm_iat", name: "Hj. Nur Aisyah, Lc., M.Pd", email: "gkm_iat@example.com", password, role: "GKM", nidn: "198506142015", prodiId: iat.id, gkmProdiId: iat.id },
  })

  // IH
  const nur = await prisma.user.create({
    data: { username: "nur", name: "Dr. Nur Hadi, M.A", email: "nur@example.com", password, role: "DOSEN", nidn: "197612152000", prodiId: ih.id },
  })

  const zainab = await prisma.user.create({
    data: { username: "zainab", name: "Zainab Abdullah, Lc., M.Hum", email: "zainab@example.com", password, role: "DOSEN", nidn: "2002109302", prodiId: ih.id },
  })

  const gkmIh = await prisma.user.create({
    data: { username: "gkm_ih", name: "H. Fahmi Syuhada, Lc., M.A", email: "gkm_ih@example.com", password, role: "GKM", nidn: "198312142016", prodiId: ih.id, gkmProdiId: ih.id },
  })

  // SPI
  const rizal = await prisma.user.create({
    data: { username: "rizal", name: "Dr. Rizal Fathoni, M.Hum", email: "rizal@example.com", password, role: "DOSEN", nidn: "197809112000", prodiId: spi.id },
  })

  const halimah = await prisma.user.create({
    data: { username: "halimah", name: "Halimah Sa'diyah, S.Hum., M.A", email: "halimah@example.com", password, role: "DOSEN", nidn: "2003129402", prodiId: spi.id },
  })

  const gkmSpi = await prisma.user.create({
    data: { username: "gkm_spi", name: "Dra. Hj. Lutfiah Hanim, M.Si", email: "gkm_spi@example.com", password, role: "GKM", nidn: "197502212017", prodiId: spi.id, gkmProdiId: spi.id },
  })

  // BSA
  const idris = await prisma.user.create({
    data: { username: "idris", name: "Dr. Idris Yahya, M.Ag", email: "idris@example.com", password, role: "DOSEN", nidn: "197107152000", prodiId: bsa.id },
  })

  const aisyah = await prisma.user.create({
    data: { username: "aisyah", name: "Aisyah Az-Zahra, Lc., M.Pd", email: "aisyah@example.com", password, role: "DOSEN", nidn: "2005049602", prodiId: bsa.id },
  })

  const gkmBsa = await prisma.user.create({
    data: { username: "gkm_bsa", name: "Drs. H. Abdul Ghofur, M.Pd", email: "gkm_bsa@example.com", password, role: "GKM", nidn: "199104182018", prodiId: bsa.id, gkmProdiId: bsa.id },
  })

  // AFI
  const ahmad = await prisma.user.create({
    data: { username: "ahmad", name: "Dr. Ahmad Fauzi, M.Ag", email: "ahmad@example.com", password, role: "DOSEN", nidn: "2001038801", prodiId: afi.id },
  })

  const siti = await prisma.user.create({
    data: { username: "siti", name: "Hj. Siti Nurhaliza, Lc., M.A", email: "siti@example.com", password, role: "DOSEN", nidn: "2005039202", prodiId: afi.id },
  })

  const gkmAfi = await prisma.user.create({
    data: { username: "gkm_afi", name: "Dr. Hj. Anisah Muthmainnah, M.Fil.I", email: "gkm_afi@example.com", password, role: "GKM", nidn: "198807132019", prodiId: afi.id, gkmProdiId: afi.id },
  })

  // IPII
  const mahmud = await prisma.user.create({
    data: { username: "mahmud", name: "Drs. Mahmud Syaltout, S.IP., M.Si", email: "mahmud@example.com", password, role: "DOSEN", nidn: "196512311990", prodiId: ipii.id },
  })

  const fatimah = await prisma.user.create({
    data: { username: "fatimah", name: "Fatimah Az-Zahra, S.IP., M.IP", email: "fatimah@example.com", password, role: "DOSEN", nidn: "2010039502", prodiId: ipii.id },
  })

  const bakri = await prisma.user.create({
    data: { username: "bakri", name: "Bakri, S.Pd., M.Pd", email: "bakri@example.com", password, role: "DOSEN", nidn: "2011079101", prodiId: ipii.id },
  })

  const gkmIpii = await prisma.user.create({
    data: { username: "gkm_ipii", name: "Muhammad Arsyad, S.IP., M.A", email: "gkm_ipii@example.com", password, role: "GKM", nidn: "199308152020", prodiId: ipii.id, gkmProdiId: ipii.id },
  })

  // === MATA KULIAH ===
  // IAT
  const ulumulQuran = await prisma.course.create({
    data: { name: "Ulumul Qur'an", code: "IAT101", sks: 3, totalMeeting: 16, prodiId: iat.id, semesterId: semester.id },
  })

  const tafsirMaudhui = await prisma.course.create({
    data: { name: "Tafsir Maudhu'i", code: "IAT201", sks: 3, totalMeeting: 16, prodiId: iat.id, semesterId: semester.id },
  })

  const studiQuran = await prisma.course.create({
    data: { name: "Studi Al-Qur'an Kontemporer", code: "IAT301", sks: 2, totalMeeting: 14, prodiId: iat.id, semesterId: semester.id },
  })

  // IH
  const ulumulHadis = await prisma.course.create({
    data: { name: "Ulumul Hadis", code: "IH101", sks: 3, totalMeeting: 16, prodiId: ih.id, semesterId: semester.id },
  })

  const takhrijHadis = await prisma.course.create({
    data: { name: "Takhrij Hadis", code: "IH201", sks: 3, totalMeeting: 16, prodiId: ih.id, semesterId: semester.id },
  })

  const studiHadis = await prisma.course.create({
    data: { name: "Studi Hadis Kontemporer", code: "IH301", sks: 2, totalMeeting: 14, prodiId: ih.id, semesterId: semester.id },
  })

  // SPI
  const sejarahKlasik = await prisma.course.create({
    data: { name: "Sejarah Peradaban Islam Klasik", code: "SPI101", sks: 3, totalMeeting: 16, prodiId: spi.id, semesterId: semester.id },
  })

  const sejarahModern = await prisma.course.create({
    data: { name: "Sejarah Peradaban Islam Modern", code: "SPI201", sks: 3, totalMeeting: 16, prodiId: spi.id, semesterId: semester.id },
  })

  const historiografi = await prisma.course.create({
    data: { name: "Historiografi Islam", code: "SPI301", sks: 2, totalMeeting: 14, prodiId: spi.id, semesterId: semester.id },
  })

  // BSA
  const nahwu = await prisma.course.create({
    data: { name: "Nahwu", code: "BSA101", sks: 3, totalMeeting: 16, prodiId: bsa.id, semesterId: semester.id },
  })

  const sharaf = await prisma.course.create({
    data: { name: "Sharaf", code: "BSA201", sks: 3, totalMeeting: 16, prodiId: bsa.id, semesterId: semester.id },
  })

  const balaghah = await prisma.course.create({
    data: { name: "Balaghah", code: "BSA301", sks: 2, totalMeeting: 14, prodiId: bsa.id, semesterId: semester.id },
  })

  // AFI
  const filsafat = await prisma.course.create({
    data: { name: "Filsafat Umum", code: "AFI101", sks: 3, totalMeeting: 16, prodiId: afi.id, semesterId: semester.id },
  })

  const kalam = await prisma.course.create({
    data: { name: "Ilmu Kalam", code: "AFI201", sks: 3, totalMeeting: 16, prodiId: afi.id, semesterId: semester.id },
  })

  const tasawuf = await prisma.course.create({
    data: { name: "Akhlak Tasawuf", code: "AFI301", sks: 3, totalMeeting: 16, prodiId: afi.id, semesterId: semester.id },
  })

  // IPII
  const pengantarPerpus = await prisma.course.create({
    data: { name: "Pengantar Ilmu Perpustakaan", code: "IPII101", sks: 3, totalMeeting: 16, prodiId: ipii.id, semesterId: semester.id },
  })

  const klasifikasi = await prisma.course.create({
    data: { name: "Klasifikasi Bahan Pustaka", code: "IPII201", sks: 3, totalMeeting: 16, prodiId: ipii.id, semesterId: semester.id },
  })

  const manajemenPerpus = await prisma.course.create({
    data: { name: "Manajemen Perpustakaan", code: "IPII301", sks: 3, totalMeeting: 16, prodiId: ipii.id, semesterId: semester.id },
  })

  // === TEACHING LOADS ===
  await prisma.teachingLoad.createMany({
    data: [
      // IAT
      { userId: ali.id, courseId: ulumulQuran.id, semesterId: semester.id },
      { userId: ali.id, courseId: tafsirMaudhui.id, semesterId: semester.id },
      { userId: maryam.id, courseId: studiQuran.id, semesterId: semester.id },
      // IH
      { userId: nur.id, courseId: ulumulHadis.id, semesterId: semester.id },
      { userId: nur.id, courseId: takhrijHadis.id, semesterId: semester.id },
      { userId: zainab.id, courseId: studiHadis.id, semesterId: semester.id },
      // SPI
      { userId: rizal.id, courseId: sejarahKlasik.id, semesterId: semester.id },
      { userId: rizal.id, courseId: sejarahModern.id, semesterId: semester.id },
      { userId: halimah.id, courseId: historiografi.id, semesterId: semester.id },
      // BSA
      { userId: idris.id, courseId: nahwu.id, semesterId: semester.id },
      { userId: idris.id, courseId: sharaf.id, semesterId: semester.id },
      { userId: aisyah.id, courseId: balaghah.id, semesterId: semester.id },
      // AFI
      { userId: ahmad.id, courseId: filsafat.id, semesterId: semester.id },
      { userId: ahmad.id, courseId: kalam.id, semesterId: semester.id },
      { userId: siti.id, courseId: tasawuf.id, semesterId: semester.id },
      // IPII
      { userId: mahmud.id, courseId: pengantarPerpus.id, semesterId: semester.id },
      { userId: mahmud.id, courseId: klasifikasi.id, semesterId: semester.id },
      { userId: fatimah.id, courseId: manajemenPerpus.id, semesterId: semester.id },
      { userId: bakri.id, courseId: klasifikasi.id, semesterId: semester.id },
    ],
  })

  // === SCHEDULE SLOTS ===
  await prisma.scheduleSlot.createMany({
    data: [
      // IAT - ali (2 courses × 2 slots)
      { semesterId: semester.id, userId: ali.id, courseId: ulumulQuran.id, prodiId: iat.id, roomName: "R.201", className: "IAT-1A", day: "SENIN", startTime: "08.00", endTime: "09.40" },
      { semesterId: semester.id, userId: ali.id, courseId: ulumulQuran.id, prodiId: iat.id, roomName: "R.201", className: "IAT-1A", day: "RABU", startTime: "08.00", endTime: "09.40" },
      { semesterId: semester.id, userId: ali.id, courseId: tafsirMaudhui.id, prodiId: iat.id, roomName: "R.202", className: "IAT-2A", day: "SELASA", startTime: "10.00", endTime: "11.40" },
      { semesterId: semester.id, userId: ali.id, courseId: tafsirMaudhui.id, prodiId: iat.id, roomName: "R.202", className: "IAT-2A", day: "KAMIS", startTime: "10.00", endTime: "11.40" },
      // IAT - maryam (1 course × 2 slots)
      { semesterId: semester.id, userId: maryam.id, courseId: studiQuran.id, prodiId: iat.id, roomName: "R.103", className: "IAT-3A", day: "RABU", startTime: "13.00", endTime: "14.40" },
      { semesterId: semester.id, userId: maryam.id, courseId: studiQuran.id, prodiId: iat.id, roomName: "R.103", className: "IAT-3A", day: "JUMAT", startTime: "08.00", endTime: "09.40" },
      // IH - nur (2 courses × 2 slots)
      { semesterId: semester.id, userId: nur.id, courseId: ulumulHadis.id, prodiId: ih.id, roomName: "R.301", className: "IH-1A", day: "SENIN", startTime: "13.00", endTime: "14.40" },
      { semesterId: semester.id, userId: nur.id, courseId: ulumulHadis.id, prodiId: ih.id, roomName: "R.301", className: "IH-1A", day: "RABU", startTime: "13.00", endTime: "14.40" },
      { semesterId: semester.id, userId: nur.id, courseId: takhrijHadis.id, prodiId: ih.id, roomName: "R.302", className: "IH-2A", day: "SELASA", startTime: "08.00", endTime: "09.40" },
      { semesterId: semester.id, userId: nur.id, courseId: takhrijHadis.id, prodiId: ih.id, roomName: "R.302", className: "IH-2A", day: "KAMIS", startTime: "08.00", endTime: "09.40" },
      // IH - zainab (1 course × 3 slots)
      { semesterId: semester.id, userId: zainab.id, courseId: studiHadis.id, prodiId: ih.id, roomName: "R.203", className: "IH-3A", day: "SELASA", startTime: "13.00", endTime: "14.40" },
      { semesterId: semester.id, userId: zainab.id, courseId: studiHadis.id, prodiId: ih.id, roomName: "R.203", className: "IH-3A", day: "KAMIS", startTime: "13.00", endTime: "14.40" },
      { semesterId: semester.id, userId: zainab.id, courseId: studiHadis.id, prodiId: ih.id, roomName: "R.203", className: "IH-3A", day: "JUMAT", startTime: "10.00", endTime: "11.40" },
      // SPI - rizal (2 courses × 2 slots)
      { semesterId: semester.id, userId: rizal.id, courseId: sejarahKlasik.id, prodiId: spi.id, roomName: "R.401", className: "SPI-1A", day: "SENIN", startTime: "10.00", endTime: "11.40" },
      { semesterId: semester.id, userId: rizal.id, courseId: sejarahKlasik.id, prodiId: spi.id, roomName: "R.401", className: "SPI-1A", day: "KAMIS", startTime: "13.00", endTime: "14.40" },
      { semesterId: semester.id, userId: rizal.id, courseId: sejarahModern.id, prodiId: spi.id, roomName: "R.402", className: "SPI-2A", day: "RABU", startTime: "10.00", endTime: "11.40" },
      { semesterId: semester.id, userId: rizal.id, courseId: sejarahModern.id, prodiId: spi.id, roomName: "R.402", className: "SPI-2A", day: "JUMAT", startTime: "08.00", endTime: "09.40" },
      // SPI - halimah (1 course × 3 slots)
      { semesterId: semester.id, userId: halimah.id, courseId: historiografi.id, prodiId: spi.id, roomName: "R.303", className: "SPI-3A", day: "SELASA", startTime: "08.00", endTime: "09.40" },
      { semesterId: semester.id, userId: halimah.id, courseId: historiografi.id, prodiId: spi.id, roomName: "R.303", className: "SPI-3A", day: "KAMIS", startTime: "08.00", endTime: "09.40" },
      { semesterId: semester.id, userId: halimah.id, courseId: historiografi.id, prodiId: spi.id, roomName: "R.303", className: "SPI-3A", day: "JUMAT", startTime: "13.00", endTime: "14.40" },
      // BSA - idris (2 courses × 2 slots)
      { semesterId: semester.id, userId: idris.id, courseId: nahwu.id, prodiId: bsa.id, roomName: "R.501", className: "BSA-1A", day: "SENIN", startTime: "08.00", endTime: "09.40" },
      { semesterId: semester.id, userId: idris.id, courseId: nahwu.id, prodiId: bsa.id, roomName: "R.501", className: "BSA-1A", day: "SELASA", startTime: "08.00", endTime: "09.40" },
      { semesterId: semester.id, userId: idris.id, courseId: sharaf.id, prodiId: bsa.id, roomName: "R.502", className: "BSA-2A", day: "RABU", startTime: "10.00", endTime: "11.40" },
      { semesterId: semester.id, userId: idris.id, courseId: sharaf.id, prodiId: bsa.id, roomName: "R.502", className: "BSA-2A", day: "KAMIS", startTime: "10.00", endTime: "11.40" },
      // BSA - aisyah (1 course × 3 slots)
      { semesterId: semester.id, userId: aisyah.id, courseId: balaghah.id, prodiId: bsa.id, roomName: "R.403", className: "BSA-3A", day: "RABU", startTime: "13.00", endTime: "14.40" },
      { semesterId: semester.id, userId: aisyah.id, courseId: balaghah.id, prodiId: bsa.id, roomName: "R.403", className: "BSA-3A", day: "KAMIS", startTime: "13.00", endTime: "14.40" },
      { semesterId: semester.id, userId: aisyah.id, courseId: balaghah.id, prodiId: bsa.id, roomName: "R.403", className: "BSA-3A", day: "JUMAT", startTime: "10.00", endTime: "11.40" },
      // AFI - ahmad (2 courses × 2 slots)
      { semesterId: semester.id, userId: ahmad.id, courseId: filsafat.id, prodiId: afi.id, roomName: "R.601", className: "AFI-1A", day: "SENIN", startTime: "10.00", endTime: "11.40" },
      { semesterId: semester.id, userId: ahmad.id, courseId: filsafat.id, prodiId: afi.id, roomName: "R.601", className: "AFI-1A", day: "SELASA", startTime: "10.00", endTime: "11.40" },
      { semesterId: semester.id, userId: ahmad.id, courseId: kalam.id, prodiId: afi.id, roomName: "R.602", className: "AFI-2A", day: "RABU", startTime: "08.00", endTime: "09.40" },
      { semesterId: semester.id, userId: ahmad.id, courseId: kalam.id, prodiId: afi.id, roomName: "R.602", className: "AFI-2A", day: "KAMIS", startTime: "08.00", endTime: "09.40" },
      // AFI - siti (1 course × 3 slots)
      { semesterId: semester.id, userId: siti.id, courseId: tasawuf.id, prodiId: afi.id, roomName: "R.503", className: "AFI-3A", day: "SELASA", startTime: "13.00", endTime: "14.40" },
      { semesterId: semester.id, userId: siti.id, courseId: tasawuf.id, prodiId: afi.id, roomName: "R.503", className: "AFI-3A", day: "KAMIS", startTime: "13.00", endTime: "14.40" },
      { semesterId: semester.id, userId: siti.id, courseId: tasawuf.id, prodiId: afi.id, roomName: "R.503", className: "AFI-3A", day: "JUMAT", startTime: "08.00", endTime: "09.40" },
      // IPII - mahmud (2 courses × 2 slots)
      { semesterId: semester.id, userId: mahmud.id, courseId: pengantarPerpus.id, prodiId: ipii.id, roomName: "R.701", className: "IPII-1A", day: "SENIN", startTime: "13.00", endTime: "14.40" },
      { semesterId: semester.id, userId: mahmud.id, courseId: pengantarPerpus.id, prodiId: ipii.id, roomName: "R.701", className: "IPII-1A", day: "RABU", startTime: "10.00", endTime: "11.40" },
      { semesterId: semester.id, userId: mahmud.id, courseId: klasifikasi.id, prodiId: ipii.id, roomName: "R.702", className: "IPII-2A", day: "SELASA", startTime: "13.00", endTime: "14.40" },
      { semesterId: semester.id, userId: mahmud.id, courseId: klasifikasi.id, prodiId: ipii.id, roomName: "R.702", className: "IPII-2A", day: "KAMIS", startTime: "10.00", endTime: "11.40" },
      // IPII - fatimah (1 course × 3 slots)
      { semesterId: semester.id, userId: fatimah.id, courseId: manajemenPerpus.id, prodiId: ipii.id, roomName: "R.603", className: "IPII-3A", day: "RABU", startTime: "08.00", endTime: "09.40" },
      { semesterId: semester.id, userId: fatimah.id, courseId: manajemenPerpus.id, prodiId: ipii.id, roomName: "R.603", className: "IPII-3A", day: "KAMIS", startTime: "08.00", endTime: "09.40" },
      { semesterId: semester.id, userId: fatimah.id, courseId: manajemenPerpus.id, prodiId: ipii.id, roomName: "R.603", className: "IPII-3A", day: "JUMAT", startTime: "13.00", endTime: "14.40" },
      // IPII - bakri (1 course × 3 slots, team teaching with mahmud)
      { semesterId: semester.id, userId: bakri.id, courseId: klasifikasi.id, prodiId: ipii.id, roomName: "R.702", className: "IPII-2B", day: "SENIN", startTime: "08.00", endTime: "09.40" },
      { semesterId: semester.id, userId: bakri.id, courseId: klasifikasi.id, prodiId: ipii.id, roomName: "R.702", className: "IPII-2B", day: "SELASA", startTime: "10.00", endTime: "11.40" },
      { semesterId: semester.id, userId: bakri.id, courseId: klasifikasi.id, prodiId: ipii.id, roomName: "R.702", className: "IPII-2B", day: "JUMAT", startTime: "10.00", endTime: "11.40" },
    ],
  })

  console.log("✅ Seed completed!")
  const allUsers = [
    admin, dekanat,
    ali, maryam, gkmIat,
    nur, zainab, gkmIh,
    rizal, halimah, gkmSpi,
    idris, aisyah, gkmBsa,
    ahmad, siti, gkmAfi,
    mahmud, fatimah, bakri, gkmIpii,
  ]
  for (const u of allUsers) {
    console.log(`  ${u.role}: ${u.username} / password123`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
