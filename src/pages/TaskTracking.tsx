import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Search, Filter, Inbox, ExternalLink, DollarSign, Clock, Check, AlertCircle, X, Shield } from 'lucide-react';
import { supabase, getCookie } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface Task {
  id: string;
  task_id_display: string;
  tier: string;
  title: string;
  category: string;
  reward: string;
  deadline: string;
  reddit_url: string;
  instructions: string;
  assigned_to: string;
  status: string;
  claimed_by: string;
  is_hidden: boolean;
  created_at: string;
}

interface CustomAlert {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

const TaskTracking = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All Tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom Alert State
  const [activeAlert, setActiveAlert] = useState<CustomAlert>({ show: false, message: '', type: 'info' });

  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setActiveAlert({ show: true, message, type });
    setTimeout(() => setActiveAlert(prev => ({ ...prev, show: false })), 2000);
  };

  const tabs = ['All Tasks', 'Active', 'Pending', 'Completed'];

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    const userEmail = getCookie('user_email') || localStorage.getItem('user_email') || 'Guest';
    
    // Fetch tasks that are:
    // 1. Not hidden AND
    // 2. Either public (assigned_to = 'All') OR assigned to the current user
    // 3. AND (available OR claimed/submitted/verified by the current user)
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('is_hidden', false)
      .or(`assigned_to.eq.All,assigned_to.eq.${userEmail}`)
      .or(`status.eq.available,claimed_by.eq.${userEmail}`)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching tasks:', error);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  };

  const filteredTasks = tasks.filter(task => {
    const userEmail = getCookie('user_email') || localStorage.getItem('user_email') || 'Guest';
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         task.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // Privacy check: Only show the task if it's public or assigned to the current user
    const isTaskVisible = task.assigned_to === 'All' || task.assigned_to === userEmail;
    if (!isTaskVisible) return false;

    if (activeTab === 'All Tasks') {
      // Show available tasks + tasks claimed/submitted/verified by THIS user
      return task.status === 'available' || task.claimed_by === userEmail;
    }
    if (activeTab === 'Active') {
      return task.status === 'claimed' && task.claimed_by === userEmail;
    }
    if (activeTab === 'Pending') {
      return task.status === 'submitted' && task.claimed_by === userEmail;
    }
    if (activeTab === 'Completed') {
      return task.status === 'verified' && task.claimed_by === userEmail;
    }
    return true;
  });

  return (
    <Layout>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
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
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Tasks</h1>
            <p className="text-gray-500 text-sm">Manage and track your assigned tasks.</p>
          </div>
        </header>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
          <div className="flex flex-wrap bg-white/[0.03] border border-white/5 p-1 rounded-xl">
            {tabs.map((tab, index) => (
              <button
                key={index}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  activeTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-white/[0.03] border border-white/5 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-5 px-8">ID</th>
                  <th className="py-5 px-8">Task Name</th>
                  <th className="py-5 px-8">Category</th>
                  <th className="py-5 px-8 text-right">Reward</th>
                  <th className="py-5 px-8 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-500 text-sm">Loading tasks...</p>
                    </td>
                  </tr>
                ) : filteredTasks.length > 0 ? (
                  filteredTasks.map((task) => (
                    <tr key={task.id} className="border-b border-white/5 text-sm hover:bg-white/[0.01] transition-colors group">
                      <td className="py-5 px-8">
                        <span className="text-[10px] font-black text-blue-500">{task.task_id_display || '#000000'}</span>
                      </td>
                      <td className="py-5 px-8">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            task.status === 'verified' ? 'bg-emerald-500 text-white' :
                            task.status === 'submitted' ? 'bg-amber-500 text-white' :
                            task.tier === 'Tier 3' ? 'bg-red-500/10 text-red-500' :
                            task.tier === 'Tier 2' ? 'bg-amber-500/10 text-amber-500' :
                            'bg-emerald-500/10 text-emerald-500'
                          }`}>
                            {task.status === 'verified' ? <Check size={14} strokeWidth={3} /> :
                             task.status === 'submitted' ? <AlertCircle size={14} strokeWidth={3} /> :
                             <Shield size={14} />}
                          </div>
                          <div>
                            <div className="font-bold text-white">{task.title}</div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5 uppercase tracking-widest font-black">
                              {task.tier || 'Tier 1'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-8">
                        <span className="bg-white/5 px-3 py-1 rounded-full text-[10px] font-bold text-gray-500 border border-white/5 uppercase">
                          {task.category}
                        </span>
                      </td>
                      <td className="py-5 px-8 font-black text-white text-right">
                        ${task.reward}
                      </td>
                      <td className="py-5 px-8 text-right">
                        {task.status === 'verified' ? (
                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                            Completed
                          </span>
                        ) : task.status === 'submitted' ? (
                          <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                            Pending
                          </span>
                        ) : (
                          <button 
                            onClick={() => navigate(`/task/${task.id}`)}
                            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                          >
                            {task.status === 'claimed' ? 'Continue' : 'Claim'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-32 px-8">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-white/[0.03] rounded-full flex items-center justify-center mb-6">
                          <Inbox size={32} className="text-gray-600" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">No tasks found</h3>
                        <p className="text-gray-500 text-sm max-w-xs">You don't have any tasks assigned at the moment. Check back later for new opportunities.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </div>
    </Layout>
  );
};

export default TaskTracking;
