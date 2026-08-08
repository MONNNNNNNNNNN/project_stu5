import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { TextField, Button, Alert } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOnOutlined';
import EmailIcon from '@mui/icons-material/EmailOutlined';
import BugReportIcon from '@mui/icons-material/BugReportOutlined';
import { PublicHeader } from '../components/PublicHeader';
import { AppChrome } from '../components/AppShell';
import { Footer } from '../components/Footer';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Contact() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => (await api.post('/support/contact', { email, subject, message })).data,
    onSuccess: () => {
      setSent(true);
      setSubject('');
      setMessage('');
    },
  });

  const body = (
    <div className="max-w-4xl mx-auto w-full">
        <span className="font-mono text-xs tracking-widest text-brand-500 uppercase font-semibold">Contact</span>
        <h1 className="font-heading font-bold text-3xl md:text-4xl text-ink mt-2 mb-8">Get in touch</h1>

        <div className="bg-surface rounded-2xl border border-brand-100 p-6 mb-8 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <LocationOnIcon className="text-brand-500 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-ink text-sm mb-1">Department</h2>
              <p className="text-sm text-gray-500">
                Digital Media Engineering Program, Faculty of Engineering
                <br />
                Khon Kaen University, Mueang Khon Kaen District, Khon Kaen 40002, Thailand
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <EmailIcon className="text-brand-500 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-ink text-sm mb-1">Email</h2>
              <p className="text-sm text-gray-500">
                Contact the Faculty of Engineering, KKU DME program directly — exact department email TBD.
              </p>
            </div>
          </div>
        </div>

        {user && (
          <div className="bg-surface rounded-2xl border border-brand-100 p-6">
            <div className="flex items-center gap-2 mb-1">
              <BugReportIcon className="text-brand-500" fontSize="small" />
              <h2 className="font-heading font-semibold text-lg text-ink">Report a bug / contact support</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">Signed in as {user.email} — we'll use this to follow up.</p>
            {sent && (
              <Alert severity="success" className="mb-4" onClose={() => setSent(false)}>
                Thanks — your message has been sent.
              </Alert>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
              className="flex flex-col gap-4"
            >
              <TextField label="Your email" type="email" required fullWidth value={email} onChange={(e) => setEmail(e.target.value)} />
              <TextField label="Subject" required fullWidth value={subject} onChange={(e) => setSubject(e.target.value)} />
              <TextField
                label="Message"
                required
                fullWidth
                multiline
                minRows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <Button type="submit" variant="contained" disabled={mutation.isPending} sx={{ alignSelf: 'flex-start', px: 4 }}>
                {mutation.isPending ? 'Sending…' : 'Send message'}
              </Button>
            </form>
          </div>
        )}
    </div>
  );

  if (user) {
    return <AppChrome>{body}</AppChrome>;
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col page-fade-in">
      <PublicHeader />
      <main className="flex-1 py-16 px-4 md:px-8">{body}</main>
      <Footer />
    </div>
  );
}
