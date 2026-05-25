-- DropIndex
DROP INDEX "campus_locations_facultyId_key";

-- AlterTable
ALTER TABLE "campus_locations" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
