import { existsSync } from 'fs';
import { ConfigService } from '@nestjs/config';
import { BoneAgeInferenceService } from './bone-age.inference';

/**
 * Covers everything about the inference service that does not require building a tensor.
 *
 * Actually running the model is deliberately not tested here. Jest evaluates the suite in its
 * own VM context, so a `Float32Array` built in the test realm fails onnxruntime's
 * `instanceof` check with "a float32 tensor's data must be type of Float32Array" — an
 * artefact of the harness, not of the code. The same calls succeed under plain node.
 *
 * The end-to-end check lives in `npm run verify:model`, which loads the real weights and
 * asserts a plausible bone age for both sexes. Run it after any change to preprocessing,
 * to the model, or to the calibration constants.
 *
 * Skips itself when the weights are absent so CI without the release asset still passes.
 */
const MODEL = 'models/bone_age.onnx';
const maybe = existsSync(MODEL) ? describe : describe.skip;

maybe('BoneAgeInferenceService', () => {
  const config = (overrides: Record<string, string> = {}) =>
    ({
      get: (k: string) =>
        ({
          BONE_AGE_MODEL_PATH: MODEL,
          BONE_AGE_MODEL_VERSION: 'effnetb0-v1-rsna',
          BONE_AGE_MAE_MONTHS: '8.78',
          BONE_AGE_ACCURACY_12M: '0.731',
          ...overrides,
        })[k],
    }) as unknown as ConfigService;

  it('loads the model on init', async () => {
    const svc = new BoneAgeInferenceService(config());
    await svc.onModuleInit();
    expect(svc.isReady).toBe(true);
    expect(svc.status.detail).toBeNull();
  });

  it('reports the measured accuracy the UI needs for FR-18', async () => {
    const svc = new BoneAgeInferenceService(config());
    await svc.onModuleInit();
    // Both numbers, not just the mean: 73.1% within a year is what stops the UI implying
    // that +/-8.78 months is a bound.
    expect(svc.status.maeMonths).toBe(8.78);
    expect(svc.status.accuracyWithin12Months).toBe(0.731);
  });

  it('treats calibration as provisional until explicitly confirmed', async () => {
    const svc = new BoneAgeInferenceService(config());
    await svc.onModuleInit();
    expect(svc.isProvisional).toBe(true);
    expect(svc.status.calibration).toBe('provisional');
  });

  it('reports confirmed once the constants are signed off', async () => {
    const svc = new BoneAgeInferenceService(
      config({ BONE_AGE_CALIBRATION: 'confirmed' }),
    );
    await svc.onModuleInit();
    expect(svc.isProvisional).toBe(false);
    expect(svc.status.calibration).toBe('confirmed');
  });

  it('stays unready, without throwing, when the model file is missing', async () => {
    const svc = new BoneAgeInferenceService(
      config({ BONE_AGE_MODEL_PATH: 'models/nope.onnx' }),
    );
    await svc.onModuleInit();
    expect(svc.isReady).toBe(false);
    expect(svc.status.detail).toContain('no model at');
  });
});
