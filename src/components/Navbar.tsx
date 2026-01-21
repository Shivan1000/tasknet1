import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, Home, ListTodo, WalletCards, Bell, ChevronDown, Menu, X, LogOut, Settings, User, UserPlus, CheckCircle2, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Navbar = () => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState<{server_username: string, reddit_username: string, balance: number} | null>(null);
  const [redditKarma, setRedditKarma] = useState<number | null>(null);
  const [redditStatus, setRedditStatus] = useState<'active' | 'suspended' | 'banned' | 'not_found' | null>(null);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const profileRef = useRef<HTMLDivElement>(null);
  
  const userEmail = localStorage.getItem('user_email') || '';

  useEffect(() => {
    if (userEmail) {
      fetchUserProfile();
      fetchAlerts();
      fetchAllAlerts(); // Fetch all alerts for the modal
      
      // Subscribe to profile changes (for balance updates)
      const profileChannel = supabase
        .channel('profile-changes')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `email=eq.${userEmail}` }, () => {
          fetchUserProfile();
        })
        .subscribe();

      // Subscribe to alert changes
      const alertChannel = supabase
        .channel('alert-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_alerts', filter: `user_email=eq.${userEmail}` }, () => {
          fetchAlerts();
          fetchAllAlerts(); // Refresh all alerts when new one arrives
        })
        .subscribe();

      return () => {
        supabase.removeChannel(profileChannel);
        supabase.removeChannel(alertChannel);
      };
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (showAlertsModal && event.target instanceof Element && !event.target.closest('.alerts-modal')) {
        setShowAlertsModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userEmail, showAlertsModal]);

  const fetchUserProfile = async () => {
    try {
      // First attempt to fetch everything including balance
      const { data, error } = await supabase
        .from('profiles')
        .select('server_username, reddit_username, balance')
        .eq('email', userEmail)
        .single();
      
      if (error) {
        // If it fails (possibly due to missing balance column), fetch without balance
        const { data: retryData, error: retryError } = await supabase
          .from('profiles')
          .select('server_username, reddit_username')
          .eq('email', userEmail)
          .single();
        
        if (retryData) {
          setProfileData({ ...retryData, balance: 0 });
          if (retryData.reddit_username) {
            fetchRedditData(retryData.reddit_username);
          }
        }
      } else if (data) {
        setProfileData(data);
        if (data.reddit_username) {
          fetchRedditData(data.reddit_username);
        }
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  const fetchAlerts = async () => {
    const { count } = await supabase
      .from('admin_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_email', userEmail)
      .eq('is_read', false);
    
    setUnreadAlerts(count || 0);
  };

  const fetchAllAlerts = async () => {
    const { data, error } = await supabase
      .from('admin_alerts')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching alerts:', error);
    } else {
      setAlerts(data || []);
    }
  };

  const fetchRedditData = async (username: string) => {
    try {
      // Try direct Reddit API first, then fallback to CORS proxy
      let response;
      
      try {
        // Try direct access first
        response = await fetch(`https://www.reddit.com/user/${username}/about.json`, {
          headers: {
            'Accept': 'application/json',
          }
        });
        console.log('[Navbar] Direct API - Response status:', response.status);
      } catch (directError) {
        console.log('[Navbar] Direct API failed, trying CORS proxy');
        // Fallback to CORS proxy
        const redditUrl = `https://www.reddit.com/user/${username}/about.json`;
        response = await fetch(`https://corsproxy.io/?${encodeURIComponent(redditUrl)}`, {
          headers: {
            'Accept': 'application/json',
          }
        });
        console.log('[Navbar] CORS Proxy - Response status:', response.status);
      }
      
      if (response.status === 404) {
        setRedditStatus('not_found');
      } else if (response.status === 403) {
        setRedditStatus('suspended');
      } else if (response.ok) {
        const json = await response.json();
        console.log('[Navbar] Reddit API Response:', json);
        
        if (json && json.data) {
          const userData = json.data;
          if (userData.is_suspended === true) {
            setRedditStatus('suspended');
          } else {
            setRedditStatus('active');
            const totalKarma = userData.total_karma ?? (userData.link_karma + userData.comment_karma || 0);
            setRedditKarma(totalKarma);
          }
        }
      } else {
        setRedditStatus('not_found');
      }
    } catch (err) {
      console.error('[Navbar] Error fetching Reddit info:', err);
      setRedditStatus('not_found');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_email');
    navigate('/welcome');
  };

  const displayName = profileData?.server_username || userEmail.split('@')[0];
  const redditName = profileData?.reddit_username || 'Not connected';

  const menuItems = [
    { icon: <Home size={18} />, label: 'Home', path: '/' },
    { icon: <ListTodo size={18} />, label: 'Tasks', path: '/tasks' },
    { icon: <WalletCards size={18} />, label: 'Payouts', path: '/withdraw' },
  ];

  return (
    <div className="h-20 bg-black text-white border-b border-white/5 sticky top-0 z-50 backdrop-blur-md bg-black/80">
      <div className="h-full max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4 md:gap-10">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group transition-transform hover:scale-105">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10c0-5.523-4.477-10-10-10zm4.5 13.5h-9v-1.5h9v1.5zm0-3h-9v-1.5h9v1.5zm0-3h-9v-1.5h9v1.5z" />
              </svg>
            </div>
            <div className="hidden xs:block">
              <span className="text-xl font-black tracking-tighter text-blue-500">TASK</span>
              <span className="text-xl font-black tracking-tighter text-white">NET</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-2">
            {menuItems.map((item) => (
              <React.Fragment key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-6 py-2 rounded-xl transition-all duration-200 group relative ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <span className="transition-transform group-hover:scale-110">{item.icon}</span>
                  <span className="font-bold text-sm">{item.label}</span>
                </NavLink>

                {item.label === 'Payouts' && profileData?.reddit_username && (
                  <div className="flex flex-col ml-2 pl-4 border-l border-white/10 select-none animate-in fade-in slide-in-from-left-2 duration-500">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-white/90 tracking-tight">u/{profileData.reddit_username}</span>
                      <span className="text-gray-700 text-[10px]">•</span>
                      <span className="text-[10px] font-black text-blue-400 tracking-tighter">
                        {redditKarma !== null ? `${redditKarma.toLocaleString()} KARMA` : '---'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className={`w-1 h-1 rounded-full ${redditStatus === 'active' ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></div>
                      <span className={`text-[8px] font-black uppercase tracking-widest ${redditStatus === 'active' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {redditStatus || 'checking...'}
                      </span>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={() => navigate('/withdraw')}
            className="hidden xs:flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-white/5 transition-all group"
          >
            <Wallet size={16} className="text-emerald-500 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black text-white">${profileData?.balance?.toFixed(2) || '0.00'}</span>
          </button>

          <button 
            onClick={() => {
              if (unreadAlerts > 0) {
                // Mark all unread alerts as read
                supabase.from('admin_alerts').update({ is_read: true }).eq('user_email', userEmail);
                setUnreadAlerts(0);
              }
              setShowAlertsModal(!showAlertsModal);
            }}
            className="p-2 text-gray-400 hover:text-white transition-colors relative"
          >
            <Bell size={20} />
            {unreadAlerts > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full border-2 border-black animate-pulse"></span>
            )}
          </button>

          {/* Alerts Modal */}
          {showAlertsModal && (
            <div className="fixed top-20 right-4 z-[100] w-80 alerts-modal bg-[#080808] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-5 py-4 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                <h3 className="font-bold text-white">Notifications</h3>
                <button 
                  onClick={() => setShowAlertsModal(false)}
                  className="text-gray-500 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {alerts.length > 0 ? (
                  alerts.map((alert) => (
                    <div 
                      key={alert.id} 
                      className={`px-5 py-4 border-b border-white/5 ${!alert.is_read ? 'bg-blue-600/10' : 'bg-white/[0.01]'}`}
                    >
                      <p className="text-sm text-white">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(alert.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="px-5 py-8 text-center">
                    <p className="text-gray-500 text-sm">No notifications yet</p>
                  </div>
                )}
              </div>
            </div>
          )}


          <button 
            onClick={() => navigate('/account')}
            className="p-2 text-gray-400 hover:text-blue-500 transition-all hover:scale-110 active:scale-95"
            title="Account Settings"
          >
            <Settings size={20} />
          </button>
          
          <div className="relative" ref={profileRef}>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-full border border-white/5 bg-white/[0.03] group">
              <div 
                onClick={() => navigate('/account')}
                className="flex items-center gap-3 pl-2 cursor-pointer group/name"
              >
                <span className="hidden sm:block text-sm font-bold text-white group-hover/name:text-blue-400 transition-colors max-w-[100px] truncate">
                  {displayName}
                </span>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-black text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] group-hover/name:scale-105 transition-transform uppercase">
                  {displayName[0]}
                </div>
              </div>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="p-1 hover:bg-white/5 rounded-full transition-colors"
              >
                <ChevronDown size={14} className={`text-gray-500 transition-all duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {isProfileOpen && (
              <div className="absolute top-full right-0 mt-3 w-72 bg-[#080808] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                {/* User Email Header */}
                <div className="px-5 py-4 border-b border-white/5 bg-white/[0.01]">
                  <p className="text-xs font-medium text-gray-400 truncate">{userEmail}</p>
                </div>

                {/* Reddit Accounts Section */}
                <div className="p-2">
                  <div className="px-3 py-2 flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    <div className="w-4 h-4 bg-[#FF4500] rounded-full flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-white" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.051l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.945 0 1.712.767 1.712 1.712 0 .593-.306 1.11-.764 1.398.032.183.051.369.051.563 0 2.315-2.72 4.192-6.075 4.192-3.354 0-6.074-1.877-6.074-4.192 0-.194.02-.38.051-.563a1.712 1.712 0 0 1-1.114-2.622c.307-.31.73-.491 1.207-.491.478 0 .901.182 1.207.491 1.194-.856 2.85-1.419 4.674-1.488l.82-3.818a.312.312 0 0 1 .37-.243l2.672.567c.058-.051.126-.093.197-.122zm-6.11 7.115c-.631 0-1.145.513-1.145 1.145s.514 1.145 1.145 1.145c.632 0 1.145-.513 1.145-1.145s-.513-1.145-1.145-1.145zm4.22 0c-.632 0-1.145.513-1.145 1.145s.513 1.145 1.145 1.145c.631 0 1.145-.513 1.145-1.145s-.514-1.145-1.145-1.145zm-4.22 3.183c-.11 0-.213.044-.29.121-.423.422-1.328.462-1.62.462a.41.31 0 1 0 0 .82c.728 0 1.938-.11 2.546-.718a.41.41 0 0 0-.636-.585zm4.22 0c-.11 0-.213.044-.29.121-.423.422-1.328.462-1.62.462a.41.31 0 1 0 0 .82c.728 0 1.938-.11 2.546-.718a.41.41 0 0 0-.636-.585z"/>
                      </svg>
                    </div>
                    Reddit Accounts
                  </div>

                  {profileData?.reddit_username ? (
                    <div className="mx-2 mb-2 p-3 bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-between group/reddit hover:border-blue-500/30 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#FF4500]/10 rounded-full flex items-center justify-center">
                          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#FF4500]" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.051l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.945 0 1.712.767 1.712 1.712 0 .593-.306 1.11-.764 1.398.032.183.051.369.051.563 0 2.315-2.72 4.192-6.075 4.192-3.354 0-6.074-1.877-6.074-4.192 0-.194.02-.38.051-.563a1.712 1.712 0 0 1-1.114-2.622c.307-.31.73-.491 1.207-.491.478 0 .901.182 1.207.491 1.194-.856 2.85-1.419 4.674-1.488l.82-3.818a.312.312 0 0 1 .37-.243l2.672.567c.058-.051.126-.093.197-.122zm-6.11 7.115c-.631 0-1.145.513-1.145 1.145s.514 1.145 1.145 1.145c.632 0 1.145-.513 1.145-1.145s-.513-1.145-1.145-1.145zm4.22 0c-.632 0-1.145.513-1.145 1.145s.513 1.145 1.145 1.145c.631 0 1.145-.513 1.145-1.145s-.514-1.145-1.145-1.145zm-4.22 3.183c-.11 0-.213.044-.29.121-.423.422-1.328.462-1.62.462a.41.31 0 1 0 0 .82c.728 0 1.938-.11 2.546-.718a.41.41 0 0 0-.636-.585zm4.22 0c-.11 0-.213.044-.29.121-.423.422-1.328.462-1.62.462a.41.31 0 1 0 0 .82c.728 0 1.938-.11 2.546-.718a.41.41 0 0 0-.636-.585z"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-white leading-none mb-1">u/{redditName}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-gray-500">{redditKarma !== null ? `${redditKarma.toLocaleString()} karma` : '---'}</span>
                            <CheckCircle2 size={11} className="text-emerald-500" />
                          </div>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-[#FF4500] text-black text-[10px] font-black uppercase rounded-lg border border-[#FF4500]">
                        Active
                      </span>
                    </div>
                  ) : (
                    <div className="px-3 py-4 text-center text-[10px] text-gray-600 font-bold uppercase tracking-widest italic">
                      No Accounts Linked
                    </div>
                  )}

                  <div className="space-y-0.5 border-t border-white/5 pt-1">
                    <button 
                      onClick={() => { navigate('/account'); setIsProfileOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                    >
                      <UserPlus size={18} className="text-gray-400" /> Add Reddit Account
                    </button>
                    <button 
                      onClick={() => { navigate('/account'); setIsProfileOpen(false); }}
                      className="w-full flex items-center gap-4 px-4 py-3 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                    >
                      <Settings size={18} className="text-gray-400" /> Profile Settings
                    </button>
                  </div>

                  <div className="mt-1 border-t border-white/5 pt-1">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-xl transition-all group/logout"
                    >
                      <LogOut size={18} className="group-hover:-translate-x-0.5 transition-transform" /> Sign Out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 right-0 bg-black/95 backdrop-blur-xl border-b border-white/5 animate-in slide-in-from-top duration-300">
          <nav className="flex flex-col p-4 gap-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${
                    isActive 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                {item.icon}
                <span className="font-bold">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
};

export default Navbar;
