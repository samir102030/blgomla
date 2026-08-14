import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  isAppleSignInAvailable,
  isAppleCancellation,
  signInWithApple,
} from "../lib/appleAuth";

/**
 * Sign in with Apple.
 *
 * Renders nothing when VITE_APPLE_CLIENT_ID is unset — the normal state until
 * an Apple Developer account and Service ID exist. Showing a button that can
 * only fail is worse than showing none.
 *
 * The mark and wording follow Apple's Human Interface Guidelines, which are a
 * review requirement rather than a style preference: their glyph, a black or
 * white field, and the exact phrase "Sign in with Apple" in the user's
 * language.
 */
const AppleSignInButton: React.FC<{
  onSuccess: (payload: {
    identityToken: string;
    nonce: string;
    fullName?: { givenName?: string; familyName?: string };
  }) => void | Promise<void>;
  onError: (message: string) => void;
}> = ({ onSuccess, onError }) => {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  if (!isAppleSignInAvailable()) return null;

  const start = async () => {
    setBusy(true);
    try {
      const result = await signInWithApple();
      await onSuccess(result);
    } catch (err) {
      // Closing the popup is a decision, not a failure.
      if (!isAppleCancellation(err)) {
        onError(
          err instanceof Error && err.message
            ? err.message
            : t("login.appleFailed", "Apple sign-in failed.")
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={start}
      disabled={busy}
      className="flex h-[42px] w-[320px] max-w-full items-center justify-center gap-2 rounded-[4px] bg-black px-4 text-[15px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
    >
      <svg width="17" height="17" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
      </svg>
      {t("login.signInWithApple", "Sign in with Apple")}
    </button>
  );
};

export default AppleSignInButton;
