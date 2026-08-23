import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import { clahe } from './clahe';

/**
 * Bone-age inference, in-process.
 *
 * This started life as a separate Python FastAPI service. It runs here instead because
 * Render's free tier bills **750 instance hours per workspace per month**, not per service —
 * two always-waking services burn that at double the rate and get the whole workspace
 * suspended mid-month. Two services also means two cold starts chained on the first request,
 * which for a ~1 minute spin-up each is a poor way to open a demo.
 *
 * Node and Python ONNX Runtime were checked against each other on identical input and return
 * the same value to the last decimal (1.223963), so nothing is given up by moving it here.
 * `ai-service/` is kept for local experimentation and for the one-off .pt -> .onnx conversion.
 */

// EfficientNet-B3 (refine5), confirmed against src/train.py in the model repo. The service was
// built for an earlier EfficientNet-B0 checkpoint at 224px; refine5 trains at 320px.
const IMG_SIZE = 320;

// CLAHE, applied to the grayscale image at its ORIGINAL resolution before resizing — matches
// src/train.py's `apply_clahe` + `val_transform` order exactly. This is deterministic
// preprocessing, not augmentation: skipping it degrades accuracy without ever erroring.
const CLAHE_CLIP_LIMIT = 2.0;
const CLAHE_TILES = 8;

// ImageNet normalisation, per channel — confirmed against src/train.py (IMAGENET_MEAN/STD).
const NORM_MEAN = [0.485, 0.456, 0.406];
const NORM_STD = [0.229, 0.224, 0.225];

// A result outside this band means something upstream is wrong, not that a child is unusual.
const MIN_PLAUSIBLE_MONTHS = 0;
const MAX_PLAUSIBLE_MONTHS = 300;

export interface BoneAgeResult {
  boneAgeMonths: number;
  modelVersion: string;
  inferenceMs: number;
  /** True until BONE_AGE_CALIBRATION=confirmed is set for the currently deployed model. */
  provisional: boolean;
}

