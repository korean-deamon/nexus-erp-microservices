'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, Activity, 
  ArrowUpRight, Users, Settings, Search, Bell, 
  Plus, Zap, Globe, Database, ShieldCheck, Layers,
  CreditCard, TrendingUp, MoreHorizontal, LogOut, User, X,
  Clock, CheckCircle, AlertCircle, ShoppingBag, Info, Trash2, 
  PieChart, BarChart3, TrendingDown, ShieldAlert, Box, Wallet, Eye, EyeOff, Edit3, Truck, PackageCheck,
  DollarSign, BarChart, Menu, Minus, Sparkles
} from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';

export default function NexusApp() {
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<any>(null);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showVault, setShowVault] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [basket, setBasket] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeToast, setActiveToast] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [userFilter, setUserFilter] = useState<string | null>(null);

   const [paymentMethod, setPaymentMethod] = useState('CASH');
   const [itemForm, setItemForm] = useState({ name: '', price: '', quantity: '', sku: '' });

   useEffect(() => {
     if (showEditModal) {
       setItemForm({ 
         name: showEditModal.name, 
         price: showEditModal.price.toString(), 
         quantity: showEditModal.quantity.toString(), 
         sku: showEditModal.sku 
       });
     } else {
       setItemForm({ name: '', price: '', quantity: '', sku: '' });
     }
   }, [showEditModal]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  useEffect(() => {
    setMounted(true);
    
    // API manzilini sozlash
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    axios.defaults.baseURL = host === 'localhost' ? 'http://localhost:8080' : `http://${host}:8080`;

    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setIsLoggedIn(true);
      refreshData();
    }
  }, []);

  // Auto-logout timer (30 mins)
  useEffect(() => {
    if (isLoggedIn) {
      const expiryMs = parseInt(process.env.NEXT_PUBLIC_SESSION_EXPIRY_MS || '0') || 3 * 60 * 60 * 1000;
      const timer = setTimeout(() => {
        handleLogout();
        alert('Session expired. Please log in again.');
      }, expiryMs);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn]);

  // Socket Connection Effect
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (isLoggedIn && savedToken && savedUser) {
      const user = JSON.parse(savedUser);
      // Dinamik manzil: Agar sayt IP/localhost orqali ochilgan bo'lsa, o'sha manzilga ulanish
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      // Eng ishonchli avtomatik ulanish
      const socketUrl = host === 'localhost' ? 'http://localhost:8080' : `http://${host}:8080`;
      const socket = io(socketUrl, { path: '/socket.io/', transports: ['websocket', 'polling'] });
 
      socket.on('connect', () => {
        socket.emit('join', { userId: user.id, role: user.role });
      });
 
      socket.on('notification', (data) => {
        console.log('🔔 INCOMING:', data);
        
        // 1. Yangi buyurtma xabari - FAQAT ADMIN UCHUN
        if (data.type === 'ORDER_RECEIVED' && isAdmin) {
            fetchOrders();
            // Ovoz (Ding!)
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(e => console.log('Audio Blocked:', e));
            
            setActiveToast({ ...data, title: 'New Order', id: Date.now() });
            setTimeout(() => setActiveToast(null), 8000);
            return; // Admin uchun ish bitdi
        }

        // 2. Boshqa tizim xabarlari (Status o'zgarishi va h.k.) - USER va ADMIN uchun
        if (data.message && data.type !== 'ORDER_RECEIVED') {
            const newNotif = { ...data, id: Date.now(), read: false };
            setNotifications(prev => [newNotif, ...prev].slice(0, 20));
            
            // Foydalanuvchiga faqat o'ziga tegishli xabarlarni Toast qilib ko'rsatamiz
            setActiveToast(newNotif);
            setTimeout(() => setActiveToast(null), 5000);
            refreshData();
        } else if (data.type === 'REFRESH_ORDERS') {
            fetchOrders();
        } else if (data.type === 'REFRESH_USERS') {
            fetchUsers();
        } else if (data.type === 'REFRESH_INV') {
            fetchInventory();
        }
      });

      socket.on('disconnect', () => {});

      return () => { socket.disconnect(); };
    }
  }, [isLoggedIn]);

  const refreshData = () => {
    fetchInventory();
    fetchOrders();
    fetchBasket();
    if (localStorage.getItem('user') && JSON.parse(localStorage.getItem('user')!).role === 'ADMIN') {
        fetchUsers();
    }
  };

  const fetchInventory = async () => {
    const res = await axios.get('/api/v1/inventory');
    setInventory(res.data);
  };

  const fetchOrders = async () => {
    const token = localStorage.getItem('token');
    const res = await axios.get('/api/v1/orders', { headers: { Authorization: `Bearer ${token}` } });
    setOrders(res.data);
  };

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    try {
        const res = await axios.get('/api/v1/auth/users', { headers: { Authorization: `Bearer ${token}` } });
        setUsers(res.data);
    } catch (e) { console.error('User fetch denied'); }
  };

  const fetchBasket = async () => {
    const token = localStorage.getItem('token');
    const res = await axios.get('/api/v1/basket', { headers: { Authorization: `Bearer ${token}` } });
    setBasket(res.data);
  };

  const handleAddToBasket = async (item: any) => {
    try {
        const token = localStorage.getItem('token');
        await axios.post('/api/v1/basket', {
            productId: item.id,
            name: item.name,
            price: item.price
        }, { headers: { Authorization: `Bearer ${token}` } });
        
        // Jonli bildirishnoma qo'shamiz
        const newNotif = { message: `${item.name} added to Vault`, type: 'INFO', id: Date.now() };
        setActiveToast(newNotif);
        setTimeout(() => setActiveToast(null), 3000);
        
        await fetchBasket();
    } catch (err: any) {
        console.error('Vault Sync Failure:', err.response?.data || err.message);
        setActiveToast({ message: 'Sync Interrupted - Refreshing...', type: 'CAUTION', id: Date.now() });
        setTimeout(() => setActiveToast(null), 3000);
    }
  };

  const handleRemoveFromBasket = async (productId: string) => {
    try {
        const token = localStorage.getItem('token');
        await axios.post('/api/v1/basket/decrement', { productId }, { headers: { Authorization: `Bearer ${token}` } });
        fetchBasket();
    } catch (err: any) {
        console.error('Decrement Error');
    }
  };

   const handleCheckout = async () => {
     try {
         const token = localStorage.getItem('token');
         await axios.post('/api/v1/checkout', { paymentMethod }, { headers: { Authorization: `Bearer ${token}` } });
         setShowVault(false);
         refreshData();
     } catch (err: any) {
         alert(err.response?.data?.error || 'Checkout failed');
     }
   };

   const handleAddInventory = async (e: React.FormEvent) => {
     e.preventDefault();
     try {
       const token = localStorage.getItem('token');
       await axios.post('/api/v1/inventory', itemForm, { headers: { Authorization: `Bearer ${token}` } });
       setShowAddModal(false);
       refreshData();
       setActiveToast({ title: 'System Updated', message: 'New resource synchronized successfully.', type: 'SUCCESS', id: Date.now() });
     } catch (err: any) { alert('Access Denied'); }
   };

   const handleEditInventory = async (e: React.FormEvent) => {
     e.preventDefault();
     try {
       const token = localStorage.getItem('token');
       await axios.put(`/api/v1/inventory/${showEditModal.id}`, itemForm, { headers: { Authorization: `Bearer ${token}` } });
       setShowEditModal(null);
       refreshData();
       setActiveToast({ title: 'Protocol Updated', message: 'Resource parameters recalibrated.', type: 'SUCCESS', id: Date.now() });
     } catch (err: any) { alert('Update Failure'); }
   };

  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = isRegisterMode ? '/auth/register' : '/auth/login';
      const response = await axios.post(`/api/v1${endpoint}`, authForm);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      window.location.reload();
    } catch (err: any) { alert(err.response?.data?.error || 'Access Denied'); }
  };

  const groupOrders = (ordersList: any[]) => {
    const groups: any = {};
    ordersList.forEach(o => {
      const date = new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      if (!groups[date]) groups[date] = [];
      groups[date].push(o);
    });
    return groups;
  };

  const isAdmin = currentUser?.role === 'ADMIN';
  const myOrders = orders.filter(o => o.userId === currentUser?.id);

  const stats = useMemo(() => {
    const sourceOrders = isAdmin ? orders : orders.filter(o => o.userId === currentUser?.id);
    const totalRevenue = sourceOrders
      .filter(o => o.status === 'COMPLETED')
      .reduce((acc, curr) => acc + parseFloat(curr.totalAmount || 0), 0);
    const totalEvents = sourceOrders.length;
    const secondaryStat = isAdmin 
      ? inventory.filter(i => i.quantity <= 0).length 
      : sourceOrders.filter(o => o.status === 'PENDING' || o.status === 'SHIPPED').length;

    const statusCounts = sourceOrders.reduce((acc: any, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {});
    
    return { revenue: totalRevenue, events: totalEvents, secondary: secondaryStat, status: statusCounts };
  }, [orders, inventory, isAdmin, currentUser]);

  if (!mounted) return null;

  if (!isLoggedIn) return (
    <div className="min-h-screen bg-[#020203] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="mesh-bg opacity-30"></div>
      <div className="glass p-8 md:p-10 rounded-[2rem] w-full max-w-sm border border-white/10 space-y-8 animate-in fade-in zoom-in duration-500 relative z-10">
        <div className="text-center space-y-2">
          <Layers className="w-12 h-12 text-indigo-500 mx-auto animate-float" />
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Nexus<span className="text-indigo-500">.</span></h2>
        </div>
        <form className="space-y-4" onSubmit={handleAuth}>
          {isRegisterMode && <input required type="text" value={authForm.name} onChange={(e) => setAuthForm({...authForm, name: e.target.value})} placeholder="Full Name" className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-white outline-none focus:border-indigo-500/50 transition-all text-sm" />}
          <input required type="email" value={authForm.email} onChange={(e) => setAuthForm({...authForm, email: e.target.value})} placeholder="Email" className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-white outline-none focus:border-indigo-500/50 transition-all text-sm" />
          <input required type="password" value={authForm.password} onChange={(e) => setAuthForm({...authForm, password: e.target.value})} placeholder="Password" className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-white outline-none focus:border-indigo-500/50 transition-all text-sm" />
          <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Authorize</button>
          <button type="button" onClick={() => setIsRegisterMode(!isRegisterMode)} className="w-full text-center text-[9px] font-black uppercase text-zinc-500 hover:text-indigo-400">{isRegisterMode ? 'Login' : 'Create Identity'}</button>
        </form>
      </div>
    </div>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-amber-500';
      case 'SHIPPED': return 'text-indigo-400';
      case 'DELIVERED': return 'text-sky-400';
      case 'COMPLETED': return 'text-emerald-500';
      case 'CANCELLED': return 'text-rose-500';
      default: return 'text-zinc-500';
    }
  };

  const QuantitySelector = ({ item, basketItem }: { item: any, basketItem: any }) => (
    <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-lg border border-indigo-500/10">
      <button onClick={() => handleRemoveFromBasket(item.id)} className="p-1.5 text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-all active:scale-90"><Minus className="w-3 h-3" /></button>
      <span className="font-black text-white text-[10px] w-4 text-center">{basketItem.quantity}</span>
      <button onClick={() => handleAddToBasket(item)} className="p-1.5 text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-all active:scale-90"><Plus className="w-3 h-3" /></button>
    </div>
  );

  const tabs = [
    { id: 'dashboard', name: 'Board', icon: LayoutDashboard },
    { id: 'inventory', name: 'Items', icon: Package },
    { id: 'orders', name: 'Orders', icon: ShoppingBag, hideForAdmin: true },
    { id: 'admin', name: 'Control', icon: ShieldCheck, admin: true },
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#020203] text-zinc-200 font-sans relative overflow-hidden">
      <div className="mesh-bg"></div>
      
      <aside className="hidden lg:flex w-64 border-r border-white/5 p-6 h-screen sticky top-0 flex-col z-[100] glass-dark">
        <div className="flex items-center gap-3 mb-10 px-2">
          <Layers className="text-indigo-500 w-6 h-6" />
          <span className="font-black text-xl uppercase tracking-tighter">Nexus<span className="text-indigo-500">.</span></span>
        </div>
        <nav className="flex-1 space-y-1">
          {tabs.map(tab => (
            (!tab.admin || isAdmin) && (!tab.hideForAdmin || !isAdmin) && (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full p-3.5 rounded-2xl flex items-center gap-4 transition-all group relative ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-zinc-500 hover:bg-white/5 hover:text-white'}`}
              >
                <div className="relative">
                  <tab.icon className="w-4 h-4" />
                  {((tab.id === 'admin' && isAdmin) || (tab.id === 'orders' && !isAdmin)) && (
                    (() => {
                      // Faqat o'ziga tegishli buyurtmalar soni
                      const targetOrders = isAdmin ? orders : orders.filter(o => o.userId === currentUser?.id);
                      const count = targetOrders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length;
                      return count > 0 ? (
                        <span className="absolute -top-2 -right-2 bg-rose-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-lg shadow-rose-600/40">{count}</span>
                      ) : null;
                    })()
                  )}
                </div>
                <span className="font-black uppercase text-[10px] tracking-[0.2em]">{tab.name}</span>
              </button>
            )
          ))}
        </nav>
        <div className="mt-auto space-y-2">
            <button onClick={handleLogout} className="w-full p-3.5 text-rose-500/60 font-black uppercase text-[9px] tracking-widest flex items-center gap-3 hover:text-rose-500 transition-all"><LogOut className="w-4 h-4" /> Exit</button>
        </div>
      </aside>

      <header className="lg:hidden flex items-center justify-between p-4 border-b border-white/5 glass-dark sticky top-0 z-[100]">
        <div className="flex items-center gap-2">
          <Layers className="text-indigo-500 w-6 h-6" />
          <span className="font-black text-lg uppercase tracking-tighter">Nexus</span>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={() => setShowNotifDropdown(!showNotifDropdown)} className="relative p-2 bg-white/5 rounded-lg">
                <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-indigo-400' : 'text-zinc-600'}`} />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 rounded-full text-[8px] flex items-center justify-center font-black">{unreadCount}</span>}
            </button>
            {!isAdmin && (
                <button onClick={() => setShowVault(true)} className="relative p-2 bg-white/5 rounded-lg">
                    <CreditCard className="w-5 h-5 text-indigo-400" />
                    {basket.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full text-[8px] flex items-center justify-center font-black">{basket.length}</span>}
                </button>
            )}
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-[10px]">{currentUser?.name?.substring(0,2).toUpperCase()}</div>
        </div>
      </header>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass-dark border-t border-white/10 p-3 flex justify-around items-center z-[150] shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        {tabs.map(tab => (
            (!tab.admin || isAdmin) && (!tab.hideForAdmin || !isAdmin) && (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 transition-all relative ${activeTab === tab.id ? 'text-indigo-500 scale-110' : 'text-zinc-600 hover:text-zinc-400'}`}
              >
                <tab.icon className="w-5 h-5" />
                {((tab.id === 'admin' && isAdmin) || (tab.id === 'orders' && !isAdmin)) && (
                   (() => {
                     const targetOrders = isAdmin ? orders : orders.filter(o => o.userId === currentUser?.id);
                     const count = targetOrders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length;
                     return count > 0 ? (
                       <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-lg shadow-rose-600/40 animate-bounce">{count}</span>
                     ) : null;
                   })()
                )}
                <span className="text-[7px] font-black uppercase tracking-widest">{tab.name}</span>
              </button>
            )
        ))}
        <button onClick={handleLogout} className="flex flex-col items-center gap-1 p-2 text-rose-500/50">
            <LogOut className="w-5 h-5" />
            <span className="text-[7px] font-black uppercase tracking-tighter">Exit</span>
        </button>
      </nav>

      <main className="flex-1 p-4 md:p-8 pb-32 lg:pb-8 overflow-y-auto custom-scrollbar">
        <header className="hidden lg:flex justify-between items-end mb-8">
          <div>
             <h2 className="text-4xl font-black text-white uppercase tracking-tighter">{activeTab}</h2>
             <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500/70 mt-1">Operator: {currentUser?.name}</p>
          </div>
          <div className="flex items-center gap-6">
             {!isAdmin && (
                <button onClick={() => setShowVault(true)} className="relative p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                    <CreditCard className="w-5 h-5 text-indigo-400" />
                    {basket.length > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-indigo-600 rounded-full text-[9px] flex items-center justify-center font-black border-2 border-[#020203]">{basket.length}</span>}
                </button>
             )}
             <div className="relative">
                <button onClick={() => setShowNotifDropdown(!showNotifDropdown)} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                   <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-indigo-400' : 'text-zinc-600'}`} />
                </button>
                {showNotifDropdown && (
                  <div className="absolute top-16 right-0 w-72 glass-dark p-5 rounded-3xl border border-white/10 z-[200] shadow-2xl animate-in slide-in-from-top-2">
                     <p className="text-[8px] font-black uppercase text-zinc-500 mb-4">Live Feed</p>
                     <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                        {notifications.length === 0 ? (
                           <p className="text-[8px] text-center py-4 text-zinc-600 uppercase font-black">No signals detected</p>
                        ) : notifications.map((n) => (
                           <div key={n.id} className="text-[9px] p-4 rounded-xl bg-white/5 border border-white/5">
                              <p className="text-white">{n.message}</p>
                              <p className="text-zinc-600 text-[7px] mt-1 uppercase">{n.time}</p>
                           </div>
                        ))}
                     </div>
                  </div>
                )}
             </div>
             <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-xs shadow-lg">{currentUser?.name?.substring(0,1).toUpperCase()}</div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="glass p-6 rounded-3xl border-white/10">
                   <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest">Revenue Flow</p>
                   <p className="text-2xl md:text-4xl font-black text-white mt-3 tracking-tighter">${stats.revenue.toLocaleString()}</p>
                </div>
                <div className="glass p-6 rounded-3xl border-white/10">
                   <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest">Total Events</p>
                   <p className="text-2xl md:text-4xl font-black text-white mt-3 tracking-tighter">{stats.events}</p>
                </div>
                <div className="glass p-6 rounded-3xl border-white/10">
                   <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest">{isAdmin ? 'Stock Alerts' : 'Active Orders'}</p>
                   <p className={`text-2xl md:text-4xl font-black mt-3 tracking-tighter ${stats.secondary > 0 ? 'text-rose-500' : 'text-white'}`}>{stats.secondary}</p>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass p-6 md:p-8 rounded-[2rem] border-white/5">
                   <h3 className="font-black text-white uppercase text-[9px] tracking-widest mb-6 flex items-center gap-2"><PieChart className="w-4 h-4 text-indigo-400" /> Performance Analysis</h3>
                   <div className="space-y-4">
                      {[
                        { label: 'Completed', count: stats.status['COMPLETED'] || 0, total: stats.events, color: 'bg-emerald-500' },
                        { label: 'Delivered', count: stats.status['DELIVERED'] || 0, total: stats.events, color: 'bg-sky-500' },
                        { label: 'Shipped', count: stats.status['SHIPPED'] || 0, total: stats.events, color: 'bg-indigo-500' },
                        { label: 'Pending', count: stats.status['PENDING'] || 0, total: stats.events, color: 'bg-amber-500' },
                        { label: 'Cancelled', count: stats.status['CANCELLED'] || 0, total: stats.events, color: 'bg-rose-500' },
                      ].map(bar => (
                        <div key={bar.label}>
                           <div className="flex justify-between text-[7px] font-black uppercase text-zinc-500 mb-1.5">
                              <span>{bar.label}</span>
                              <span className="text-white">{bar.total > 0 ? Math.round((bar.count/bar.total)*100) : 0}%</span>
                           </div>
                           <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className={`h-full ${bar.color} transition-all duration-1000`} style={{ width: `${bar.total > 0 ? (bar.count/bar.total)*100 : 0}%` }}></div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="glass p-6 md:p-8 rounded-[2rem] border-white/5">
                   <h3 className="font-black text-white uppercase text-[9px] tracking-widest mb-6 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-indigo-400" /> Recent Operations</h3>
                   <div className="space-y-3">
                      {(isAdmin ? orders : orders.filter(o => o.userId === currentUser?.id)).slice(0, 4).map(o => (
                        <div key={o.id} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl border border-white/5">
                           <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getStatusColor(o.status)} bg-white/5`}>
                                 <ShoppingCart className="w-4 h-4" />
                              </div>
                              <p className="text-[9px] font-black text-white uppercase truncate max-w-[100px]">{o.productName}</p>
                           </div>
                           <p className="text-xs font-black text-white tabular-nums">${parseFloat(o.totalAmount).toLocaleString()}</p>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'inventory' && (
           <div className="glass rounded-[2rem] border-white/5 overflow-hidden animate-in fade-in duration-500">
              <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                 <h3 className="text-xl font-black text-white uppercase tracking-tighter">Inventory Hub</h3>
                 {isAdmin && (
                   <button onClick={() => setShowAddModal(true)} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all">Add Resource</button>
                 )}
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <tbody className="divide-y divide-white/5">
                         {inventory.sort((a, b) => a.name.localeCompare(b.name)).map(item => {
                           const basketItem = basket.find(b => b.productId === item.id);
                           return (
                             <tr key={item.id} className={`hover:bg-white/[0.01] transition-all ${item.quantity <= 0 ? 'grayscale opacity-40' : ''}`}>
                                 <td className="px-6 py-5">
                                     <p className="font-black text-white text-xs uppercase">{item.name}</p>
                                     <p className="text-[7px] font-black uppercase text-zinc-600 mt-0.5">Stock: {item.quantity} | {item.sku}</p>
                                 </td>
                                 <td className="px-6 py-5 text-right font-black text-white text-sm tabular-nums">${parseFloat(item.price).toLocaleString()}</td>
                                 <td className="px-6 py-5 text-right">
                                     <div className="flex justify-end gap-2">
                                        {isAdmin ? (
                                            <>
                                            <button onClick={() => setShowEditModal(item)} className="p-2.5 bg-white/5 text-indigo-400 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"><Edit3 className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => axios.delete(`/api/v1/inventory/${item.id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(fetchInventory)} className="p-2.5 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </>
                                        ) : (
                                          basketItem ? (
                                            <QuantitySelector item={item} basketItem={basketItem} />
                                          ) : (
                                            <button disabled={item.quantity <= 0} onClick={() => handleAddToBasket(item)} className={`px-5 py-2.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${item.quantity <= 0 ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-white text-black hover:bg-indigo-600 hover:text-white'}`}>
                                                {item.quantity <= 0 ? 'Sold Out' : 'Sync'}
                                            </button>
                                          )
                                        )}
                                     </div>
                                 </td>
                             </tr>
                           );
                         })}
                    </tbody>
                  </table>
                </div>
             </div>
          )}

         {(activeTab === 'admin' || activeTab === 'orders') && (
              <div className="mt-12 space-y-8">
                 <div className="border-b border-white/5 pb-4">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                       <ShoppingBag className="w-6 h-6 text-indigo-500" /> {activeTab === 'admin' ? 'Incoming Orders' : 'My Operations'}
                    </h2>
                 </div>

                 <div className="space-y-6">
                    {/* Status Chips */}
                    <div className="flex flex-wrap gap-2">
                       {['ALL', 'PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'COMPLETED'].map(s => {
                          const relevantOrders = isAdmin && activeTab === 'admin' ? orders : orders.filter(o => o.userId === currentUser.id);
                          const count = s === 'ALL' ? relevantOrders.length : relevantOrders.filter(o => o.status === s).length;
                          
                          return (
                             <button 
                                key={s} 
                                onClick={() => setStatusFilter(s)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${statusFilter === s ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'}`}
                             >
                                <span>{s}</span>
                                {count > 0 && (
                                  <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${statusFilter === s ? 'bg-white/20 text-white' : 'bg-white/5 text-zinc-400'}`}>
                                     {count}
                                  </span>
                                )}
                             </button>
                          );
                       })}
                    </div>

                    {/* User Avatars (Admin only) */}
                    {activeTab === 'admin' && (
                      <div className="flex items-center gap-6 overflow-x-auto pb-4 custom-scrollbar">
                         <button 
                            onClick={() => setUserFilter(null)}
                            className={`flex flex-col items-center gap-2 group min-w-[60px]`}
                         >
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border relative ${!userFilter ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/5 text-zinc-500 group-hover:bg-white/10'}`}>
                               <Users className="w-5 h-5" />
                               {orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length > 0 && (
                                 <div className="absolute -top-1 -right-1 bg-rose-600 border border-rose-500/30 px-1.5 py-0.5 rounded-lg text-[7px] font-black text-white shadow-lg shadow-rose-600/20">
                                    {orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length}
                                 </div>
                               )}
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-tighter ${!userFilter ? 'text-indigo-400' : 'text-zinc-600'}`}>All Users</span>
                         </button>
                         {users.map(u => {
                            const userActiveCount = orders.filter(o => o.userId === u.id && o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length;
                            return (
                               <button 
                                  key={u.id}
                                  onClick={() => setUserFilter(u.id)}
                                  className="flex flex-col items-center gap-2 group min-w-[60px]"
                               >
                                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border font-black text-lg relative ${userFilter === u.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/5 text-zinc-500 group-hover:bg-white/10'}`}>
                                     {u.name.charAt(0)}
                                     {userActiveCount > 0 && (
                                       <div className={`absolute -top-1 -right-1 px-1.5 py-0.5 rounded-lg text-[7px] font-black border shadow-lg ${userFilter === u.id ? 'bg-white text-indigo-600 border-white' : 'bg-rose-600 text-white border-rose-500/30 shadow-rose-600/20'}`}>
                                          {userActiveCount}
                                       </div>
                                     )}
                                  </div>
                                  <span className={`text-[8px] font-black uppercase tracking-tighter ${userFilter === u.id ? 'text-indigo-400' : 'text-zinc-600'}`}>{u.name.split(' ')[0]}</span>
                               </button>
                            );
                         })}
                      </div>
                    )}
                 </div>
              </div>
         )}

        {(activeTab === 'orders' || activeTab === 'admin') && (
           <div className="space-y-6 animate-in fade-in duration-500 pb-20">
              {(() => {
                 let filtered = isAdmin && activeTab === 'admin' ? [...orders] : [...orders].filter(o => o.userId === currentUser.id);
                 if (statusFilter !== 'ALL') filtered = filtered.filter(o => o.status === statusFilter);
                 if (isAdmin && activeTab === 'admin' && userFilter) {
                    filtered = filtered.filter(o => o.userId === userFilter);
                 }

                 const grouped = groupOrders(filtered);
                 if (filtered.length === 0) return (
                    <div className="py-20 flex flex-col items-center justify-center opacity-30">
                       <Database className="w-16 h-16 mb-4" />
                       <p className="font-black text-xs uppercase tracking-[0.2em]">No matching protocols found</p>
                    </div>
                 );

                 return Object.entries(grouped).map(([date, items]: any) => (
                    <div key={date} className="space-y-3">
                       <p className="text-zinc-600 font-black uppercase text-[7px] tracking-widest pl-2">{date}</p>
                       {items.map((o: any) => (
                          <div key={o.id} className={`glass p-5 rounded-2xl border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 ${o.status === 'CANCELLED' ? 'opacity-30 grayscale' : 'hover:border-indigo-500/15'}`}>
                             <div className="flex items-center gap-4 w-full sm:w-auto">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 ${getStatusColor(o.status)}`}>
                                   <ShoppingCart className="w-5 h-5" />
                                </div>
                                <div>
                                   <p className="font-black text-white text-xs uppercase tracking-tight">{o.productName} <span className="text-zinc-600 ml-2">x{o.quantity}</span></p>
                                   <div className="flex flex-wrap gap-2.5 mt-1 items-center">
                                      <span className={`text-[7px] font-black uppercase tracking-widest ${getStatusColor(o.status)}`}>
                                        {o.status === 'CANCELLED' ? `CANCELLED ${o.cancelledBy ? `BY ${o.cancelledBy}` : ''}` : o.status}
                                      </span>
                                      <span className="text-[7px] font-bold text-zinc-400 uppercase flex items-center gap-1">
                                         <User className="w-2.5 h-2.5 text-indigo-500" /> {o.user?.name || o.user?.email || 'User'}
                                      </span>
                                      <span className="text-[7px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                                         <Clock className="w-2.5 h-2.5" /> {new Date(o.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                      </span>
                                   </div>
                                </div>
                             </div>
                             <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-none pt-3 sm:pt-0">
                                <p className="font-black text-white text-xl tracking-tighter tabular-nums">${parseFloat(o.totalAmount).toLocaleString()}</p>
                                <div className="flex gap-2">
                                   {isAdmin && activeTab === 'admin' && (
                                      <>
                                         {o.status === 'PENDING' && <button onClick={() => axios.patch(`/api/v1/orders/${o.id}/status`, { status: 'SHIPPED' }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(refreshData)} className="p-2.5 bg-indigo-600 text-white rounded-lg hover:shadow-lg hover:shadow-indigo-600/30 transition-all"><Truck className="w-4 h-4" /></button>}
                                         {o.status === 'SHIPPED' && <button onClick={() => axios.patch(`/api/v1/orders/${o.id}/status`, { status: 'DELIVERED' }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(refreshData)} className="p-2.5 bg-sky-600 text-white rounded-lg hover:shadow-lg hover:shadow-sky-600/30 transition-all"><PackageCheck className="w-4 h-4" /></button>}
                                         {o.status === 'DELIVERED' && <button onClick={() => axios.patch(`/api/v1/orders/${o.id}/status`, { status: 'COMPLETED' }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(refreshData)} className="p-2.5 bg-emerald-600 text-white rounded-lg hover:shadow-lg hover:shadow-emerald-600/30 transition-all"><CheckCircle className="w-4 h-4" /></button>}
                                      </>
                                   )}
                                   {o.status !== 'COMPLETED' && o.status !== 'CANCELLED' && (
                                      <button onClick={() => axios.patch(`/api/v1/orders/${o.id}/cancel`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(refreshData)} className="p-2.5 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                                   )}
                                </div>
                             </div>
                          </div>
                       ))}
                    </div>
                 ));
              })()}
           </div>
        )}
      </main>

      {/* Nexus Vault Sidebar (Full Responsive) */}
      {showVault && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xl z-[300] flex items-center justify-end animate-in fade-in">
           <div className="absolute inset-0" onClick={() => setShowVault(false)}></div>
           <div className="glass-dark w-full max-w-sm h-full border-l border-white/10 p-6 flex flex-col relative animate-in slide-in-from-right duration-300">
              <button onClick={() => setShowVault(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3 mb-8"><CreditCard className="text-indigo-500 w-6 h-6" /> Vault</h3>
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                 {basket.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20">
                        <Box className="w-12 h-12 mb-3" />
                        <p className="font-black text-[8px] uppercase tracking-widest">Vault Empty</p>
                    </div>
                 ) : basket.map(item => (
                    <div key={item.id} className="p-4 bg-white/[0.03] rounded-xl border border-white/5 flex justify-between items-center group">
                       <div>
                          <p className="font-black text-white text-[10px] uppercase">{item.name}</p>
                          <p className="text-[7px] text-zinc-500 font-black mt-0.5 uppercase">${item.price * item.quantity}</p>
                       </div>
                       <div className="flex items-center gap-2">
                          <QuantitySelector item={{id: item.productId, name: item.name, price: item.price}} basketItem={item} />
                          <button onClick={() => axios.delete(`/api/v1/basket/${item.id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(fetchBasket)} className="p-2 text-zinc-700 hover:text-rose-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                       </div>
                    </div>
                 ))}
              </div>
              {basket.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                   <div className="flex justify-between items-end">
                      <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest">Grand Total</p>
                      <p className="text-3xl font-black text-white tracking-tighter tabular-nums">${basket.reduce((acc, i) => acc + (parseFloat(i.price) * i.quantity), 0).toLocaleString()}</p>
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setPaymentMethod('CASH')} className={`py-3 rounded-xl font-black uppercase text-[8px] tracking-widest border transition-all ${paymentMethod === 'CASH' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white/5 border-white/10 text-zinc-500'}`}>Cash</button>
                      <button onClick={() => setPaymentMethod('CARD')} className={`py-3 rounded-xl font-black uppercase text-[8px] tracking-widest border transition-all ${paymentMethod === 'CARD' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white/5 border-white/10 text-zinc-500'}`}>Chip</button>
                   </div>
                   <button onClick={handleCheckout} className="w-full py-4 bg-white text-black rounded-xl font-black uppercase tracking-widest text-[9px] shadow-xl hover:bg-indigo-50 transition-all">Settle Protocol</button>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Global Notification Toast - Compact Top Right Design */}
      {activeToast && (
        <div className="fixed top-6 right-6 z-[2000] animate-in slide-in-from-right-5 duration-500 w-full max-w-xs px-2">
          <div className="bg-zinc-900/90 border border-indigo-500/50 shadow-2xl p-4 rounded-xl backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-indigo-500"></div>
            <button onClick={() => setActiveToast(null)} className="absolute top-3 right-3 text-zinc-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <Bell className="w-5 h-5 text-white animate-bounce" />
              </div>
              <div className="flex-1 pr-4">
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">{activeToast.title || 'Notification'}</p>
                <p className="text-[11px] font-bold text-white tracking-tight leading-snug">{activeToast.message}</p>
              </div>
            </div>
          </div>
        </div>
      )}

       {/* Auth Modal */}
       {!isLoggedIn && mounted && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-3xl z-[5000] flex items-center justify-center p-4">
            <div className="glass-dark w-full max-w-md p-8 rounded-[2.5rem] border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
               <div className="text-center mb-10">
                  <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-indigo-600/20 rotate-12">
                     <ShieldCheck className="w-10 h-10 text-white -rotate-12" />
                  </div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Nexus Terminal</h2>
                  <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.3em] mt-2">Authorization Required</p>
               </div>
               <form onSubmit={handleAuth} className="space-y-4">
                  {isRegisterMode && (
                    <div className="space-y-1.5">
                       <label className="text-[7px] font-black text-zinc-500 uppercase tracking-widest ml-1">Identity Name</label>
                       <input required type="text" placeholder="OPERATIVE NAME" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold text-xs focus:border-indigo-500 outline-none transition-all" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} />
                    </div>
                  )}
                  <div className="space-y-1.5">
                     <label className="text-[7px] font-black text-zinc-500 uppercase tracking-widest ml-1">Channel Access</label>
                     <input required type="email" placeholder="EMAIL ADDRESS" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold text-xs focus:border-indigo-500 outline-none transition-all" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[7px] font-black text-zinc-500 uppercase tracking-widest ml-1">Secure Key</label>
                     <input required type="password" placeholder="PASSWORD" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold text-xs focus:border-indigo-500 outline-none transition-all" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
                  </div>
                  <button className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[10px] mt-4 hover:bg-indigo-50 transition-all shadow-xl shadow-white/5">{isRegisterMode ? 'Initialize Identity' : 'Establish Link'}</button>
               </form>
               <button onClick={() => setIsRegisterMode(!isRegisterMode)} className="w-full mt-6 text-[8px] font-black text-zinc-500 uppercase tracking-widest hover:text-white transition-colors">
                  {isRegisterMode ? 'Existing identity? Access link' : 'New operative? Request ID'}
               </button>
            </div>
         </div>
       )}

       {/* Add/Edit Inventory Modal */}
       {(showAddModal || showEditModal) && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[4000] flex items-center justify-center p-4 animate-in fade-in">
            <div className="glass-dark w-full max-w-lg p-8 rounded-[2.5rem] border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{showAddModal ? 'Inject Resource' : 'Recalibrate Item'}</h3>
                  <button onClick={() => { setShowAddModal(false); setShowEditModal(null); }} className="text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
               </div>
               <form onSubmit={showAddModal ? handleAddInventory : handleEditInventory} className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                     <label className="text-[7px] font-black text-zinc-500 uppercase tracking-widest ml-1">Label</label>
                     <input required type="text" placeholder="RESOURCE NAME" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold text-xs focus:border-indigo-500 outline-none transition-all" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[7px] font-black text-zinc-500 uppercase tracking-widest ml-1">Credits</label>
                     <input required type="number" placeholder="PRICE" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold text-xs focus:border-indigo-500 outline-none transition-all" value={itemForm.price} onChange={e => setItemForm({...itemForm, price: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[7px] font-black text-zinc-500 uppercase tracking-widest ml-1">Volume</label>
                     <input required type="number" placeholder="QUANTITY" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold text-xs focus:border-indigo-500 outline-none transition-all" value={itemForm.quantity} onChange={e => setItemForm({...itemForm, quantity: e.target.value})} />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                     <label className="text-[7px] font-black text-zinc-500 uppercase tracking-widest ml-1">Serial SKU</label>
                     <input required type="text" placeholder="UNIQUE IDENTIFIER" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold text-xs focus:border-indigo-500 outline-none transition-all" value={itemForm.sku} onChange={e => setItemForm({...itemForm, sku: e.target.value})} />
                  </div>
                  <button className="col-span-2 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] mt-4 hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20">{showAddModal ? 'Deploy Resource' : 'Apply Calibration'}</button>
               </form>
            </div>
         </div>
       )}
    </div>
  );
}
