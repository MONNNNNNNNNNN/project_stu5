-- AlterTable: a Google-only account has no password to hash.
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- AlterTable: Google's stable subject claim, for linking and audit.
ALTER TABLE "users" ADD COLUMN     "googleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
