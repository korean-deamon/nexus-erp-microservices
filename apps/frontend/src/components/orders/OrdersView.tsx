'use client';
import { CheckCircle, Clock, Database, PackageCheck, ShoppingBag, ShoppingCart, Trash2, Truck, User, Users } from 'lucide-react';
import { Order, User as UserType } from '@/types';
import { getStatusColor, groupOrders } from '@/utils/helpers';

interface Props {
  activeTab: string;
  orders: Order[];
  users: UserType[];
  currentUser: UserType | null;
  isAdmin: boolean;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  userFilter: string | null;
  setUserFilter: (id: string | null) => void;
  onStatusUpdate: (id: string, status: string) => void;
  onCancel: (id: string) => void;
}

export default function OrdersView({ activeTab, orders, users, currentUser, isAdmin, statusFilter, setStatusFilter, userFilter, setUserFilter, onStatusUpdate, onCancel }: Props) {
  const relevant = isAdmin && activeTab === 'admin' ? orders : orders.filter(o => o.userId === currentUser?.id);
  let filtered = [...relevant];
  if (statusFilter !== 'ALL') filtered = filtered.filter(o => o.status === statusFilter);
  if (isAdmin && activeTab === 'admin' && userFilter) filtered = filtered.filter(o => o.userId === userFilter);
  const grouped = groupOrders(filtered);

  return (
    <div className="mt-12 space-y-8">
      <div className="border-b border-white/5 pb-4">
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
          <ShoppingBag className="w-6 h-6 text-indigo-500" />
          {activeTab === 'admin' ? 'Incoming Orders' : 'My Operations'}
        </h2>
      </div>

      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {['ALL', 'PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'COMPLETED'].map(s => {
            const count = s === 'ALL' ? relevant.length : relevant.filter(o => o.status === s).length;
            return (
              <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${statusFilter === s ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'}`}>
                <span>{s}</span>
                {count > 0 && <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${statusFilter === s ? 'bg-white/20 text-white' : 'bg-white/5 text-zinc-400'}`}>{count}</span>}
              </button>
            );
          })}
        </div>

        {activeTab === 'admin' && (
          <div className="flex items-center gap-6 overflow-x-auto pb-4 custom-scrollbar">
            <button onClick={() => setUserFilter(null)} className="flex flex-col items-center gap-2 group min-w-[60px]">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border relative ${!userFilter ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/5 text-zinc-500 group-hover:bg-white/10'}`}>
                <Users className="w-5 h-5" />
                {orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length > 0 && (
                  <div className="absolute -top-1 -right-1 bg-rose-600 border border-rose-500/30 px-1.5 py-0.5 rounded-lg text-[7px] font-black text-white">
                    {orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length}
                  </div>
                )}
              </div>
              <span className={`text-[8px] font-black uppercase tracking-tighter ${!userFilter ? 'text-indigo-400' : 'text-zinc-600'}`}>All Users</span>
            </button>
            {users.map(u => {
              const activeCount = orders.filter(o => o.userId === u.id && o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length;
              return (
                <button key={u.id} onClick={() => setUserFilter(u.id)} className="flex flex-col items-center gap-2 group min-w-[60px]">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border font-black text-lg relative ${userFilter === u.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/5 text-zinc-500 group-hover:bg-white/10'}`}>
                    {u.name.charAt(0)}
                    {activeCount > 0 && (
                      <div className={`absolute -top-1 -right-1 px-1.5 py-0.5 rounded-lg text-[7px] font-black border ${userFilter === u.id ? 'bg-white text-indigo-600 border-white' : 'bg-rose-600 text-white border-rose-500/30'}`}>{activeCount}</div>
                    )}
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-tighter ${userFilter === u.id ? 'text-indigo-400' : 'text-zinc-600'}`}>{u.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        {filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center opacity-30">
            <Database className="w-16 h-16 mb-4" />
            <p className="font-black text-xs uppercase tracking-[0.2em]">No matching protocols found</p>
          </div>
        ) : Object.entries(grouped).map(([date, items]) => (
          <div key={date} className="space-y-3">
            <p className="text-zinc-600 font-black uppercase text-[7px] tracking-widest pl-2">{date}</p>
            {items.map(o => (
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
                  <p className="font-black text-white text-xl tracking-tighter tabular-nums">${parseFloat(String(o.totalAmount)).toLocaleString()}</p>
                  <div className="flex gap-2">
                    {isAdmin && activeTab === 'admin' && (
                      <>
                        {o.status === 'PENDING'   && <button onClick={() => onStatusUpdate(o.id, 'SHIPPED')}    className="p-2.5 bg-indigo-600 text-white rounded-lg hover:shadow-lg hover:shadow-indigo-600/30 transition-all"><Truck className="w-4 h-4" /></button>}
                        {o.status === 'SHIPPED'   && <button onClick={() => onStatusUpdate(o.id, 'DELIVERED')}  className="p-2.5 bg-sky-600 text-white rounded-lg hover:shadow-lg hover:shadow-sky-600/30 transition-all"><PackageCheck className="w-4 h-4" /></button>}
                        {o.status === 'DELIVERED' && <button onClick={() => onStatusUpdate(o.id, 'COMPLETED')}  className="p-2.5 bg-emerald-600 text-white rounded-lg hover:shadow-lg hover:shadow-emerald-600/30 transition-all"><CheckCircle className="w-4 h-4" /></button>}
                      </>
                    )}
                    {o.status !== 'COMPLETED' && o.status !== 'CANCELLED' && (
                      <button onClick={() => onCancel(o.id)} className="p-2.5 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
