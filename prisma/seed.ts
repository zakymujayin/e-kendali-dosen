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
    data: { name: "Ilmu Al-Qur'an dan Tafsir", code: "IAT", facultyId: faculty.id },
  })

  const ih = await prisma.prodi.create({
    data: { name: "Ilmu Hadis", code: "IH", facultyId: faculty.id },
  })

  const spi = await prisma.prodi.create({
    data: { name: "Sejarah Peradaban Islam", code: "SPI", facultyId: faculty.id },
  })

  const bsa = await prisma.prodi.create({
    data: { name: "Bahasa dan Sastra Arab", code: "BSA", facultyId: faculty.id },
  })

  const afi = await prisma.prodi.create({
    data: { name: "Aqidah dan Filsafat Islam", code: "AFI", facultyId: faculty.id },
  })

  const ipii = await prisma.prodi.create({
    data: { name: "Ilmu Perpustakaan dan Informasi Islam", code: "IPII", facultyId: faculty.id },
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
    data: { username: "gkm_iat", name: "Dr. H. Hasan Basri, M.Ag", email: "gkm_iat@example.com", password, role: "GKM", nidn: "196809152000", prodiId: iat.id, gkmProdiId: iat.id },
  })

  // IH
  const nur = await prisma.user.create({
    data: { username: "nur", name: "Dr. Nur Hadi, M.A", email: "nur@example.com", password, role: "DOSEN", nidn: "197612152000", prodiId: ih.id },
  })

  const zainab = await prisma.user.create({
    data: { username: "zainab", name: "Zainab Abdullah, Lc., M.Hum", email: "zainab@example.com", password, role: "DOSEN", nidn: "2002109302", prodiId: ih.id },
  })

  const gkmIh = await prisma.user.create({
    data: { username: "gkm_ih", name: "Prof. Dr. Syamsuddin, M.A", email: "gkm_ih@example.com", password, role: "GKM", nidn: "196505122000", prodiId: ih.id, gkmProdiId: ih.id },
  })

  // SPI
  const rizal = await prisma.user.create({
    data: { username: "rizal", name: "Dr. Rizal Fathoni, M.Hum", email: "rizal@example.com", password, role: "DOSEN", nidn: "197809112000", prodiId: spi.id },
  })

  const halimah = await prisma.user.create({
    data: { username: "halimah", name: "Halimah Sa'diyah, S.Hum., M.A", email: "halimah@example.com", password, role: "DOSEN", nidn: "2003129402", prodiId: spi.id },
  })

  const gkmSpi = await prisma.user.create({
    data: { username: "gkm_spi", name: "Drs. Ahmad Syarif, M.Pd", email: "gkm_spi@example.com", password, role: "GKM", nidn: "196712102000", prodiId: spi.id, gkmProdiId: spi.id },
  })

  // BSA
  const idris = await prisma.user.create({
    data: { username: "idris", name: "Dr. Idris Yahya, M.Ag", email: "idris@example.com", password, role: "DOSEN", nidn: "197107152000", prodiId: bsa.id },
  })

  const aisyah = await prisma.user.create({
    data: { username: "aisyah", name: "Aisyah Az-Zahra, Lc., M.Pd", email: "aisyah@example.com", password, role: "DOSEN", nidn: "2005049602", prodiId: bsa.id },
  })

  const gkmBsa = await prisma.user.create({
    data: { username: "gkm_bsa", name: "Dr. H. Muhammad Taufik, Lc., M.A", email: "gkm_bsa@example.com", password, role: "GKM", nidn: "196803142000", prodiId: bsa.id, gkmProdiId: bsa.id },
  })

  // AFI
  const ahmad = await prisma.user.create({
    data: { username: "ahmad", name: "Dr. Ahmad Fauzi, M.Ag", email: "ahmad@example.com", password, role: "DOSEN", nidn: "2001038801", prodiId: afi.id },
  })

  const siti = await prisma.user.create({
    data: { username: "siti", name: "Hj. Siti Nurhaliza, Lc., M.A", email: "siti@example.com", password, role: "DOSEN", nidn: "2005039202", prodiId: afi.id },
  })

  const gkmAfi = await prisma.user.create({
    data: { username: "gkm_afi", name: "Dr. H. Rahmat Hidayat, M.Ag", email: "gkm_afi@example.com", password, role: "GKM", nidn: "197003142000", prodiId: afi.id, gkmProdiId: afi.id },
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
    data: { username: "gkm_ipii", name: "Dr. Hj. Siti Maryam, S.IP., M.Si", email: "gkm_ipii@example.com", password, role: "GKM", nidn: "196809212000", prodiId: ipii.id, gkmProdiId: ipii.id },
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
