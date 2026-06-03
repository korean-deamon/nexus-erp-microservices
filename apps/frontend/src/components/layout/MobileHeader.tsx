'use client';
import { Bell, CreditCard, Layers } from 'lucide-react';
import { BasketItem, User } from '@/types';

interface Props {
  currentUser: User | null;
  isAdmin: boolean;
  basket: BasketItem[];
  unreadCount: number;
  setShowNotifDropdown: (v: boolean) => void;
  setShowVault: (v: boolean) => void;
}

export default function MobileHeader({ currentUser, isAdmin, basket, unreadCount, setShowNotifDropdown, setShowVault }: Props) {
  return (
    <header className="lg:hidden flex items-center justify-between p-4 border-b border-white/5 glass-dark sticky top-0 z-[100]">
      <div className="flex items-center gap-2">
        <Layers className="text-indigo-500 w-6 h-6" />
        <span className="font-black text-lg uppercase tracking-tighter">Nexus</span>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => setShowNotifDropdown(true)} className="relative p-2 bg-white/5 rounded-lg">
          <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-indigo-400' : 'text-zinc-600'}`} />
          {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 rounded-full text-[8px] flex items-center justify-center font-black">{unreadCount}</span>}
        </button>
        {!isAdmin && (
          <button onClick={() => setShowVault(true)} className="relative p-2 bg-white/5 rounded-lg">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            {basket.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full text-[8px] flex items-center justify-center font-black">{basket.length}</span>}
          </button>
        )}
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-[10px]">
          {currentUser?.name?.substring(0, 2).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
