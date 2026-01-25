import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Wallet, ArrowUpRight, History, CreditCard, Inbox, Check, X, AlertCircle, Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase, getCookie } from '../lib/supabase';

interface CustomAlert {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface PayoutMethod {
  id: string;
  type: 'binance' | 'usdt' | 'upi';
  value: string;
  label: string;
}

const PAYMENT_ICONS = {
  binance: 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png',
  usdt: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
  upi: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/UPI-Logo-vector.svg/1200px-UPI-Logo-vector.svg.png'
};

const PAYMENT_LABELS = {
  binance: 'Binance ID',
  usdt: 'USDT Wallet',
  upi: 'UPI ID'
};

const WithdrawEarnings = () => {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const userEmail = localStorage.getItem('user_email') || getCookie('user_email') || '';
  
  // Payout Methods State
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<'binance' | 'usdt' | 'upi' | null>(null);
  const [methodValue, setMethodValue] = useState('');
  const [editingMethod, setEditingMethod] = useState<PayoutMethod | null>(null);
  const [deletingMethod, setDeletingMethod] = useState<PayoutMethod | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [selectedWithdrawMethodId, setSelectedWithdrawMethodId] = useState<string | null>(null);
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([]);

  // Custom Alert State
  const [activeAlert, setActiveAlert] = useState<CustomAlert>({ show: false, message: '', type: 'info' });

  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setActiveAlert({ show: true, message, type });
    setTimeout(() => setActiveAlert(prev => ({ ...prev, show: false })), 2000);
  };

  useEffect(() => {
    if (userEmail) {
      fetchBalance();
      fetchPayoutMethods();
      fetchWithdrawalHistory();
    }
  }, [userEmail]);

