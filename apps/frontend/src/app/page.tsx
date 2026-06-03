'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Package, ShoppingBag, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';

import { BasketItem, InventoryItem, Notification, Order, Stats, User } from '@/types';
import Sidebar          from '@/components/layout/Sidebar';
import MobileHeader     from '@/components/layout/MobileHeader';
import BottomNav        from '@/components/layout/BottomNav';
import PageHeader       from '@/components/layout/PageHeader';
import AuthModal        from '@/components/auth/AuthModal';
import Dashboard        from '@/components/dashboard/Dashboard';
import InventoryView    from '@/components/inventory/InventoryView';
import InventoryModal   from '@/components/inventory/InventoryModal';
import OrdersView       from '@/components/orders/OrdersView';
import VaultSidebar     from '@/components/vault/VaultSidebar';
import Toast            from '@/components/ui/Toast';
import BackgroundScene  from '@/components/ui/BackgroundScene';

export default function NexusApp() {
  const [mounted,             setMounted]             = useState(false);
  const [isLoggedIn,          setIsLoggedIn]          = useState(false);
  const [activeTab,           setActiveTab]           = useState('dashboard');
  const [showAddModal,        setShowAddModal]        = useState(false);
  const [showEditModal,       setShowEditModal]       = useState<InventoryItem | null>(null);
  const [showNotifDropdown,   setShowNotifDropdown]   = useState(false);
  const [showVault,           setShowVault]           = useState(false);

  const [currentUser,   setCurrentUser]   = useState<User | null>(null);
  const [inventory,     setInventory]     = useState<InventoryItem[]>([]);
  const [orders,        setOrders]        = useState<Order[]>([]);
  const [basket,        setBasket]        = useState<BasketItem[]>([]);
  const [users,         setUsers]         = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeToast,   setActiveToast]   = useState<Notification | null>(null);
  const [statusFilter,  setStatusFilter]  = useState('ALL');
  const [userFilter,    setUserFilter]    = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [itemForm,      setItemForm]      = useState({ name: '', price: '', quantity: '', sku: '' });
  const [authForm,      setAuthForm]      = useState({ email: '', password: '', name: '' });
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';

  const tabs = [
    { id: 'dashboard', name: 'Board',   icon: LayoutDashboard },
    { id: 'inventory', name: 'Items',   icon: Package },
    { id: 'orders',    name: 'Orders',  icon: ShoppingBag, hideForAdmin: true },
    { id: 'admin',     name: 'Control', icon: ShieldCheck, admin: true },
  ];

  // Edit modal → form auto-fill
  useEffect(() => {
    if (showEditModal) {
      setItemForm({ name: showEditModal.name, price: String(showEditModal.price), quantity: String(showEditModal.quantity), sku: showEditModal.sku });
    } else {
      setItemForm({ name: '', price: '', quantity: '', sku: '' });
    }
  }, [showEditModal]);

  // Init: axios base URL + 401 interceptor + session restore
  useEffect(() => {
    setMounted(true);
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    axios.defaults.baseURL = host === 'localhost' ? 'http://localhost:8080' : `http://${host}:8080`;
    axios.interceptors.response.use(
      res => res,
      err => {
        if (err.response?.status === 401) { localStorage.clear(); window.location.reload(); }
        return Promise.reject(err);
      }
    );
    const token = localStorage.getItem('token');
    const user  = localStorage.getItem('user');
    if (token && user) {
      setCurrentUser(JSON.parse(user));
      setIsLoggedIn(true);
      refreshData();
    }
  }, []);

  // Auto-logout after session expiry
  useEffect(() => {
    if (!isLoggedIn) return;
    const ms = parseInt(process.env.NEXT_PUBLIC_SESSION_EXPIRY_MS || '0') || 3 * 60 * 60 * 1000;
    const t = setTimeout(() => { handleLogout(); alert('Session expired. Please log in again.'); }, ms);
    return () => clearTimeout(t);
  }, [isLoggedIn]);

  // Socket.io real-time connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    const saved = localStorage.getItem('user');
    if (!isLoggedIn || !token || !saved) return;
    const user = JSON.parse(saved);
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const url  = host === 'localhost' ? 'http://localhost:8080' : `http://${host}:8080`;
    const socket = io(url, { path: '/socket.io/', transports: ['websocket', 'polling'] });

    socket.on('connect', () => socket.emit('join', { userId: user.id, role: user.role }));
    socket.on('notification', (data: any) => {
      if (data.type === 'ORDER_RECEIVED' && isAdmin) {
        fetchOrders();
        new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
        setActiveToast({ ...data, title: 'New Order', id: Date.now(), read: false });
        setTimeout(() => setActiveToast(null), 8000);
        return;
      }
      if (data.message) {
        const n = { ...data, id: Date.now(), read: false };
        setNotifications(prev => [n, ...prev].slice(0, 20));
        setActiveToast(n);
        setTimeout(() => setActiveToast(null), 5000);
        refreshData();
      } else if (data.type === 'REFRESH_ORDERS') fetchOrders();
        else if (data.type === 'REFRESH_USERS')  fetchUsers();
        else if (data.type === 'REFRESH_INV')    fetchInventory();
    });
    return () => { socket.disconnect(); };
  }, [isLoggedIn]);

  // ── Data fetchers ─────────────────────────────────────────────────────────
  const refreshData = () => {
    fetchInventory(); fetchOrders(); fetchBasket();
    const u = localStorage.getItem('user');
    if (u && JSON.parse(u).role === 'ADMIN') fetchUsers();
  };
  const fetchInventory = async () => { const r = await axios.get('/api/v1/inventory'); setInventory(r.data); };
  const fetchOrders    = async () => { const r = await axios.get('/api/v1/orders',      auth()); setOrders(r.data); };
  const fetchBasket    = async () => { const r = await axios.get('/api/v1/basket',      auth()); setBasket(r.data); };
  const fetchUsers     = async () => {
    const u = localStorage.getItem('user');
    if (!u || JSON.parse(u).role !== 'ADMIN') return;
    try { const r = await axios.get('/api/v1/auth/users', auth()); setUsers(r.data); } catch {}
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
  const toast = (msg: string, type = 'INFO', title?: string) => {
    setActiveToast({ message: msg, type, id: Date.now(), read: false, title });
    setTimeout(() => setActiveToast(null), 3000);
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLogout = () => { localStorage.clear(); window.location.reload(); };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const ep = isRegisterMode ? '/auth/register' : '/auth/login';
      const r = await axios.post(`/api/v1${ep}`, authForm);
      localStorage.setItem('token', r.data.token);
      localStorage.setItem('user', JSON.stringify(r.data.user));
      window.location.reload();
    } catch (err: any) { alert(err.response?.data?.error || 'Access Denied'); }
  };

  const handleAddToBasket = async (item: any) => {
    try {
      await axios.post('/api/v1/basket', { productId: item.id, name: item.name, price: item.price }, auth());
      toast(`${item.name} added to Vault`);
      await fetchBasket();
    } catch { toast('Sync Interrupted - Refreshing...', 'CAUTION'); }
  };

  const handleRemoveFromBasket  = async (productId: string) => { try { await axios.post('/api/v1/basket/decrement', { productId }, auth()); fetchBasket(); } catch {} };
  const handleDeleteBasketItem  = async (id: string)        => { await axios.delete(`/api/v1/basket/${id}`, auth());      fetchBasket(); };
  const handleDeleteInventory   = async (id: string)        => { await axios.delete(`/api/v1/inventory/${id}`, auth());   fetchInventory(); };
  const handleStatusUpdate      = async (id: string, status: string) => { await axios.patch(`/api/v1/orders/${id}/status`, { status }, auth()); refreshData(); };
  const handleCancelOrder       = async (id: string)        => { await axios.patch(`/api/v1/orders/${id}/cancel`, {}, auth()); refreshData(); };

  const handleCheckout = async () => {
    try { await axios.post('/api/v1/checkout', { paymentMethod }, auth()); setShowVault(false); refreshData(); }
    catch (err: any) { alert(err.response?.data?.error || 'Checkout failed'); }
  };

  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await axios.post('/api/v1/inventory', itemForm, auth()); setShowAddModal(false); refreshData(); toast('New resource synchronized successfully.', 'SUCCESS', 'System Updated'); }
    catch { alert('Access Denied'); }
  };

  const handleEditInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await axios.put(`/api/v1/inventory/${showEditModal!.id}`, itemForm, auth()); setShowEditModal(null); refreshData(); toast('Resource parameters recalibrated.', 'SUCCESS', 'Protocol Updated'); }
    catch { alert('Update Failure'); }
  };

  // ── Stats (memoized) ──────────────────────────────────────────────────────
  const stats: Stats = useMemo(() => {
    const src = isAdmin ? orders : orders.filter(o => o.userId === currentUser?.id);
    const revenue   = src.filter(o => o.status === 'COMPLETED').reduce((a, o) => a + parseFloat(String(o.totalAmount || 0)), 0);
    const secondary = isAdmin ? inventory.filter(i => i.quantity <= 0).length : src.filter(o => o.status === 'PENDING' || o.status === 'SHIPPED').length;
    const status    = src.reduce((a: Record<string, number>, o) => { a[o.status] = (a[o.status] || 0) + 1; return a; }, {});
    return { revenue, events: src.length, secondary, status };
  }, [orders, inventory, isAdmin, currentUser]);

  if (!mounted) return null;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#020203] text-zinc-200 font-sans relative overflow-hidden">
      <BackgroundScene />

      <Sidebar tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={isAdmin} orders={orders} currentUser={currentUser} onLogout={handleLogout} />
      <MobileHeader currentUser={currentUser} isAdmin={isAdmin} basket={basket} unreadCount={0} setShowNotifDropdown={setShowNotifDropdown} setShowVault={setShowVault} />
      <BottomNav tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={isAdmin} orders={orders} currentUser={currentUser} onLogout={handleLogout} />

      <main className="flex-1 p-4 md:p-8 pb-32 lg:pb-8 overflow-y-auto custom-scrollbar">
        <PageHeader activeTab={activeTab} currentUser={currentUser} isAdmin={isAdmin} basket={basket} notifications={notifications} unreadCount={0} showNotifDropdown={showNotifDropdown} setShowNotifDropdown={setShowNotifDropdown} setShowVault={setShowVault} />

        <div key={activeTab} className="page-transition">
          {activeTab === 'dashboard' && <Dashboard stats={stats} isAdmin={isAdmin} orders={orders} currentUser={currentUser} />}
          {activeTab === 'inventory' && <InventoryView inventory={inventory} basket={basket} isAdmin={isAdmin} onAddToBasket={handleAddToBasket} onRemoveFromBasket={handleRemoveFromBasket} onEdit={setShowEditModal} onDelete={handleDeleteInventory} onAddNew={() => setShowAddModal(true)} />}
          {(activeTab === 'orders' || activeTab === 'admin') && <OrdersView activeTab={activeTab} orders={orders} users={users} currentUser={currentUser} isAdmin={isAdmin} statusFilter={statusFilter} setStatusFilter={setStatusFilter} userFilter={userFilter} setUserFilter={setUserFilter} onStatusUpdate={handleStatusUpdate} onCancel={handleCancelOrder} />}
        </div>
      </main>

      {showVault        && <VaultSidebar basket={basket} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} onClose={() => setShowVault(false)} onCheckout={handleCheckout} onAddToBasket={handleAddToBasket} onRemoveFromBasket={handleRemoveFromBasket} onDeleteItem={handleDeleteBasketItem} />}
      {activeToast      && <Toast toast={activeToast} onClose={() => setActiveToast(null)} />}
      {!isLoggedIn      && <AuthModal authForm={authForm} setAuthForm={setAuthForm} isRegisterMode={isRegisterMode} setIsRegisterMode={setIsRegisterMode} onSubmit={handleAuth} />}
      {(showAddModal || showEditModal) && <InventoryModal isAdd={!!showAddModal} itemForm={itemForm} setItemForm={setItemForm} onSubmit={showAddModal ? handleAddInventory : handleEditInventory} onClose={() => { setShowAddModal(false); setShowEditModal(null); }} />}
    </div>
  );
}
