import { PageChrome } from '../components/PageChrome';
import { BackLink } from '../components/BackLink';

export default function PrivacyNotice() {
  return (
    <PageChrome>
      <div className="max-w-2xl mx-auto bg-surface rounded-2xl shadow-sm p-8 flex flex-col gap-4 text-sm text-ink leading-relaxed">
        <h1 className="text-xl font-semibold text-brand-700 mb-2">Privacy Notice</h1>

        <p>
          GrowTH is a class project (Digital Media Engineering, Khon Kaen University) for tracking
          child growth, puberty development, and AI-assisted bone age screening. This notice
          explains what data we collect, why, and how it's handled, in the spirit of Thailand's
          Personal Data Protection Act (PDPA).
        </p>

        <h2 className="font-semibold text-ink mt-2">What we collect</h2>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>Account: full name, email, and either a hashed password or a Google account identifier. A phone number only if you choose to add one.</li>
          <li>Child profile: name, sex, date of birth, and your relationship to the child.</li>
          <li>Growth records: height, weight, and the date measured.</li>
          <li>Puberty screening answers, as reported by you.</li>
          <li>Bone-age X-ray images you choose to upload, and any resulting prediction.</li>
        </ul>
        <p>We only collect what each feature needs to function (data minimization) — nothing is sold or shared with third parties.</p>

        <h2 className="font-semibold text-ink mt-2">How it's used</h2>
        <p>
          To calculate growth percentiles/SDS against standard pediatric growth references, compile
          puberty screening summaries, and run bone-age prediction — all shown back
          to you inside your own account. None of these results are a clinical diagnosis.
        </p>

        <h2 className="font-semibold text-ink mt-2">How it's stored</h2>
        <p>
          Data lives in a PostgreSQL database. Passwords are hashed (never stored in plain text).
          A child's records are only visible to accounts linked to that child as a guardian —
          not to other users.
        </p>

        <h2 className="font-semibold text-ink mt-2">Your controls</h2>
        <p>
          You can edit or delete any growth record, puberty screening, or child profile at any
          time from within the app. You can delete your entire account from your Profile page,
          which removes your login and unlinks you from any children's records.
        </p>

        <BackLink />
      </div>
    </PageChrome>
  );
}
