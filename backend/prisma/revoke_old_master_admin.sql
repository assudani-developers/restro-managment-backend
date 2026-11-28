-- ============================================================================
-- SQL SCRIPT: CONFIGURE MASTER PIYUSH ACCESS
-- ============================================================================

-- Update Master Piyush user with SuperAdmin privileges
UPDATE "users"
SET 
  "isActive" = true,
  "isSuperAdmin" = true
WHERE 
  LOWER(COALESCE("name", '')) = 'piyushassudani'
  OR LOWER(COALESCE("email", '')) LIKE '%piyushassudani%'
  OR COALESCE("phone", '') = '9413879444';

-- Verify Master Piyush user
SELECT "id", "name", "email", "phone", "isActive", "isSuperAdmin"
FROM "users"
WHERE 
  LOWER(COALESCE("name", '')) = 'piyushassudani'
  OR LOWER(COALESCE("email", '')) LIKE '%piyushassudani%'
  OR COALESCE("phone", '') = '9413879444';
