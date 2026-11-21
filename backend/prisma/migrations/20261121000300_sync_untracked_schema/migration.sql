-- Catch-up for schema changes that earlier work applied to development
-- databases without a migration file (multi-tenant SaaS flags and indexes).
-- Idempotent, so it is safe on databases that already have them.

ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'ENTERPRISE';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "kot_items_orderItemId_idx" ON "kot_items"("orderItemId");
CREATE INDEX IF NOT EXISTS "kot_items_status_idx" ON "kot_items"("status");
CREATE INDEX IF NOT EXISTS "kots_status_createdAt_idx" ON "kots"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "menu_items_branchId_isActive_idx" ON "menu_items"("branchId", "isActive");
CREATE INDEX IF NOT EXISTS "menu_items_branchId_isVeg_idx" ON "menu_items"("branchId", "isVeg");
CREATE INDEX IF NOT EXISTS "orders_branchId_createdAt_idx" ON "orders"("branchId", "createdAt");
CREATE INDEX IF NOT EXISTS "orders_branchId_tableId_idx" ON "orders"("branchId", "tableId");
CREATE INDEX IF NOT EXISTS "orders_customerId_idx" ON "orders"("customerId");
CREATE INDEX IF NOT EXISTS "payments_createdAt_idx" ON "payments"("createdAt");
CREATE INDEX IF NOT EXISTS "payments_method_idx" ON "payments"("method");
CREATE INDEX IF NOT EXISTS "reservations_branchId_status_idx" ON "reservations"("branchId", "status");

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'verifactu_records_chain_key') THEN
    ALTER INDEX "verifactu_records_chain_key" RENAME TO "verifactu_records_restaurantId_issuerNif_environment_seq_key";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'verifactu_records_number_key') THEN
    ALTER INDEX "verifactu_records_number_key" RENAME TO "verifactu_records_restaurantId_issuerNif_environment_invoic_key";
  END IF;
END $$;
