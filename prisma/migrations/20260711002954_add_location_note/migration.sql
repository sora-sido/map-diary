-- DropIndex
DROP INDEX "gps_logs_geog_gist_idx";

-- DropIndex
DROP INDEX "locations_geog_gist_idx";

-- DropIndex
DROP INDEX "place_visits_geog_gist_idx";

-- AlterTable
ALTER TABLE "diary_entries" ADD COLUMN     "locationId" TEXT;

-- CreateIndex
CREATE INDEX "diary_entries_userId_locationId_idx" ON "diary_entries"("userId", "locationId");

-- AddForeignKey
ALTER TABLE "diary_entries" ADD CONSTRAINT "diary_entries_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
