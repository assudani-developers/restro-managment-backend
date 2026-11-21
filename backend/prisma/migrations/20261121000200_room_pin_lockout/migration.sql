-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "pinFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pinLockedUntil" TIMESTAMP(3);

