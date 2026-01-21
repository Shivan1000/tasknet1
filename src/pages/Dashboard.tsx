import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Activity, CreditCard, Layers, Zap, Check, X, AlertCircle, ArrowRight, Shield, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface Task {
  id: string;
  task_id_display: string;
  tier: string;
  title: string;
  reward: string;
  deadline: string;
}

interface CustomAlert {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeAlert, setActiveAlert] = useState<CustomAlert>({ show: false, message: '', type: 'info' });
  const [taskCounts, setTaskCounts] = useState({ active: 0, available: 0, completed: 0 });
  const [balance, setBalance] = useState(0);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const userEmail = localStorage.getItem('user_email') || '';

  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setActiveAlert({ show: true, message, type });
    setTimeout(() => setActiveAlert(prev => ({ ...prev, show: false })), 2000);
  };

  useEffect(() => {
    fetchTaskStats();
    fetchUserBalance();

    // Subscribe to task changes
    const taskChannel = supabase
      .channel('dashboard-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTaskStats();
      })
      .subscribe();

    // Subscribe to balance changes
    const profileChannel = supabase
      .channel('dashboard-profile')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `email=eq.${userEmail}` }, () => {
        fetchUserBalance();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(taskChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [userEmail]);

  const fetchUserBalance = async () => {
    if (!userEmail) return;
    const { data } = await supabase
      .from('profiles')
      .select('balance')
      .eq('email', userEmail)
      .single();
    if (data) setBalance(data.balance || 0);
  };

  const fetchTaskStats = async () => {
    if (!userEmail) return;

    // Fetch all tasks for this user or available to everyone
    const { data: allTasks, error } = await supabase
      .from('tasks')
      .select('status, claimed_by, assigned_to')
      .eq('is_hidden', false);

    if (error) {
      console.error('Error fetching task stats:', error);
    } else {
      const available = allTasks.filter(t => t.status === 'available' && (t.assigned_to === 'All' || t.assigned_to === userEmail)).length;
      const active = allTasks.filter(t => t.status === 'claimed' && t.claimed_by === userEmail).length;
      const completed = allTasks.filter(t => t.status === 'verified' && t.claimed_by === userEmail).length;

      setTaskCounts({ active, available, completed });
      
      // Also fetch the actual tasks for the list (Available only)
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, task_id_display, tier, title, reward, deadline')
        .eq('is_hidden', false)
        .eq('status', 'available')
        .or(`assigned_to.eq.All,assigned_to.eq.${userEmail}`)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (tasksData) setRecentTasks(tasksData);
    }
  };

  const stats = [
    { label: 'Total Earnings', value: `$${balance.toFixed(2)}`, icon: <CreditCard size={20} />, color: 'text-blue-500' },
    { label: 'Active Tasks', value: taskCounts.active.toString(), icon: <Activity size={20} />, color: 'text-emerald-500' },
    { label: 'Completed', value: taskCounts.completed.toString(), icon: <Zap size={20} />, color: 'text-orange-500' },
    { label: 'Available', value: taskCounts.available.toString(), icon: <Layers size={20} />, color: 'text-purple-500' },
  ];

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
          <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h1>
          <p className="text-gray-500 text-sm">Welcome back. Here is what's happening today.</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl hover:border-white/10 transition-all group">
              <div className={`w-10 h-10 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-4 ${stat.color} group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
              <p className="text-gray-500 text-sm font-medium mb-1">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white/[0.02] border border-white/5 rounded-3xl p-4 sm:p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold">Available Tasks</h2>
                <button 
                  onClick={() => navigate('/tasks')}
                  className="text-xs font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1 group"
                >
                  View All <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              
              <div className="space-y-4">
                {recentTasks.length > 0 ? (
                  recentTasks.map((task) => (
                    <div 
                      key={task.id}
                      onClick={() => navigate(`/task/${task.id}`)}
                      className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-between group cursor-pointer hover:border-blue-500/30 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                          task.tier === 'Tier 3' ? 'bg-red-500/10 text-red-500' :
                          task.tier === 'Tier 2' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-emerald-500/10 text-emerald-500'
                        }`}>
                          <Shield size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black text-blue-500">{task.task_id_display}</span>
                            <h3 className="text-sm font-bold text-white">{task.title}</h3>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">{task.tier}</span>
                            <div className="w-1 h-1 bg-gray-800 rounded-full"></div>
                            <div className="flex items-center gap-1 text-[10px] text-gray-600">
                              <Clock size={10} />
                              {new Date(task.deadline).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-white">${task.reward}</p>
                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Available</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-2xl">
                    <div className="w-12 h-12 bg-white/[0.02] rounded-full flex items-center justify-center mb-4">
                      <Activity size={24} className="text-gray-600" />
                    </div>
                    <p className="text-gray-500 text-sm">No tasks available yet.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-8">
            <section className="bg-blue-600 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden group">
              <div className="relative z-10">
                <h3 className="text-lg font-bold mb-2">Premium Access</h3>
                <p className="text-blue-100 text-sm mb-6 leading-relaxed">Unlock high-priority tasks and faster payouts today.</p>
                <button 
                  onClick={() => showAlert('Premium features are currently invite-only.', 'info')}
                  className="w-full py-3 bg-white text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors"
                >
                  Upgrade Now
                </button>
              </div>
              <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
            </section>
          </aside>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
