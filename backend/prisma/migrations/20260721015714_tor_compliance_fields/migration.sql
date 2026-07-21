-- AlterTable
ALTER TABLE "puberty_screenings" ALTER COLUMN "tannerStage" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);
