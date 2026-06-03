'use client';
import { Bell, X } from 'lucide-react';
import { Notification } from '@/types';

interface Props {
  toast: Notification;
  onClose: () => void;
}

export default function Toast({ toast, onClose }: Props) {
  return (
    <div className="fixed top-6 right-6 z-[2000] animate-in slide-in-from-right-5 duration-500 w-full max-w-xs px-2">
      <div className="bg-zinc-900/90 border border-indigo-500/50 shadow-2xl p-4 rounded-xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-indigo-500" />
        <button onClick={onClose} className="absolute top-3 right-3 text-zinc-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Bell className="w-5 h-5 text-white animate-bounce" />
          </div>
          <div className="flex-1 pr-4">
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">{toast.title || 'Notification'}</p>
            <p className="text-[11px] font-bold text-white tracking-tight leading-snug">{toast.message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
