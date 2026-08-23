/**
 * End-to-end check of the bone-age model against the real weights.
 *
 * Lives here rather than in the Jest suite because Jest builds typed arrays in its own VM
 * context, and onnxruntime rejects them with "a float32 tensor's data must be type of
 * Float32Array". That is a harness artefact — the same code runs fine under plain node — so
 * the check runs under plain node.
 *
 *     npm run build && npm run verify:model
 *
 * Run it after changing preprocessing, swapping the model, or setting the calibration
 * constants. It is the only thing that exercises decode -> CLAHE -> resize -> normalise ->
 * infer as one chain.
 */

import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODEL = process.env.BONE_AGE_MODEL_PATH ?? join(root, 'models/bone_age.onnx');
const IMAGE = process.env.VERIFY_IMAGE ?? join(root, 'test/fixtures/hand.png');

if (!existsSync(MODEL)) {
  console.error(`no model at ${MODEL}\n  gh release download model-v2 --pattern 'bone_age.onnx' --dir models`);
  process.exit(1);
}

const { BoneAgeInferenceService } = await import(join(root, 'dist/bone-age/bone-age.inference.js'));

const env = {
  BONE_AGE_MODEL_PATH: MODEL,
  BONE_AGE_MODEL_VERSION: process.env.BONE_AGE_MODEL_VERSION ?? 'effnetb3-v5-rsna',
  BONE_AGE_MAE_MONTHS: process.env.BONE_AGE_MAE_MONTHS ?? '8.12',
  BONE_AGE_ACCURACY_12M: process.env.BONE_AGE_ACCURACY_12M ?? '0.768',
  BONE_AGE_CALIBRATION: process.env.BONE_AGE_CALIBRATION ?? 'confirmed',
};

const svc = new BoneAgeInferenceService({ get: (k) => env[k] });
await svc.onModuleInit();

let failures = 0;
const check = (label, ok, detail) => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

console.log(`\nmodel   : ${MODEL}`);
console.log(`image   : ${IMAGE}`);
console.log(`status  : ${JSON.stringify(svc.status)}\n`);

check('model loads', svc.isReady, svc.status.detail ?? undefined);

const male = await svc.predict(IMAGE, 'MALE');
const female = await svc.predict(IMAGE, 'FEMALE');

console.log(`\n  MALE   -> ${male.boneAgeMonths} months (${(male.boneAgeMonths / 12).toFixed(1)}y) in ${male.inferenceMs}ms`);
console.log(`  FEMALE -> ${female.boneAgeMonths} months (${(female.boneAgeMonths / 12).toFixed(1)}y) in ${female.inferenceMs}ms\n`);

check('result is a whole number of months', Number.isInteger(male.boneAgeMonths));
check('result is inside 0-300 months', male.boneAgeMonths > 0 && male.boneAgeMonths <= 300);
// If the second input were being ignored, these would be identical.
check('sex input reaches the model', male.boneAgeMonths !== female.boneAgeMonths,
  `${male.boneAgeMonths} vs ${female.boneAgeMonths}`);
check('provisional flag matches config', male.provisional === (env.BONE_AGE_CALIBRATION !== 'confirmed'));

let rejected = false;
try {
  await svc.predict(join(root, 'package.json'), 'MALE');
} catch {
  rejected = true;
}
check('a non-image is rejected', rejected);

if (svc.status.calibration === 'provisional') {
  console.log('\n  NOTE: calibration is provisional — BONE_AGE_CALIBRATION is not "confirmed"');
  console.log('  for this model version.');
}

console.log(failures ? `\n${failures} check(s) failed\n` : '\nall checks passed\n');
process.exit(failures ? 1 : 0);
