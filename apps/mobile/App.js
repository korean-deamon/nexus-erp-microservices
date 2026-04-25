import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  FlatList, SafeAreaView, StatusBar, ActivityIndicator, ScrollView, Modal, Alert, Animated
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  Package, ShoppingCart, LayoutDashboard, 
  LogOut, Layers, Box, TrendingUp, Wallet, Plus, Trash2, X, Bell
} from 'lucide-react-native';

const API_BASE = 'http://10.50.3.248:8080';

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
  const [newItem, setNewItem] = useState({ name: '', price: '', quantity: '', sku: '' });

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

  useEffect(() => {
    if (isLoggedIn && token) {
      fetchData();
      const socket = io(API_BASE, { transports: ['websocket'] });
      
      socket.on('notification', (data) => {
        if (data.type === 'REFRESH_INV') {
          showToast(`System Update: New Asset synchronization complete.`);
          fetchData();
        }
        if (data.type === 'REFRESH_ORDERS') {
          showToast(`Order Update: Protocol synchronization complete.`);
          fetchData();
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

  const handleAuth = async () => {
    setLoading(true);
    try {
      const endpoint = view === 'login' ? '/api/v1/auth/login' : '/api/v1/auth/register';
      const res = await axios.post(`${API_BASE}${endpoint}`, authForm);
      const { user, token } = res.data;
      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      setToken(token);
      setUser(user);
      setIsLoggedIn(true);
      setView('dashboard');
    } catch (err) { alert('Auth Failed'); } finally { setLoading(false); }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    setIsLoggedIn(false);
    setToken(null);
    setUser(null);
    setView('login');
  };

  const handleAddItem = async () => {
    try {
      await axios.post(`${API_BASE}/api/v1/inventory`, newItem, { headers: { Authorization: `Bearer ${token}` }});
      setShowAddModal(false);
      setNewItem({ name: '', price: '', quantity: '', sku: '' });
      fetchData();
    } catch (err) { alert('Failed to add'); }
  };

  const handleDeleteItem = (id) => {
    Alert.alert('Protocol Delta', 'Delete this record?', [
      { text: 'Cancel' },
      { text: 'Delete', onPress: async () => {
        await axios.delete(`${API_BASE}/api/v1/inventory/${id}`, { headers: { Authorization: `Bearer ${token}` }});
        fetchData();
      }}
    ]);
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loginCard}>
          <Layers color="#6366f1" size={60} style={{ alignSelf: 'center', marginBottom: 20 }} />
          <Text style={styles.title}>Nexus<Text style={{ color: '#6366f1' }}>.Pro</Text></Text>
          <View style={styles.inputGroup}>
            {view === 'register' && <TextInput placeholder="Name" placeholderTextColor="#52525b" style={styles.input} onChangeText={(t) => setAuthForm({...authForm, name: t})} />}
            <TextInput placeholder="Email" placeholderTextColor="#52525b" style={styles.input} autoCapitalize="none" onChangeText={(t) => setAuthForm({...authForm, email: t})} />
            <TextInput placeholder="Key" placeholderTextColor="#52525b" secureTextEntry style={styles.input} onChangeText={(t) => setAuthForm({...authForm, password: t})} />
          </View>
          <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{view.toUpperCase()}</Text>}
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
        <TouchableOpacity onPress={handleLogout}><LogOut color="#f43f5e" size={24} /></TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {view === 'dashboard' && (
          <ScrollView style={{ padding: 20 }}>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}><TrendingUp color="#6366f1" size={20} /><Text style={styles.statValue}>{inventory.length}</Text><Text style={styles.statLabel}>Assets</Text></View>
              <View style={styles.statCard}><ShoppingCart color="#10b981" size={20} /><Text style={styles.statValue}>{orders.length}</Text><Text style={styles.statLabel}>Orders</Text></View>
            </View>
            <View style={styles.wideCard}>
              <Wallet color="#f59e0b" size={24} />
              <Text style={{ color: '#fff', fontWeight: 'bold', marginTop: 10 }}>Global Revenue</Text>
              <Text style={styles.headerTitle}>$42,850.00</Text>
            </View>
          </ScrollView>
        )}
        
        {view === 'inventory' && (
          <View style={{ flex: 1 }}>
            <FlatList data={inventory} keyExtractor={(i) => i.id} contentContainerStyle={{ padding: 20 }} renderItem={({ item }) => (
              <View style={styles.itemCard}>
                <View style={styles.itemInfo}>
                  <Box color="#6366f1" size={24} />
                  <View><Text style={styles.itemName}>{item.name}</Text><Text style={styles.itemStats}>QTY: {item.quantity}</Text></View>
                </View>
                {user?.role === 'ADMIN' ? (
                  <View style={styles.adminActions}>
                    <TouchableOpacity onPress={() => handleDeleteItem(item.id)}><Trash2 color="#f43f5e" size={20} /></TouchableOpacity>
                  </View>
                ) : <Text style={styles.itemPrice}>${item.price}</Text>}
              </View>
            )} />
            {user?.role === 'ADMIN' && <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}><Plus color="#fff" size={28} /></TouchableOpacity>}
          </View>
        )}

        {view === 'orders' && (
          <FlatList data={orders} keyExtractor={(i) => i.id} contentContainerStyle={{ padding: 20 }} renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <View><Text style={styles.itemName}>Order #{item.id.substring(0,6)}</Text><Text style={styles.itemStats}>{item.status}</Text></View>
              <Text style={styles.itemPrice}>${item.total_price}</Text>
            </View>
          )} />
        )}
      </View>

      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.headerTitle}>New Asset</Text><TouchableOpacity onPress={() => setShowAddModal(false)}><X color="#fff" /></TouchableOpacity></View>
            <TextInput placeholder="Item Name" placeholderTextColor="#52525b" style={styles.input} onChangeText={(t) => setNewItem({...newItem, name: t})} />
            <TextInput placeholder="SKU" placeholderTextColor="#52525b" style={styles.input} onChangeText={(t) => setNewItem({...newItem, sku: t})} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput placeholder="Price" placeholderTextColor="#52525b" style={[styles.input, {flex: 1}]} keyboardType="numeric" onChangeText={(t) => setNewItem({...newItem, price: t})} />
              <TextInput placeholder="Qty" placeholderTextColor="#52525b" style={[styles.input, {flex: 1}]} keyboardType="numeric" onChangeText={(t) => setNewItem({...newItem, quantity: t})} />
            </View>
            <TouchableOpacity style={styles.button} onPress={handleAddItem}><Text style={styles.buttonText}>COMMIT ASSET</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => setView('dashboard')}><LayoutDashboard color={view === 'dashboard' ? "#6366f1" : "#52525b"} size={24} /></TouchableOpacity>
        <TouchableOpacity onPress={() => setView('inventory')}><Package color={view === 'inventory' ? "#6366f1" : "#52525b"} size={24} /></TouchableOpacity>
        <TouchableOpacity onPress={() => setView('orders')}><ShoppingCart color={view === 'orders' ? "#6366f1" : "#52525b"} size={24} /></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020203' },
  loginCard: { flex: 1, justifyContent: 'center', padding: 30 },
  title: { color: '#fff', fontSize: 32, fontWeight: '900', textAlign: 'center' },
  inputGroup: { marginTop: 40, gap: 15 },
  input: { backgroundColor: '#09090b', borderWidth: 1, borderColor: '#18181b', borderRadius: 16, padding: 18, color: '#fff', marginBottom: 10 },
  button: { backgroundColor: '#4f46e5', borderRadius: 16, padding: 20, marginTop: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '900' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 25, borderBottomWidth: 1, borderBottomColor: '#18181b' },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
  headerSub: { color: '#6366f1', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  itemCard: { backgroundColor: '#09090b', borderRadius: 20, padding: 20, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#18181b' },
  itemInfo: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  itemName: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  itemStats: { color: '#52525b', fontSize: 10, textTransform: 'uppercase' },
  itemPrice: { color: '#fff', fontSize: 18, fontWeight: '900' },
  navBar: { flexDirection: 'row', justifyContent: 'space-around', padding: 20, borderTopWidth: 1, borderTopColor: '#18181b' },
  statsGrid: { flexDirection: 'row', gap: 15, marginBottom: 15 },
  statCard: { flex: 1, backgroundColor: '#09090b', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#18181b' },
  statValue: { color: '#fff', fontSize: 28, fontWeight: '900' },
  statLabel: { color: '#52525b', fontSize: 10, fontWeight: 'bold' },
  wideCard: { backgroundColor: '#09090b', padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#18181b' },
  adminActions: { flexDirection: 'row', gap: 15 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#09090b', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, borderTopWidth: 1, borderTopColor: '#18181b' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  toast: { position: 'absolute', top: 50, left: 20, right: 20, backgroundColor: '#4f46e5', padding: 15, borderRadius: 12, zIndex: 9999, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#4f46e5', shadowOpacity: 0.5, shadowRadius: 10 },
  toastText: { color: '#fff', fontWeight: 'bold', fontSize: 12 }
});
