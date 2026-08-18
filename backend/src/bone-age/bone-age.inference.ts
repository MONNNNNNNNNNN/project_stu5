import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';

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

const IMG_SIZE = 224;

// ImageNet normalisation, per channel. Standard for a torchvision EfficientNet-B0 — still
// unconfirmed against the actual training run.
const NORM_MEAN = [0.485, 0.456, 0.406];
const NORM_STD = [0.229, 0.224, 0.225];

// A result outside this band means something upstream is wrong, not that a child is unusual.
const MIN_PLAUSIBLE_MONTHS = 0;
const MAX_PLAUSIBLE_MONTHS = 300;

export interface BoneAgeResult {
  boneAgeMonths: number;
  modelVersion: string;
  inferenceMs: number;
  /** True while the denormalisation constants are inferred rather than supplied. */
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
          'Bone-age calibration is PROVISIONAL — AGE_MEAN/AGE_STD were inferred from the ' +
            'reported metrics, not supplied by the ML team. Results are flagged as such.',
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
   * hides the spread: at 73.1%, roughly one estimate in four is out by more than a year, and
   * quoting "±9 months" alone would imply a bound the model does not have.
   */
  get accuracyWithin12Months(): number {
    return Number(this.config.get<string>('BONE_AGE_ACCURACY_12M') ?? 0);
  }

  /**
   * The checkpoint's training target was normalised — it emits ~2.4, not ~120 — so months are
   * `raw * std + mean`. Those constants did not arrive with the weights.
   *
   * Until they do, these are derived: the reported MSE and R² give
   * `Var(y) = MSE / (1 - R²)`, so the test set's true bone ages have SD ≈ 41.7 months, and the
   * RSNA training mean is ≈ 127.3. Every result computed this way is marked `provisional` all
   * the way to the UI, so a demo can run without a guess quietly becoming the truth.
   */
  private get ageMean(): number {
    return Number(this.config.get<string>('BONE_AGE_AGE_MEAN') ?? 127.3);
  }

  private get ageStd(): number {
    return Number(this.config.get<string>('BONE_AGE_AGE_STD') ?? 41.7);
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

  /** Decode, resize to the training resolution, normalise, and lay out as NCHW float32. */
  private async preprocess(file: string): Promise<Float32Array> {
    const { data } = await sharp(await readFile(file))
      .removeAlpha()
      .resize(IMG_SIZE, IMG_SIZE, { fit: 'fill' })
      .toColourspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = IMG_SIZE * IMG_SIZE;
    const out = new Float32Array(3 * pixels);
    for (let i = 0; i < pixels; i++) {
      for (let c = 0; c < 3; c++) {
        // sharp gives interleaved RGB; the model wants planar CHW.
        out[c * pixels + i] =
          (data[i * 3 + c] / 255 - NORM_MEAN[c]) / NORM_STD[c];
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
      // Which value means male is still unconfirmed — a flip degrades one sex quietly.
      sex: new ort.Tensor(
        'float32',
        new Float32Array([sex === 'MALE' ? 1 : 0]),
        [1, 1],
      ),
    };

    const output = await this.session.run(feeds);
    const raw = Number((output.bone_age.data as Float32Array)[0]);
    const months = raw * this.ageStd + this.ageMean;

    if (
      !Number.isFinite(months) ||
      months < MIN_PLAUSIBLE_MONTHS ||
      months > MAX_PLAUSIBLE_MONTHS
    ) {
      throw new Error(
        `model returned ${months.toFixed(1)} months, outside 0-300 (raw ${raw.toFixed(4)}) — ` +
          'AGE_MEAN/AGE_STD are the usual cause',
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
