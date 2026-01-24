import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowRight, Shield, Zap, Globe, Users } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const isAuthenticated = localStorage.getItem('user_email');

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-600">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full bg-blue-900/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-900/5 blur-[100px]"></div>
      </div>

      <nav className="relative z-10 h-24 max-w-7xl mx-auto px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10c0-5.523-4.477-10-10-10zm4.5 13.5h-9v-1.5h9v1.5zm0-3h-9v-1.5h9v1.5zm0-3h-9v-1.5h9v1.5z" />
            </svg>
          </div>
          <span className="text-2xl font-black tracking-tighter uppercase italic">TaskNet</span>
        </div>
        <button 
          onClick={() => navigate('/login')}
          className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl font-bold text-sm hover:bg-white/10 transition-all"
        >
          Sign In
        </button>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/10 border border-blue-500/20 rounded-full text-blue-500 text-xs font-bold uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Next-Gen Reddit Automation
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase italic leading-[0.9] mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            Empower Your <span className="text-blue-600">Network</span> Influence.
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 leading-relaxed">
            Grow your business <span className="text-blue-500 font-black italic">2x faster</span> by leveraging the power of organic Reddit advertising.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <button 
              onClick={() => navigate('/login')}
              className="px-10 py-5 bg-blue-600 text-white rounded-[24px] font-bold text-lg hover:bg-blue-700 transition-all shadow-2xl shadow-blue-600/40 flex items-center justify-center gap-3 group"
            >
              Get Started Now
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        <div className="mt-32 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
          <div className="p-12 bg-white/[0.02] border border-white/5 rounded-[40px] hover:border-blue-500/20 transition-all group text-center max-w-4xl mx-auto">
            <div className="w-20 h-20 bg-blue-600/10 rounded-[24px] flex items-center justify-center mb-8 mx-auto group-hover:scale-110 transition-transform border border-blue-500/20">
              <Users className="text-blue-500" size={40} />
            </div>
            <h3 className="text-4xl font-black mb-4 italic uppercase tracking-tighter">Join Discord & Contact Admins</h3>
            <p className="text-gray-400 text-xl font-medium leading-relaxed max-w-2xl mx-auto mb-8">
              Want to scale your reach? Contact our administration team on Discord to build your custom advertisement campaign.
            </p>
            <button 
              onClick={() => window.open('https://discord.gg/ND296AgTyc', '_blank')}
              className="px-12 py-4 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-blue-500 hover:text-white transition-all shadow-xl active:scale-[0.98]"
            >
              Open Discord Server
            </button>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-8 text-gray-600 text-xs font-bold uppercase tracking-widest">
          <p>© 2026 TaskNet Infrastructure. All Rights Reserved.</p>
          <div className="flex gap-10">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
