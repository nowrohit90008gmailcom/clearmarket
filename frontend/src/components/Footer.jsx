import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="font-heading font-bold text-xl text-white">ClearAI</span>
            </div>
            <p className="text-slate-400 text-sm max-w-md">
              Empowering Indian retail investors with jargon-free, AI-powered stock analysis. 
              Make informed decisions with clarity, not noise.
            </p>
            <p className="text-xs text-slate-500 mt-4">
              Disclaimer: ClearAI is for informational purposes only. It does not constitute 
              financial advice. Always consult a qualified financial advisor before making investment decisions.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/dashboard" className="hover:text-emerald-400 transition-colors">Dashboard</Link>
              </li>
              <li>
                <Link to="/portfolio" className="hover:text-emerald-400 transition-colors">Portfolio</Link>
              </li>
              <li>
                <Link to="/mutual-funds" className="hover:text-emerald-400 transition-colors">Mutual Funds</Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-emerald-400 transition-colors">Pricing</Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-heading font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="text-slate-400 cursor-default">Privacy Policy</span>
              </li>
              <li>
                <span className="text-slate-400 cursor-default">Terms of Service</span>
              </li>
              <li>
                <span className="text-slate-400 cursor-default">Risk Disclosure</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} ClearAI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
