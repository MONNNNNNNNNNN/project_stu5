import { Link, useNavigate } from 'react-router-dom';
import { PageChrome } from '../components/PageChrome';
import { useAuth } from '../context/AuthContext';

/**
 * Terms of use.
 *
 * ⚠️ Written by the project team, not by a lawyer, and **not yet reviewed by the Client
 * Representative**. The clauses that carry real weight here are the ones about what GrowTH is
 * not (a diagnosis, a medical device, an emergency service) and the guardian's authority to
 * enter a child's health data — Thailand's PDPA requires a parent or guardian's consent to
 * process a minor's personal data, and this screen is where that consent is taken.
 *
 * Tracked as an open item in docs/research-checklist.md. Get it reviewed before 2 Nov.
 */
export default function TermsOfUse() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <PageChrome>
      <div className="max-w-2xl mx-auto bg-surface rounded-2xl shadow-sm p-8 flex flex-col gap-4 text-sm text-ink leading-relaxed">
        <h1 className="text-xl font-semibold text-brand-700 mb-2">Terms of Use</h1>
        <p className="text-xs text-gray-500 -mt-3">Last updated 22 August 2026</p>

        <h2 className="font-semibold text-ink mt-2">1. What GrowTH is</h2>
        <p>
          GrowTH is a <span className="font-medium">screening aid</span> for parents and
          guardians. It records a child's height and weight, compares them against published
          paediatric growth references, asks structured questions about signs of puberty, and can
          give an automated estimate of bone age from a hand X-ray you already have.
        </p>

        <h2 className="font-semibold text-ink mt-2">2. What GrowTH is not</h2>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>
            <span className="font-medium">It is not a diagnosis.</span> Nothing the app shows you
            confirms or rules out any condition. Only a qualified clinician can do that.
          </li>
          <li>
            <span className="font-medium">It is not a registered medical device</span>, and has
            not been evaluated by the Thai FDA or any equivalent regulator.
          </li>
          <li>
            <span className="font-medium">It is not for emergencies.</span> If a child needs
            urgent care, contact a hospital or call 1669.
          </li>
          <li>
            <span className="font-medium">It does not replace appointments.</span> The bone-age
            feature reads an X-ray you already have; it cannot order one, and it is not a
            substitute for a radiologist's report.
          </li>
        </ul>

        <h2 className="font-semibold text-ink mt-2">3. Accuracy, stated plainly</h2>
        <p>
          Growth percentiles are calculated from the <span className="font-medium">CDC 2000</span>{' '}
          growth charts and CDC's 2022 extended BMI percentiles — a United States reference,
          applied here to all children. The bone-age model's typical error is about{' '}
          <span className="font-medium">9 months</span>, and roughly{' '}
          <span className="font-medium">one estimate in four</span> is out by more than a year.
          Bone-age results are currently marked as provisional in the app, and you should read
          them as a prompt to ask a question, never as a measurement.
        </p>

        <h2 className="font-semibold text-ink mt-2">4. Who may use it</h2>
        <p>
          You must be an adult and be the child's parent or legal guardian, or have that
          guardian's permission. By adding a child you confirm you have the authority to enter
          and store that child's health information. Thailand's Personal Data Protection Act
          treats a child's data as requiring the guardian's consent, and creating an account is
          how that consent is recorded.
        </p>

        <h2 className="font-semibold text-ink mt-2">5. Your account</h2>
        <p>
          Keep your login details to yourself. You are responsible for what is entered under your
          account. Records are visible only to accounts linked to that child as a guardian. You
          may delete any record, any child, or your whole account at any time from within the
          app.
        </p>

        <h2 className="font-semibold text-ink mt-2">6. Your data</h2>
        <p>
          How data is collected, used and stored is set out in the{' '}
          <Link to="/privacy" className="text-brand-600 underline underline-offset-2">
            Privacy Notice
          </Link>
          , which forms part of these terms. Nothing is sold or shared with third parties.
        </p>

        <h2 className="font-semibold text-ink mt-2">7. Availability</h2>
        <p>
          GrowTH is a university project (Digital Media Engineering, Khon Kaen University) running
          on free hosting. It may be slow to start, briefly unavailable, or changed without
          notice, and it is offered without any warranty. Keep your own record of anything you
          would be sorry to lose.
        </p>

        <h2 className="font-semibold text-ink mt-2">8. Changes</h2>
        <p>
          We may update these terms. Material changes will be shown in the app, and the date at
          the top of this page will change.
        </p>

        <h2 className="font-semibold text-ink mt-2">9. Governing law</h2>
        <p>These terms are governed by the laws of Thailand.</p>

        <h2 className="font-semibold text-ink mt-2">10. Contact</h2>
        <p>
          Questions about these terms or your data can be sent through the{' '}
          <Link to="/contact" className="text-brand-600 underline underline-offset-2">
            contact form
          </Link>
          .
        </p>

        {/* Signed-in readers came from somewhere inside the app; sending them to the
            registration page would be nonsense. */}
        {user ? (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-brand-600 font-medium mt-4 self-start hover:underline"
          >
            ← Back
          </button>
        ) : (
          <Link to="/register" className="text-brand-600 font-medium mt-4">
            ← Back to registration
          </Link>
        )}
      </div>
    </PageChrome>
  );
}
