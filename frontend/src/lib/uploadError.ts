import type { TFunction } from "i18next";

/**
 * The message to show when an upload fails.
 *
 * The server sends a `code` for failures an operator can act on, so those can
 * be shown in the reader's own language; everything else falls back to the
 * server's own text, which is still far better than a fixed "Failed to
 * upload" that names neither the cause nor the fix.
 */
const BY_CODE: Record<string, [en: string, key: string]> = {
  UPLOADS_NOT_CONFIGURED: [
    "Image uploads aren't set up on this server yet. Add the Cloudinary keys to the server settings and try again.",
    "upload.notConfigured",
  ],
};

export const uploadErrorMessage = (
  error: unknown,
  t: TFunction,
  fallback: string
): string => {
  const res = (error as { response?: { data?: { code?: string; message?: string } } })
    ?.response?.data;
  const known = res?.code ? BY_CODE[res.code] : undefined;
  if (known) {
    const [en, key] = known;
    return t(key, en);
  }
  return res?.message || fallback;
};
