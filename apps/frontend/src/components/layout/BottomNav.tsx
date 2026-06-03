'use client';
import { LogOut } from 'lucide-react';
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

export default function BottomNav({ tabs, activeTab, setActiveTab, isAdmin, orders, currentUser, onLogout }: Props) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass-dark border-t border-white/10 p-3 flex justify-around items-center z-[150] shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      {tabs.map(tab => (
        (!tab.admin || isAdmin) && (!tab.hideForAdmin || !isAdmin) && (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 transition-all relative ${activeTab === tab.id ? 'text-indigo-500 scale-110' : 'text-zinc-600 hover:text-zinc-400'}`}
          >
            <tab.icon className="w-5 h-5" />
            {((tab.id === 'admin' && isAdmin) || (tab.id === 'orders' && !isAdmin)) && (() => {
              const target = isAdmin ? orders : orders.filter(o => o.userId === currentUser?.id);
              const count = target.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length;
              return count > 0 ? (
                <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce">{count}</span>
              ) : null;
            })()}
            <span className="text-[7px] font-black uppercase tracking-widest">{tab.name}</span>
          </button>
        )
      ))}
      <button onClick={onLogout} className="flex flex-col items-center gap-1 p-2 text-rose-500/50">
        <LogOut className="w-5 h-5" />
        <span className="text-[7px] font-black uppercase tracking-tighter">Exit</span>
      </button>
    </nav>
  );
}
