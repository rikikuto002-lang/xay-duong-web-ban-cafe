export type UserRole = 'guest' | 'customer' | 'admin';

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  categoryId: string;
  imageUrl: string;
  stock: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Order {
  id: string;
  userId?: string;
  status: 'pending' | 'paid' | 'shipped' | 'completed';
  total: number;
  items: CartItem[];
}
