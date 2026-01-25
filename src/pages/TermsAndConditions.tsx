import React from 'react';
import { ArrowLeft, Scale, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsAndConditions = () => {
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
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase">TERMS & CONDITIONS</h1>
            <p className="text-gray-500 font-medium">Effective Date: January 21, 2026</p>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-white/[0.03] border border-white/10 rounded-[32px] space-y-4">
              <div className="w-12 h-12 bg-emerald-600/20 rounded-2xl flex items-center justify-center text-emerald-500">
                <CheckCircle size={24} />
              </div>
              <h3 className="text-xl font-bold">User Eligibility</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                You must be at least 13 years old or the legal age of majority in your jurisdiction to use TaskNet and participate in social tasking.
              </p>
            </div>

            <div className="p-8 bg-white/[0.03] border border-white/10 rounded-[32px] space-y-4">
              <div className="w-12 h-12 bg-amber-600/20 rounded-2xl flex items-center justify-center text-amber-500">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-bold">Prohibited Conduct</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Fraudulent activity, multi-accounting, and botting are strictly prohibited. Violators will face permanent network bans and forfeiture of earnings.
              </p>
            </div>
          </section>

          <div className="space-y-8 text-gray-400 leading-relaxed">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Scale className="text-blue-500" /> Service Agreement
              </h2>
              <p>
                By accessing TaskNet, you agree to comply with our network rules and verification processes. We provide a platform connecting task posters with participants but do not guarantee specific earning amounts.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <FileText className="text-blue-500" /> Withdrawal Policy
              </h2>
              <p>
                Earnings are distributed after verification. Processing times vary by payout method. We reserve the right to audit accounts before finalizing large withdrawals to ensure compliance.
              </p>
            </div>
          </div>

          <footer className="pt-12 border-t border-white/5">
            <p className="text-center text-gray-600 text-xs font-bold uppercase tracking-[0.2em]">
              © 2026 TASKNET NETWORK • TERMS OF SERVICE
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
