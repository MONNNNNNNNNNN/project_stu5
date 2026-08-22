import MonitoringIcon from '@mui/icons-material/InsightsOutlined';
import PsychologyIcon from '@mui/icons-material/PsychologyOutlined';
import MedicalIcon from '@mui/icons-material/MedicalServicesOutlined';
import ShieldIcon from '@mui/icons-material/ShieldOutlined';
import { PublicHeader } from '../components/PublicHeader';
import { Footer } from '../components/Footer';

const features = [
  {
    icon: MonitoringIcon,
    title: 'Growth Tracking',
    body: 'Log height, weight, and BMI over time, plotted against standard pediatric growth references — not just raw numbers.',
  },
  {
    icon: PsychologyIcon,
    title: 'Puberty Screening',
    body: 'A guided, sex-specific questionnaire that flags signs that fall outside the typical age range, as a screening aid.',
  },
  {
    icon: MedicalIcon,
    title: 'AI Bone Age (in progress)',
    body: 'Upload a hand X-ray for an AI-assisted bone age estimate to support — never replace — clinical assessment.',
  },
  {
    icon: ShieldIcon,
    title: 'Privacy by design',
    body: "Data collection is limited to what each feature needs. A child's records stay visible only to their linked guardians.",
  },
];

export default function About() {
  return (
    <div className="min-h-svh bg-cream flex flex-col">
      <PublicHeader />
      <main className="flex-1 max-w-4xl mx-auto px-4 md:px-8 py-16 w-full">
        <span className="font-mono text-xs tracking-widest text-brand-500 uppercase font-semibold">About</span>
        <h1 className="font-heading font-bold text-3xl md:text-4xl text-ink mt-2 mb-4">What GrowTH is, and who it's for</h1>
        <p className="text-gray-500 text-base md:text-lg mb-10 max-w-2xl">
          GrowTH is a web application built for parents and caregivers of children from infancy through
          adolescence — anyone who wants to track a child's physical growth, screen for early or delayed
          puberty, and keep that history in one place between clinic visits. It's a screening and
          record-keeping aid, not a diagnostic tool, and it's not a substitute for a pediatrician.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {features.map((f) => (
            <div key={f.title} className="bg-surface rounded-2xl border border-brand-100 p-5">
              <f.icon className="text-brand-500 mb-2" />
              <h3 className="font-semibold text-ink mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="bg-brand-50 rounded-2xl border border-brand-100 p-6">
          <h2 className="font-heading font-semibold text-lg text-ink mb-2">Where this comes from</h2>
          <p className="text-sm text-gray-500">
            GrowTH is developed as a project for the Digital Media Engineering program, Faculty of
            Engineering, Khon Kaen University. It's built as a class/capstone project, not a certified
            medical device — see the disclaimer in the footer of every page.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
