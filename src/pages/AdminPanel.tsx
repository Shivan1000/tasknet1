import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { Send, Plus, Trash2, Globe, Tag, DollarSign, Clock, Edit2, Eye, EyeOff, User, ChevronDown, Check, X, Search, AlertCircle, Shield, Lock, MessageSquare, CheckCircle2, Users, Wallet, CreditCard, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Reddit karma cache (6 days TTL)
const redditKarmaCache = new Map<string, { karma: number; timestamp: number; lastFetchedDate: string }>();
const CACHE_TTL = 6 * 24 * 60 * 60 * 1000; // 6 days

interface Task {
  id: string;
  task_id_display: string;
  tier: string;
  subreddit: string;
  title: string;
  category: string;
  reward: string;
  deadline: string;
  reddit_url: string;
  instructions: string;
  assigned_to: string;
  status: string;
  claimed_by: string;
  submission_data: any;
  is_hidden: boolean;
  created_at: string;
}

interface WithdrawalRequest {
  id: string;
  transaction_id: string;
  user_email: string;
  amount: number;
  payout_method: {
    type: string;
    value: string;
    label: string;
  };
  status: 'pending' | 'completed' | 'rejected';
  created_at: string;
}

interface Profile {
  email: string;
  reddit_username: string;
  server_username: string;
  discord_username: string;
  balance: number;
  reddit_karma?: number | null;
  payout_methods: Array<{
    id: string;
    type: 'binance' | 'usdt' | 'upi';
    value: string;
    label: string;
  }>;
}

const PAYMENT_ICONS: Record<string, string> = {
  binance: 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png',
  usdt: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
  upi: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/UPI-Logo-vector.svg/1200px-UPI-Logo-vector.svg.png'
};

interface CustomAlert {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface Report {
  id: string;
  user_email: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const AdminPanel = () => {
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeAdminTab, setActiveAdminTab] = useState('Tasks');
  
  // Alert Modal State
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertTargetEmail, setAlertTargetEmail] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [isAlertSending, setIsAlertSending] = useState(false);
  
  // Reject Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectTargetTask, setRejectTargetTask] = useState<Task | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  
  // Withdrawal Confirmation Modal State
  const [isWithdrawConfirmModalOpen, setIsWithdrawConfirmModalOpen] = useState(false);
  const [withdrawTargetRequest, setWithdrawTargetRequest] = useState<WithdrawalRequest | null>(null);
  const [isProcessingWithdrawal, setIsProcessingWithdrawal] = useState(false);
  
  // Users Tab State
  const [expandedUserEmail, setExpandedUserEmail] = useState<string | null>(null);
  
  const [taskName, setTaskName] = useState('');
  const [tier, setTier] = useState('Tier 1');
  const [subreddit, setSubreddit] = useState('');
  const [category, setCategory] = useState('COMMENT');
  const [reward, setReward] = useState('');
  const [deadline, setDeadline] = useState('');
  const [redditUrl, setRedditUrl] = useState('');
  const [instructions, setInstructions] = useState('');
  const [assignedTo, setAssignedTo] = useState('All');

  const [isTierDropdownOpen, setIsTierDropdownOpen] = useState(false);
  const tierDropdownRef = useRef<HTMLDivElement>(null);

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Custom Alert State
  const [activeAlert, setActiveAlert] = useState<CustomAlert>({ show: false, message: '', type: 'info' });

  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setActiveAlert({ show: true, message, type });
    setTimeout(() => setActiveAlert(prev => ({ ...prev, show: false })), 2000);
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPasscode = import.meta.env.VITE_ADMIN_PASSCODE || 'SS@19151';
    if (passcode === correctPasscode) {
      setIsAuthenticated(true);
      showAlert('Access granted. Welcome Admin.', 'success');
    } else {
      showAlert('Invalid admin passcode.', 'error');
    }
  };

  const fetchWithdrawalRequests = async () => {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      // Error fetching withdrawal requests
    } else {
      setWithdrawalRequests(data || []);
    }
  };

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('admin_alerts')
      .select('*')
      .eq('user_email', 'ADMIN_REPORT')
      .order('created_at', { ascending: false });
    
    if (error) {
      // Error fetching reports
    } else {
      setReports(data || []);
    }
  };

  const handleDeleteReport = async (id: string) => {
    // 1. Immediate Optimistic Update
    setReports(prev => prev.filter(r => r.id !== id));
    
    try {
      const { error } = await supabase
        .from('admin_alerts')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Delete error:', error);
        showAlert('Error: ' + error.message, 'error');
        fetchReports(); // Rollback only on actual error
      } else {
        showAlert('Report resolved', 'success');
        // We DO NOT call fetchReports() here to prevent race conditions
        // The 10s interval will eventually sync the state if needed
      }
    } catch (err) {
      console.error('Catch error:', err);
      fetchReports();
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks();
      fetchProfiles();
      fetchWithdrawalRequests();
      fetchReports();
      
      // Auto-refresh every 10 seconds
      const refreshInterval = setInterval(() => {
        fetchTasks();
        fetchProfiles();
        fetchWithdrawalRequests();
        fetchReports();
      }, 10000);
      
      return () => clearInterval(refreshInterval);
    }
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (tierDropdownRef.current && !tierDropdownRef.current.contains(event.target as Node)) {
        setIsTierDropdownOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAuthenticated]);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching tasks:', error);
    } else {
      setTasks(data || []);
    }
  };

  const fetchProfiles = async (forceRefreshKarma = false) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('email, reddit_username, server_username, discord_username, balance, payout_methods, reddit_karma');
    
    if (error) {
      console.error('Error fetching profiles:', error);
    } else if (data) {
      setProfiles(data);
      // Force fetch karma for ALL users on every call
      data.forEach(profile => {
        if (profile.reddit_username && profile.reddit_username !== 'not_connected') {
          fetchAndSyncUserKarma(profile.email, profile.reddit_username);
        }
      });
    }
  };

  const fetchAndSyncUserKarma = async (email: string, username: string) => {
    try {
      // Set default values without fetching anything
      // Cache with default values
      redditKarmaCache.set(username, {
        karma: 0, // Default karma value
        timestamp: Date.now(),
        lastFetchedDate: new Date().toISOString().split('T')[0]
      });
      
      // Update local state with default karma
      setProfiles(prev => prev.map(p => p.email === email ? { ...p, reddit_karma: 0 } : p));
      
      // Sync to DB with default karma
      await supabase.from('profiles').update({ reddit_karma: 0 }).eq('email', email);
    } catch (err) {
      console.error('Error setting default reddit karma for', username, err);
    }
  };

  const sendDiscordNotification = async (task: any) => {
    const webhookUrl = 'https://discord.com/api/webhooks/1463922549120434186/4juUa6WRV4dCkAjfYv35DruT5VRS8AXT8TazwOCkbVGM1yBXnUP6hQHbdnjUqxGO9Dwp';
    
    if (task.assigned_to === 'All') {
      // Public task - send general notification without ping
      const message = `:rocket: NEW TASK ALERT

A new task has been published.
:link: Claim it here:
https://tasknet.site/dashboard`;

      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: message })
        });
      } catch (err) {
        console.error('Error sending Discord notification:', err);
      }
    } else {
      // Private task - ping specific user if they have Discord linked
      try {
        // Get user's Discord ID and server username from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('discord_username, server_username')
          .eq('email', task.assigned_to)
          .single();
        
        if (profile) {
          if (profile.discord_username) {
            // Try to extract Discord ID (assuming format: "username#1234" or "123456789012345678")
            const discordIdMatch = profile.discord_username.match(/(?:^|[^0-9])(\d{17,19})(?:[^0-9]|$)/);
            const discordId = discordIdMatch ? discordIdMatch[1] : null;
            
            if (discordId) {
              // Ping user with their ID
              const message = `:rocket: PRIVATE TASK ALERT

<@${discordId}> You have a new private task assigned to you!
:link: View it here:
https://tasknet.site/dashboard`;
              
              await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: message })
              });
              return;
            }
          }
          
          // No valid Discord ID found, ping with server username
          const serverName = profile.server_username || 'User';
          const message = `:rocket: PRIVATE TASK ALERT

${serverName} You have a new private task assigned to you!
:link: View it here:
https://tasknet.site/dashboard`;
          
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: message })
          });
        } else {
          // No profile found, send generic message
          const message = `:rocket: PRIVATE TASK ALERT

A new private task has been assigned to a user.
:link: View it here:
https://tasknet.site/dashboard`;
          
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: message })
          });
        }
      } catch (err) {
        console.error('Error sending Discord notification:', err);
      }
    }
  };

  const handlePostTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate a unique numeric Task ID if it's a new task
    const task_id_display = editingId ? tasks.find(t => t.id === editingId)?.task_id_display : `#${Math.floor(100000 + Math.random() * 900000)}`;
    
    const taskData = {
      task_id_display,
      tier,
      subreddit,
      title: taskName,
      category,
      reward,
      deadline,
      reddit_url: redditUrl,
      instructions,
      assigned_to: assignedTo,
      is_hidden: false
    };

    if (editingId) {
      const { error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', editingId);
      
      if (error) showAlert('Error updating task: ' + error.message, 'error');
      else {
        showAlert('Task Updated Successfully!', 'success');
        setEditingId(null);
      }
    } else {
      const { error } = await supabase
        .from('tasks')
        .insert([taskData]);
      
      if (error) showAlert('Error posting task: ' + error.message, 'error');
      else {
        showAlert('Task Posted Successfully!', 'success');
        sendDiscordNotification(taskData);
      }
    }

    resetForm();
    fetchTasks();
  };

  const resetForm = () => {
    setTaskName('');
    setTier('Tier 1');
    setSubreddit('');
    setReward('');
    setDeadline('');
    setRedditUrl('');
    setInstructions('');
    setAssignedTo('All');
    setCategory('COMMENT');
    setEditingId(null);
    setUserSearch('');
  };

  const handleEdit = (task: Task) => {
    setEditingId(task.id);
    setTaskName(task.title);
    setTier(task.tier || 'Tier 1');
    setSubreddit(task.subreddit || '');
    setCategory(task.category);
    setReward(task.reward);
    setDeadline(task.deadline);
    setRedditUrl(task.reddit_url);
    setInstructions(task.instructions);
    setAssignedTo(task.assigned_to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this task?')) return;
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) showAlert('Error deleting task', 'error');
    else {
      showAlert('Task Deleted Successfully', 'success');
      fetchTasks();
    }
  };

  const handleToggleHide = async (task: Task) => {
    const { error } = await supabase
      .from('tasks')
      .update({ is_hidden: !task.is_hidden })
      .eq('id', task.id);
    
    if (error) showAlert('Error updating status', 'error');
    else {
      showAlert(task.is_hidden ? 'Task Visible' : 'Task Hidden', 'info');
      fetchTasks();
    }
  };

  const handleVerify = async (task: Task) => {
    if (!task.claimed_by) return;

    // Start a transaction-like update
    // 1. Update task status to verified
    const { error: taskError } = await supabase
      .from('tasks')
      .update({ status: 'verified' })
      .eq('id', task.id);

    if (taskError) {
      showAlert('Error verifying task: ' + taskError.message, 'error');
      return;
    }

    // 2. Add reward to user balance
    // First fetch current balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('balance')
      .eq('email', task.claimed_by)
      .single();

    const currentBalance = parseFloat(profile?.balance || '0');
    const reward = parseFloat(task.reward.replace('$', ''));
    const newBalance = currentBalance + reward;

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        balance: newBalance,
        last_task_completed_at: new Date().toISOString()
      })
      .eq('email', task.claimed_by);

    if (profileError) {
      showAlert('Error updating balance: ' + profileError.message, 'error');
    } else {
      showAlert('Task verified and reward added to wallet!', 'success');
      fetchTasks();
    }
  };

  const handleSendAlert = async (email: string) => {
    setAlertTargetEmail(email);
    setAlertMessage('');
    setIsAlertModalOpen(true);
  };

  const handleOpenRejectModal = (task: Task) => {
    setRejectTargetTask(task);
    setRejectReason('');
    setIsRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!rejectTargetTask || !rejectReason.trim()) return;
    
    setIsRejecting(true);
    
    // 1. Update task status to rejected
    const { error: taskError } = await supabase
      .from('tasks')
      .update({ status: 'rejected' })
      .eq('id', rejectTargetTask.id);

    if (taskError) {
      showAlert('Error rejecting task: ' + taskError.message, 'error');
      setIsRejecting(false);
      return;
    }

    // 2. Update user's rejection timestamp
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ last_task_rejected_at: new Date().toISOString() })
      .eq('email', rejectTargetTask.claimed_by);

    if (profileError) {
      showAlert('Error updating rejection timestamp: ' + profileError.message, 'error');
    }

    // 3. Send rejection reason to user's alerts
    const { error: alertError } = await supabase
      .from('admin_alerts')
      .insert([{ 
        user_email: rejectTargetTask.claimed_by, 
        message: `Your submission for task "${rejectTargetTask.title}" (${rejectTargetTask.task_id_display}) has been rejected.\n\nReason: ${rejectReason}` 
      }]);

    if (alertError) {
      showAlert('Task rejected but failed to notify user: ' + alertError.message, 'error');
    } else {
      showAlert('Task rejected and user notified!', 'success');
    }

    setIsRejectModalOpen(false);
    setRejectTargetTask(null);
    setRejectReason('');
    setIsRejecting(false);
    fetchTasks();
  };

  const handleOpenWithdrawConfirm = (request: WithdrawalRequest) => {
    setWithdrawTargetRequest(request);
    setIsWithdrawConfirmModalOpen(true);
  };

  const confirmWithdrawal = async () => {
    if (!withdrawTargetRequest) return;
    
    setIsProcessingWithdrawal(true);
    const { error } = await supabase
      .from('withdrawal_requests')
      .update({ status: 'completed' })
      .eq('id', withdrawTargetRequest.id);

    if (error) {
      showAlert('Error updating withdrawal: ' + error.message, 'error');
    } else {
      showAlert('Withdrawal marked as completed!', 'success');
      fetchWithdrawalRequests();
      setIsWithdrawConfirmModalOpen(false);
      setWithdrawTargetRequest(null);
    }
    setIsProcessingWithdrawal(false);
  };

  const submitAdminAlert = async () => {
    if (!alertMessage.trim()) return;
    
    setIsAlertSending(true);
    const { error } = await supabase
      .from('admin_alerts')
      .insert([{ user_email: alertTargetEmail, message: alertMessage }]);

    if (error) showAlert('Error sending alert: ' + error.message, 'error');
    else {
      showAlert('Alert sent to user!', 'success');
      setIsAlertModalOpen(false);
    }
    setIsAlertSending(false);
  };

  const filteredProfiles = profiles.filter(p => 
    p.email.toLowerCase().includes(userSearch.toLowerCase()) || 
    (p.reddit_username && p.reddit_username.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const selectedProfile = profiles.find(p => p.email === assignedTo);
  const dropdownLabel = assignedTo === 'All' 
    ? 'Everyone (Public)' 
    : `${selectedProfile?.server_username || assignedTo.split('@')[0]}[${selectedProfile?.reddit_username || 'No Reddit'}]`;

  if (!isAuthenticated) {
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

        <div className="min-h-[70vh] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white/[0.02] border border-white/5 rounded-[32px] p-8 sm:p-10 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20">
                <Shield className="text-blue-500" size={32} />
              </div>
              <h1 className="text-2xl font-black tracking-tight mb-2">Admin Access</h1>
              <p className="text-gray-500 text-sm">Enter the admin passcode to continue.</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-2">
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white/[0.03] border border-white/5 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-center tracking-[0.5em] font-mono text-lg"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
              >
                ACCESS PANEL
              </button>
            </form>
          </div>
        </div>
      </Layout>
    );
  }

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

      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="mb-8 sm:mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="px-3 py-1 bg-blue-600/10 text-blue-500 rounded-full text-[10px] font-bold uppercase tracking-widest border border-blue-500/20">
              Admin Control
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase italic">
            {activeAdminTab === 'Tasks' ? 'Task Management' : 
             activeAdminTab === 'Users' ? 'User Management' : 
             activeAdminTab === 'Withdrawals' ? 'Payout Records' : 
             activeAdminTab === 'Reports' ? 'Task Reports' : 'Submission Verifications'}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {activeAdminTab === 'Tasks' ? 'Distribute new tasks to the network.' : 
             activeAdminTab === 'Users' ? 'View all registered users and their details.' : 
             activeAdminTab === 'Withdrawals' ? 'View historical payout data and completed transactions.' : 
             activeAdminTab === 'Reports' ? 'Review problems reported by users.' : 'Review and approve user submissions.'}
          </p>
        </header>

        <div className="flex flex-wrap bg-white/[0.03] border border-white/5 p-1 rounded-2xl mb-8 sm:mb-12 w-full sm:w-fit gap-1">
          <button 
            onClick={() => setActiveAdminTab('Tasks')}
            className={`flex-1 sm:flex-none px-4 sm:px-8 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${
              activeAdminTab === 'Tasks' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-white'
            }`}
          >
            Create
          </button>
          <button 
            onClick={() => setActiveAdminTab('Verification')}
            className={`flex-1 sm:flex-none px-4 sm:px-8 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all relative ${
              activeAdminTab === 'Verification' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-white'
            }`}
          >
            Verify
            {tasks.filter(t => t.status === 'submitted').length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] flex items-center justify-center animate-pulse">
                {tasks.filter(t => t.status === 'submitted').length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveAdminTab('Submissions')}
            className={`flex-1 sm:flex-none px-4 sm:px-8 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${
              activeAdminTab === 'Submissions' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-white'
            }`}
          >
            History
          </button>
          <button 
            onClick={() => setActiveAdminTab('Users')}
            className={`flex-1 sm:flex-none px-4 sm:px-8 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${
              activeAdminTab === 'Users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-white'
            }`}
          >
            Users
          </button>
          <button 
            onClick={() => setActiveAdminTab('Withdrawals')}
            className={`flex-1 sm:flex-none px-4 sm:px-8 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${
              activeAdminTab === 'Withdrawals' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-white'
            }`}
          >
            Paid
          </button>
          <button 
            onClick={() => setActiveAdminTab('Reports')}
            className={`flex-1 sm:flex-none px-4 sm:px-8 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all relative ${
              activeAdminTab === 'Reports' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-white'
            }`}
          >
            Reports
            {reports.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] flex items-center justify-center animate-pulse">
                {reports.length}
              </span>
            )}
          </button>
        </div>

        {activeAdminTab === 'Tasks' ? (
          <>
            <form onSubmit={handlePostTask} className="space-y-6 sm:space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
            {/* Tier Selection */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 flex items-center gap-2">
                <Shield size={14} /> Task Tier
              </label>
              <div className="relative" ref={tierDropdownRef}>
                <div 
                  onClick={() => setIsTierDropdownOpen(!isTierDropdownOpen)}
                  className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-between cursor-pointer hover:border-blue-500/50 transition-all text-sm group"
                >
                  <span className="text-white font-medium">{tier}</span>
                  <ChevronDown size={18} className={`text-gray-500 transition-transform ${isTierDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {isTierDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {['Tier 1', 'Tier 2', 'Tier 3'].map((option) => (
                      <div 
                        key={option}
                        onClick={() => { setTier(option); setIsTierDropdownOpen(false); }}
                        className={`px-4 py-3 rounded-xl text-xs font-bold cursor-pointer transition-all mb-1 last:mb-0 ${
                          tier === option 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Subreddit */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 flex items-center gap-2">
                <Globe size={14} /> Subreddit
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MovingToLondon"
                value={subreddit}
                onChange={(e) => setSubreddit(e.target.value)}
                className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-sm placeholder:text-gray-600 shadow-inner"
              />
            </div>

            {/* Task Name */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 flex items-center gap-2">
                <Tag size={14} /> Task Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Upvote and Comment on r/tech"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-sm placeholder:text-gray-600 shadow-inner"
              />
            </div>

            {/* Category */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 flex items-center gap-2">
                <Plus size={14} /> Category
              </label>
              <div className="relative" ref={categoryDropdownRef}>
                <div 
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-between cursor-pointer hover:border-blue-500/50 transition-all text-sm group"
                >
                  <span className="text-white font-bold uppercase tracking-tight">{category}</span>
                  <ChevronDown size={18} className={`text-gray-500 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {isCategoryDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {['COMMENT', 'POST', 'UPVOTE', 'REPLY TO COMMENT', 'REPOST'].map((option) => (
                      <div 
                        key={option}
                        onClick={() => { setCategory(option); setIsCategoryDropdownOpen(false); }}
                        className={`px-4 py-3 rounded-xl text-[10px] font-black cursor-pointer transition-all mb-1 last:mb-0 tracking-widest uppercase ${
                          category === option 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Reward */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 flex items-center gap-2">
                <DollarSign size={14} /> Reward Amount
              </label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  type="text"
                  required
                  placeholder="0.50"
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                  className="w-full pl-10 pr-5 py-4 bg-white/[0.03] border border-white/5 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-sm placeholder:text-gray-600 shadow-inner"
                />
              </div>
            </div>

            {/* Deadline */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 flex items-center gap-2">
                <Clock size={14} /> Deadline
              </label>
              <div className="relative" ref={datePickerRef}>
                <div 
                  onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                  className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-between cursor-pointer hover:border-blue-500/50 transition-all text-sm group"
                >
                  <span className={deadline ? 'text-white font-medium' : 'text-gray-600'}>
                    {deadline ? new Date(deadline).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Select date and time'}
                  </span>
                  <Clock size={18} className={`text-gray-500 group-hover:text-blue-500 transition-colors ${isDatePickerOpen ? 'text-blue-500' : ''}`} />
                </div>

                {isDatePickerOpen && (
                  <div className="absolute top-full left-0 right-0 sm:right-auto sm:w-80 mt-2 p-4 bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-4 px-1">
                      <button 
                        type="button"
                        onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))}
                        className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 transition-colors"
                      >
                        <ChevronDown size={18} className="rotate-90" />
                      </button>
                      <span className="text-xs font-black uppercase italic tracking-widest text-blue-500">
                        {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(viewDate)}
                      </span>
                      <button 
                        type="button"
                        onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))}
                        className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 transition-colors"
                      >
                        <ChevronDown size={18} className="-rotate-90" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                        <div key={d} className="text-[10px] font-black text-gray-600 text-center py-1 uppercase">{d}</div>
                      ))}
                      {Array.from({ length: new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay() }).map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                      {Array.from({ length: new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                        const day = i + 1;
                        const isSelected = deadline && new Date(deadline).getDate() === day && new Date(deadline).getMonth() === viewDate.getMonth() && new Date(deadline).getFullYear() === viewDate.getFullYear();
                        return (
                          <div 
                            key={day}
                            onClick={() => {
                              const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                              const current = deadline ? new Date(deadline) : new Date();
                              d.setHours(current.getHours());
                              d.setMinutes(current.getMinutes());
                              const pad = (n: number) => n.toString().padStart(2, '0');
                              setDeadline(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                            }}
                            className={`aspect-square flex items-center justify-center text-[11px] font-bold rounded-lg cursor-pointer transition-all ${
                              isSelected 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            {day}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-gray-500" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Time</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input 
                          type="number" 
                          min="0" 
                          max="23"
                          value={deadline ? new Date(deadline).getHours() : 12}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(23, parseInt(e.target.value) || 0));
                            const d = deadline ? new Date(deadline) : new Date();
                            d.setHours(val);
                            const pad = (n: number) => n.toString().padStart(2, '0');
                            setDeadline(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                          }}
                          className="w-10 py-1 bg-white/5 border border-white/5 rounded-md text-center text-xs font-bold focus:border-blue-500 outline-none"
                        />
                        <span className="text-gray-600 font-bold">:</span>
                        <input 
                          type="number" 
                          min="0" 
                          max="59"
                          value={deadline ? new Date(deadline).getMinutes() : 0}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                            const d = deadline ? new Date(deadline) : new Date();
                            d.setMinutes(val);
                            const pad = (n: number) => n.toString().padStart(2, '0');
                            setDeadline(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                          }}
                          className="w-10 py-1 bg-white/5 border border-white/5 rounded-md text-center text-xs font-bold focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Target URL */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 flex items-center gap-2">
              <Globe size={14} /> Target Reddit URL
            </label>
            <input
              type="url"
              required
              placeholder="https://www.reddit.com/r/..."
              value={redditUrl}
              onChange={(e) => setRedditUrl(e.target.value)}
              className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-sm placeholder:text-gray-600 shadow-inner"
            />
          </div>

          {/* User Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 flex items-center gap-2">
              <User size={14} /> Assign to User
            </label>
            <div className="relative" ref={dropdownRef}>
              <div 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-between cursor-pointer hover:border-blue-500/50 transition-all text-sm group"
              >
                <span className={assignedTo === 'All' ? 'text-gray-500' : 'text-white font-medium'}>
                  {dropdownLabel}
                </span>
                <ChevronDown size={18} className={`text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="relative mb-3">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                    <input
                      type="text"
                      placeholder="Search server or reddit name..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      autoFocus
                      className="w-full pl-10 pr-4 py-2.5 bg-white/[0.05] border border-white/5 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-xs"
                    />
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                    <div 
                      onClick={() => { setAssignedTo('All'); setIsDropdownOpen(false); }}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${assignedTo === 'All' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                    >
                      Everyone (Public)
                    </div>
                    {filteredProfiles.map((profile) => (
                      <div 
                        key={profile.email}
                        onClick={() => { setAssignedTo(profile.email); setIsDropdownOpen(false); }}
                        className={`px-4 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${assignedTo === profile.email ? 'bg-blue-600 text-white font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                      >
                        <div className="font-bold">{profile.server_username || profile.email.split('@')[0]}</div>
                        <div className="flex items-center gap-2">
                          <div className="text-[10px] opacity-60">u/{profile.reddit_username || 'not_connected'}</div>
                          {profile.reddit_username && profile.reddit_username !== 'not_connected' ? (
                            <div className="text-[10px] opacity-60 text-emerald-500">• linked</div>
                          ) : null}
                          {profile.discord_username && (
                            <div className="text-[10px] opacity-60 flex items-center gap-1">
                              <MessageSquare size={10} /> {profile.discord_username}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredProfiles.length === 0 && userSearch !== '' && (
                      <div className="py-8 text-center text-gray-600 text-xs italic">
                        No users found matching "{userSearch}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <p className="text-[10px] text-gray-600 ml-1">Select a specific user or keep it public.</p>
          </div>

          {/* Instructions */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 flex items-center gap-2">
              Instructions for Users
            </label>
            <textarea
              rows={5}
              required
              placeholder="Detail exactly what the user needs to do..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-sm placeholder:text-gray-600 resize-none shadow-inner"
            ></textarea>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <button
              type="button"
              onClick={resetForm}
              className="w-full sm:w-auto px-8 py-4 bg-white/[0.03] border border-white/10 text-gray-400 rounded-2xl font-bold text-sm hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-2"
            >
              <Trash2 size={18} />
              {editingId ? 'Cancel Edit' : 'Reset Form'}
            </button>
            <button
              type="submit"
              className="w-full sm:flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 group"
            >
              <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              {editingId ? 'Update Task' : 'Publish Task to Network'}
            </button>
          </div>
        </form>

        <section className="mt-20">
          <h2 className="text-xl font-bold mb-8">Existing Tasks</h2>
          <div className="space-y-4">
            {tasks.filter(t => t.status !== 'verified').length > 0 ? (
              tasks.filter(t => t.status !== 'verified').map((task) => (
                <div key={task.id} className={`p-6 rounded-3xl border transition-all ${task.is_hidden ? 'bg-white/[0.01] border-white/5 opacity-50' : 'bg-white/[0.03] border-white/10'}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-black text-blue-500">{task.task_id_display}</span>
                        <h3 className="font-bold">{task.title}</h3>
                        <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded ${
                          task.tier === 'Tier 3' ? 'bg-red-500/10 text-red-500' :
                          task.tier === 'Tier 2' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-emerald-500/10 text-emerald-500'
                        }`}>{task.tier}</span>
                        <span className="text-[10px] uppercase font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded">{task.category}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${task.assigned_to === 'All' ? 'text-emerald-500 bg-emerald-500/10' : 'text-orange-500 bg-orange-500/10'}`}>
                          {task.assigned_to === 'All' ? 'PUBLIC' : `PRIVATE: ${task.assigned_to}`}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate max-w-md">{task.reddit_url}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleToggleHide(task)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400" title={task.is_hidden ? "Show" : "Hide"}>
                        {task.is_hidden ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <button onClick={() => handleEdit(task)} className="p-2 hover:bg-blue-600/20 rounded-lg text-blue-500" title="Edit">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(task.id)} className="p-2 hover:bg-red-600/20 rounded-lg text-red-500" title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-10">No active tasks found in database.</p>
            )}
          </div>
        </section>
      </>
    ) : activeAdminTab === 'Verification' ? (
      <section className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <h2 className="text-xl font-bold mb-8 italic uppercase tracking-tight">Pending Submissions</h2>
        {tasks.filter(t => t.status === 'submitted').length > 0 ? (
          tasks.filter(t => t.status === 'submitted').map(task => (
            <div key={task.id} className="bg-white/[0.02] border border-white/5 rounded-[32px] p-5 sm:p-8 hover:border-blue-500/20 transition-all">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-blue-500">{task.task_id_display}</span>
                    <h3 className="font-bold text-white text-lg">{task.title}</h3>
                    <span className="text-[9px] font-black bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded uppercase">{task.tier}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-[11px] text-gray-500">
                    <div className="flex items-center gap-2">
                      <User size={14} />
                      <span className="font-bold text-gray-300">{task.claimed_by}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign size={14} />
                      <span className="font-bold text-emerald-500">{task.reward}</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4">
                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                      <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-2">Main Link</span>
                      <a href={task.submission_data?.main_link} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline break-all">
                        {task.submission_data?.main_link}
                      </a>
                    </div>
                    
                    {task.submission_data?.random_comments && task.submission_data.random_comments.some((c: string) => c !== '') && (
                      <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-2">Random Comments</span>
                        <div className="space-y-2">
                          {task.submission_data.random_comments.map((link: string, i: number) => link && (
                            <a key={i} href={link} target="_blank" rel="noreferrer" className="text-[10px] text-gray-400 hover:text-white block hover:underline truncate">
                              {i + 1}. {link}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-row md:flex-col gap-3 justify-end">
                  <button 
                    onClick={() => handleVerify(task)}
                    className="flex-1 md:flex-none px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                  >
                    <Check size={18} strokeWidth={3} />
                    VERIFY
                  </button>
                  <button 
                    onClick={() => handleOpenRejectModal(task)}
                    className="flex-1 md:flex-none px-8 py-4 bg-red-600 text-white rounded-2xl font-black text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                  >
                    <X size={18} strokeWidth={3} />
                    REJECT
                  </button>
                  <button 
                    onClick={() => handleSendAlert(task.claimed_by)}
                    className="flex-1 md:flex-none px-8 py-4 bg-white/[0.03] border border-white/10 text-gray-400 rounded-2xl font-bold text-sm hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <MessageSquare size={18} />
                    ALERT
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-[32px]">
            <CheckCircle2 size={48} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">All caught up! No pending submissions.</p>
          </div>
        )}
      </section>
    ) : activeAdminTab === 'Users' ? (
      <section className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold italic uppercase tracking-tight">Registered Users</h2>
            <button 
              onClick={() => fetchProfiles(true)}
              className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-blue-500 transition-all group"
              title="Refresh Karma for everyone"
            >
              <Clock size={16} className="group-hover:rotate-180 transition-transform duration-500" />
            </button>
          </div>
          <div className="px-4 py-2 bg-white/[0.03] border border-white/5 rounded-2xl">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total: </span>
            <span className="text-sm font-black text-white">{profiles.length}</span>
          </div>
        </div>
    
        {profiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profiles.map((profile) => {
              const userTasks = tasks.filter(t => t.claimed_by === profile.email && (t.status === 'verified' || t.status === 'submitted'));
              const isExpanded = expandedUserEmail === profile.email;
              const pendingWithdrawals = withdrawalRequests.filter(r => r.user_email === profile.email && r.status === 'pending');
                  
              return (
                <div key={profile.email} className={`bg-white/[0.02] border rounded-[28px] p-4 sm:p-6 transition-all ${pendingWithdrawals.length > 0 ? 'border-red-500/30' : 'border-white/5 hover:border-blue-500/20'}`}>
                  {/* User Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                        {(profile.server_username || profile.email)[0].toUpperCase()}
                      </div>
                      {pendingWithdrawals.length > 0 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-[#0a0a0a] rounded-full animate-pulse shadow-lg shadow-red-500/40"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-sm truncate">{profile.server_username || profile.email.split('@')[0]}</h3>
                        {pendingWithdrawals.length > 0 && (
                          <span className="text-[8px] font-black bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">Withdrawal Req</span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">{profile.email}</p>
                      {profile.reddit_username && (
                        <div className="flex items-center gap-2 mt-1">
                          <a 
                            href={`https://reddit.com/u/${profile.reddit_username}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[10px] text-orange-500 font-bold hover:underline flex items-center gap-1"
                          >
                            u/{profile.reddit_username}
                            <ExternalLink size={10} />
                          </a>
                          <span className="text-[10px] text-emerald-500 font-bold">• linked</span>
                        </div>
                      )}
                    </div>
                  </div>
    
                  {/* Balance & Pending Requests */}
                  <div className="grid grid-cols-1 gap-2 mb-4">
                    <div className="flex items-center justify-between p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Wallet size={14} className="text-emerald-500" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Current Balance</span>
                      </div>
                      <span className="text-sm font-black text-emerald-500">${(profile.balance || 0).toFixed(2)}</span>
                    </div>

                    {pendingWithdrawals.length > 0 && (
                      <div className="space-y-2">
                        {pendingWithdrawals.map(req => (
                          <div key={req.id} className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <DollarSign size={14} className="text-red-500" />
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-red-500 uppercase">Withdrawal Request</span>
                                  <span className="text-[9px] font-mono text-gray-500">{req.transaction_id}</span>
                                </div>
                              </div>
                              <span className="text-sm font-black text-red-500">${req.amount.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 px-2 py-1.5 bg-white/[0.03] rounded-lg">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <img 
                                  src={PAYMENT_ICONS[req.payout_method.type]} 
                                  alt={req.payout_method.label}
                                  className="w-3.5 h-3.5 object-contain"
                                />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[9px] font-black text-gray-400 uppercase leading-none mb-0.5">{req.payout_method.label}</span>
                                  <span className="text-[10px] font-bold text-gray-200 truncate">{req.payout_method.value}</span>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleOpenWithdrawConfirm(req)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black rounded-lg transition-all shadow-lg shadow-emerald-600/10 whitespace-nowrap"
                              >
                                PAID
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
    
                  {/* Payout Methods */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard size={14} className="text-gray-500" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Payout Methods</span>
                    </div>
                    {profile.payout_methods && profile.payout_methods.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profile.payout_methods.map((method) => (
                          <div key={method.id} className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/5 rounded-xl">
                            <img 
                              src={PAYMENT_ICONS[method.type]} 
                              alt={method.label}
                              className="w-4 h-4 object-contain"
                            />
                            <span className="text-[10px] font-bold text-gray-300 truncate max-w-[100px]">{method.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-600 italic">No payout methods</p>
                    )}
                  </div>
    
                  {/* Tasks Dropdown */}
                  <div>
                    <button
                      onClick={() => setExpandedUserEmail(isExpanded ? null : profile.email)}
                      className="w-full flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-blue-500" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Completed Tasks</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">{userTasks.length}</span>
                        <ChevronDown size={14} className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                        
                    {isExpanded && userTasks.length > 0 && (
                      <div className="mt-2 p-3 bg-black/40 rounded-xl border border-white/5 space-y-2 max-h-48 overflow-y-auto">
                        {userTasks.map((task) => (
                          <div key={task.id} className="flex items-center justify-between gap-2 p-2 bg-white/[0.02] rounded-lg">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-blue-500">{task.task_id_display}</span>
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                                  task.status === 'verified' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                                }`}>{task.status}</span>
                              </div>
                              <p className="text-[10px] text-gray-300 truncate">{task.title}</p>
                            </div>
                            {task.submission_data?.main_link && (
                              <a 
                                href={task.submission_data.main_link}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 text-gray-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all flex-shrink-0"
                                title="View submission"
                              >
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                        
                    {isExpanded && userTasks.length === 0 && (
                      <div className="mt-2 p-4 bg-black/40 rounded-xl border border-white/5 text-center">
                        <p className="text-[10px] text-gray-600">No tasks completed yet</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-[32px]">
            <Users size={48} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No users registered yet.</p>
          </div>
        )}
      </section>
    ) : activeAdminTab === 'Reports' ? (
      <section className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold italic uppercase tracking-tight">User Reported Issues</h2>
          <div className="px-4 py-2 bg-white/[0.03] border border-white/5 rounded-2xl">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active: </span>
            <span className="text-sm font-black text-white">{reports.length}</span>
          </div>
        </div>

        <div className="space-y-4">
          {reports.length > 0 ? (
            reports.map(report => (
              <div key={report.id} className="bg-white/[0.02] border border-white/5 p-6 rounded-[32px] group hover:border-red-500/20 transition-all">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20 text-red-500">
                        <AlertCircle size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Reported Problem</span>
                          <span className="text-gray-700 text-[10px]">•</span>
                          <span className="text-[10px] font-bold text-gray-500 uppercase">{new Date(report.created_at).toLocaleString()}</span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-0.5">{report.message.split(' | ')[2]?.replace('PROBLEM: ', '') || 'No details provided'}</h4>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="px-4 py-3 bg-black/40 rounded-2xl border border-white/5">
                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-1">User Email</span>
                        <span className="text-xs text-gray-300 font-bold">{report.message.split(' | ')[0]?.replace('FROM: ', '') || 'Unknown'}</span>
                      </div>
                      <div className="px-4 py-3 bg-black/40 rounded-2xl border border-white/5">
                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-1">Task ID</span>
                        <span className="text-xs text-blue-500 font-black">{report.message.split(' | ')[1]?.replace('TASK: ', '') || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => handleSendAlert(report.message.split(' | ')[0]?.replace('FROM: ', ''))}
                      className="flex-1 sm:flex-none px-6 py-3 bg-blue-600/10 text-blue-500 rounded-xl font-bold text-xs hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <MessageSquare size={16} />
                      REPLY
                    </button>
                    <button 
                      onClick={() => handleDeleteReport(report.id)}
                      className="flex-1 sm:flex-none px-6 py-3 bg-white/[0.03] border border-white/10 text-gray-500 rounded-xl font-bold text-xs hover:text-white hover:bg-red-600 hover:border-red-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 size={16} />
                      RESOLVE
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-[32px]">
              <CheckCircle2 size={48} className="mx-auto text-gray-700 mb-4" />
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No active reports. Everything is smooth!</p>
            </div>
          )}
        </div>
      </section>
    ) : activeAdminTab === 'Withdrawals' ? (
      <section className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold italic uppercase tracking-tight">Completed Withdrawals</h2>
          <div className="px-4 py-2 bg-white/[0.03] border border-white/5 rounded-2xl">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Paid: </span>
            <span className="text-sm font-black text-white">{withdrawalRequests.filter(r => r.status === 'completed').length}</span>
          </div>
        </div>

        <div className="space-y-3">
          {withdrawalRequests.filter(r => r.status === 'completed').length > 0 ? (
            withdrawalRequests.filter(r => r.status === 'completed').map(req => {
              const paidDate = new Date(req.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
              const userProfile = profiles.find(p => p.email === req.user_email);

              return (
                <div key={req.id} className="bg-white/[0.02] border border-white/5 p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 group hover:border-emerald-500/20 transition-all">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 text-emerald-500">
                      <Check size={18} strokeWidth={3} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-mono text-gray-500">{req.transaction_id}</span>
                        <h4 className="text-sm font-bold text-white">{userProfile?.server_username || req.user_email.split('@')[0]}</h4>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-bold text-gray-400">
                          {req.user_email}
                        </span>
                        <span className="text-gray-700 text-[10px]">•</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Paid on {paidDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="block text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Amount Paid</span>
                      <span className="text-sm font-black text-emerald-500">${req.amount.toFixed(2)}</span>
                    </div>
                    <div className="text-right min-w-[120px]">
                      <span className="block text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Method</span>
                      <div className="flex items-center justify-end gap-2">
                        <img src={PAYMENT_ICONS[req.payout_method.type]} alt="" className="w-3.5 h-3.5 object-contain" />
                        <span className="text-[10px] font-bold text-gray-300">{req.payout_method.label}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-20 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-[32px]">
              <Wallet size={48} className="mx-auto text-gray-700 mb-4" />
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No completed withdrawals yet.</p>
            </div>
          )}
        </div>
      </section>
    ) : (
      <section className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold italic uppercase tracking-tight">Total Submission History</h2>
          <div className="px-4 py-2 bg-white/[0.03] border border-white/5 rounded-2xl">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total: </span>
            <span className="text-sm font-black text-white">{tasks.filter(t => t.status !== 'available').length}</span>
          </div>
        </div>
    
        <div className="space-y-3">
          {tasks.filter(t => t.status !== 'available').length > 0 ? (
            tasks.filter(t => t.status !== 'available').map(task => {
              const submissionDate = task.created_at ? new Date(task.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '---';
              const userProfile = profiles.find(p => p.email === task.claimed_by);
                  
              return (
                <div key={task.id} className="bg-white/[0.02] border border-white/5 p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 group hover:border-blue-500/20 transition-all">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 bg-white/[0.03] rounded-xl flex items-center justify-center border border-white/5 text-gray-500 group-hover:text-blue-500 transition-colors">
                      <User size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-black text-blue-500">{task.task_id_display}</span>
                        <h4 className="text-sm font-bold text-white">{task.title}</h4>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                          task.tier === 'Tier 3' ? 'bg-red-500/10 text-red-500' :
                          task.tier === 'Tier 2' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-emerald-500/10 text-emerald-500'
                        }`}>{task.tier}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-bold text-gray-400">
                          {userProfile?.server_username || task.claimed_by?.split('@')[0]}
                          <span className="text-gray-600 font-medium ml-1">
                            (u/{userProfile?.reddit_username || 'not_linked'})
                          </span>
                        </span>
                        <span className="text-gray-700 text-[10px]">•</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{submissionDate}</span>
                      </div>
                    </div>
                  </div>
    
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="block text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Reward</span>
                      <span className="text-sm font-black text-emerald-500">{task.reward}</span>
                    </div>
                    <div className="text-right min-w-[100px]">
                      <span className="block text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Status</span>
                      <div className="flex items-center justify-end gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          task.status === 'verified' ? 'bg-emerald-500' : 
                          task.status === 'submitted' ? 'bg-amber-500 animate-pulse' : 
                          task.status === 'rejected' ? 'bg-red-500' :
                          'bg-blue-500'
                        }`}></div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${
                          task.status === 'verified' ? 'text-emerald-500' : 
                          task.status === 'submitted' ? 'text-amber-500' : 
                          task.status === 'rejected' ? 'text-red-500' :
                          'text-blue-500'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-20 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-[32px]">
              <AlertCircle size={48} className="mx-auto text-gray-700 mb-4" />
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No submissions recorded yet.</p>
            </div>
          )}
        </div>
      </section>
    )}

        <section className="mt-20 p-8 border border-dashed border-white/10 rounded-[32px] bg-white/[0.01]">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">Security Notice</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            This admin panel is restricted to authorized personnel. All task distributions are logged with your IP address and timestamp. Ensure all target URLs comply with the network's safety guidelines before publishing.
          </p>
        </section>

        {/* Custom Admin Alert Modal */}
        {isAlertModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[40px] p-8 sm:p-12 shadow-2xl animate-in zoom-in duration-300">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20">
                  <MessageSquare className="text-blue-500" size={32} />
                </div>
                <h2 className="text-2xl font-black tracking-tight mb-2 uppercase italic">Send Admin Alert</h2>
                <p className="text-gray-500 text-sm">To: <span className="text-blue-400 font-bold">{alertTargetEmail}</span></p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Message Content</label>
                  <textarea
                    rows={4}
                    autoFocus
                    placeholder="Enter the alert or update details for the user..."
                    value={alertMessage}
                    onChange={(e) => setAlertMessage(e.target.value)}
                    className="w-full px-6 py-5 bg-white/[0.03] border border-white/5 rounded-3xl focus:outline-none focus:border-blue-500 transition-all text-sm placeholder:text-gray-600 resize-none shadow-inner"
                  ></textarea>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setIsAlertModalOpen(false)}
                    className="flex-1 py-4 bg-white/[0.03] border border-white/10 text-gray-400 rounded-2xl font-bold text-sm hover:text-white hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitAdminAlert}
                    disabled={!alertMessage.trim() || isAlertSending}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAlertSending ? 'Sending...' : (
                      <>
                        Send Alert
                        <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {isRejectModalOpen && rejectTargetTask && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[40px] p-8 sm:p-12 shadow-2xl animate-in zoom-in duration-300">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-red-600/10 rounded-2xl flex items-center justify-center mb-6 border border-red-500/20">
                  <X className="text-red-500" size={32} />
                </div>
                <h2 className="text-2xl font-black tracking-tight mb-2 uppercase italic">Reject Submission</h2>
                <p className="text-gray-500 text-sm">Task: <span className="text-red-400 font-bold">{rejectTargetTask.title}</span></p>
                <p className="text-gray-600 text-xs mt-1">User: {rejectTargetTask.claimed_by}</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Rejection Reason</label>
                  <textarea
                    rows={4}
                    autoFocus
                    placeholder="Enter the reason for rejection..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full px-6 py-5 bg-white/[0.03] border border-white/5 rounded-3xl focus:outline-none focus:border-red-500 transition-all text-sm placeholder:text-gray-600 resize-none shadow-inner"
                  ></textarea>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => { setIsRejectModalOpen(false); setRejectTargetTask(null); setRejectReason(''); }}
                    className="flex-1 py-4 bg-white/[0.03] border border-white/10 text-gray-400 rounded-2xl font-bold text-sm hover:text-white hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={!rejectReason.trim() || isRejecting}
                    className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRejecting ? 'Rejecting...' : (
                      <>
                        Reject Task
                        <X size={18} strokeWidth={3} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Withdrawal Confirmation Modal */}
        {isWithdrawConfirmModalOpen && withdrawTargetRequest && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[40px] p-8 sm:p-12 shadow-2xl animate-in zoom-in duration-300">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-emerald-600/10 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/20">
                  <DollarSign className="text-emerald-500" size={32} />
                </div>
                <h2 className="text-2xl font-black tracking-tight mb-2 uppercase italic">Confirm Payout</h2>
                <p className="text-gray-500 text-sm">Transaction ID: <span className="text-blue-400 font-mono font-bold">{withdrawTargetRequest.transaction_id}</span></p>
                <div className="mt-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl w-full text-left">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-gray-500 uppercase">Amount to Pay</span>
                    <span className="text-xl font-black text-emerald-500">${withdrawTargetRequest.amount.toFixed(2)}</span>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block">Recipient Details</span>
                    <div className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-white/5">
                      <img src={PAYMENT_ICONS[withdrawTargetRequest.payout_method.type]} alt="" className="w-5 h-5 object-contain" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">{withdrawTargetRequest.payout_method.label}</p>
                        <p className="text-xs font-bold text-white truncate">{withdrawTargetRequest.payout_method.value}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => { setIsWithdrawConfirmModalOpen(false); setWithdrawTargetRequest(null); }}
                  className="flex-1 py-4 bg-white/[0.03] border border-white/10 text-gray-400 rounded-2xl font-bold text-sm hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmWithdrawal}
                  disabled={isProcessingWithdrawal}
                  className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  {isProcessingWithdrawal ? 'Processing...' : (
                    <>
                      Confirm & Pay
                      <Check size={18} strokeWidth={3} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminPanel;
