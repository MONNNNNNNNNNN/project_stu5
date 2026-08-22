import { useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

/**
 * Fades each route in as it mounts.
 *
 * Navigation used to swap the whole screen between two paint frames, which reads as a jolt
 * rather than a transition — there is no cue that anything moved, so the new page just appears
 * mid-thought. Keying on the pathname remounts the wrapper, which restarts the CSS animation.
 *
 * Keyed on `pathname` only, not on `location.key`: re-keying on search or hash would replay the
 * animation when a filter changes on the Knowledge Center, which is a flicker, not a
 * transition.
 *
 * The animation is disabled entirely under `prefers-reduced-motion` — see index.css. Motion
 * that helps most people orient can make others ill, and this is a health app.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="page-fade-in">
      {children}
    </div>
  );
}
