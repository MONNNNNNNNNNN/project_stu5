-- AlterTable: head circumference covers the under-2 window where BMI-for-age does not apply.
ALTER TABLE "growth_records" ADD COLUMN     "headCircumferenceCm" DECIMAL(5,2);
ALTER TABLE "growth_records" ADD COLUMN     "headCircumferencePercentile" DECIMAL(5,2);
ALTER TABLE "growth_records" ADD COLUMN     "headCircumferenceSds" DECIMAL(4,2);
