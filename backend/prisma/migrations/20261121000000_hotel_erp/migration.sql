-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'DIRTY', 'INSPECTION', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('RECEPTION', 'WEBSITE', 'OTA', 'PHONE', 'WALK_IN');

-- CreateEnum
CREATE TYPE "FolioEntryType" AS ENUM ('ROOM', 'MEAL_PLAN', 'RESTAURANT', 'ROOM_SERVICE', 'POOL', 'EVENT', 'EXTRA', 'TAX', 'DISCOUNT', 'PAYMENT', 'REFUND');

-- AlterEnum
ALTER TYPE "OrderType" ADD VALUE 'ROOM_SERVICE';

-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "checkInTime" TEXT NOT NULL DEFAULT '12:00',
ADD COLUMN     "checkOutTime" TEXT NOT NULL DEFAULT '11:00',
ADD COLUMN     "checkoutSoonHours" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "geofenceEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "geofenceRadiusM" INTEGER NOT NULL DEFAULT 200,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "roomMenuMode" TEXT NOT NULL DEFAULT 'SYNCED',
ADD COLUMN     "roomServiceCharge" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "isSoldOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "roomServiceEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "roomServicePrice" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "bookingId" TEXT,
ADD COLUMN     "folioPostedAt" TIMESTAMP(3),
ADD COLUMN     "roomId" TEXT;

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "accentColor" TEXT DEFAULT '#C9973F',
ADD COLUMN     "brandColor" TEXT DEFAULT '#7A2E1F',
ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "tagline" TEXT;

-- CreateTable
CREATE TABLE "room_categories" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "bedType" TEXT NOT NULL DEFAULT 'DOUBLE',
    "baseRate" DECIMAL(12,2) NOT NULL,
    "extraGuestRate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "maxAdults" INTEGER NOT NULL DEFAULT 2,
    "maxChildren" INTEGER NOT NULL DEFAULT 1,
    "taxRatePercent" DECIMAL(5,2) NOT NULL DEFAULT 12,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plans" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pricePerNight" DECIMAL(12,2) NOT NULL,
    "includesBreakfast" BOOLEAN NOT NULL DEFAULT false,
    "includesLunch" BOOLEAN NOT NULL DEFAULT false,
    "includesDinner" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "floorLabel" TEXT,
    "status" "RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "statusSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "qrToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_status_history" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "fromStatus" "RoomStatus",
    "toStatus" "RoomStatus" NOT NULL,
    "note" TEXT,
    "byUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "source" "BookingSource" NOT NULL DEFAULT 'RECEPTION',
    "otaName" TEXT,
    "otaReference" TEXT,
    "otaCommissionPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "guestName" TEXT NOT NULL,
    "guestPhone" TEXT,
    "guestEmail" TEXT,
    "guestIdType" TEXT,
    "guestIdNumber" TEXT,
    "guestAddress" TEXT,
    "consentMessages" BOOLEAN NOT NULL DEFAULT true,
    "categoryId" TEXT NOT NULL,
    "roomId" TEXT,
    "mealPlanId" TEXT,
    "checkIn" DATE NOT NULL,
    "checkOut" DATE NOT NULL,
    "nights" INTEGER NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 2,
    "children" INTEGER NOT NULL DEFAULT 0,
    "arrivalTime" TEXT,
    "specialRequests" TEXT,
    "roomRate" DECIMAL(12,2) NOT NULL,
    "mealRate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxRatePercent" DECIMAL(5,2) NOT NULL DEFAULT 12,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "guestToken" TEXT NOT NULL,
    "stayPin" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3),
    "checkedOutAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folio_transactions" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" "FolioEntryType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "method" TEXT,
    "reference" TEXT,
    "orderId" TEXT,
    "idempotencyKey" TEXT,
    "byUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "folio_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venues" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'BANQUET',
    "capacity" INTEGER NOT NULL DEFAULT 100,
    "baseRate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "perPlateRate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_bookings" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ENQUIRY',
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "eventDate" DATE NOT NULL,
    "startTime" TEXT NOT NULL DEFAULT '18:00',
    "endTime" TEXT NOT NULL DEFAULT '23:00',
    "guestCount" INTEGER NOT NULL DEFAULT 100,
    "packageName" TEXT,
    "services" JSONB NOT NULL DEFAULT '[]',
    "venueCharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cateringPerPlate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxRatePercent" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "payments" JSONB NOT NULL DEFAULT '[]',
    "roomBlockCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pool_passes" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "guestType" TEXT NOT NULL DEFAULT 'VISITOR',
    "bookingId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "sessionDate" DATE NOT NULL,
    "slot" TEXT NOT NULL DEFAULT 'MORNING',
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "checkedInAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pool_passes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "bookingId" TEXT,
    "trigger" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "room_categories_branchId_code_key" ON "room_categories"("branchId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "meal_plans_branchId_code_key" ON "meal_plans"("branchId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_qrToken_key" ON "rooms"("qrToken");

-- CreateIndex
CREATE INDEX "rooms_branchId_status_idx" ON "rooms"("branchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_branchId_number_key" ON "rooms"("branchId", "number");

-- CreateIndex
CREATE INDEX "room_status_history_roomId_createdAt_idx" ON "room_status_history"("roomId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_guestToken_key" ON "bookings"("guestToken");

-- CreateIndex
CREATE INDEX "bookings_branchId_status_idx" ON "bookings"("branchId", "status");

-- CreateIndex
CREATE INDEX "bookings_branchId_checkIn_idx" ON "bookings"("branchId", "checkIn");

-- CreateIndex
CREATE INDEX "bookings_roomId_status_idx" ON "bookings"("roomId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_branchId_code_key" ON "bookings"("branchId", "code");

-- CreateIndex
CREATE INDEX "folio_transactions_bookingId_createdAt_idx" ON "folio_transactions"("bookingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "folio_transactions_bookingId_idempotencyKey_key" ON "folio_transactions"("bookingId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "event_bookings_branchId_eventDate_idx" ON "event_bookings"("branchId", "eventDate");

-- CreateIndex
CREATE UNIQUE INDEX "event_bookings_branchId_code_key" ON "event_bookings"("branchId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "pool_passes_code_key" ON "pool_passes"("code");

-- CreateIndex
CREATE INDEX "pool_passes_branchId_sessionDate_idx" ON "pool_passes"("branchId", "sessionDate");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_branchId_trigger_channel_key" ON "notification_templates"("branchId", "trigger", "channel");

-- CreateIndex
CREATE INDEX "notification_logs_branchId_createdAt_idx" ON "notification_logs"("branchId", "createdAt");

-- CreateIndex
CREATE INDEX "orders_roomId_idx" ON "orders"("roomId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_categories" ADD CONSTRAINT "room_categories_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "room_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_status_history" ADD CONSTRAINT "room_status_history_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "room_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "meal_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folio_transactions" ADD CONSTRAINT "folio_transactions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venues" ADD CONSTRAINT "venues_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_bookings" ADD CONSTRAINT "event_bookings_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_bookings" ADD CONSTRAINT "event_bookings_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_passes" ADD CONSTRAINT "pool_passes_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_passes" ADD CONSTRAINT "pool_passes_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

