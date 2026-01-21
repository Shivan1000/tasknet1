import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Link2, Mail, Shield, Check, X, AlertCircle, MessageSquare, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CustomAlert {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

const Account = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Personal Settings');
  const [email, setEmail] = useState(localStorage.getItem('user_email') || '');
  const [serverUsername, setServerUsername] = useState('');
  const [redditUsername, setRedditUsername] = useState('');
  const [redditLink, setRedditLink] = useState('');
  const [discordUsername, setDiscordUsername] = useState('');
  const [redditKarma, setRedditKarma] = useState<number | null>(null);
  const [redditStatus, setRedditStatus] = useState<'active' | 'suspended' | 'banned' | 'not_found' | null>(null);
  const [isServerUsernameLocked, setIsServerUsernameLocked] = useState(false);
  const [isRedditLocked, setIsRedditLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingReddit, setFetchingReddit] = useState(false);

  // Custom Alert State
  const [activeAlert, setActiveAlert] = useState<CustomAlert>({ show: false, message: '', type: 'info' });

  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setActiveAlert({ show: true, message, type });
    setTimeout(() => setActiveAlert(prev => ({ ...prev, show: false })), 2000);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (redditUsername) {
      fetchRedditKarma(redditUsername);
    }
  }, [redditUsername]);

  const fetchRedditKarma = async (username: string) => {
    if (!username) return;
    setFetchingReddit(true);
    setRedditStatus(null);
    try {
      // Try direct Reddit API first, then fallback to CORS proxy
      let response;
      let json;
      
      try {
        // Try direct access first
        response = await fetch(`https://www.reddit.com/user/${username}/about.json`, {
          headers: {
            'Accept': 'application/json',
          }
        });
        console.log('Direct API - Response status:', response.status);
      } catch (directError) {
        console.log('Direct API failed, trying CORS proxy:', directError);
        // Fallback to CORS proxy
        const redditUrl = `https://www.reddit.com/user/${username}/about.json`;
        response = await fetch(`https://corsproxy.io/?${encodeURIComponent(redditUrl)}`, {
          headers: {
            'Accept': 'application/json',
          }
        });
        console.log('CORS Proxy - Response status:', response.status);
      }
      
      if (response.status === 404) {
        console.log('Account not found (404)');
        setRedditStatus('not_found');
        setRedditKarma(null);
      } else if (response.status === 403) {
        console.log('Account forbidden/suspended (403)');
        setRedditStatus('suspended');
        setRedditKarma(null);
      } else if (response.ok) {
        json = await response.json();
        console.log('Full Reddit API Response:', JSON.stringify(json, null, 2));
        
        if (json && json.data) {
          const userData = json.data;
          console.log('User data found:', {
            name: userData.name,
            is_suspended: userData.is_suspended,
            total_karma: userData.total_karma,
            link_karma: userData.link_karma,
            comment_karma: userData.comment_karma,
            subreddit: userData.subreddit
          });
          
          // Check if account is suspended
          if (userData.is_suspended === true) {
            console.log('Account IS suspended');
            setRedditStatus('suspended');
            setRedditKarma(null);
          } else if (userData.subreddit && userData.subreddit.subreddit_type === 'user') {
            // Valid user account
            console.log('Account is ACTIVE');
            setRedditStatus('active');
            const totalKarma = userData.total_karma ?? (userData.link_karma + userData.comment_karma || 0);
            console.log('Calculated karma:', totalKarma);
            setRedditKarma(totalKarma);
          } else {
            console.log('Account structure unexpected');
            setRedditStatus('active');
            const totalKarma = userData.total_karma ?? (userData.link_karma + userData.comment_karma || 0);
            setRedditKarma(totalKarma);
          }
        } else if (json && json.error === 404) {
          console.log('Error 404 in response body');
          setRedditStatus('not_found');
          setRedditKarma(null);
        } else {
          console.log('No data field in response:', json);
          setRedditStatus('not_found');
          setRedditKarma(null);
        }
      } else {
        console.log('Response not ok, status:', response.status);
        setRedditStatus('not_found');
        setRedditKarma(null);
      }
    } catch (err) {
      console.error('Error fetching Reddit data:', err);
      setRedditStatus('not_found');
      setRedditKarma(null);
    }
    setFetchingReddit(false);
  };

  const fetchProfile = async () => {
    if (!email) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();
    
    if (data) {
      setServerUsername(data.server_username || '');
      setRedditUsername(data.reddit_username || '');
      setRedditLink(data.reddit_link || '');
      setDiscordUsername(data.discord_username || '');
      
      // Lock fields if they are already set in the database
      if (data.server_username) setIsServerUsernameLocked(true);
      if (data.reddit_username) setIsRedditLocked(true);
    }
  };

  const handleSaveProfile = async () => {
    if (redditStatus && redditStatus !== 'active') {
      showAlert(`Cannot link a ${redditStatus} account.`, 'error');
      return;
    }

    setLoading(true);
    
    // Check if reddit username is already used by another account
    if (redditUsername && !isRedditLocked) {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('email')
        .eq('reddit_username', redditUsername)
        .neq('email', email)
        .single();
      
      if (existingUser) {
        showAlert('This Reddit account is already linked to another TaskNet user.', 'error');
        setLoading(false);
        return;
      }
    }

    // Use upsert with onConflict to handle existing profiles
    const { error } = await supabase
      .from('profiles')
      .upsert({ 
        email: email, 
        server_username: serverUsername,
        reddit_username: redditUsername,
        reddit_link: redditLink,
        discord_username: discordUsername,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'email'
      });

    if (error) showAlert('Error saving profile: ' + error.message, 'error');
    else {
      showAlert('Profile updated successfully!', 'success');
      // Update local lock states
      if (serverUsername) setIsServerUsernameLocked(true);
      if (redditUsername) setIsRedditLocked(true);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('user_email');
    navigate('/welcome');
  };

  const menuItems = [
    { icon: <User size={18} />, label: 'Personal Settings' },
    { icon: <Lock size={18} />, label: 'Change Password' },
    { icon: <Link2 size={18} />, label: 'Social Integration' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'Personal Settings':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-xl font-bold mb-6">Personal Settings</h3>
            <div className="max-w-xl space-y-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                      type="email"
                      readOnly
                      value={email}
                      className="w-full pl-12 pr-4 py-3 bg-white/[0.01] border border-white/5 rounded-xl text-gray-500 text-sm cursor-not-allowed outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Server Username</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input
                      type="text"
                      placeholder="Enter your server username"
                      value={serverUsername}
                      readOnly={isServerUsernameLocked}
                      onChange={(e) => setServerUsername(e.target.value)}
                      className={`w-full pl-12 pr-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl focus:outline-none transition-all text-sm outline-none ${
                        isServerUsernameLocked ? 'cursor-not-allowed text-gray-500 border-none opacity-60' : 'focus:border-blue-500'
                      }`}
                    />
                    {isServerUsernameLocked && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg border border-white/5">
                        <Lock size={10} className="text-gray-500" />
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Locked</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'Social Integration':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-xl font-bold mb-1">Social Integration</h3>
            <p className="text-gray-500 text-sm mb-8">Link your socials here</p>
            
            <div className="max-w-xl space-y-8">
              {/* Linked Accounts Display */}
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] ml-1">Linked Accounts</label>
                {(redditUsername) ? (
                  <div className="p-5 bg-[#0a0a0a] border border-white/5 rounded-3xl flex items-center justify-between group hover:border-white/10 transition-all shadow-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#FF4500]/10 rounded-2xl flex items-center justify-center border border-[#FF4500]/20">
                        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-[#FF4500]" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.051l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.945 0 1.712.767 1.712 1.712 0 .593-.306 1.11-.764 1.398.032.183.051.369.051.563 0 2.315-2.72 4.192-6.075 4.192-3.354 0-6.074-1.877-6.074-4.192 0-.194.02-.38.051-.563a1.712 1.712 0 0 1-1.114-2.622c.307-.31.73-.491 1.207-.491.478 0 .901.182 1.207.491 1.194-.856 2.85-1.419 4.674-1.488l.82-3.818a.312.312 0 0 1 .37-.243l2.672.567c.058-.051.126-.093.197-.122zm-6.11 7.115c-.631 0-1.145.513-1.145 1.145s.514 1.145 1.145 1.145c.632 0 1.145-.513 1.145-1.145s-.513-1.145-1.145-1.145zm4.22 0c-.632 0-1.145.513-1.145 1.145s.513 1.145 1.145 1.145c.631 0 1.145-.513 1.145-1.145s-.514-1.145-1.145-1.145zm-4.22 3.183c-.11 0-.213.044-.29.121-.423.422-1.328.462-1.62.462a.41.31 0 1 0 0 .82c.728 0 1.938-.11 2.546-.718a.41.41 0 0 0-.636-.585zm4.22 0c-.11 0-.213.044-.29.121-.423.422-1.328.462-1.62.462a.41.31 0 1 0 0 .82c.728 0 1.938-.11 2.546-.718a.41.41 0 0 0-.636-.585z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-[15px] font-black text-white tracking-tight">u/{redditUsername}</p>
                        <div className="flex items-center gap-2 mt-0.5 min-h-[16px]">
                          {fetchingReddit ? (
                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest animate-pulse">Checking Account...</span>
                          ) : redditStatus ? (
                            <>
                              {redditStatus === 'active' ? (
                                <>
                                  <span className="text-[11px] font-bold text-gray-500">{redditKarma?.toLocaleString() || '---'} karma</span>
                                  <span className="text-gray-700">•</span>
                                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    Active
                                  </span>
                                </>
                              ) : (
                                <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                                  redditStatus === 'suspended' || redditStatus === 'banned' ? 'text-red-500' : 'text-gray-500'
                                }`}>
                                  <div className={`w-1.5 h-1.5 rounded-full ${
                                    redditStatus === 'suspended' || redditStatus === 'banned' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-gray-500'
                                  }`}></div>
                                  {redditStatus.replace('_', ' ')}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] font-bold text-gray-600">Linked account</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {!isRedditLocked && (
                      <button 
                        onClick={() => { setRedditLink(''); setRedditUsername(''); setRedditKarma(null); }}
                        className="px-4 py-2 text-[10px] font-black text-red-500/60 hover:text-red-500 hover:bg-red-500/5 rounded-xl uppercase tracking-[0.2em] transition-all"
                      >
                        UNLINK
                      </button>
                    )}
                    {isRedditLocked && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5">
                        <Lock size={12} className="text-gray-600" />
                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Permanent</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-10 border border-dashed border-white/5 rounded-[32px] flex flex-col items-center justify-center text-center bg-white/[0.01]">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-4 border border-white/5">
                      <Link2 className="text-gray-600" size={24} />
                    </div>
                    <p className="text-gray-500 text-xs font-medium">No accounts integrated yet.</p>
                  </div>
                )}
              </div>

              <div className="h-[1px] bg-white/5 mx-2"></div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-widest ml-1 flex items-center justify-between">
                    <span>Reddit Profile Link</span>
                    {!isRedditLocked && (
                      <span className="text-[9px] font-black text-amber-500 uppercase tracking-tighter bg-amber-500/10 px-2 py-0.5 rounded-md animate-pulse">Action Required</span>
                    )}
                  </label>
                  
                  {!isRedditLocked && (
                    <div className="mb-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex gap-3 items-start animate-in fade-in slide-in-from-top-2 duration-500">
                      <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-[11px] leading-relaxed text-amber-500/80 font-medium">
                        <span className="font-bold text-amber-500 uppercase mr-1">Permanent Binding:</span>
                        Once you apply changes, this Reddit account will be <span className="text-amber-500 underline decoration-2">permanently locked</span> to your profile. You cannot change, reroll, or unlink it later. Please ensure the link is 100% correct.
                      </p>
                    </div>
                  )}
                  
                  <div className="relative group">
                    <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#FF4500] transition-colors" size={16} />
                    <input
                      type="url"
                      placeholder="https://www.reddit.com/user/username"
                      value={redditLink}
                      readOnly={isRedditLocked}
                      onChange={(e) => {
                        if (isRedditLocked) return;
                        
                        // Intelligent extraction for /u/ or /user/
                        const val = e.target.value.trim();
                        setRedditLink(val);
                        
                        // Precise regex for reddit profile links
                        const match = val.match(/^https?:\/\/(www\.)?reddit\.com\/(u|user)\/([a-zA-Z0-9_-]+)/i);
                        if (match && match[3]) {
                          setRedditUsername(match[3]);
                        } else {
                          setRedditUsername('');
                          setRedditStatus(null);
                          setRedditKarma(null);
                        }
                      }}
                      className={`w-full pl-12 pr-4 py-4 bg-white/[0.03] border border-white/5 rounded-2xl focus:outline-none transition-all text-sm outline-none placeholder:text-gray-700 ${
                        isRedditLocked ? 'cursor-not-allowed text-gray-500 border-none opacity-60' : 'focus:border-[#FF4500]'
                      }`}
                    />
                    {isRedditLocked && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5">
                        <Lock size={12} className="text-gray-500" />
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Locked</span>
                      </div>
                    )}
                  </div>
                </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Discord Username</label>
                <div className="relative group">
                  <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#5865F2] transition-colors" size={16} />
                  <input
                    type="text"
                    placeholder="username#0000"
                    value={discordUsername}
                    onChange={(e) => setDiscordUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl focus:outline-none focus:border-[#5865F2] transition-all text-sm outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      );
      case 'Change Password':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-xl font-bold mb-6">Security Update</h3>
            <div className="p-8 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl text-center">
              <Shield className="mx-auto mb-4 text-gray-600" size={32} />
              <p className="text-gray-500 text-sm mb-6">Password management is handled via secure reset links sent to your email.</p>
              <button 
                onClick={() => showAlert('Reset link sent to ' + email, 'success')}
                className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-sm transition-all"
              >
                Send Reset Email
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Layout>
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

      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Account</h1>
          <p className="text-gray-500 text-sm">Update your profile and account preferences.</p>
        </header>

        <div className="flex flex-col lg:flex-row gap-12">
          <aside className="w-full lg:w-64 space-y-2">
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-4 ml-4">Select Menu</p>
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={() => setActiveTab(item.label)}
                className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all ${
                  activeTab === item.label
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-gray-500 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                {item.icon}
                <span className="font-bold text-sm tracking-tight">{item.label}</span>
              </button>
            ))}

            <div className="pt-4 mt-4 border-t border-white/5">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-red-500 hover:bg-red-500/10 transition-all group"
              >
                <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span className="font-bold text-sm tracking-tight">Sign Out</span>
              </button>
            </div>
          </aside>

          <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-[40px] p-8 sm:p-12">
            <div className="max-w-2xl">
              {renderContent()}

              <div className="flex items-center gap-4 mt-16 pt-8 border-t border-white/5">
                <button 
                  onClick={fetchProfile}
                  className="px-10 py-3.5 bg-white/5 border border-white/5 text-white rounded-2xl font-bold text-sm hover:bg-white/10 transition-all"
                >
                  Discard
                </button>
                <button 
                  disabled={loading}
                  onClick={handleSaveProfile}
                  className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Apply Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Account;
