-- Add optional phone column to User table with a unique constraint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");
