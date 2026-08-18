-- Why a prediction failed.
--
-- FAILED carried no explanation, so the UI could only say "try again" — it could not tell a
-- parent that their image was unreadable versus that the model was offline. Those need
-- different actions from the user.
ALTER TABLE "bone_age_predictions" ADD COLUMN "failureReason" TEXT;
