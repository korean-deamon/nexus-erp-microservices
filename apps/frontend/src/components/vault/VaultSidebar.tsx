'use client';
import { Box, CreditCard, Trash2, X } from 'lucide-react';
import { BasketItem } from '@/types';
import QuantitySelector from '@/components/ui/QuantitySelector';

interface Props {
  basket: BasketItem[];
  paymentMethod: string;
  setPaymentMethod: (m: string) => void;
  onClose: () => void;
  onCheckout: () => void;
  onAddToBasket: (item: any) => void;
  onRemoveFromBasket: (productId: string) => void;
  onDeleteItem: (id: string) => void;
}

export default function VaultSidebar({ basket, paymentMethod, setPaymentMethod, onClose, onCheckout, onAddToBasket, onRemoveFromBasket, onDeleteItem }: Props) {
  const total = basket.reduce((acc, i) => acc + parseFloat(String(i.price)) * i.quantity, 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-2xl z-[300] flex items-center justify-end animate-in fade-in">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="glass-dark w-full max-w-sm h-full border-l border-white/10 p-6 flex flex-col relative animate-in slide-in-from-right duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
        <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3 mb-8">
          <CreditCard className="text-indigo-500 w-6 h-6" /> Vault
        </h3>
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {basket.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20">
              <Box className="w-12 h-12 mb-3" />
              <p className="font-black text-[8px] uppercase tracking-widest">Vault Empty</p>
            </div>
          ) : basket.map(item => (
            <div key={item.id} className="p-4 bg-white/[0.03] rounded-xl border border-white/5 flex justify-between items-center group">
              <div>
                <p className="font-black text-white text-[10px] uppercase">{item.name}</p>
                <p className="text-[7px] text-zinc-500 font-black mt-0.5 uppercase">${parseFloat(String(item.price)) * item.quantity}</p>
              </div>
              <div className="flex items-center gap-2">
                <QuantitySelector
                  item={{ id: item.productId, name: item.name, price: item.price }}
                  basketItem={item}
                  onAdd={onAddToBasket}
                  onRemove={onRemoveFromBasket}
                />
                <button onClick={() => onDeleteItem(item.id)} className="p-2 text-zinc-700 hover:text-rose-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
        {basket.length > 0 && (
          <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
            <div className="flex justify-between items-end">
              <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest">Grand Total</p>
              <p className="text-3xl font-black text-white tracking-tighter tabular-nums">${total.toLocaleString()}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setPaymentMethod('CASH')} className={`py-3 rounded-xl font-black uppercase text-[8px] tracking-widest border transition-all ${paymentMethod === 'CASH' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white/5 border-white/10 text-zinc-500'}`}>Cash</button>
              <button onClick={() => setPaymentMethod('CARD')} className={`py-3 rounded-xl font-black uppercase text-[8px] tracking-widest border transition-all ${paymentMethod === 'CARD' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white/5 border-white/10 text-zinc-500'}`}>Chip</button>
            </div>
            <button onClick={onCheckout} className="w-full py-4 bg-white text-black rounded-xl font-black uppercase tracking-widest text-[9px] shadow-xl hover:bg-indigo-50 transition-all">Settle Protocol</button>
          </div>
        )}
      </div>
    </div>
  );
}
