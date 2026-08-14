import { useEffect, useState } from 'react';
import { Alert } from '@mui/material';

/**
 * The backend runs on a free plan that spins down after ~15 min of no traffic, so the
 * first request after a quiet stretch waits on a container boot rather than on anything
 * the user did. Without this, a 30s login looks identical to a broken one — people retry,
 * or leave. Shown only once the wait is long enough to be worth explaining.
 */
const NOTICE_DELAY_MS = 4000;

export function ColdStartNotice({ active }: { active: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) {
      setShow(false);
      return;
    }
    const timer = setTimeout(() => setShow(true), NOTICE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [active]);

  if (!show) return null;

  return (
    <Alert severity="info" className="mb-4">
      Waking the server up — this can take up to a minute after a period of inactivity.
      Hang tight, it's much faster next time.
    </Alert>
  );
}
