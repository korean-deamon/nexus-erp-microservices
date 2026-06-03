'use client';
import { Layers, LogOut } from 'lucide-react';
import { Order, Tab, User } from '@/types';

interface Props {
  tabs: Tab[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin: boolean;
  orders: Order[];
  currentUser: User | null;
  onLogout: () => void;
}

export default function Sidebar({ tabs, activeTab, setActiveTab, isAdmin, orders, currentUser, onLogout }: Props) {
  return (
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
              className={`w-full p-3.5 rounded-2xl flex items-center gap-4 transition-all relative ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-zinc-500 hover:bg-white/5 hover:text-white'}`}
            >
              <div className="relative">
                <tab.icon className="w-4 h-4" />
                {((tab.id === 'admin' && isAdmin) || (tab.id === 'orders' && !isAdmin)) && (() => {
                  const target = isAdmin ? orders : orders.filter(o => o.userId === currentUser?.id);
                  const count = target.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length;
                  return count > 0 ? (
                    <span className="absolute -top-2 -right-2 bg-rose-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-lg shadow-rose-600/40">{count}</span>
                  ) : null;
                })()}
              </div>
              <span className="font-black uppercase text-[10px] tracking-[0.2em]">{tab.name}</span>
            </button>
          )
        ))}
      </nav>
      <div className="mt-auto">
        <button onClick={onLogout} className="w-full p-3.5 text-rose-500/60 font-black uppercase text-[9px] tracking-widest flex items-center gap-3 hover:text-rose-500 transition-all">
          <LogOut className="w-4 h-4" /> Exit
        </button>
      </div>
    </aside>
  );
}
