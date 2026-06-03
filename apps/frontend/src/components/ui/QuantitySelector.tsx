'use client';
import { Minus, Plus } from 'lucide-react';

interface Props {
  item: { id: string; name: string; price: string | number };
  basketItem: { quantity: number };
  onAdd: (item: any) => void;
  onRemove: (productId: string) => void;
}

export default function QuantitySelector({ item, basketItem, onAdd, onRemove }: Props) {
  return (
    <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-lg border border-indigo-500/10">
      <button onClick={() => onRemove(item.id)} className="p-1.5 text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-all active:scale-90">
        <Minus className="w-3 h-3" />
      </button>
      <span className="font-black text-white text-[10px] w-4 text-center">{basketItem.quantity}</span>
      <button onClick={() => onAdd(item)} className="p-1.5 text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-all active:scale-90">
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}
