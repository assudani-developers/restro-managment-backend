-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "poolAdultRate" DECIMAL(12,2) NOT NULL DEFAULT 300,
ADD COLUMN     "poolChildRate" DECIMAL(12,2) NOT NULL DEFAULT 150,
ADD COLUMN     "poolSlotCapacity" INTEGER NOT NULL DEFAULT 40,
ADD COLUMN     "wifiName" TEXT,
ADD COLUMN     "wifiPassword" TEXT;

