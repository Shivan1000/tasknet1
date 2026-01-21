import React, { useState } from 'react';
import { LayoutGrid, Mail, Lock, ArrowRight, Check, X, AlertCircle, UserPlus, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface CustomAlert {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [redditUsername, setRedditUsername] = useState('');
  const [serverUsername, setServerUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Custom Alert State
  const [activeAlert, setActiveAlert] = useState<CustomAlert>({ show: false, message: '', type: 'info' });

  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setActiveAlert({ show: true, message, type });
    setTimeout(() => setActiveAlert(prev => ({ ...prev, show: false })), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      if (!redditUsername || !serverUsername) {
        showAlert('Please fill in all fields.', 'error');
        setLoading(false);
        return;
      }

      // Simulate Signup & Database Entry
      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          email: email, 
          reddit_username: redditUsername,
          server_username: serverUsername,
          updated_at: new Date().toISOString()
        });

      if (error) {
        showAlert('Error creating account: ' + error.message, 'error');
      } else {
        localStorage.setItem('user_email', email);
        showAlert('Account created! Welcome to TaskNet.', 'success');
        setTimeout(() => navigate('/'), 1500);
      }
    } else {
      // Simulate Login
      localStorage.setItem('user_email', email);
      
      // Check if profile exists and update last login
      await supabase.from('profiles').upsert({ email: email, updated_at: new Date().toISOString() });
      
      showAlert('Login successful! Redirecting...', 'success');
      setTimeout(() => navigate('/'), 1000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center p-6 selection:bg-blue-600 selection:text-white">
      {/* Custom Alert Toast */}
      <div className={`fixed top-6 left-6 right-6 md:left-auto md:right-10 z-[100] pointer-events-none flex justify-center md:justify-end transition-all duration-300 transform ${
        activeAlert.show ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'
      }`}>
        <div className={`flex items-center justify-between gap-4 px-8 py-5 rounded-[24px] border backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] pointer-events-auto min-w-[280px] max-w-[90vw] md:max-w-md ${
          activeAlert.type === 'success' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
          activeAlert.type === 'error' ? 'bg-red-500/15 border-red-500/30 text-red-400' :
          'bg-blue-500/15 border-blue-500/30 text-blue-400'
        }`}>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              {activeAlert.type === 'success' ? <Check size={24} strokeWidth={3} /> : 
               activeAlert.type === 'error' ? <X size={24} strokeWidth={3} /> : <AlertCircle size={24} strokeWidth={3} />}
            </div>
            <span className="font-bold text-base tracking-tight leading-tight">{activeAlert.message}</span>
          </div>
          <button 
            onClick={() => setActiveAlert(prev => ({ ...prev, show: false }))}
            className="flex-shrink-0 ml-2 p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={18} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Abstract Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-900/10 blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/5 blur-[100px]"></div>
      </div>

      <div className="relative w-full max-w-[440px] animate-in fade-in zoom-in duration-500">
        <div className="bg-white/[0.02] border border-white/5 backdrop-blur-2xl rounded-[32px] p-10 shadow-2xl">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-600/20 rotate-3 group hover:rotate-0 transition-transform cursor-pointer">
              <svg viewBox="0 0 24 24" className="w-10 h-10 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10c0-5.523-4.477-10-10-10zm4.5 13.5h-9v-1.5h9v1.5zm0-3h-9v-1.5h9v1.5zm0-3h-9v-1.5h9v1.5z" />
              </svg>
            </div>
            <h1 className="text-3xl font-black tracking-tighter mb-1 uppercase italic">
              {isSignUp ? 'Join TaskNet' : 'TaskNet'}
            </h1>
            <p className="text-gray-500 text-sm font-medium">
              {isSignUp ? 'Start your automation journey' : 'Powering your automated infrastructure'}
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {isSignUp && (
              <>
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">Server Username</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input
                      type="text"
                      required
                      placeholder="Enter server username"
                      value={serverUsername}
                      onChange={(e) => setServerUsername(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white/[0.03] border border-white/5 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300 delay-75">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">Reddit Username</label>
                  <div className="relative group">
                    <LayoutGrid className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input
                      type="text"
                      required
                      placeholder="reddit_handle"
                      value={redditUsername}
                      onChange={(e) => setRedditUsername(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white/[0.03] border border-white/5 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-sm"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/[0.03] border border-white/5 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Password</label>
                <button type="button" className="text-[11px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-wider">Forgot?</button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/[0.03] border border-white/5 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!email || !password || loading}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 group mt-4"
            >
              {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
              {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-gray-500 text-sm">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button 
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-blue-500 font-bold hover:underline"
              >
                {isSignUp ? 'Sign In' : 'Create one'}
              </button>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[11px] text-gray-600 uppercase tracking-widest font-bold">
            &copy; 2026 TaskNet Infrastructure
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
