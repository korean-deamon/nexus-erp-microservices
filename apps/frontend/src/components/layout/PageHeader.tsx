'use client';
import { Bell, CreditCard } from 'lucide-react';
import { BasketItem, Notification, User } from '@/types';

interface Props {
  activeTab: string;
  currentUser: User | null;
  isAdmin: boolean;
  basket: BasketItem[];
  notifications: Notification[];
  unreadCount: number;
  showNotifDropdown: boolean;
  setShowNotifDropdown: (v: boolean) => void;
  setShowVault: (v: boolean) => void;
}

export default function PageHeader({ activeTab, currentUser, isAdmin, basket, notifications, unreadCount, showNotifDropdown, setShowNotifDropdown, setShowVault }: Props) {
  return (
    <header className="hidden lg:flex justify-between items-end mb-8">
      <div>
        <h2 className="text-4xl font-black uppercase tracking-tighter gradient-text">{activeTab}</h2>
        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400/60 mt-1">Operator: <span className="text-indigo-300">{currentUser?.name}</span></p>
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
                ) : notifications.map(n => (
                  <div key={n.id} className="text-[9px] p-4 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-white">{n.message}</p>
                    <p className="text-zinc-600 text-[7px] mt-1 uppercase">{n.time}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-xs shadow-lg">
          {currentUser?.name?.substring(0, 1).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
