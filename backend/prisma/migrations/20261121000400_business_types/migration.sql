ALTER TABLE "restaurants"
ADD COLUMN "businessType" TEXT NOT NULL DEFAULT 'RESTAURANT',
ADD COLUMN "enabledModules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "restaurants"
SET "enabledModules" = ARRAY[
  'pos',
  'tables',
  'kds',
  'reservations',
  'delivery',
  'qrMenu',
  'inventory',
  'accounting'
]::TEXT[]
WHERE "enabledModules" = ARRAY[]::TEXT[];
