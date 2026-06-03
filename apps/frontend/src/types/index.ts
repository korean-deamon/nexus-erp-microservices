export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  createdAt?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: string | number;
  createdAt?: string;
}

export interface BasketItem {
  id: string;
  userId: string;
  productId: string;
  name: string;
  quantity: number;
  price: string | number;
}

export interface Order {
  id: string;
  userId: string;
  productName: string;
  quantity: number;
  totalAmount: string | number;
  status: 'PENDING' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
  cancelledBy?: string;
  paymentMethod: 'CASH' | 'CARD';
  createdAt: string;
  user?: { email: string; name: string };
}

export interface Notification {
  id: number;
  type: string;
  message: string;
  read: boolean;
  title?: string;
  time?: string;
}

export interface Stats {
  revenue: number;
  events: number;
  secondary: number;
  status: Record<string, number>;
}

export interface Tab {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  admin?: boolean;
  hideForAdmin?: boolean;
}
