import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Wallet, ArrowUpRight, History, CreditCard, Inbox, Check, X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CustomAlert {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

const WithdrawEarnings = () => {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const userEmail = localStorage.getItem('user_email') || '';

  // Custom Alert State
  const [activeAlert, setActiveAlert] = useState<CustomAlert>({ show: false, message: '', type: 'info' });

  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setActiveAlert({ show: true, message, type });
    setTimeout(() => setActiveAlert(prev => ({ ...prev, show: false })), 2000);
  };

  useEffect(() => {
    if (userEmail) {
      fetchBalance();
    }
  }, [userEmail]);

  const fetchBalance = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('balance')
      .eq('email', userEmail)
      .single();
    
    if (data) setBalance(data.balance || 0);
    setLoading(false);
  };

  const history: any[] = []; // Empty data

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
          <h1 className="text-3xl font-bold tracking-tight mb-2">Earnings</h1>
          <p className="text-gray-500 text-sm">Manage your payouts and withdrawal history.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2 bg-blue-600 rounded-3xl p-8 text-white flex flex-col justify-between relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Wallet size={24} />
                </div>
                <button 
                  onClick={() => showAlert('Transaction history is already up to date.', 'info')}
                  className="text-sm font-bold bg-white/10 px-4 py-2 rounded-xl hover:bg-white/20 transition-all"
                >
                  Withdraw History
                </button>
              </div>
              <div>
                <p className="text-blue-100 text-sm font-medium mb-2">Available Balance</p>
                <p className="text-5xl font-bold mb-8">${balance.toFixed(2)}</p>
              </div>
              <button 
                onClick={() => showAlert('Insufficient balance for withdrawal.', 'error')}
                className="w-full sm:w-auto px-8 py-4 bg-white text-blue-600 rounded-2xl font-bold text-sm hover:shadow-xl hover:shadow-blue-900/40 transition-all flex items-center justify-center gap-2"
              >
                Withdraw Funds
                <ArrowUpRight size={18} />
              </button>
            </div>
            <div className="absolute bottom-[-20%] right-[-5%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <CreditCard size={20} className="text-blue-500" />
              Payout Methods
            </h3>
            <div className="space-y-4">
              <div className="p-4 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center py-10">
                <p className="text-gray-500 text-xs mb-4">No payout methods linked.</p>
                <button 
                  onClick={() => showAlert('Payment method setup is currently restricted.', 'info')}
                  className="text-blue-500 text-xs font-bold hover:underline"
                >
                  + Add Method
                </button>
              </div>
            </div>
          </div>
        </div>

        <section className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
          <div className="p-8 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <History size={20} className="text-gray-500" />
              Transaction History
            </h2>
            <select className="bg-transparent text-sm text-gray-500 focus:outline-none">
              <option>Last 30 days</option>
            </select>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-5 px-8">Transaction ID</th>
                  <th className="py-5 px-8">Date</th>
                  <th className="py-5 px-8">Method</th>
                  <th className="py-5 px-8 text-right">Amount</th>
                  <th className="py-5 px-8 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.length > 0 ? (
                  history.map((item, index) => (
                    <tr key={index} className="border-b border-white/5 text-sm hover:bg-white/[0.01] transition-colors">
                      {/* Rows would go here */}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-32 px-8">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-white/[0.03] rounded-full flex items-center justify-center mb-6">
                          <Inbox size={32} className="text-gray-600" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">No transactions</h3>
                        <p className="text-gray-500 text-sm max-w-xs">Your transaction history will appear here once you make your first withdrawal.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default WithdrawEarnings;
