import React from 'react';
import { ArrowLeft, ShieldCheck, Lock, Eye, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white p-6 sm:p-12">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-white transition-all mb-12 group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold uppercase tracking-widest text-xs">Go Back</span>
        </button>

        <div className="space-y-12">
          <header className="space-y-4">
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter">PRIVACY POLICY</h1>
            <p className="text-gray-500 font-medium">Last Updated: January 21, 2026</p>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-white/[0.03] border border-white/10 rounded-[32px] space-y-4">
              <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-500">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-xl font-bold">Data Protection</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                We take your data security seriously. All personal information and Reddit credentials are encrypted and stored securely within our infrastructure.
              </p>
            </div>

            <div className="p-8 bg-white/[0.03] border border-white/10 rounded-[32px] space-y-4">
              <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center text-purple-500">
                <Lock size={24} />
              </div>
              <h3 className="text-xl font-bold">Authentication</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                TaskNet uses secure authentication protocols. Your passwords and login details are never shared with third parties or stored in plain text.
              </p>
            </div>
          </section>

          <div className="space-y-8 text-gray-400 leading-relaxed">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Eye className="text-blue-500" /> Information We Collect
              </h2>
              <p>
                To provide our services, we collect minimal necessary information: email addresses for account management, Reddit usernames for task verification, and payout details for earnings distribution.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Bell className="text-blue-500" /> How We Use Data
              </h2>
              <p>
                Your data is used exclusively for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Verifying task completion on social platforms.</li>
                <li>Processing withdrawal requests and tracking earnings.</li>
                <li>Sending important administrative alerts regarding your account.</li>
                <li>Preventing fraud and maintaining network integrity.</li>
              </ul>
            </div>
          </div>

          <footer className="pt-12 border-t border-white/5">
            <p className="text-center text-gray-600 text-xs font-bold uppercase tracking-[0.2em]">
              © 2026 TASKNET NETWORK • ALL RIGHTS RESERVED
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
