-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_userId_fkey";

-- DropForeignKey
ALTER TABLE "schedule_slots" DROP CONSTRAINT "schedule_slots_courseId_fkey";

-- DropForeignKey
ALTER TABLE "schedule_slots" DROP CONSTRAINT "schedule_slots_prodiId_fkey";

-- DropForeignKey
ALTER TABLE "schedule_slots" DROP CONSTRAINT "schedule_slots_semesterId_fkey";

-- DropForeignKey
ALTER TABLE "schedule_slots" DROP CONSTRAINT "schedule_slots_userId_fkey";

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "prodi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
