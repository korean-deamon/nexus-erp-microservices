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
  LogOut, Layers, Box, TrendingUp, Wallet, Plus, Trash2, X, Bell, Activity, CheckCircle, XCircle, Clock, Database, ChevronRight, User, Calendar, Truck, Briefcase
} from 'lucide-react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';

// Status Sequence & Colors
const STATUS_FLOW = {
  'PENDING': { next: 'SHIPPED', color: '#f59e0b', bg: '#451a03', icon: <Clock size={10} color="#f59e0b" /> },
  'SHIPPED': { next: 'DELIVERED', color: '#3b82f6', bg: '#1e3a8a', icon: <Truck size={10} color="#3b82f6" /> },
  'DELIVERED': { next: 'COMPLETED', color: '#10b981', bg: '#064e3b', icon: <Package size={10} color="#10b981" /> },
  'COMPLETED': { next: null, color: '#10b981', bg: '#064e3b', icon: <CheckCircle size={10} color="#10b981" /> },
  'CANCELLED': { next: null, color: '#f43f5e', bg: '#450a0a', icon: <XCircle size={10} color="#f43f5e" /> }
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
        if (data.type === 'REFRESH_ORDERS') {
          Vibration.vibrate([0, 200, 100, 200]);
          showToast(`🚀 INCOMING PROTOCOL: New order detected in network.`);
          fetchData(); // Trigger immediate fetch
        }
        if (data.type === 'REFRESH_INV') {
          fetchData(); // Silent sync for inventory
        }
      });

      return () => socket.disconnect();
    }
  }, [isLoggedIn, token]);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [invRes, orderRes] = await Promise.all([
        axios.get(`${API_BASE}/api/v1/inventory`, { headers }),
        axios.get(`${API_BASE}/api/v1/orders`, { headers })
      ]);
      setInventory(invRes.data);
      setOrders(orderRes.data);
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
    } catch (err) { alert('Access Denied'); } finally { setLoading(false); }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    setIsLoggedIn(false);
    setToken(null);
    setUser(null);
    setView('login');
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
    const revenue = orders.filter(o => o.status !== 'CANCELLED').reduce((acc, curr) => acc + (parseFloat(curr.totalAmount) || 0), 0);
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
          <Bell color="#fff" size={16} />
          <Text style={styles.toastText}>{notification}</Text>
        </View>
      )}

      <View style={styles.header}>
        <View><Text style={styles.headerTitle}>{view.toUpperCase()}</Text><Text style={styles.headerSub}>{user?.role}: {user?.name}</Text></View>
        <TouchableOpacity onPress={handleLogout}><LogOut color="#f43f5e" size={26} /></TouchableOpacity>
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
                <View style={styles.itemInfo}>
                  <View style={styles.cartIconBox}><ShoppingCart color="#6366f1" size={24} /></View>
                  <View><Text style={styles.itemName}>{item.name}</Text><Text style={styles.itemStats}>SKU: {item.sku} • QTY: {item.quantity}</Text></View>
                </View>
                {user?.role === 'ADMIN' ? (
                  <View style={styles.adminActions}>
                    <TouchableOpacity onPress={() => { setEditingItem(item); setNewItem({ name: item.name, price: item.price.toString(), quantity: item.quantity.toString(), sku: item.sku }); setShowAddModal(true); }}><Plus color="#6366f1" size={22} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => { Alert.alert('Purge', 'Delete asset?', [{ text: 'No' }, { text: 'Yes', onPress: async () => { await axios.delete(`${API_BASE}/api/v1/inventory/${item.id}`, { headers: { Authorization: `Bearer ${token}` }}); fetchData(); } }]) }}><Trash2 color="#f43f5e" size={22} /></TouchableOpacity>
                  </View>
                ) : <Text style={styles.itemPrice}>${parseFloat(item.price).toLocaleString()}</Text>}
              </View>
            )} />
            {user?.role === 'ADMIN' && <TouchableOpacity style={styles.fab} onPress={() => { setEditingItem(null); setNewItem({ name: '', price: '', quantity: '', sku: '' }); setShowAddModal(true); }}><Plus color="#fff" size={32} /></TouchableOpacity>}
          </View>
        )}

        {view === 'orders' && (
          <ScrollView style={{ flex: 1 }}>
            <View style={styles.ordersHeader}>
              <Briefcase color="#6366f1" size={24} />
              <Text style={styles.ordersTitle}>INCOMING ORDERS</Text>
            </View>
            
            {groupedOrders.map(([date, items]) => (
              <View key={date}>
                <Text style={styles.dateHeader}>{date.toUpperCase()}</Text>
                {items.map(item => (
                  <View key={item.id} style={styles.orderCard}>
                    <View style={styles.orderIconBox}><ShoppingCart color={item.status === 'COMPLETED' ? '#10b981' : '#f59e0b'} size={24} /></View>
                    <View style={{ flex: 1, marginLeft: 15 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.orderProductName}>{item.productName.toUpperCase()}</Text>
                        <Text style={{ color: '#52525b', fontWeight: '900', fontSize: 12 }}>X{item.quantity}</Text>
                      </View>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 5 }}>
                        <View style={[styles.statusBadge, { backgroundColor: STATUS_FLOW[item.status]?.bg || '#18181b' }]}>
                          <Text style={[styles.statusText, { color: STATUS_FLOW[item.status]?.color || '#fff' }]}>{item.status}</Text>
                        </View>
                        <View style={styles.metaInfo}><User size={10} color="#6366f1" /><Text style={styles.metaText}>{item.user?.name || 'ART'}</Text></View>
                        <View style={styles.metaInfo}><Clock size={10} color="#52525b" /><Text style={styles.metaText}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></View>
                      </View>
                    </View>
                    
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.orderPrice}>${parseFloat(item.totalAmount || 0).toLocaleString()}</Text>
                      {user?.role === 'ADMIN' && item.status !== 'CANCELLED' && item.status !== 'COMPLETED' && (
                        <View style={styles.orderActions}>
                          <TouchableOpacity style={styles.statusBtn} onPress={() => handleStatusUpdate(item.id, item.status)}>
                            <Truck color="#fff" size={16} />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancelOrder(item.id)}>
                            <Trash2 color="#fff" size={16} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ))}
            <View style={{ height: 120 }} />
          </ScrollView>
        )}
      </View>

      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.headerTitle}>{editingItem ? 'Edit Protocol' : 'New Protocol'}</Text><TouchableOpacity onPress={() => setShowAddModal(false)}><X color="#fff" /></TouchableOpacity></View>
            <TextInput placeholder="Label" placeholderTextColor="#52525b" style={styles.input} value={newItem.name} onChangeText={(t) => setNewItem({...newItem, name: t})} />
            <TextInput placeholder="SKU" placeholderTextColor="#52525b" style={styles.input} value={newItem.sku} onChangeText={(t) => setNewItem({...newItem, sku: t})} />
            <View style={{ flexDirection: 'row', gap: 15 }}>
              <TextInput placeholder="Price" placeholderTextColor="#52525b" style={[styles.input, {flex: 1}]} keyboardType="numeric" value={newItem.price} onChangeText={(t) => setNewItem({...newItem, price: t})} />
              <TextInput placeholder="Units" placeholderTextColor="#52525b" style={[styles.input, {flex: 1}]} keyboardType="numeric" value={newItem.quantity} onChangeText={(t) => setNewItem({...newItem, quantity: t})} />
            </View>
            <TouchableOpacity style={styles.button} onPress={handleSaveItem}><Text style={styles.buttonText}>SYNC PROTOCOL</Text></TouchableOpacity>
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
        <TouchableOpacity style={styles.navItem} onPress={() => setView('orders')}>
          <View>
            <CheckCircle color={view === 'orders' ? "#6366f1" : "#52525b"} size={26} />
            {orders.filter(o => o.status === 'PENDING').length > 0 && (
              <View style={styles.navBadge}><Text style={styles.navBadgeText}>{orders.filter(o => o.status === 'PENDING').length}</Text></View>
            )}
          </View>
          <Text style={[styles.navText, { color: view === 'orders' ? "#6366f1" : "#52525b" }]}>CONTROL</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={handleLogout}>
          <LogOut color="#f43f5e" size={26} />
          <Text style={[styles.navText, { color: "#f43f5e" }]}>EXIT</Text>
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
  button: { backgroundColor: '#4f46e5', borderRadius: 25, padding: 24, marginTop: 15, alignItems: 'center', shadowColor: '#4f46e5', shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 },
  buttonText: { color: '#fff', fontWeight: '900', letterSpacing: 2, fontSize: 13 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 25, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: '#18181b' },
  headerTitle: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  headerSub: { color: '#6366f1', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 },
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
  analysisLabel: { color: '#52525b', fontSize: 10, fontWeight: '900', width: 75, textTransform: 'uppercase' },
  progressBg: { flex: 1, height: 6, backgroundColor: '#18181b', borderRadius: 3 },
  progressFill: { height: '100%', borderRadius: 3 },
  analysisValue: { color: '#fff', fontSize: 12, fontWeight: '900', width: 40, textAlign: 'right' },
  miniCard: { backgroundColor: '#09090b', padding: 20, borderRadius: 28, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#18181b' },
  miniIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center' },
  miniName: { color: '#fff', fontWeight: '800', fontSize: 16 },
  miniPrice: { color: '#52525b', fontSize: 12, fontWeight: '800' },
  itemCard: { backgroundColor: '#09090b', borderRadius: 32, padding: 25, marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#18181b' },
  itemInfo: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  cartIconBox: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center' },
  itemName: { color: '#fff', fontWeight: '800', fontSize: 18 },
  itemStats: { color: '#52525b', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginTop: 4 },
  itemPrice: { color: '#fff', fontSize: 22, fontWeight: '900' },
  fab: { position: 'absolute', right: 25, bottom: 25, width: 75, height: 75, borderRadius: 38, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center', shadowColor: '#4f46e5', shadowOpacity: 0.6, shadowRadius: 20, elevation: 15 },
  ordersHeader: { flexDirection: 'row', alignItems: 'center', gap: 15, padding: 25, borderBottomWidth: 1, borderBottomColor: '#18181b' },
  ordersTitle: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -1 },
  dateHeader: { color: '#3f3f46', fontSize: 10, fontWeight: '900', paddingHorizontal: 25, marginTop: 25, marginBottom: 15, letterSpacing: 1 },
  orderCard: { backgroundColor: '#09090b', padding: 22, marginHorizontal: 20, borderRadius: 28, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#18181b' },
  orderIconBox: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center' },
  orderProductName: { color: '#fff', fontSize: 17, fontWeight: '900' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 9, fontWeight: '900' },
  metaInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: '#52525b', fontSize: 10, fontWeight: '800' },
  orderPrice: { color: '#fff', fontSize: 24, fontWeight: '900' },
  orderActions: { flexDirection: 'row', gap: 10, marginTop: 15 },
  statusBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center' },
  cancelBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#450a0a', justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#09090b', borderTopLeftRadius: 50, borderTopRightRadius: 50, padding: 40, borderTopWidth: 1, borderTopColor: '#18181b' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 35 },
  toast: { position: 'absolute', top: 60, left: 20, right: 20, backgroundColor: '#4f46e5', padding: 18, borderRadius: 20, zIndex: 9999, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#4f46e5', shadowOpacity: 0.6, shadowRadius: 20, elevation: 15 },
  toastText: { color: '#fff', fontWeight: '800', fontSize: 12 }
});
