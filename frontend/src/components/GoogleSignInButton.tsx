import { useEffect, useRef, useState } from 'react';

/**
 * Google Identity Services sign-in button.
 *
 * The ID-token flow, not the redirect flow. Google hands the browser a signed JWT, we post it
 * to `/auth/google`, and the backend verifies the signature and audience before issuing our
 * own session. No client secret exists anywhere in this path, and no redirect plumbing —
 * which is why the OAuth client has no redirect URIs configured.
 *
 * Renders nothing at all when `VITE_GOOGLE_CLIENT_ID` is unset. Sign-in with Google is an
 * addition to email and password, never a dependency of it, so a missing env var must not
 * leave a broken control on the login form.
 */

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      theme?: 'outline' | 'filled_blue';
      size?: 'large' | 'medium';
      width?: number;
      text?: 'signin_with' | 'signup_with' | 'continue_with';
      logo_alignment?: 'left' | 'center';
    },
  ): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';

/** One shared load, however many buttons mount. */
let gisPromise: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    const script = existing ?? document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Google sign-in'));
    if (!existing) document.head.appendChild(script);
  });
  return gisPromise;
}

export function GoogleSignInButton({
  onCredential,
  disabled,
  disabledReason,
  text = 'continue_with',
}: {
  onCredential: (credential: string) => void;
  /** Used by the register form to hold the button until the terms box is ticked (FR-2). */
  disabled?: boolean;
  disabledReason?: string;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  // The callback is read at click time rather than captured at initialise time, so a stale
  // closure cannot send a credential to an outdated handler.
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  useEffect(() => {
    if (!clientId || !hostRef.current) return;
    let cancelled = false;

    loadGis()
      .then(() => {
        if (cancelled || !hostRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) callbackRef.current(response.credential);
          },
          // No One Tap auto-select: on a shared family device, silently resuming somebody
          // else's session on a page showing a child's medical history is not acceptable.
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        window.google.accounts.id.renderButton(hostRef.current, {
          theme: 'outline',
          size: 'large',
          text,
          logo_alignment: 'center',
          width: 320,
        });
      })
      .catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
    };
  }, [clientId, text]);

  if (!clientId) return null;

  if (failed) {
    return (
      <p className="text-xs text-gray-500 text-center">
        Google sign-in is unavailable right now. Use your email and password.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Google renders its own button into this node and owns the click. Covering it while
          disabled is the only way to hold it without Google's iframe swallowing the event. */}
      <div className="relative">
        <div ref={hostRef} />
        {disabled && (
          <div
            className="absolute inset-0 cursor-not-allowed rounded bg-surface/60"
            title={disabledReason}
            aria-hidden="true"
          />
        )}
      </div>
      {disabled && disabledReason && (
        <p className="text-xs text-gray-500">{disabledReason}</p>
      )}
    </div>
  );
}
