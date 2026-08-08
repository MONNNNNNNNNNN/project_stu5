import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="w-full border-t border-brand-100 bg-brand-50 mt-auto">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="font-heading font-bold text-brand-500">GrowTH</span>
          <p className="text-xs text-gray-500 max-w-lg">Faculty of Engineering, Khon Kaen University — Digital Media Engineering Department</p>
          <p className="text-xs text-gray-400 mt-1 max-w-lg">
            © {new Date().getFullYear()} GrowTH. Medical Disclaimer: this platform is for tracking purposes only and does not replace professional medical advice.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link to="/privacy" className="text-gray-500 hover:text-brand-500 transition-colors">
            Privacy Policy
          </Link>
          <Link to="/contact" className="text-gray-500 hover:text-brand-500 transition-colors">
            Contact Support
          </Link>
        </div>
      </div>
    </footer>
  );
}
