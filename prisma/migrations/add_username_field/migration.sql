-- Add username column (initially nullable)
ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- Fill in username for existing rows using email prefix
UPDATE "users" SET "username" = SPLIT_PART("email", '@', 1) WHERE "username" IS NULL;

-- Make username NOT NULL
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

-- Add unique constraint
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
