import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Puts every route change back at the top of the page.
 *
 * A single-page app doesn't reload the document on navigation, so the browser keeps the
 * scroll position it had on the previous screen. Tapping a nav item from halfway down a
 * long page dropped you halfway down the next one — and if the new page was shorter, into
 * the empty space past the end of it.
 *
 * useLayoutEffect rather than useEffect so the jump happens before the browser paints;
 * with useEffect the new page renders at the old offset for a frame first.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
