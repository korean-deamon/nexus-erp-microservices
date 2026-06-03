import { Order } from '@/types';

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'PENDING':   return 'text-amber-500';
    case 'SHIPPED':   return 'text-indigo-400';
    case 'DELIVERED': return 'text-sky-400';
    case 'COMPLETED': return 'text-emerald-500';
    case 'CANCELLED': return 'text-rose-500';
    default:          return 'text-zinc-500';
  }
};

export const groupOrders = (ordersList: Order[]): Record<string, Order[]> => {
  const groups: Record<string, Order[]> = {};
  ordersList.forEach(o => {
    const date = new Date(o.createdAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(o);
  });
  return groups;
};
