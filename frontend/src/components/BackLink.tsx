import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * "Back" for pages reachable both signed in and signed out.
 *
 * Two things it gets right that a hardcoded link cannot:
 *
 * A signed-in reader is never sent to the registration page. That was a real complaint —
 * opening the privacy notice from inside the app and being offered "back to registration"
 * reads as though the session had ended.
 *
 * And going back only works if there is somewhere to go back *to*. Arriving directly — a
 * bookmark, a shared link, a new tab — leaves `navigate(-1)` with nothing to do, so the button
 * silently does nothing. React Router marks that first entry with `key === 'default'`, which is
 * how we know to send them somewhere sensible instead.
 */
export function BackLink({ signedOutTo = '/register', signedOutLabel = '← Back to registration' }: {
  signedOutTo?: string;
  signedOutLabel?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const canGoBack = location.key !== 'default';

  if (!user) {
    return (
      <Link to={signedOutTo} className="text-brand-600 font-medium mt-4 self-start">
        {signedOutLabel}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => (canGoBack ? navigate(-1) : navigate('/dashboard'))}
      className="text-brand-600 font-medium mt-4 self-start hover:underline"
    >
      {canGoBack ? '← Back' : '← Back to dashboard'}
    </button>
  );
}
