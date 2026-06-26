export interface Profile {
  id: string;
  role: 'owner' | 'cook' | 'customer';
  full_name: string;
  phone: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  subcategories?: Category[];
  products?: Product[];
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  display_order: number;
  created_at: string;
  category?: Category;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled';

export interface Order {
  id: string;
  table_id: string;
  customer_id: string | null;
  status: OrderStatus;
  total_amount: number | null;
  created_at: string;
  updated_at: string;
  table?: TableRecord;
  customer?: Profile;
  order_items?: OrderItem[];
  payment?: Payment;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  created_at: string;
  product?: Product;
}

export type PaymentMethod = 'cash' | 'orange_money' | 'mtn_momo';
export type PaymentStatus = 'pending' | 'completed';

export interface Payment {
  id: string;
  order_id: string;
  method: PaymentMethod;
  phone_number: string | null;
  amount: number;
  discount_amount: number;
  status: PaymentStatus;
  created_at: string;
}

export interface TableRecord {
  id: string;
  number: string;
  is_active: boolean;
  created_at: string;
}

export interface TableStatus extends TableRecord {
  is_occupied: boolean;
  current_order_id: string | null;
}

export interface LoyaltyTransaction {
  id: string;
  user_id: string;
  order_id: string | null;
  points_delta: number;
  type: 'earned' | 'spent';
  created_at: string;
}

export interface Log {
  id: string;
  event_type: string;
  description: string;
  user_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user?: Profile;
}

// Panier local (pas en base)
export interface CartItem {
  product: Product;
  quantity: number;
  notes: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
