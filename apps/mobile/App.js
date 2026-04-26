import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  FlatList, SafeAreaView, StatusBar, ActivityIndicator, ScrollView, Modal, Alert, Animated, Vibration
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  Package, ShoppingCart, LayoutDashboard, 
  LogOut, Layers, Box, TrendingUp, Wallet, Plus, Trash2, X, Bell, Activity, CheckCircle, XCircle, Clock, Database, ChevronRight, User, Calendar, Truck, Briefcase, ShieldCheck, ClipboardList, Users
} from 'lucide-react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
const SESSION_EXPIRY_MS = parseInt(process.env.EXPO_PUBLIC_SESSION_EXPIRY_MS) || 3 * 60 * 60 * 1000;

// Status Sequence & Colors
const STATUS_FLOW = {
  'PENDING': { next: 'SHIPPED', color: '#f59e0b', bg: '#451a03', icon: <Clock size={12} color="#f59e0b" /> },
  'SHIPPED': { next: 'DELIVERED', color: '#3b82f6', bg: '#1e3a8a', icon: <Truck size={12} color="#3b82f6" /> },
  'DELIVERED': { next: 'COMPLETED', color: '#10b981', bg: '#064e3b', icon: <Package size={12} color="#10b981" /> },
  'COMPLETED': { next: null, color: '#10b981', bg: '#064e3b', icon: <CheckCircle size={12} color="#10b981" /> },
  'CANCELLED': { next: null, color: '#f43f5e', bg: '#450a0a', icon: <XCircle size={12} color="#f43f5e" /> }
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [view, setView] = useState('login');
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [notification, setNotification] = useState(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', price: '', quantity: '', sku: '' });
  const [basket, setBasket] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [userFilter, setUserFilter] = useState(null);

  // Session Recovery
  useEffect(() => {
    const checkSession = async () => {
      try {
        const savedToken = await SecureStore.getItemAsync('token');
        const savedUser = await SecureStore.getItemAsync('user');
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
          setIsLoggedIn(true);
          setView('dashboard');
        }
      } catch (e) { console.log('No session'); }
    };
    checkSession();
  }, []);

  // Socket Connection with Enhanced Sync
  useEffect(() => {
    if (isLoggedIn && token && user) {
      fetchData();
      const socket = io(API_BASE, { 
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10
      });
      
      socket.emit('join', { userId: user.id, role: user.role });

      socket.on('notification', (data) => {
        console.log('🔔 Mobile Received:', data);
        fetchData();
        
        if (data.message) {
          Vibration.vibrate(100);
          let prefix = '🛡️ SYSTEM';
          if (data.type === 'ORDER_RECEIVED') prefix = '🚀 NEW ORDER';
          if (data.type === 'ORDER_CANCELLED' || data.type === 'CANCEL') prefix = '🚫 CANCELLED';
          if (data.type === 'SUCCESS') prefix = '✅ SUCCESS';
          
          showToast(`${prefix}: ${data.message}`);
        }
      });

      // Session expiry timer
      const timer = setTimeout(() => {
        handleLogout();
        alert('Session Protocol Expired: Security re-authentication required.');
      }, SESSION_EXPIRY_MS);

      return () => {
        socket.disconnect();
        clearTimeout(timer);
      };
    }
  }, [isLoggedIn, token]);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [invRes, orderRes, basketRes] = await Promise.all([
        axios.get(`${API_BASE}/api/v1/inventory`, { headers }),
        axios.get(`${API_BASE}/api/v1/orders`, { headers }),
        axios.get(`${API_BASE}/api/v1/basket`, { headers })
      ]);
      setInventory(invRes.data);
      setOrders(orderRes.data);
      setBasket(basketRes.data);
    } catch (err) {
      if (err.response?.status === 401) handleLogout();
    }
  };

  const handleStatusUpdate = async (id, currentStatus) => {
    const nextStatus = STATUS_FLOW[currentStatus]?.next;
    if (!nextStatus) return;
    
    try {
      await axios.patch(`${API_BASE}/api/v1/orders/${id}/status`, 
        { status: nextStatus }, 
        { headers: { Authorization: `Bearer ${token}` }}
      );
      fetchData();
    } catch (err) { alert('Status Update Failed'); }
  };

  const handleCancelOrder = async (id) => {
    Alert.alert('Protocol Purge', 'Terminate this order mission?', [
      { text: 'Aborted' },
      { text: 'Terminate', style: 'destructive', onPress: async () => {
        try {
          await axios.patch(`${API_BASE}/api/v1/orders/${id}/cancel`, {}, { headers: { Authorization: `Bearer ${token}` }});
          fetchData();
        } catch (err) { alert('Termination Failed'); }
      }}
    ]);
  };

  const handleAuth = async () => {
    if (!authForm.email || !authForm.password) {
      alert('Security protocol breach: Credentials required.');
      return;
    }
    setLoading(true);
    try {
      const endpoint = view === 'login' ? '/api/v1/auth/login' : '/api/v1/auth/register';
      const res = await axios.post(`${API_BASE}${endpoint}`, authForm);
      const { user: userData, token: userToken } = res.data;
      await SecureStore.setItemAsync('token', userToken);
      await SecureStore.setItemAsync('user', JSON.stringify(userData));
      setToken(userToken);
      setUser(userData);
      setIsLoggedIn(true);
      setView('dashboard');
    } catch (err) { alert('Access Denied: Intelligence mismatch.'); } finally { setLoading(false); }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    setIsLoggedIn(false);
    setToken(null);
    setUser(null);
    setView('login');
  };

  const handleAddToBasket = async (item) => {
    try {
      await axios.post(`${API_BASE}/api/v1/basket`, { productId: item.id, name: item.name, price: item.price }, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Vault Error'); }
  };

  const handleDecrementBasket = async (item) => {
    try {
      await axios.post(`${API_BASE}/api/v1/basket/decrement`, { productId: item.productId }, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (err) { alert('Sync Error'); }
  };

  const handleCheckout = async () => {
    try {
      await axios.post(`${API_BASE}/api/v1/checkout`, { paymentMethod: 'CASH' }, { headers: { Authorization: `Bearer ${token}` } });
      showToast('🚀 ORDER SUCCESSFUL: Operational protocol initiated. We are processing your request.');
      fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Checkout Failure'); }
  };

  const handleSaveItem = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (editingItem) {
        await axios.put(`${API_BASE}/api/v1/inventory/${editingItem.id}`, newItem, { headers });
      } else {
        await axios.post(`${API_BASE}/api/v1/inventory`, newItem, { headers });
      }
      setShowAddModal(false);
      setEditingItem(null);
      setNewItem({ name: '', price: '', quantity: '', sku: '' });
      fetchData();
    } catch (err) { alert('Sync Error'); }
  };

  // Dashboard Calculations
  const stats = useMemo(() => {
    const total = orders.length || 1;
    // Faqat COMPLETED bo'lgan buyurtmalar summasini hisoblaymiz
    const revenue = orders.filter(o => o.status === 'COMPLETED').reduce((acc, curr) => acc + (parseFloat(curr.totalAmount) || 0), 0);
    const alerts = inventory.filter(i => i.quantity < 5).length;
    
    return {
      revenue,
      totalEvents: orders.length,
      alerts,
      analysis: {
        Completed: Math.round((orders.filter(o => o.status === 'COMPLETED').length / total) * 100),
        Delivered: Math.round((orders.filter(o => o.status === 'DELIVERED').length / total) * 100),
        Shipped: Math.round((orders.filter(o => o.status === 'SHIPPED').length / total) * 100),
        Pending: Math.round((orders.filter(o => o.status === 'PENDING').length / total) * 100),
        Cancelled: Math.round((orders.filter(o => o.status === 'CANCELLED').length / total) * 100),
      }
    };
  }, [orders, inventory]);

  const groupedOrders = useMemo(() => {
    const groups = {};
    orders.forEach(order => {
      const date = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      if (!groups[date]) groups[date] = [];
      groups[date].push(order);
    });
    return Object.entries(groups);
  }, [orders]);

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loginCard}>
          <Layers color="#6366f1" size={80} style={{ alignSelf: 'center', marginBottom: 20 }} />
          <Text style={styles.title}>Nexus<Text style={{ color: '#6366f1' }}>.Pro</Text></Text>
          <Text style={styles.headerSub}>CORE SECURITY LAYER</Text>
          <View style={styles.inputGroup}>
            {view === 'register' && <TextInput placeholder="Identity Label" placeholderTextColor="#52525b" style={styles.input} onChangeText={(t) => setAuthForm({...authForm, name: t})} />}
            <TextInput placeholder="Network Email" placeholderTextColor="#52525b" style={styles.input} autoCapitalize="none" onChangeText={(t) => setAuthForm({...authForm, email: t})} />
            <TextInput placeholder="Security Key" placeholderTextColor="#52525b" secureTextEntry style={styles.input} onChangeText={(t) => setAuthForm({...authForm, password: t})} />
          </View>
          <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{view.toUpperCase()} PROTOCOL</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {notification && (
        <View style={styles.toast}>
          <View style={styles.toastContent}>
            <Bell color="#fff" size={18} />
            <Text style={styles.toastText} numberOfLines={2}>{notification}</Text>
          </View>
          <TouchableOpacity onPress={() => setNotification(null)} style={styles.toastClose}>
            <X color="#fff" size={16} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>{user?.role || 'USER'} PROTOCOL</Text>
          <Text style={styles.headerTitle}>{user?.name || 'IDENTITY'}</Text>
        </View>
        <TouchableOpacity style={styles.profileAvatar} onPress={() => {
          Alert.alert('System Exit', 'Terminate current session?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: handleLogout }
          ]);
        }}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'A'}</Text>
          <View style={styles.onlineDot} />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {view === 'dashboard' && (
          <ScrollView style={{ padding: 20 }}>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}><Text style={styles.statLabel}>Revenue Flow</Text><Text style={styles.statValue}>${stats.revenue.toLocaleString()}</Text></View>
              <View style={styles.statCard}><Text style={styles.statLabel}>Total Events</Text><Text style={styles.statValue}>{stats.totalEvents}</Text></View>
              <View style={[styles.statCard, { borderRightWidth: 0 }]}><Text style={styles.statLabel}>Stock Alerts</Text><Text style={[styles.statValue, { color: stats.alerts > 0 ? '#f43f5e' : '#fff' }]}>{stats.alerts}</Text></View>
            </View>

            <Text style={styles.sectionTitle}>Performance Analysis</Text>
            <View style={styles.analysisBox}>
              {Object.entries(stats.analysis).map(([key, val]) => (
                <View key={key} style={styles.analysisRow}>
                  <Text style={styles.analysisLabel}>{key}</Text>
                  <View style={styles.progressBg}><View style={[styles.progressFill, { width: `${val}%`, backgroundColor: key === 'Cancelled' ? '#f43f5e' : '#6366f1' }]} /></View>
                  <Text style={styles.analysisValue}>{val}%</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Recent Operations</Text>
            {orders.slice(0, 4).map(o => (
              <View key={o.id} style={styles.miniCard}>
                <View style={styles.miniIcon}><Box color="#6366f1" size={16} /></View>
                <View style={{ flex: 1, marginLeft: 15 }}>
                  <Text style={styles.miniName}>{o.productName}</Text>
                  <Text style={styles.miniPrice}>${parseFloat(o.totalAmount || 0).toLocaleString()}</Text>
                </View>
                <ChevronRight color="#18181b" size={18} />
              </View>
            ))}
            <View style={{ height: 100 }} />
          </ScrollView>
        )}
        
        {view === 'inventory' && (
          <View style={{ flex: 1 }}>
            <FlatList data={inventory} keyExtractor={(i) => i.id} contentContainerStyle={{ padding: 20, paddingBottom: 100 }} renderItem={({ item }) => (
              <View style={styles.itemCard}>
                <View style={[styles.itemInfo, { flex: 1 }]}>
                  <View style={styles.cartIconBox}><Package color="#6366f1" size={24} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.itemStats}>SKU: {item.sku} • QTY: {item.quantity}</Text>
                    <Text style={[styles.itemPrice, { marginTop: 4 }]}>${parseFloat(item.price).toLocaleString()}</Text>
                  </View>
                </View>
                {user?.role === 'ADMIN' ? (
                  <View style={styles.adminActions}>
                    <TouchableOpacity style={styles.adminBtn} onPress={() => { setEditingItem(item); setNewItem({ name: item.name, price: item.price.toString(), quantity: item.quantity.toString(), sku: item.sku }); setShowAddModal(true); }}>
                      <Plus color="#6366f1" size={18} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.adminBtn, { backgroundColor: '#450a0a' }]} onPress={() => { Alert.alert('Purge', 'Delete asset?', [{ text: 'No' }, { text: 'Yes', onPress: async () => { await axios.delete(`${API_BASE}/api/v1/inventory/${item.id}`, { headers: { Authorization: `Bearer ${token}` }}); fetchData(); } }]) }}>
                      <Trash2 color="#f43f5e" size={18} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    {basket.find(b => b.productId === item.id) ? (
                      <View style={styles.vaultCounter}>
                        <TouchableOpacity onPress={() => handleDecrementBasket({ productId: item.id })} style={styles.countBtn}><Text style={{ color: '#fff' }}>-</Text></TouchableOpacity>
                        <Text style={{ color: '#fff', fontWeight: '900', marginHorizontal: 12, fontSize: 12 }}>{basket.find(b => b.productId === item.id).quantity}</Text>
                        <TouchableOpacity onPress={() => handleAddToBasket(item)} style={styles.countBtn}><Text style={{ color: '#fff' }}>+</Text></TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.addVaultBtn} onPress={() => handleAddToBasket(item)}>
                        <Plus color="#fff" size={20} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )} />
            {user?.role === 'ADMIN' && <TouchableOpacity style={styles.fab} onPress={() => { setEditingItem(null); setNewItem({ name: '', price: '', quantity: '', sku: '' }); setShowAddModal(true); }}><Plus color="#fff" size={32} /></TouchableOpacity>}
          </View>
        )}

        {view === 'vault' && (
          <View style={{ flex: 1 }}>
             <View style={styles.ordersHeader}>
               <ShoppingCart color="#6366f1" size={24} />
               <Text style={styles.ordersTitle}>YOUR VAULT</Text>
             </View>
             <FlatList data={basket} keyExtractor={i => i.id} contentContainerStyle={{ padding: 20 }} renderItem={({ item }) => (
               <View style={styles.itemCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemStats}>PRICE: ${parseFloat(item.price).toLocaleString()}</Text>
                  </View>
                  <View style={styles.vaultCounter}>
                    <TouchableOpacity onPress={() => handleDecrementBasket(item)} style={styles.countBtn}><Text style={{ color: '#fff' }}>-</Text></TouchableOpacity>
                    <Text style={{ color: '#fff', fontWeight: '900', marginHorizontal: 15 }}>{item.quantity}</Text>
                    <TouchableOpacity onPress={() => handleAddToBasket({ id: item.productId, name: item.name, price: item.price })} style={styles.countBtn}><Text style={{ color: '#fff' }}>+</Text></TouchableOpacity>
                  </View>
               </View>
             )} />
             {basket.length > 0 && (
               <View style={styles.checkoutFooter}>
                  <View>
                    <Text style={styles.totalLabel}>TOTAL PROTOCOL</Text>
                    <Text style={styles.totalValue}>${basket.reduce((acc, c) => acc + (parseFloat(c.price)*c.quantity), 0).toLocaleString()}</Text>
                  </View>
                  <TouchableOpacity style={styles.payBtn} onPress={handleCheckout}>
                    <Text style={styles.buttonText}>CHECKOUT</Text>
                  </TouchableOpacity>
               </View>
             )}
          </View>
        )}

        {view === 'orders' && (
          <View style={{ flex: 1 }}>
            <View style={styles.ordersHeader}>
              <Briefcase color="#6366f1" size={24} />
              <Text style={styles.ordersTitle}>{user?.role === 'ADMIN' ? 'CONTROL PANEL' : 'MY OPERATIONS'}</Text>
            </View>

            <View style={styles.filterSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
                {['ALL', 'PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'COMPLETED'].map(s => {
                  const relevant = user?.role === 'ADMIN' ? orders : orders.filter(o => o.userId === user.id);
                  const count = s === 'ALL' ? relevant.length : relevant.filter(o => o.status === s).length;
                  return (
                    <TouchableOpacity key={s} onPress={() => setStatusFilter(s)} style={[styles.filterChip, statusFilter === s && styles.activeChip]}>
                      <Text style={[styles.chipText, statusFilter === s && styles.activeChipText]}>
                        {s}{count > 0 ? ` (${count})` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              
              {user?.role === 'ADMIN' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarContainer}>
                   <TouchableOpacity onPress={() => setUserFilter(null)} style={[styles.avatarBox, !userFilter && styles.activeAvatar]}>
                      <View style={[styles.avatarCircle, !userFilter && { borderColor: '#6366f1' }]}>
                        <Users color={!userFilter ? "#6366f1" : "#52525b"} size={18} />
                        {(() => {
                           const totalActive = orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length;
                           if (totalActive > 0) return (
                             <View style={styles.badge}><Text style={styles.badgeText}>{totalActive}</Text></View>
                           );
                        })()}
                      </View>
                      <Text style={[styles.avatarName, !userFilter && { color: '#6366f1' }]}>ALL USERS</Text>
                   </TouchableOpacity>
                   {[...new Set(orders.map(o => JSON.stringify({ id: o.userId, name: o.user?.name || 'User' })))].map(uStr => {
                     const u = JSON.parse(uStr);
                     const activeCount = orders.filter(o => o.userId === u.id && o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length;
                     return (
                       <TouchableOpacity key={u.id} onPress={() => setUserFilter(u.id)} style={[styles.avatarBox, userFilter === u.id && styles.activeAvatar]}>
                         <View style={[styles.avatarCircle, userFilter === u.id && { borderColor: '#6366f1' }]}>
                           <Text style={[styles.avatarInitial, userFilter === u.id && { color: '#6366f1' }]}>{u.name.charAt(0)}</Text>
                           {activeCount > 0 && (
                             <View style={styles.badge}><Text style={styles.badgeText}>{activeCount}</Text></View>
                           )}
                         </View>
                         <Text style={[styles.avatarName, userFilter === u.id && { color: '#6366f1' }]} numberOfLines={1}>{u.name.split(' ')[0]}</Text>
                       </TouchableOpacity>
                     );
                   })}
                </ScrollView>
              )}
            </View>
            
            <ScrollView style={{ flex: 1 }}>
               {(() => {
                 let filtered = [...orders];
                 if (user?.role !== 'ADMIN') filtered = filtered.filter(o => o.userId === user.id);
                 else {
                   if (statusFilter !== 'ALL') filtered = filtered.filter(o => o.status === statusFilter);
                   if (userFilter) filtered = filtered.filter(o => o.userId === userFilter);
                 }

                 const grouped = Object.entries(filtered.reduce((acc, o) => {
                   const date = new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                   if (!acc[date]) acc[date] = [];
                   acc[date].push(o);
                   return acc;
                 }, {}));

                 if (filtered.length === 0) return (
                   <View style={{ alignItems: 'center', marginTop: 100, opacity: 0.5 }}>
                     <Database color="#52525b" size={64} />
                     <Text style={{ color: '#52525b', fontWeight: '800', marginTop: 20 }}>NO MATCHING RECORDS</Text>
                   </View>
                 );

                 return grouped.map(([date, items]) => (
                   <View key={date}>
                     <Text style={styles.dateHeader}>{date.toUpperCase()}</Text>
                     {items.map(item => (
                       <View key={item.id} style={styles.orderCard}>
                     <View style={styles.orderIconBox}><ShoppingCart color={item.status === 'COMPLETED' ? '#10b981' : '#f59e0b'} size={24} /></View>
                     <View style={{ flex: 1, marginLeft: 15 }}>
                       <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                         <Text style={styles.orderProductName} numberOfLines={1}>{item.productName.toUpperCase()}</Text>
                         <Text style={{ color: '#52525b', fontWeight: '900', fontSize: 10 }}>X{item.quantity}</Text>
                       </View>
                       
                       <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                         <View style={[styles.statusBadge, { backgroundColor: STATUS_FLOW[item.status]?.bg || '#18181b', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                           {STATUS_FLOW[item.status]?.icon}
                           <Text style={[styles.statusText, { color: STATUS_FLOW[item.status]?.color || '#fff' }]}>
                              {item.status}{item.status === 'CANCELLED' && item.cancelledBy ? ` BY ${item.cancelledBy}` : ''}
                           </Text>
                         </View>
                         <Text style={styles.orderPrice}>${parseFloat(item.totalAmount || 0).toLocaleString()}</Text>
                       </View>
                       
                       {/* Metama'lumotlar */}
                       <View style={styles.metaContainer}>
                         <View style={styles.metaInfo}><User size={12} color="#6366f1" /><Text style={styles.metaText}>{item.user?.name || 'User'}</Text></View>
                         <View style={styles.metaInfo}><Clock size={12} color="#a1a1aa" /><Text style={styles.metaText}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></View>
                       </View>

                       {/* Action buttons */}
                       {((user?.role === 'ADMIN' && item.status !== 'CANCELLED' && item.status !== 'COMPLETED') || 
                         (user?.role !== 'ADMIN' && item.status !== 'CANCELLED' && item.status !== 'COMPLETED')) && (
                         <View style={[styles.orderActions, { marginTop: 15, justifyContent: 'flex-start', width: '100%' }]}>
                           {user?.role === 'ADMIN' && (
                             <TouchableOpacity 
                               style={[styles.statusBtn, { backgroundColor: STATUS_FLOW[STATUS_FLOW[item.status]?.next]?.color || '#4f46e5', flex: 1, maxWidth: 120, height: 40 }]} 
                               onPress={() => handleStatusUpdate(item.id, item.status)}
                             >
                               {React.cloneElement(STATUS_FLOW[STATUS_FLOW[item.status]?.next]?.icon || <Truck />, { size: 18, color: '#fff' })}
                               <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', marginLeft: 8 }}>NEXT STEP</Text>
                             </TouchableOpacity>
                           )}
                           
                           <TouchableOpacity 
                             style={[styles.cancelBtn, { height: 40, paddingHorizontal: 15, flexDirection: 'row', gap: 5, flex: user?.role === 'ADMIN' ? 0 : 1, maxWidth: user?.role === 'ADMIN' ? 60 : 150 }]} 
                             onPress={() => handleCancelOrder(item.id)}
                           >
                             <Trash2 color="#fff" size={18} />
                             {user?.role !== 'ADMIN' && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>CANCEL ORDER</Text>}
                           </TouchableOpacity>
                         </View>
                       )}
                     </View>
                   </View>
                 ))}
               </View>
                 ))
               })()}
               <View style={{ height: 120 }} />
            </ScrollView>
          </View>
        )}
      </View>

      <Modal visible={showAddModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.headerSub}>INVENTORY SYSTEM</Text>
                <Text style={styles.ordersTitle}>{editingItem ? 'EDIT PROTOCOL' : 'NEW PROTOCOL'}</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowAddModal(false)}><X color="#fff" size={20} /></TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>ASSET NAME</Text>
              <TextInput style={styles.input} placeholder="e.g. Quantum Core" placeholderTextColor="#3f3f46" value={newItem.name} onChangeText={(t) => setNewItem({...newItem, name: t})} />
            </View>

            <View style={{ flexDirection: 'row', gap: 15 }}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>PRICE (USD)</Text>
                <TextInput style={styles.input} placeholder="0.00" placeholderTextColor="#3f3f46" value={newItem.price} onChangeText={(t) => setNewItem({...newItem, price: t})} keyboardType="numeric" />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>QUANTITY</Text>
                <TextInput style={styles.input} placeholder="0" placeholderTextColor="#3f3f46" value={newItem.quantity} onChangeText={(t) => setNewItem({...newItem, quantity: t})} keyboardType="numeric" />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>SKU IDENTIFIER</Text>
              <TextInput style={styles.input} placeholder="NEX-XXX-XXX" placeholderTextColor="#3f3f46" value={newItem.sku} onChangeText={(t) => setNewItem({...newItem, sku: t})} />
            </View>

            <TouchableOpacity style={[styles.button, { marginTop: 10 }]} onPress={handleSaveItem}>
              <Text style={styles.buttonText}>{editingItem ? 'COMMIT CHANGES' : 'INITIALIZE ASSET'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navItem} onPress={() => setView('dashboard')}>
          <LayoutDashboard color={view === 'dashboard' ? "#6366f1" : "#52525b"} size={26} />
          <Text style={[styles.navText, { color: view === 'dashboard' ? "#6366f1" : "#52525b" }]}>BOARD</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setView('inventory')}>
          <Box color={view === 'inventory' ? "#6366f1" : "#52525b"} size={26} />
          <Text style={[styles.navText, { color: view === 'inventory' ? "#6366f1" : "#52525b" }]}>ITEMS</Text>
        </TouchableOpacity>
        {user?.role !== 'ADMIN' && (
          <TouchableOpacity style={styles.navItem} onPress={() => setView('vault')}>
            <View>
              <ShoppingCart color={view === 'vault' ? "#6366f1" : "#52525b"} size={26} />
              {basket.length > 0 && (
                <View style={styles.navBadge}><Text style={styles.navBadgeText}>{basket.reduce((acc, c) => acc + c.quantity, 0)}</Text></View>
              )}
            </View>
            <Text style={[styles.navText, { color: view === 'vault' ? "#6366f1" : "#52525b" }]}>VAULT</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.navItem} onPress={() => setView('orders')}>
          <View>
            {user?.role === 'ADMIN' ? (
              <ShieldCheck color={view === 'orders' ? "#6366f1" : "#52525b"} size={26} />
            ) : (
              <ClipboardList color={view === 'orders' ? "#6366f1" : "#52525b"} size={26} />
            )}
            {orders.filter(o => o.status === 'PENDING').length > 0 && (
              <View style={styles.navBadge}><Text style={styles.navBadgeText}>{orders.filter(o => o.status === 'PENDING').length}</Text></View>
            )}
          </View>
          <Text style={[styles.navText, { color: view === 'orders' ? "#6366f1" : "#52525b" }]}>{user?.role === 'ADMIN' ? 'CONTROL' : 'MY ORDERS'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020203' },
  loginCard: { flex: 1, justifyContent: 'center', padding: 35 },
  title: { color: '#fff', fontSize: 48, fontWeight: '900', textAlign: 'center', letterSpacing: -2 },
  inputGroup: { marginTop: 40, gap: 12 },
  input: { backgroundColor: '#09090b', borderWidth: 1, borderColor: '#18181b', borderRadius: 25, padding: 24, color: '#fff', fontSize: 16 },
  toast: { position: 'absolute', top: 50, left: 20, right: 20, backgroundColor: '#6366f1', padding: 12, borderRadius: 15, zIndex: 9999, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#6366f1', shadowOpacity: 0.5, shadowRadius: 20, elevation: 15 },
  toastContent: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  toastText: { color: '#fff', fontWeight: '800', fontSize: 11, flex: 1 },
  toastClose: { padding: 4, marginLeft: 10, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10 },
  button: { backgroundColor: '#4f46e5', borderRadius: 25, padding: 24, marginTop: 15, alignItems: 'center', shadowColor: '#4f46e5', shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 },
  buttonText: { color: '#fff', fontWeight: '900', letterSpacing: 2, fontSize: 13 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 25, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: '#18181b' },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  headerSub: { color: '#6366f1', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },
  profileAvatar: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#6366f1', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#6366f1', fontSize: 18, fontWeight: '900' },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#10b981', borderWidth: 2, borderColor: '#020203' },
  navBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 15, borderTopWidth: 1, borderTopColor: '#18181b', backgroundColor: '#020203' },
  navItem: { alignItems: 'center', gap: 5 },
  navText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  navBadge: { position: 'absolute', right: -12, top: -8, backgroundColor: '#f43f5e', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#020203' },
  navBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statCard: { flex: 1, paddingRight: 10, borderRightWidth: 1, borderRightColor: '#18181b' },
  statValue: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 8 },
  statLabel: { color: '#52525b', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  sectionTitle: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 20, marginTop: 25 },
  analysisBox: { backgroundColor: '#09090b', padding: 25, borderRadius: 32, borderWidth: 1, borderColor: '#18181b', marginBottom: 25 },
  analysisRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 15 },
  adminActions: { gap: 10 },
  adminBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  analysisLabel: { color: '#52525b', fontSize: 10, fontWeight: '900', width: 75, textTransform: 'uppercase' },
  progressBg: { flex: 1, height: 6, backgroundColor: '#18181b', borderRadius: 3 },
  progressFill: { height: '100%', borderRadius: 3 },
  analysisValue: { color: '#fff', fontSize: 10, fontWeight: '900', width: 35, textAlign: 'right' },
  miniCard: { backgroundColor: '#09090b', padding: 15, borderRadius: 20, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#18181b' },
  miniIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center' },
  miniName: { color: '#fff', fontWeight: '800', fontSize: 14 },
  miniPrice: { color: '#52525b', fontSize: 10, fontWeight: '800' },
  itemCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#09090b', padding: 15, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#18181b' },
  itemInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartIconBox: { width: 45, height: 45, borderRadius: 15, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center' },
  itemName: { color: '#fff', fontSize: 14, fontWeight: '900' },
  itemStats: { color: '#52525b', fontSize: 10, fontWeight: '800', marginTop: 2 },
  itemPrice: { color: '#fff', fontSize: 18, fontWeight: '900' },
  fab: { position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center', shadowColor: '#4f46e5', shadowOpacity: 0.5, shadowRadius: 15, elevation: 10 },
  ordersHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 25, paddingVertical: 15 },
  ordersTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  dateHeader: { color: '#3f3f46', fontSize: 9, fontWeight: '900', paddingHorizontal: 25, marginTop: 20, marginBottom: 10, letterSpacing: 1 },
  orderCard: { flexDirection: 'row', backgroundColor: '#09090b', padding: 15, marginHorizontal: 20, borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: '#18181b' },
  orderIconBox: { width: 45, height: 45, borderRadius: 15, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center' },
  orderProductName: { color: '#fff', fontSize: 14, fontWeight: '900' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 8, fontWeight: '900' },
  metaContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  metaInfo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { color: '#a1a1aa', fontSize: 10, fontWeight: '800' },
  orderPrice: { color: '#fff', fontSize: 18, fontWeight: '900' },
  orderActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statusBtn: { width: 100, height: 36, borderRadius: 10, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  cancelBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#450a0a', justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#09090b', borderRadius: 30, padding: 30, borderWidth: 1, borderColor: '#18181b', shadowColor: '#6366f1', shadowOpacity: 0.2, shadowRadius: 30, elevation: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
  filterSection: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#18181b', backgroundColor: '#020203' },
  chipContainer: { paddingHorizontal: 20, gap: 10, paddingBottom: 15 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a' },
  activeChip: { backgroundColor: '#4f46e5', borderColor: '#6366f1' },
  chipText: { color: '#52525b', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  activeChipText: { color: '#fff' },
  avatarContainer: { paddingHorizontal: 20, gap: 20, paddingBottom: 10 },
  avatarBox: { alignItems: 'center', gap: 6, width: 60 },
  avatarCircle: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', justifyContent: 'center', alignItems: 'center' },
  activeAvatar: { opacity: 1 },
  avatarInitial: { color: '#52525b', fontSize: 16, fontWeight: '900' },
  avatarName: { color: '#52525b', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  badge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#e11d48', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 2, borderColor: '#020203', shadowColor: '#e11d48', shadowOpacity: 0.5, shadowRadius: 5 },
  badgeText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center' },
  formGroup: { marginBottom: 15 },
  inputLabel: { color: '#6366f1', fontSize: 9, fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
  input: { backgroundColor: '#020203', color: '#fff', borderRadius: 12, padding: 14, fontSize: 13, fontWeight: '700', borderWidth: 1, borderColor: '#18181b' },
  addVaultBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center' },
  vaultCounter: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', borderRadius: 15, padding: 5 },
  countBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#27272a', justifyContent: 'center', alignItems: 'center' },
  checkoutFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#09090b', padding: 25, borderTopWidth: 1, borderTopColor: '#18181b', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: '#52525b', fontSize: 10, fontWeight: '900' },
  totalValue: { color: '#fff', fontSize: 24, fontWeight: '900' },
  payBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 20 }
});
