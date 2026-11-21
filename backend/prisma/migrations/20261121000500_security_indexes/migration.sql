CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx"
  ON "audit_logs"("createdAt");

CREATE INDEX IF NOT EXISTS "audit_logs_userId_createdAt_idx"
  ON "audit_logs"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "orders_branchId_status_createdAt_idx"
  ON "orders"("branchId", "status", "createdAt");
