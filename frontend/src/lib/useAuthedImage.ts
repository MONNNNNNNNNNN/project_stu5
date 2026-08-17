import { useEffect, useState } from 'react';
import { api } from './api';

/**
 * Object URL for an image that lives behind an authenticated endpoint.
 *
 * Avatars and bone-age X-rays are no longer served as public static files — `uploads/` held
 * children's radiographs and anyone with the filename could fetch one — so a plain
 * <img src> can't reach them any more. The bytes need the bearer token like every other API
 * call, which means fetching them and wrapping the blob in an object URL.
 *
 * Pass `null` when there is nothing to load; the hook then makes no request. The object URL
 * is revoked on unmount and whenever `path` changes, so blobs don't accumulate.
 */
export function useAuthedImage(path: string | null | undefined): string | null {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setSrc(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    api
      .get(path, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  return src;
}

/**
 * Route for the signed-in user's own avatar. The stored path is folded in as a cache-buster
 * so uploading a new photo actually swaps the image — the route itself never changes, so
 * without this the hook would see an unchanged dependency and keep showing the old blob.
 */
export function ownAvatarPath(avatarUrl: string | null | undefined): string | null {
  return avatarUrl ? `/users/me/avatar?v=${encodeURIComponent(avatarUrl)}` : null;
}
