import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { ArrowLeft, MessageSquare, Shield, Clock, AlertCircle, CheckCircle2, Link2, ExternalLink, Send, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Task {
  id: string;
  task_id_display: string;
  tier: string;
  subreddit: string;
  title: string;
  category: string;
  reward: string;
  reddit_url: string;
  instructions: string;
  status: string;
  claimed_by: string;
}

interface CustomAlert {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

const TaskDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [redditUsername, setRedditUsername] = useState('');
  
  // Submission fields
  const [mainLink, setMainLink] = useState('');
  const [randomComments, setRandomComments] = useState(['', '', '', '', '']);
  
  const [activeAlert, setActiveAlert] = useState<CustomAlert>({ show: false, message: '', type: 'info' });

  // Report State
  const [reportMessage, setReportMessage] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  // Confirmation State
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setActiveAlert({ show: true, message, type });
    setTimeout(() => setActiveAlert(prev => ({ ...prev, show: false })), 2000);
  };

  useEffect(() => {
    fetchTask();
    fetchUserProfile();
  }, [id]);

  const fetchTask = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();
    
    if (data) setTask(data);
    setLoading(false);
  };

  const fetchUserProfile = async () => {
    const email = localStorage.getItem('user_email');
    if (!email) return;
    const { data } = await supabase
      .from('profiles')
      .select('reddit_username')
      .eq('email', email)
      .single();
    if (data) setRedditUsername(data.reddit_username);
  };

  const handleClaim = async () => {
    const email = localStorage.getItem('user_email');
    if (!email) return;

    setSubmitting(true);
    const { error } = await supabase
      .from('tasks')
      .update({ 
        status: 'claimed', 
        claimed_by: email 
      })
      .eq('id', id)
      .eq('status', 'available');

    if (error) {
      showAlert('Error claiming task: ' + error.message, 'error');
    } else {
      showAlert('Task claimed! You can now start working.', 'success');
      fetchTask();
    }
    setSubmitting(false);
  };

  const validateSubreddit = (url: string, targetSub: string) => {
    const lowerUrl = url.toLowerCase().trim();
    
    // 1. Must be a valid reddit URL format
    const isRedditUrl = lowerUrl.includes('reddit.com/r/') || lowerUrl.startsWith('r/');
    if (!isRedditUrl) return false;

    // 2. If admin specified a subreddit, it MUST be present in the link
    if (targetSub) {
      const subPattern = `/r/${targetSub.toLowerCase()}`;
      return lowerUrl.includes(subPattern);
    }
    
    return true;
  };

  const handleReport = async () => {
    if (!reportMessage.trim()) return;
    
    setIsReporting(true);
    const email = localStorage.getItem('user_email');
    
    const { error } = await supabase
      .from('admin_alerts') // Using same table but maybe we should have a 'reports' table. 
      // For now, let's assume admins check admin_alerts for user feedback too, or use a dedicated column.
      // Re-using admin_alerts but tagging it as a report
      .insert([{ 
        user_email: 'ADMIN_REPORT', 
        message: `FROM: ${email} | TASK: ${task?.task_id_display} | PROBLEM: ${reportMessage}` 
      }]);

    if (error) {
      showAlert('Error sending report: ' + error.message, 'error');
    } else {
      showAlert('Report sent to admins. We will look into it.', 'success');
      setReportMessage('');
    }
    setIsReporting(false);
  };

  const handleSubmit = async () => {
    if (!mainLink) {
      showAlert('Please enter the main task link.', 'error');
      return;
    }

    if (!validateSubreddit(mainLink, task?.subreddit || '')) {
      if (!mainLink.toLowerCase().includes('reddit.com/r/')) {
        showAlert('Please enter a valid Reddit link (e.g., https://reddit.com/r/...)', 'error');
      } else {
        showAlert(`This task requires a link specifically from r/${task?.subreddit}.`, 'error');
      }
      return;
    }

    if (task?.tier?.includes('Tier 3')) {
      const allCommentsFilled = randomComments.every(c => c && c.trim() !== '');
      if (!allCommentsFilled) {
        showAlert('Tier 3 tasks require all 5 random comment links to be filled.', 'error');
        return;
      }
      
      const uniqueLinks = new Set(randomComments.filter(c => c.trim() !== ''));
      if (uniqueLinks.size !== 5) {
        showAlert('All 5 random comment links must be unique.', 'error');
        return;
      }
    }

    setShowConfirmModal(true);
  };

  const proceedWithSubmit = async () => {
    setSubmitting(true);
    setShowConfirmModal(false);
    
    const email = localStorage.getItem('user_email');
    if (!email) {
      showAlert('Session expired. Please log in again.', 'error');
      setSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'submitted',
          submission_data: {
            main_link: mainLink.trim(),
            random_comments: randomComments.map(c => c.trim()).filter(c => c !== ''),
            submitted_at: new Date().toISOString()
          }
        })
        .eq('id', id)
        .eq('claimed_by', email); // Extra safety: ensure the user submitting is the one who claimed it

      if (error) {
        console.error('Submission error:', error);
        showAlert('Error submitting task: ' + error.message, 'error');
      } else {
        showAlert('Task submitted successfully! Awaiting verification.', 'success');
        fetchTask();
      }
    } catch (err) {
      console.error('Unexpected submission error:', err);
      showAlert('An unexpected error occurred during submission.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-blue-500 font-bold">Loading Task...</div>;
  if (!task) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-bold">Task not found.</div>;

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
              {activeAlert.type === 'success' ? <CheckCircle2 size={24} strokeWidth={3} /> : 
               activeAlert.type === 'error' ? <X size={24} strokeWidth={3} /> : <AlertCircle size={24} strokeWidth={3} />}
            </div>
            <span className="font-bold text-base tracking-tight leading-tight">{activeAlert.message}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <button 
          onClick={() => navigate('/tasks')}
          className="flex items-center gap-2 text-gray-500 hover:text-white transition-all mb-8 group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold text-sm">Back to Tasks</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-400">
              <MessageSquare size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">{task.category || 'Reddit Task'}</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic flex items-center gap-4">
              Task {task.task_id_display}
              <span className={`text-xs not-italic font-black px-3 py-1 rounded-lg ${
                task.tier === 'Tier 3' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                task.tier === 'Tier 2' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              }`}>{task.tier}</span>
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/5 rounded-xl">
                <div className="w-5 h-5 bg-[#FF4500] rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.051l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.945 0 1.712.767 1.712 1.712 0 .593-.306 1.11-.764 1.398.032.183.051.369.051.563 0 2.315-2.72 4.192-6.075 4.192-3.354 0-6.074-1.877-6.074-4.192 0-.194.02-.38.051-.563a1.712 1.712 0 0 1-1.114-2.622c.307-.31.73-.491 1.207-.491.478 0 .901.182 1.207.491 1.194-.856 2.85-1.419 4.674-1.488l.82-3.818a.312.312 0 0 1 .37-.243l2.672.567c.058-.051.126-.093.197-.122zm-6.11 7.115c-.631 0-1.145.513-1.145 1.145s.514 1.145 1.145 1.145c.632 0 1.145-.513 1.145-1.145s-.513-1.145-1.145-1.145zm4.22 0c-.632 0-1.145.513-1.145 1.145s.513 1.145 1.145 1.145c.631 0 1.145-.513 1.145-1.145s-.514-1.145-1.145-1.145zm-4.22 3.183c-.11 0-.213.044-.29.121-.423.422-1.328.462-1.62.462a.41.31 0 1 0 0 .82c.728 0 1.938-.11 2.546-.718a.41.41 0 0 0-.636-.585zm4.22 0c-.11 0-.213.044-.29.121-.423.422-1.328.462-1.62.462a.41.31 0 1 0 0 .82c.728 0 1.938-.11 2.546-.718a.41.41 0 0 0-.636-.585z"/>
                  </svg>
                </div>
                <span className="text-xs font-bold text-white">u/{redditUsername || 'Account'}</span>
                <span className="text-gray-600 text-[10px]">•</span>
                <span className="text-[10px] text-gray-500 font-bold">Task accepted with this account</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-gray-500">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Clock size={14} />
                Average completion time: ~3 minutes
              </div>
            </div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-8 py-4 rounded-2xl flex flex-col items-center">
            <span className="text-3xl font-black text-emerald-500">${task.reward}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60 mt-1">Reward</span>
          </div>
        </div>

        {/* Warning Box */}
        <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-3xl flex gap-4 items-start mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-10 h-10 bg-red-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-red-500/20">
            <AlertCircle className="text-red-500" size={24} />
          </div>
          <div>
            <h3 className="font-black text-red-500 text-sm uppercase tracking-wider mb-1">Important Warning</h3>
            <p className="text-sm leading-relaxed text-gray-400">
              Deleting your post/comment after receiving payment will result in a <span className="text-red-500 font-bold">permanent ban</span> from the platform. Keep your submissions live to maintain eligibility.
            </p>
          </div>
        </div>

        {/* Dashboard Status */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl">
            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-2">Earned</span>
            <span className="text-2xl font-black text-white">$0.00</span>
          </div>
          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl">
            <span className="text-[10px] font-black text-orange-500/60 uppercase tracking-widest block mb-2">Pending</span>
            <span className="text-2xl font-black text-orange-500">${task.reward}</span>
          </div>
        </div>

        {/* Status Box */}
        {task.status === 'claimed' && (
          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl flex items-center gap-4 mb-12 animate-in fade-in zoom-in">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-500/20">
              <CheckCircle2 className="text-emerald-500" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white text-sm">Task Claimed</h3>
              <p className="text-xs text-gray-500">You've claimed this task. Complete it to earn your reward.</p>
            </div>
          </div>
        )}

        {task.status === 'submitted' && (
          <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-3xl flex items-center gap-4 mb-12 animate-in fade-in zoom-in">
            <div className="w-10 h-10 bg-amber-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-amber-500/20">
              <AlertCircle className="text-amber-500" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-amber-500 text-sm">Pending Verification</h3>
              <p className="text-xs text-gray-500">Your submission is being reviewed by admins.</p>
            </div>
          </div>
        )}

        {task.status === 'verified' && (
          <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl flex items-center gap-4 mb-12 animate-in fade-in zoom-in">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-500/20">
              <CheckCircle2 className="text-emerald-500" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-emerald-500 text-sm">Task Completed</h3>
              <p className="text-xs text-gray-500">Reward has been added to your wallet.</p>
            </div>
          </div>
        )}

        {task.status === 'available' && (
          <div className="mb-12">
            <button 
              onClick={handleClaim}
              disabled={submitting}
              className="w-full py-5 bg-blue-600 text-white rounded-[32px] font-black text-lg hover:bg-blue-700 transition-all shadow-2xl shadow-blue-600/40 flex items-center justify-center gap-3 group disabled:opacity-50"
            >
              {submitting ? 'Claiming...' : 'Claim This Task'}
              {!submitting && <ArrowLeft size={20} className="rotate-180 group-hover:translate-x-1 transition-transform" />}
            </button>
            <p className="text-center text-gray-600 text-[10px] mt-4 uppercase font-bold tracking-widest">Only one person can claim this task at a time.</p>
          </div>
        )}

        {/* Instructions & Form Section */}
        {(task.status === 'claimed' || task.status === 'submitted' || task.status === 'verified') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
            <div className="lg:col-span-2 space-y-8">
              <h2 className="text-xl font-black uppercase italic tracking-tighter">Instructions</h2>
              
              <div className="space-y-6">
                <div className="flex gap-6 items-start group">
                  <div className="w-10 h-10 bg-emerald-500 text-black font-black flex items-center justify-center rounded-xl shrink-0 text-xl shadow-lg shadow-emerald-500/20">1</div>
                  <div className="pt-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-black text-blue-500 uppercase tracking-widest">Step 1</span>
                      <div className="h-[1px] w-12 bg-white/10"></div>
                      <span className="text-xs font-bold text-gray-500 flex items-center gap-2 italic">
                        <Shield size={12} /> r/{task.subreddit || 'Reddit'}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Join the Subreddit First</h3>
                    <p className="text-sm text-gray-500 mb-4 max-w-lg">Go to the target subreddit and make sure you are joined before participating.</p>
                    <a 
                      href={task.reddit_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF4500] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#ff5722] transition-all shadow-lg shadow-[#FF4500]/20"
                    >
                      Go to Subreddit <ExternalLink size={14} />
                    </a>
                  </div>
                </div>

                <div className="flex gap-6 items-start group">
                  <div className="w-10 h-10 bg-blue-600 text-white font-black flex items-center justify-center rounded-xl shrink-0 text-xl shadow-lg shadow-blue-600/20">2</div>
                  <div className="pt-1 w-full">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-black text-blue-500 uppercase tracking-widest">Step 2</span>
                      <div className="h-[1px] w-12 bg-white/10"></div>
                      <span className="text-xs font-bold text-gray-500 italic">Participation</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Complete the Task</h3>
                    <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl text-sm text-gray-400 leading-relaxed mb-6 whitespace-pre-line max-w-lg">
                      {task.instructions}
                    </div>
                    
                    {/* Task Submission Form */}
                    <div className="space-y-6 max-w-lg">
                      <div>
                        <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3 ml-1">Main Task Submission Link</label>
                        <div className="relative group">
                          <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-blue-500 transition-colors" size={16} />
                          <input 
                            type="url" 
                            placeholder="https://www.reddit.com/r/..."
                            value={mainLink}
                            onChange={(e) => setMainLink(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-[#0a0a0a] border border-white/5 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-sm outline-none shadow-inner"
                          />
                        </div>
                      </div>

                      {task.tier === 'Tier 3' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3 ml-1">Random Comments (Must be unique subreddits)</label>
                          {randomComments.map((link, idx) => (
                            <div key={idx} className="relative group">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-700 group-focus-within:text-blue-500 transition-colors w-4">{idx + 1}</div>
                              <input 
                                type="url" 
                                placeholder={`Random comment link ${idx + 1}...`}
                                value={link}
                                onChange={(e) => {
                                  const newLinks = [...randomComments];
                                  newLinks[idx] = e.target.value;
                                  setRandomComments(newLinks);
                                }}
                                className="w-full pl-12 pr-4 py-3.5 bg-[#0a0a0a] border border-white/5 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-xs outline-none shadow-inner"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="pt-4">
                        <div className="flex items-center gap-3 p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl mb-4">
                          <AlertCircle size={16} className="text-orange-500 shrink-0" />
                          <p className="text-[10px] font-bold text-orange-500/80 uppercase tracking-wider">Please double check before submitting the link</p>
                        </div>
                        {task.status === 'claimed' ? (
                          <button 
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 group disabled:opacity-50"
                          >
                            {submitting ? 'Submitting...' : (
                              <>
                                Submit Completed Task
                                <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl text-center">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                              Submission Locked ({task.status.toUpperCase()})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar: Report Section */}
            <div className="lg:col-span-1">
              <div className="sticky top-28 space-y-6">
                <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[32px] animate-in fade-in slide-in-from-right-4 duration-700">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
                      <AlertCircle className="text-red-500" size={24} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-white">Report Problem</h3>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Contact Administration</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500 leading-relaxed italic">
                      Disclaimer: Reporting fake issues or spamming this box will lead to a temporary account suspension.
                    </p>
                    <textarea 
                      rows={4}
                      placeholder="Note down your problem here..."
                      value={reportMessage}
                      onChange={(e) => setReportMessage(e.target.value)}
                      className="w-full px-5 py-4 bg-black/40 border border-white/5 rounded-2xl focus:outline-none focus:border-red-500/50 transition-all text-xs placeholder:text-gray-600 resize-none outline-none"
                    ></textarea>
                    <button 
                      onClick={handleReport}
                      disabled={!reportMessage.trim() || isReporting}
                      className="w-full py-4 bg-white/[0.03] border border-white/10 text-gray-400 rounded-2xl font-bold text-xs hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                    >
                      {isReporting ? 'Sending...' : 'Send Report'}
                      {!isReporting && <Send size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />}
                    </button>
                  </div>
                </div>

                <div className="p-6 bg-blue-600/5 border border-blue-600/10 rounded-[32px] text-center">
                  <p className="text-[10px] font-black text-blue-500/60 uppercase tracking-[0.2em] mb-2">Need Live Support?</p>
                  <a href="https://discord.gg/ND296AgTyc" target="_blank" rel="noreferrer" className="text-xs font-bold text-white hover:text-blue-400 transition-colors">Join our Discord Community</a>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  
    {/* Submission Confirmation Modal */}
    {showConfirmModal && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[40px] p-8 sm:p-10 shadow-2xl animate-in zoom-in duration-300">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20">
              <Shield className="text-blue-500" size={32} />
            </div>
            <h2 className="text-2xl font-black tracking-tight mb-2 uppercase italic">Confirm Submission</h2>
            <p className="text-gray-500 text-sm">Do you want to proceed with the task submission? This action cannot be undone.</p>
          </div>
  
          <div className="flex gap-4">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="flex-1 py-4 bg-white/[0.03] border border-white/10 text-gray-400 rounded-2xl font-bold text-sm hover:text-white hover:bg-white/5 transition-all"
            >
              No, Back
            </button>
            <button
              onClick={proceedWithSubmit}
              className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
            >
              Yes, Submit
            </button>
          </div>
        </div>
      </div>
    )}
  </Layout>
  );
};

export default TaskDetails;
