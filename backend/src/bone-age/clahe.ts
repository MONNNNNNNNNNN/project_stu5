/**
 * Contrast Limited Adaptive Histogram Equalization for an 8-bit single-channel image.
 *
 * The training pipeline (`src/train.py` in the model repo) runs `cv2.createCLAHE(clipLimit=2.0,
 * tileGridSize=(8, 8))` on every image — train AND val/test — before resizing. It is
 * deterministic preprocessing, not augmentation, so serving must reproduce it: skipping it
 * silently degrades accuracy below the model's reported MAE without ever throwing an error.
 *
 * There is no maintained CLAHE implementation for Node that avoids a native build (the usual
 * option, opencv4nodejs, does not install cleanly on Render's free build image), so this
 * reimplements OpenCV's algorithm directly: per-tile clipped histogram equalization, with the
 * per-pixel output bilinearly interpolated between the four nearest tile centers.
 */

export interface ClaheOptions {
  clipLimit: number;
  tilesX: number;
  tilesY: number;
}

const HIST_SIZE = 256;

/** Builds one clipped-and-equalized lookup table per tile. */
function buildTileLuts(
  pixels: Uint8Array,
  width: number,
  height: number,
  tilesX: number,
  tilesY: number,
  clipLimit: number,
): Uint8Array[] {
  const tileW = Math.ceil(width / tilesX);
  const tileH = Math.ceil(height / tilesY);
  const luts: Uint8Array[] = [];

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const x0 = tx * tileW;
      const y0 = ty * tileH;
      const x1 = Math.min(x0 + tileW, width);
      const y1 = Math.min(y0 + tileH, height);
      const tileArea = (x1 - x0) * (y1 - y0);

      const hist = new Float64Array(HIST_SIZE);
      for (let y = y0; y < y1; y++) {
        const rowOffset = y * width;
        for (let x = x0; x < x1; x++) {
          hist[pixels[rowOffset + x]]++;
        }
      }

      // OpenCV scales the user-facing clip limit by the tile's pixel count relative to the
      // histogram's bin count, then floors it at 1 so no bin can be clipped to nothing.
      const scaledClip = Math.max(
        1,
        Math.round((clipLimit * tileArea) / HIST_SIZE),
      );

      let clipped = 0;
      for (let i = 0; i < HIST_SIZE; i++) {
        if (hist[i] > scaledClip) {
          clipped += hist[i] - scaledClip;
          hist[i] = scaledClip;
        }
      }
      // Single-pass redistribution (matches OpenCV's calcLut): spread the clipped mass evenly
      // across every bin rather than iterating until nothing is left to redistribute.
      const redistribute = clipped / HIST_SIZE;
      for (let i = 0; i < HIST_SIZE; i++) {
        hist[i] += redistribute;
      }

      // Cumulative distribution -> equalization LUT, scaled to the 0-255 output range.
      const lut = new Uint8Array(HIST_SIZE);
      const scale = 255 / tileArea;
      let cdf = 0;
      for (let i = 0; i < HIST_SIZE; i++) {
        cdf += hist[i];
        lut[i] = Math.min(255, Math.max(0, Math.round(cdf * scale)));
      }
      luts.push(lut);
    }
  }
  return luts;
}

/**
 * Applies CLAHE to a grayscale image.
 *
 * @param pixels row-major, 1 byte per pixel, length === width * height
 */
export function clahe(
  pixels: Uint8Array,
  width: number,
  height: number,
  options: ClaheOptions,
): Uint8Array {
  const { clipLimit, tilesX, tilesY } = options;
  const tileW = Math.ceil(width / tilesX);
  const tileH = Math.ceil(height / tilesY);
  const luts = buildTileLuts(pixels, width, height, tilesX, tilesY, clipLimit);

  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    // Tile-center coordinates (in tile units) that this row sits between, for interpolation.
    const ty = (y - tileH / 2) / tileH;
    let ty0 = Math.floor(ty);
    let tyFrac = ty - ty0;
    if (ty0 < 0) {
      ty0 = 0;
      tyFrac = 0;
    } else if (ty0 >= tilesY - 1) {
      ty0 = tilesY - 2 >= 0 ? tilesY - 2 : 0;
      tyFrac = tilesY > 1 ? 1 : 0;
    }
    const ty1 = Math.min(ty0 + 1, tilesY - 1);

    for (let x = 0; x < width; x++) {
      const tx = (x - tileW / 2) / tileW;
      let tx0 = Math.floor(tx);
      let txFrac = tx - tx0;
      if (tx0 < 0) {
        tx0 = 0;
        txFrac = 0;
      } else if (tx0 >= tilesX - 1) {
        tx0 = tilesX - 2 >= 0 ? tilesX - 2 : 0;
        txFrac = tilesX > 1 ? 1 : 0;
      }
      const tx1 = Math.min(tx0 + 1, tilesX - 1);

      const v = pixels[y * width + x];
      const v00 = luts[ty0 * tilesX + tx0][v];
      const v01 = luts[ty0 * tilesX + tx1][v];
      const v10 = luts[ty1 * tilesX + tx0][v];
      const v11 = luts[ty1 * tilesX + tx1][v];

      const top = v00 * (1 - txFrac) + v01 * txFrac;
      const bottom = v10 * (1 - txFrac) + v11 * txFrac;
      out[y * width + x] = Math.round(top * (1 - tyFrac) + bottom * tyFrac);
    }
  }
  return out;
}
