import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, ListTodo, WalletCards, Bell, Menu, X, LogOut, Settings, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Navbar = () => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profileData, setProfileData] = useState<{server_username: string, reddit_username: string, balance: number} | null>(null);
  const [redditKarma, setRedditKarma] = useState<number | null>(null);
  const [redditStatus, setRedditStatus] = useState<'active' | 'suspended' | 'banned' | 'not_found' | null>(null);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  
  const userEmail = localStorage.getItem('user_email') || '';

  // Handle click outside for alerts modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showAlertsModal && event.target instanceof Element) {
        const isInsideModal = event.target.closest('.alerts-modal');
        const isInsideBell = event.target.closest('.bell-button');
        if (!isInsideModal && !isInsideBell) {
          setShowAlertsModal(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAlertsModal]);

  // Fetch profile and alerts
  useEffect(() => {
    if (userEmail) {
      fetchUserProfile();
      fetchAlerts();
      fetchAllAlerts();
      
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
          fetchAllAlerts();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(profileChannel);
        supabase.removeChannel(alertChannel);
      };
    }
  }, [userEmail]);

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
            
            // Sync karma to database
            supabase.from('profiles')
              .update({ reddit_karma: totalKarma })
              .eq('email', userEmail)
              .then(({ error }) => {
                if (error) console.error('[Navbar] Error syncing karma:', error);
              });
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsMobileMenuOpen(false);
              if (unreadAlerts > 0) {
                supabase.from('admin_alerts').update({ is_read: true }).eq('user_email', userEmail);
                setUnreadAlerts(0);
              }
              setShowAlertsModal(!showAlertsModal);
            }}
            className="p-4 text-gray-400 hover:text-white transition-colors relative bell-button active:scale-90 touch-manipulation z-[60]"
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            <Bell size={22} />
            {unreadAlerts > 0 && !showAlertsModal && (
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-black animate-pulse"></span>
            )}
          </button>

          {/* Alerts Modal */}
          {showAlertsModal && (
            <div className="fixed top-[80px] right-2 left-2 sm:left-auto sm:right-4 sm:w-80 z-[200] alerts-modal bg-[#080808] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="px-5 py-4 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                <h3 className="font-bold text-white">Notifications</h3>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAlertsModal(false);
                  }}
                  className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-white/10 transition-all active:scale-90"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto">
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate('/account');
            }}
            className="hidden sm:flex items-center justify-center w-14 h-14 text-gray-400 hover:text-blue-500 hover:bg-white/5 rounded-xl transition-all active:scale-95 relative z-[60]"
            title="Account Settings"
          >
            <Settings size={24} />
          </button>
          
          <div className="hidden sm:flex items-center gap-3 px-2 py-1.5 rounded-full border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] transition-all group pointer-events-none select-none">
            <div className="flex items-center gap-3 pl-2">
              <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors max-w-[100px] truncate">
                {displayName}
              </span>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-black text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-transform uppercase">
                {displayName[0]}
              </div>
            </div>
          </div>

          {/* Mobile: Just show avatar */}
          <div 
            onClick={() => navigate('/account')}
            className="sm:hidden w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-xs font-black text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] active:scale-95 transition-transform uppercase cursor-pointer"
          >
            {displayName[0]}
          </div>

          <button 
            onClick={() => {
              setShowAlertsModal(false); // Close alerts if open
              setIsMobileMenuOpen(!isMobileMenuOpen);
            }}
            className="md:hidden p-2 text-gray-400 hover:text-white transition-colors touch-manipulation"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 right-0 bg-black/95 backdrop-blur-xl border-b border-white/5 animate-in slide-in-from-top duration-300 z-[100]">
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

            {/* Divider */}
            <div className="h-[1px] bg-white/5 my-2 mx-4"></div>

            {/* Profile Info */}
            <div className="flex items-center gap-3 px-6 py-3 mx-2 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-sm font-black text-white uppercase">
                {displayName[0]}
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-sm">{displayName}</p>
                <p className="text-xs text-gray-500">{userEmail}</p>
              </div>
            </div>

            {/* Settings Button */}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                navigate('/account');
              }}
              className="flex items-center gap-4 px-6 py-4 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <Settings size={18} />
              <span className="font-bold">Account Settings</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
              className="flex items-center gap-4 px-6 py-4 rounded-2xl text-red-500 hover:bg-red-500/10 transition-all"
            >
              <LogOut size={18} />
              <span className="font-bold">Sign Out</span>
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default Navbar;
