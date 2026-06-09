-- Migra usuários com papéis removidos antes de recriar o enum.
UPDATE "User"
SET "role" = 'LEADER'
WHERE "role"::text IN ('SUPERVISOR', 'MANAGER');

UPDATE "User"
SET "role" = 'PALLET_TRANSPORTER'
WHERE "role"::text IN ('FORKLIFT_OPERATOR', 'FOLLOW_UP_OPERATOR');

CREATE TYPE "RoleUser_new" AS ENUM (
  'OPERATOR_MACHINE',
  'PALLET_TRANSPORTER',
  'SUPPLY_OPERATOR',
  'LEADER',
  'ADMIN',
  'SUPERADMIN'
);

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "RoleUser_new"
  USING ("role"::text::"RoleUser_new");

DROP TYPE "RoleUser";
ALTER TYPE "RoleUser_new" RENAME TO "RoleUser";
