import { NotFoundException, StreamableFile } from '@nestjs/common';
import { createReadStream, existsSync } from 'fs';
import { basename, extname, join } from 'path';

export const UPLOADS_ROOT = join(process.cwd(), 'uploads');

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.dcm': 'application/dicom',
};

/**
 * Streams a file stored under `uploads/<dir>/`, given the `/uploads/...` path recorded on
 * the row. Callers must have already authorized the request — this function only turns an
 * approved path into bytes.
 *
 * Taking `basename` of the stored value isn't defence against multer, which generated these
 * names; it keeps the guarantee local, so nothing here can be talked into reading outside
 * `uploads/<dir>` even if some future caller passes in a path from elsewhere.
 *
 * A missing file is a 404 rather than a 500: on the free Render plan the filesystem is
 * ephemeral, so a row can outlive its image after a redeploy.
 */
export function streamUpload(
  dir: string,
  storedPath: string | null | undefined,
): StreamableFile {
  if (!storedPath) {
    throw new NotFoundException('No image on file');
  }

  const file = join(UPLOADS_ROOT, dir, basename(storedPath));
  if (!existsSync(file)) {
    throw new NotFoundException('Image is no longer available on the server');
  }

  return new StreamableFile(createReadStream(file), {
    type:
      CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    disposition: 'inline',
  });
}
