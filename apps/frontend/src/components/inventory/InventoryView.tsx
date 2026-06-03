'use client';
import { Edit3, Trash2 } from 'lucide-react';
import { BasketItem, InventoryItem } from '@/types';
import QuantitySelector from '@/components/ui/QuantitySelector';

interface Props {
  inventory: InventoryItem[];
  basket: BasketItem[];
  isAdmin: boolean;
  onAddToBasket: (item: InventoryItem) => void;
  onRemoveFromBasket: (productId: string) => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
}

export default function InventoryView({ inventory, basket, isAdmin, onAddToBasket, onRemoveFromBasket, onEdit, onDelete, onAddNew }: Props) {
  return (
    <div className="glass rounded-[2rem] border-white/5 overflow-hidden animate-in fade-in duration-500">
      <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Inventory Hub</h3>
        {isAdmin && (
          <button onClick={onAddNew} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all">
            Add Resource
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <tbody className="divide-y divide-white/5">
            {[...inventory].sort((a, b) => a.name.localeCompare(b.name)).map(item => {
              const basketItem = basket.find(b => b.productId === item.id);
              return (
                <tr key={item.id} className={`hover:bg-white/[0.01] transition-all ${item.quantity <= 0 ? 'grayscale opacity-40' : ''}`}>
                  <td className="px-6 py-5">
                    <p className="font-black text-white text-xs uppercase">{item.name}</p>
                    <p className="text-[7px] font-black uppercase text-zinc-600 mt-0.5">Stock: {item.quantity} | {item.sku}</p>
                  </td>
                  <td className="px-6 py-5 text-right font-black text-white text-sm tabular-nums">${parseFloat(String(item.price)).toLocaleString()}</td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      {isAdmin ? (
                        <>
                          <button onClick={() => onEdit(item)} className="p-2.5 bg-white/5 text-indigo-400 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => onDelete(item.id)} className="p-2.5 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                        </>
                      ) : basketItem ? (
                        <QuantitySelector item={item} basketItem={basketItem} onAdd={onAddToBasket} onRemove={onRemoveFromBasket} />
                      ) : (
                        <button disabled={item.quantity <= 0} onClick={() => onAddToBasket(item)} className={`px-5 py-2.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${item.quantity <= 0 ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-white text-black hover:bg-indigo-600 hover:text-white'}`}>
                          {item.quantity <= 0 ? 'Sold Out' : 'Sync'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