  const fetchWithdrawalHistory = async () => {
    const { data } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false });
    
    if (data) setWithdrawalHistory(data);
  };

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

  const fetchPayoutMethods = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('payout_methods')
      .eq('email', userEmail)
      .single();
    
    if (data?.payout_methods) {
      const methods = data.payout_methods;
      setPayoutMethods(methods);
      if (methods.length > 0) {
        setSelectedWithdrawMethodId(methods[0].id);
      }
    }
  };

  const handleWithdraw = async () => {
    if (payoutMethods.length === 0) {
      showAlert('Please add a payout method first.', 'error');
      return;
    }
    
    if (balance < 1) {
      showAlert('Minimum withdrawal amount is $1.00', 'error');
      return;
    }

    const selectedMethod = payoutMethods.find(m => m.id === selectedWithdrawMethodId);
    if (!selectedMethod) {
      showAlert('Please select a payout method.', 'error');
      return;
    }

    setIsWithdrawing(true);

    try {
      // Generate unique transaction ID
      const transaction_id = `#TXN${Math.floor(100000 + Math.random() * 900000)}`;

      // 1. Create withdrawal request
      const { error: requestError } = await supabase
        .from('withdrawal_requests')
        .insert({
          transaction_id,
          user_email: userEmail,
          amount: balance,
          payout_method: selectedMethod,
          status: 'pending'
        });

      if (requestError) throw requestError;

      // 2. Reset user balance
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: 0 })
        .eq('email', userEmail);

      if (balanceError) throw balanceError;

      showAlert('Withdrawal request submitted! Transaction ID: ' + transaction_id, 'success');
      setBalance(0);
      fetchWithdrawalHistory();
    } catch (err: any) {
      showAlert('Error processing withdrawal: ' + err.message, 'error');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const savePayoutMethods = async (methods: PayoutMethod[]) => {
    const { error } = await supabase
      .from('profiles')
      .update({ payout_methods: methods })
      .eq('email', userEmail);
    
    if (error) {
      showAlert('Error saving payout method: ' + error.message, 'error');
      return false;
    }
    return true;
  };

  const handleAddMethod = async () => {
    if (!selectedType || !methodValue.trim()) return;
    
    setIsSaving(true);
    const newMethod: PayoutMethod = {
      id: Date.now().toString(),
      type: selectedType,
      value: methodValue.trim(),
      label: PAYMENT_LABELS[selectedType]
    };
    
    const updatedMethods = [...payoutMethods, newMethod];
    const success = await savePayoutMethods(updatedMethods);
    
    if (success) {
      setPayoutMethods(updatedMethods);
      showAlert('Payout method added successfully!', 'success');
      closeAddModal();
    }
    setIsSaving(false);
  };

  const handleEditMethod = async () => {
    if (!editingMethod || !methodValue.trim()) return;
    
    setIsSaving(true);
    const updatedMethods = payoutMethods.map(m => 
      m.id === editingMethod.id ? { ...m, value: methodValue.trim() } : m
    );
    
    const success = await savePayoutMethods(updatedMethods);
    if (success) {
      setPayoutMethods(updatedMethods);
      showAlert('Payout method updated!', 'success');
      closeEditModal();
    }
    setIsSaving(false);
  };

  const handleDeleteMethod = async () => {
    if (!deletingMethod) return;
    
    setIsSaving(true);
    const updatedMethods = payoutMethods.filter(m => m.id !== deletingMethod.id);
    
    const success = await savePayoutMethods(updatedMethods);
    if (success) {
      setPayoutMethods(updatedMethods);
      showAlert('Payout method removed.', 'success');
      closeDeleteModal();
    }
    setIsSaving(false);
  };

  const openEditModal = (method: PayoutMethod) => {
    setEditingMethod(method);
    setMethodValue(method.value);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (method: PayoutMethod) => {
    setDeletingMethod(method);
    setIsDeleteModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setSelectedType(null);
    setMethodValue('');
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingMethod(null);
    setMethodValue('');
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingMethod(null);
  };

  const getPlaceholder = (type: string) => {
    switch(type) {
      case 'binance': return 'Enter your Binance ID (e.g. 123456789)';
      case 'usdt': return 'Enter your USDT wallet address (TRC20)';
      case 'upi': return 'Enter your UPI ID (e.g. name@upi)';
      default: return 'Enter value';
    }
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-12">
          <div className="lg:col-span-2 bg-blue-600 rounded-3xl p-6 sm:p-8 text-white flex flex-col justify-between relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Wallet size={20} className="sm:size-6" />
                </div>
                <button 
                  onClick={() => showAlert('Transaction history is already up to date.', 'info')}
                  className="text-xs sm:text-sm font-bold bg-white/10 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl hover:bg-white/20 transition-all"
                >
                  History
                </button>
              </div>
              <div>
                <p className="text-blue-100 text-xs sm:text-sm font-medium mb-1 sm:mb-2">Available Balance</p>
                <p className="text-4xl sm:text-5xl font-bold mb-6 sm:mb-8">${balance.toFixed(2)}</p>
              </div>

              {payoutMethods.length > 0 && (
                <div className="mb-6 space-y-3">
                  <p className="text-blue-100 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Select Payout Method</p>
                  <div className="flex flex-wrap gap-2">
                    {payoutMethods.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setSelectedWithdrawMethodId(method.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border transition-all ${
                          selectedWithdrawMethodId === method.id
                            ? 'bg-white text-blue-600 border-white shadow-lg'
                            : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
                        }`}
                      >
                        <img src={PAYMENT_ICONS[method.type as keyof typeof PAYMENT_ICONS]} alt="" className="w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain" />
                        <span className="text-[10px] sm:text-xs font-bold">{method.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button 
                onClick={handleWithdraw}
                disabled={isWithdrawing || balance < 1 || payoutMethods.length === 0}
                className="w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 bg-white text-blue-600 rounded-2xl font-bold text-sm hover:shadow-xl hover:shadow-blue-900/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isWithdrawing ? 'Processing...' : 'Withdraw Funds'}
                <ArrowUpRight size={18} />
              </button>
            </div>
            <div className="absolute bottom-[-20%] right-[-5%] w-48 h-48 sm:w-64 sm:h-64 bg-white/10 rounded-full blur-3xl"></div>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 md:p-8">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <CreditCard size={20} className="text-blue-500" />
              Payout Methods
            </h3>
            
            <div className="space-y-3">
              {/* Existing Payment Methods */}
              {payoutMethods.map((method) => (
                <div key={method.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 p-2">
                      <img 
                        src={PAYMENT_ICONS[method.type]} 
                        alt={method.label}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">{method.label}</p>
                      <p className="text-sm font-bold text-white truncate">{method.value}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button 
                        onClick={() => openEditModal(method)}
                        className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => openDeleteModal(method)}
                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        title="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty State / Add Button */}
              {payoutMethods.length === 0 ? (
                <div className="p-4 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center py-10">
                  <p className="text-gray-500 text-xs mb-4">No payout methods linked.</p>
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="text-blue-500 text-xs font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Add Method
                  </button>
                </div>
              ) : (
                <>
                  {payoutMethods.length < 3 && (
                    <button 
                      onClick={() => setIsAddModalOpen(true)}
                      className="w-full p-4 border border-dashed border-white/10 rounded-2xl text-blue-500 text-xs font-bold hover:border-blue-500/30 hover:bg-blue-500/5 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={14} />
                      Add Another Payout Method
                    </button>
                  )}
                </>
              )}
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
                {withdrawalHistory.length > 0 ? (
                  withdrawalHistory.map((item, index) => (
                    <tr key={index} className="border-b border-white/5 text-sm hover:bg-white/[0.01] transition-colors">
                      <td className="py-5 px-8 font-mono text-xs text-blue-500">{item.transaction_id}</td>
                      <td className="py-5 px-8 text-gray-400">
                        {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-5 px-8">
                        <div className="flex items-center gap-2">
                          <img src={PAYMENT_ICONS[item.payout_method.type as keyof typeof PAYMENT_ICONS]} alt="" className="w-4 h-4 object-contain" />
                          <span className="text-xs text-gray-300">{item.payout_method.label}</span>
                        </div>
                      </td>
                      <td className="py-5 px-8 text-right font-bold text-white">
                        ${item.amount.toFixed(2)}
                      </td>
                      <td className="py-5 px-8 text-right">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${
                          item.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                          item.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                          'bg-amber-500/10 text-amber-500'
                        }`}>
                          {item.status}
                        </span>
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

      {/* Add Payment Method Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[32px] p-6 md:p-8 shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black tracking-tight uppercase">Add Payout Method</h2>
              <button onClick={closeAddModal} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>

            {!selectedType ? (
              <div className="space-y-3">
                <p className="text-gray-500 text-sm mb-4">Select a payout method:</p>
                
                {/* Binance Option */}
                <button
                  onClick={() => setSelectedType('binance')}
                  disabled={payoutMethods.some(m => m.type === 'binance')}
                  className="w-full p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-amber-500/30 hover:bg-amber-500/5 transition-all flex items-center gap-4 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-white/5 disabled:hover:bg-transparent"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2">
                    <img src={PAYMENT_ICONS.binance} alt="Binance" className="w-full h-full object-contain" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white">Binance ID</p>
                    <p className="text-xs text-gray-500">Pay via Binance Pay</p>
                  </div>
                  {payoutMethods.some(m => m.type === 'binance') && (
                    <span className="ml-auto text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">ADDED</span>
                  )}
                </button>

                {/* USDT Option */}
                <button
                  onClick={() => setSelectedType('usdt')}
                  disabled={payoutMethods.some(m => m.type === 'usdt')}
                  className="w-full p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all flex items-center gap-4 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-white/5 disabled:hover:bg-transparent"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2">
                    <img src={PAYMENT_ICONS.usdt} alt="USDT" className="w-full h-full object-contain" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white">USDT Wallet</p>
                    <p className="text-xs text-gray-500">TRC20 Network Address</p>
                  </div>
                  {payoutMethods.some(m => m.type === 'usdt') && (
                    <span className="ml-auto text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">ADDED</span>
                  )}
                </button>

                {/* UPI Option */}
                <button
                  onClick={() => setSelectedType('upi')}
                  disabled={payoutMethods.some(m => m.type === 'upi')}
                  className="w-full p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-purple-500/30 hover:bg-purple-500/5 transition-all flex items-center gap-4 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-white/5 disabled:hover:bg-transparent"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2">
                    <img src={PAYMENT_ICONS.upi} alt="UPI" className="w-full h-full object-contain" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white">UPI ID</p>
                    <p className="text-xs text-gray-500">Indian Payment Network</p>
                  </div>
                  {payoutMethods.some(m => m.type === 'upi') && (
                    <span className="ml-auto text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">ADDED</span>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-2">
                    <img src={PAYMENT_ICONS[selectedType]} alt={PAYMENT_LABELS[selectedType]} className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <p className="font-bold text-white">{PAYMENT_LABELS[selectedType]}</p>
                    <button onClick={() => setSelectedType(null)} className="text-xs text-blue-500 hover:underline">Change method</button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">
                    {PAYMENT_LABELS[selectedType]}
                  </label>
                  <input
                    type="text"
                    autoFocus
                    placeholder={getPlaceholder(selectedType)}
                    value={methodValue}
                    onChange={(e) => setMethodValue(e.target.value)}
                    className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-sm"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closeAddModal}
                    className="flex-1 py-4 bg-white/[0.03] border border-white/10 text-gray-400 rounded-2xl font-bold text-sm hover:text-white hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddMethod}
                    disabled={!methodValue.trim() || isSaving}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Saving...' : 'Add Method'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Payment Method Modal */}
      {isEditModalOpen && editingMethod && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[32px] p-6 md:p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black tracking-tight uppercase">Edit {editingMethod.label}</h2>
              <button onClick={closeEditModal} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-2">
                  <img src={PAYMENT_ICONS[editingMethod.type]} alt={editingMethod.label} className="w-full h-full object-contain" />
                </div>
                <p className="font-bold text-white">{editingMethod.label}</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">
                  {editingMethod.label}
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder={getPlaceholder(editingMethod.type)}
                  value={methodValue}
                  onChange={(e) => setMethodValue(e.target.value)}
                  className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={closeEditModal}
                  className="flex-1 py-4 bg-white/[0.03] border border-white/10 text-gray-400 rounded-2xl font-bold text-sm hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditMethod}
                  disabled={!methodValue.trim() || isSaving}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingMethod && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-[32px] p-6 md:p-8 shadow-2xl animate-in zoom-in duration-300 text-center">
            <div className="w-16 h-16 bg-red-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <Trash2 className="text-red-500" size={28} />
            </div>
            <h2 className="text-xl font-black tracking-tight mb-2">Remove Method?</h2>
            <p className="text-gray-500 text-sm mb-6">
              Are you sure you want to remove your <span className="text-white font-bold">{deletingMethod.label}</span>? This action cannot be undone.
            </p>
            
            <div className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl mb-6">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-2">
                <img src={PAYMENT_ICONS[deletingMethod.type]} alt={deletingMethod.label} className="w-full h-full object-contain" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-xs text-gray-500">{deletingMethod.label}</p>
                <p className="text-sm font-bold text-white truncate">{deletingMethod.value}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeDeleteModal}
                className="flex-1 py-4 bg-white/[0.03] border border-white/10 text-gray-400 rounded-2xl font-bold text-sm hover:text-white hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMethod}
                disabled={isSaving}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50"
              >
                {isSaving ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default WithdrawEarnings;
