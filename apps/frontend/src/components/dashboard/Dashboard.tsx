'use client';
import { BarChart3, PieChart, ShoppingCart } from 'lucide-react';
import { Order, Stats, User } from '@/types';
import { getStatusColor } from '@/utils/helpers';

interface Props {
  stats: Stats;
  isAdmin: boolean;
  orders: Order[];
  currentUser: User | null;
}

export default function Dashboard({ stats, isAdmin, orders, currentUser }: Props) {
  const recentOrders = (isAdmin ? orders : orders.filter(o => o.userId === currentUser?.id)).slice(0, 4);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="stat-card glass p-6 rounded-3xl border border-white/10">
          <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest">Revenue Flow</p>
          <p className="text-2xl md:text-4xl font-black text-white mt-3 tracking-tighter">${stats.revenue.toLocaleString()}</p>
          <div className="mt-4 h-0.5 w-full bg-gradient-to-r from-indigo-500/40 via-violet-500/20 to-transparent rounded-full" />
        </div>
        <div className="stat-card glass p-6 rounded-3xl border border-white/10">
          <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest">Total Events</p>
          <p className="text-2xl md:text-4xl font-black text-white mt-3 tracking-tighter">{stats.events}</p>
          <div className="mt-4 h-0.5 w-full bg-gradient-to-r from-violet-500/40 via-indigo-500/20 to-transparent rounded-full" />
        </div>
        <div className="stat-card glass p-6 rounded-3xl border border-white/10">
          <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest">{isAdmin ? 'Stock Alerts' : 'Active Orders'}</p>
          <p className={`text-2xl md:text-4xl font-black mt-3 tracking-tighter ${stats.secondary > 0 ? 'text-rose-500' : 'text-white'}`}>{stats.secondary}</p>
          <div className={`mt-4 h-0.5 w-full bg-gradient-to-r ${stats.secondary > 0 ? 'from-rose-500/40 via-rose-500/20' : 'from-emerald-500/40 via-emerald-500/20'} to-transparent rounded-full`} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass p-6 md:p-8 rounded-[2rem] border-white/5">
          <h3 className="font-black text-white uppercase text-[9px] tracking-widest mb-6 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-400" /> Performance Analysis
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Completed', key: 'COMPLETED', color: 'bg-emerald-500' },
              { label: 'Delivered', key: 'DELIVERED', color: 'bg-sky-500' },
              { label: 'Shipped',   key: 'SHIPPED',   color: 'bg-indigo-500' },
              { label: 'Pending',   key: 'PENDING',   color: 'bg-amber-500' },
              { label: 'Cancelled', key: 'CANCELLED', color: 'bg-rose-500' },
            ].map(bar => {
              const count = stats.status[bar.key] || 0;
              const pct = stats.events > 0 ? Math.round((count / stats.events) * 100) : 0;
              return (
                <div key={bar.label}>
                  <div className="flex justify-between text-[7px] font-black uppercase text-zinc-500 mb-1.5">
                    <span>{bar.label}</span>
                    <span className="text-white">{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full ${bar.color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass p-6 md:p-8 rounded-[2rem] border-white/5">
          <h3 className="font-black text-white uppercase text-[9px] tracking-widest mb-6 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" /> Recent Operations
          </h3>
          <div className="space-y-3">
            {recentOrders.map(o => (
              <div key={o.id} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getStatusColor(o.status)} bg-white/5`}>
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <p className="text-[9px] font-black text-white uppercase truncate max-w-[100px]">{o.productName}</p>
                </div>
                <p className="text-xs font-black text-white tabular-nums">${parseFloat(String(o.totalAmount)).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
