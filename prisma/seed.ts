import { PrismaClient, Role } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import bcrypt from "bcryptjs"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const password = await bcrypt.hash("admin123", 12)

  const faculty = await prisma.faculty.upsert({
    where: { code: "FTI" },
    update: {},
    create: {
      name: "Fakultas Teknologi Informasi",
      code: "FTI",
      campusLocation: {
        create: {
          latitude: -7.283100,
          longitude: 112.796200,
          radiusMeters: 300,
          label: "Kampus Utama",
        },
      },
    },
  })

  const prodi = await prisma.prodi.upsert({
    where: { code: "IF" },
    update: {},
    create: {
      name: "Informatika",
      code: "IF",
      facultyId: faculty.id,
    },
  })

  await prisma.user.upsert({
    where: { email: "admin@bkd.app" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@bkd.app",
      password,
      role: "ADMIN",
      prodiId: prodi.id,
    },
  })

  await prisma.user.upsert({
    where: { email: "dosen@bkd.app" },
    update: {},
    create: {
      name: "Dosen Test",
      email: "dosen@bkd.app",
      password,
      role: "DOSEN",
      nidn: "1234567890",
      prodiId: prodi.id,
    },
  })

  await prisma.user.upsert({
    where: { email: "gkm@bkd.app" },
    update: {},
    create: {
      name: "GKM Test",
      email: "gkm@bkd.app",
      password,
      role: "GKM",
      prodiId: prodi.id,
    },
  })

  await prisma.user.upsert({
    where: { email: "dekanat@bkd.app" },
    update: {},
    create: {
      name: "Dekanat Test",
      email: "dekanat@bkd.app",
      password,
      role: "DEKANAT",
      prodiId: prodi.id,
    },
  })

  console.log("✅ Seed completed!")
  console.log("  Admin:   admin@bkd.app / admin123")
  console.log("  Dosen:   dosen@bkd.app / admin123")
  console.log("  GKM:     gkm@bkd.app / admin123")
  console.log("  Dekanat: dekanat@bkd.app / admin123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
