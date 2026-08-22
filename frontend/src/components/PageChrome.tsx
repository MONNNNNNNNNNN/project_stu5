import type { ReactNode } from 'react';
import { PublicHeader } from './PublicHeader';
import { AppChrome } from './AppShell';
import { Footer } from './Footer';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps a page that's reachable both signed in and signed out — the articles and the
 * contact form. Signed-in visitors keep the app's nav so they don't appear to have been
 * logged out mid-session; everyone else gets the public header and footer.
 */
export function PageChrome({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  // While the session is still being restored `user` is null, which is indistinguishable from
  // signed out. Rendering the public shell during that window makes a signed-in reader flash
  // the logged-out header — and any "back" control rendered in that frame points at the
  // registration page. Wait for the answer instead of guessing it.
  if (loading) {
    return <div className="min-h-svh bg-cream" />;
  }

  if (user) {
    return <AppChrome>{children}</AppChrome>;
  }

  return (
    <div className="min-h-svh bg-cream flex flex-col page-fade-in">
      <PublicHeader />
      <main className="flex-1 py-12 px-4 md:px-8">{children}</main>
      <Footer />
    </div>
  );
}
