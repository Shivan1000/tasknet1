import React, { ReactNode } from 'react';
import Navbar from './Navbar';
import { MessageSquare, ShieldCheck } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/reddit-login' || location.pathname === '/welcome' || location.pathname === '/privacy' || location.pathname === '/terms';

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Navbar />
      <main className="flex-1 p-3 sm:p-8 bg-[#050505]">
        {children}
      </main>

      {!isAuthPage && (
        <footer className="bg-black border-t border-white/5 p-8 pb-12">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => navigate('/privacy')}
                className="flex items-center gap-2 text-gray-500 hover:text-white transition-all text-xs font-bold uppercase tracking-widest group"
              >
                <ShieldCheck size={16} className="text-blue-500 group-hover:scale-110 transition-transform" />
                Privacy Policy
              </button>
              <span className="text-white/10">|</span>
              <button 
                onClick={() => navigate('/terms')}
                className="flex items-center gap-2 text-gray-500 hover:text-white transition-all text-xs font-bold uppercase tracking-widest group"
              >
                <ShieldCheck size={16} className="text-blue-500 group-hover:scale-110 transition-transform" />
                Terms & Conditions
              </button>
              <span className="text-white/10">|</span>
              <a 
                href="https://discord.gg/3KUHvggF6k" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 text-gray-500 hover:text-white transition-all text-xs font-bold uppercase tracking-widest group"
              >
                <MessageSquare size={16} className="text-blue-500 group-hover:scale-110 transition-transform" />
                Contact using Discord
              </a>
            </div>
            
            <p className="text-[10px] text-gray-700 font-bold uppercase tracking-[0.2em]">
              © 2026 TASKNET NETWORK • SECURE TASKING SYSTEM
            </p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default Layout;
