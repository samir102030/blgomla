/**
 * Sign in with Apple, client side.
 *
 * Apple ships no npm package for the web — the flow runs through a script
 * served from their CDN, loaded here on first use rather than in index.html so
 * visitors who never touch the button don't pay for it.
 *
 * The button is hidden entirely when VITE_APPLE_CLIENT_ID is unset, which is
 * the normal state until an Apple Developer account and Service ID exist. A
 * dead button that always errors is worse than no button.
 */

interface AppleAuthResponse {
  authorization: { id_token: string; code: string; state?: string };
  // Apple sends the name only on the very first authorisation, and never
  // again. If it isn't captured now it cannot be recovered.
  user?: { name?: { firstName?: string; lastName?: string }; email?: string };
}

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: Record<string, unknown>) => void;
        signIn: () => Promise<AppleAuthResponse>;
      };
    };
  }
}

const SDK_URL =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

export const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID as string | undefined;

export const isAppleSignInAvailable = (): boolean => Boolean(APPLE_CLIENT_ID);

let sdkPromise: Promise<void> | null = null;

const loadSdk = (): Promise<void> => {
  if (window.AppleID) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Let a later attempt retry rather than pinning the failure forever.
      sdkPromise = null;
      reject(new Error("Could not load Apple's sign-in script"));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
};

/** A random nonce, echoed back inside Apple's token so the server can tie the
 *  token to this attempt and reject one captured from somewhere else. */
const makeNonce = (): string => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

export interface AppleSignInResult {
  identityToken: string;
  nonce: string;
  fullName?: { givenName?: string; familyName?: string };
}

/**
 * Opens Apple's popup and resolves once the user authorises.
 * Rejects if they cancel, which callers should treat as "nothing happened"
 * rather than as an error worth showing.
 */
export const signInWithApple = async (): Promise<AppleSignInResult> => {
  if (!APPLE_CLIENT_ID) {
    throw new Error("Sign in with Apple is not configured");
  }

  await loadSdk();
  if (!window.AppleID) throw new Error("Apple's sign-in script did not initialise");

  const nonce = makeNonce();

  window.AppleID.auth.init({
    clientId: APPLE_CLIENT_ID,
    scope: "name email",
    // Registered in the Apple developer console against the Service ID. Apple
    // rejects the request outright if it doesn't match exactly.
    redirectURI: `${window.location.origin}/login`,
    nonce,
    usePopup: true,
  });

  const response = await window.AppleID.auth.signIn();

  // Apple's web SDK names these firstName/lastName while its native SDKs use
  // givenName/familyName. Normalising here means the server speaks one shape
  // whichever client is calling.
  const name = response.user?.name;

  return {
    identityToken: response.authorization.id_token,
    nonce,
    fullName: name
      ? { givenName: name.firstName, familyName: name.lastName }
      : undefined,
  };
};

/** Apple reports a closed popup as an error; that isn't a failure to report. */
export const isAppleCancellation = (err: unknown): boolean => {
  const error = err as { error?: string } | undefined;
  return error?.error === "popup_closed_by_user" || error?.error === "user_cancelled_authorize";
};
