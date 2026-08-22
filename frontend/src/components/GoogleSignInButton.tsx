import { useEffect, useRef, useState } from 'react';
import { Button, CircularProgress } from '@mui/material';

/**
 * Sign in with Google, styled as one of our own buttons.
 *
 * Google's `renderButton` draws into an iframe we cannot theme, so it always looked like a
 * white Google button pasted onto the page — wrong in dark mode, wrong shape, wrong font. This
 * renders a normal MUI button and triggers the same GIS flow from a click, so the control
 * matches every other button in the app and still uses Google's real consent UI.
 *
 * Still the ID-token flow: Google hands the browser a signed JWT, we post it to `/auth/google`,
 * and the backend verifies the signature and audience. No client secret, no redirect plumbing.
 *
 * Renders nothing when `VITE_GOOGLE_CLIENT_ID` is unset — Google sign-in is an addition to
 * email and password, never a dependency of it.
 */

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
  }): void;
  prompt(momentListener?: (n: PromptMoment) => void): void;
  disableAutoSelect(): void;
}

interface PromptMoment {
  isNotDisplayed?: () => boolean;
  isSkippedMoment?: () => boolean;
  isDismissedMoment?: () => boolean;
  getNotDisplayedReason?: () => string;
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

/** Google's mark. Inline so the button renders instantly and works offline-ish. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

export function GoogleSignInButton({
  onCredential,
  disabled,
  disabledReason,
  label = 'Continue with Google',
  busy,
}: {
  onCredential: (credential: string) => void;
  /** Used by the register form to hold the button until the terms box is ticked (FR-2). */
  disabled?: boolean;
  disabledReason?: string;
  label?: string;
  busy?: boolean;
}) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [opening, setOpening] = useState(false);

  // Read at click time rather than captured at initialise time, so a stale closure cannot
  // deliver a credential to an outdated handler.
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    loadGis()
      .then(() => {
        if (cancelled || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            setOpening(false);
            if (response.credential) callbackRef.current(response.credential);
          },
          // No auto-select. On a shared family device, silently resuming somebody else's
          // session on a page showing a child's medical history is not acceptable.
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        window.google.accounts.id.disableAutoSelect();
        setReady(true);
      })
      .catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (!clientId) return null;

  if (failed) {
    return (
      <p className="text-xs text-gray-500 text-center">
        Google sign-in is unavailable right now. Use your email and password.
      </p>
    );
  }

  function handleClick() {
    if (!window.google) return;
    setOpening(true);
    window.google.accounts.id.prompt((moment) => {
      // The chooser can decline to appear — third-party cookies blocked, or the user has
      // dismissed it too often. Failing silently here leaves a button that does nothing, so
      // surface it rather than leaving them clicking.
      if (moment.isNotDisplayed?.() || moment.isSkippedMoment?.() || moment.isDismissedMoment?.()) {
        setOpening(false);
      }
    });
  }

  const isBusy = busy || opening;

  return (
    <div className="flex flex-col items-stretch gap-1">
      <Button
        type="button"
        variant="outlined"
        fullWidth
        disabled={!ready || disabled || isBusy}
        onClick={handleClick}
        startIcon={isBusy ? <CircularProgress size={16} /> : <GoogleMark />}
        sx={{
          py: 1.2,
          textTransform: 'none',
          fontWeight: 500,
          borderColor: 'divider',
          color: 'text.primary',
        }}
      >
        {isBusy ? 'Opening Google…' : label}
      </Button>
      {disabled && disabledReason && (
        <p className="text-xs text-gray-500 text-center">{disabledReason}</p>
      )}
    </div>
  );
}
