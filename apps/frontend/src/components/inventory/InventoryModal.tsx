'use client';
import { X } from 'lucide-react';

interface Props {
  isAdd: boolean;
  itemForm: { name: string; price: string; quantity: string; sku: string };
  setItemForm: (form: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export default function InventoryModal({ isAdd, itemForm, setItemForm, onSubmit, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[4000] flex items-center justify-center p-4 animate-in fade-in">
      <div className="glass-dark w-full max-w-lg p-8 rounded-[2.5rem] border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{isAdd ? 'Inject Resource' : 'Recalibrate Item'}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
        </div>
        <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <label className="text-[7px] font-black text-zinc-500 uppercase tracking-widest ml-1">Label</label>
            <input required type="text" placeholder="RESOURCE NAME" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold text-xs focus:border-indigo-500 outline-none transition-all" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[7px] font-black text-zinc-500 uppercase tracking-widest ml-1">Credits</label>
            <input required type="number" placeholder="PRICE" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold text-xs focus:border-indigo-500 outline-none transition-all" value={itemForm.price} onChange={e => setItemForm({ ...itemForm, price: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[7px] font-black text-zinc-500 uppercase tracking-widest ml-1">Volume</label>
            <input required type="number" placeholder="QUANTITY" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold text-xs focus:border-indigo-500 outline-none transition-all" value={itemForm.quantity} onChange={e => setItemForm({ ...itemForm, quantity: e.target.value })} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-[7px] font-black text-zinc-500 uppercase tracking-widest ml-1">Serial SKU</label>
            <input required type="text" placeholder="UNIQUE IDENTIFIER" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold text-xs focus:border-indigo-500 outline-none transition-all" value={itemForm.sku} onChange={e => setItemForm({ ...itemForm, sku: e.target.value })} />
          </div>
          <button className="col-span-2 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] mt-4 hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20">
            {isAdd ? 'Deploy Resource' : 'Apply Calibration'}
          </button>
        </form>
      </div>
    </div>
  );
}
