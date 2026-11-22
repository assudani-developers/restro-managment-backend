-- ============================================================================
-- SQL SCRIPT: REVOKE OLD MASTER ADMIN & CONFIGURE NEW MASTER ADMIN
-- ============================================================================

-- 1. Deactivate & strip superadmin permissions from old accounts
UPDATE "users"
SET 
  "isActive" = false,
  "isSuperAdmin" = false,
  "passwordHash" = '$2b$12$REVOKED_DEACTIVATED_ACCOUNT_' || md5(random()::text),
  "pinHash" = NULL,
  "twoFactorEnabled" = false
WHERE 
  LOWER(COALESCE("email", '')) LIKE '%piyushassudani%'
  OR LOWER(COALESCE("name", '')) LIKE '%piyushassudani%'
  OR COALESCE("phone", '') LIKE '%9413879444%';

-- 2. Verify deactivated users
SELECT "id", "name", "email", "phone", "isActive", "isSuperAdmin"
FROM "users"
WHERE 
  LOWER(COALESCE("email", '')) LIKE '%piyushassudani%'
  OR LOWER(COALESCE("name", '')) LIKE '%piyushassudani%'
  OR COALESCE("phone", '') LIKE '%9413879444%';

-- Note: The new master admin account is automatically created/updated
-- on application startup via MasterAdminBootstrapService, or by running:
--   npm run setup:master-admin
--
-- New Credentials:
--   Email:    masteradmin@restrocore.com
--   Username: masteradmin
--   Password: RestroMaster@2026!