@Injectable()
export class BoneAgeInferenceService implements OnModuleInit {
  private readonly logger = new Logger(BoneAgeInferenceService.name);
  private session: ort.InferenceSession | null = null;
  private loadError: string | null = null;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const path = this.modelPath;
    if (!existsSync(path)) {
      this.loadError = `no model at ${path}`;
      this.logger.warn(
        `Bone-age model not found at ${path} — predictions stay PENDING.`,
      );
      return;
    }
    try {
      this.session = await ort.InferenceSession.create(path);
      this.logger.log(
        `Bone-age model loaded from ${path} (${this.modelVersion})`,
      );
      if (this.isProvisional) {
        this.logger.warn(
          'Bone-age calibration is PROVISIONAL — BONE_AGE_CALIBRATION is not set to ' +
            '"confirmed" for this model version. Results are flagged as such.',
        );
      }
    } catch (err) {
      this.loadError = (err as Error).message;
      this.logger.error(
        `Failed to load bone-age model from ${path}`,
        err as Error,
      );
    }
  }

  private get modelPath(): string {
    return (
      this.config.get<string>('BONE_AGE_MODEL_PATH') ?? 'models/bone_age.onnx'
    );
  }

  get modelVersion(): string {
    return this.config.get<string>('BONE_AGE_MODEL_VERSION') ?? 'unset';
  }

  /** Mean absolute error in months on the held-out test set — the "±" FR-18 shows. */
  get maeMonths(): number {
    return Number(this.config.get<string>('BONE_AGE_MAE_MONTHS') ?? 0);
  }

  /**
   * Share of test predictions within a year. Reported alongside the MAE because the mean
   * hides the spread: at 76.8% (refine5), roughly one estimate in four is still out by more
   * than a year, and quoting "±8 months" alone would imply a bound the model does not have.
   */
  get accuracyWithin12Months(): number {
    return Number(this.config.get<string>('BONE_AGE_ACCURACY_12M') ?? 0);
  }

  get isProvisional(): boolean {
    return this.config.get<string>('BONE_AGE_CALIBRATION') !== 'confirmed';
  }

  get isReady(): boolean {
    return this.session !== null;
  }

  get status() {
    return {
      ready: this.isReady,
      modelVersion: this.modelVersion,
      maeMonths: this.maeMonths,
      accuracyWithin12Months: this.accuracyWithin12Months,
      calibration: this.isProvisional ? 'provisional' : 'confirmed',
      detail: this.loadError,
    };
  }

  /**
   * Decode, CLAHE at native resolution, resize to the training resolution, normalise, and lay
   * out as NCHW float32 — matches `apply_clahe` + `val_transform` in `src/train.py` step for
   * step. The order matters: CLAHE runs before resizing in training, so it must here too.
   *
   * The single channel CLAHE runs on is the RAW RED CHANNEL, not a perceptual grayscale
   * conversion: `apply_clahe` in src/train.py takes `img[0:1]` — plain channel 0 — for any
   * 3-channel source, on the assumption that an X-ray stored as RGB has identical channels.
   * Using sharp's `.grayscale()` (luma-weighted) here previously produced a wildly wrong
   * result on a non-grayscale test fixture, which is what caught this: this checkpoint is
   * unusually sensitive to any preprocessing mismatch, not just the obviously wrong ones.
   */
  private async preprocess(file: string): Promise<Float32Array> {
    const { data: raw, info } = await sharp(await readFile(file))
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const original = new Uint8Array(info.width * info.height);
    if (info.channels === 1) {
      original.set(raw);
    } else {
      for (let i = 0; i < original.length; i++) {
        original[i] = raw[i * info.channels]; // channel 0 = red
      }
    }

    const enhanced = clahe(original, info.width, info.height, {
      clipLimit: CLAHE_CLIP_LIMIT,
      tilesX: CLAHE_TILES,
      tilesY: CLAHE_TILES,
    });

    const { data: resized, info: resizedInfo } = await sharp(Buffer.from(enhanced), {
      raw: { width: info.width, height: info.height, channels: 1 },
    })
      // kernel: 'linear', not sharp's default lanczos3 — torchvision's Resize is bilinear.
      .resize(IMG_SIZE, IMG_SIZE, { fit: 'fill', kernel: 'linear' })
      // sharp/libvips does not keep raw output single-channel just because the input was —
      // without this it silently comes back as 3-channel here, which desyncs the `resized[i]`
      // indexing below from actual pixels and corrupts the tensor with no error anywhere. Was
      // caught by a >1000-month result on a real test fixture; verify with `npm run
      // verify:model` after touching this function.
      .toColourspace('b-w')
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = IMG_SIZE * IMG_SIZE;
    const out = new Float32Array(3 * pixels);
    for (let i = 0; i < pixels; i++) {
      const v = resized[i * resizedInfo.channels] / 255;
      // Single-channel value repeated into all 3 planes (matches ensure_three_channels),
      // each then normalised with its own ImageNet channel stats.
      for (let c = 0; c < 3; c++) {
        out[c * pixels + i] = (v - NORM_MEAN[c]) / NORM_STD[c];
      }
    }
    return out;
  }

  async predict(file: string, sex: 'MALE' | 'FEMALE'): Promise<BoneAgeResult> {
    if (!this.session) {
      throw new Error(this.loadError ?? 'model not loaded');
    }

    const started = Date.now();
    const pixels = await this.preprocess(file);

    const feeds = {
      image: new ort.Tensor('float32', pixels, [1, 3, IMG_SIZE, IMG_SIZE]),
      // Confirmed against src/dataset.py in the model repo: male=1.0, female=0.0.
      sex: new ort.Tensor(
        'float32',
        new Float32Array([sex === 'MALE' ? 1 : 0]),
        [1, 1],
      ),
    };

    const output = await this.session.run(feeds);
    // refine5's target was never normalised during training (see src/dataset.py /
    // src/train.py) — the model outputs months directly, no denormalisation constants needed.
    const months = Number((output.bone_age.data as Float32Array)[0]);

    if (
      !Number.isFinite(months) ||
      months < MIN_PLAUSIBLE_MONTHS ||
      months > MAX_PLAUSIBLE_MONTHS
    ) {
      throw new Error(
        `model returned ${months.toFixed(1)} months, outside 0-300 — check preprocessing ` +
          '(CLAHE, resize, sex encoding) against src/train.py in the model repo',
      );
    }

    return {
      boneAgeMonths: Math.round(months),
      modelVersion: this.modelVersion,
      inferenceMs: Date.now() - started,
      provisional: this.isProvisional,
    };
  }
}
