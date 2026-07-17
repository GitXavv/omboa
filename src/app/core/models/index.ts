export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  // Jamais NULL en base (migration_restaurant_default_colors.sql) — toujours au moins
  // la palette Omboa par défaut.
  color_primary: string;
  color_secondary: string;
  address: string | null;
  is_active: boolean;
  archived: boolean;
  created_at: string;
}

// Rôle staff (JWT scheme "Staff" — clé secrète, pas de compte individuel)
export type StaffRole = 'owner' | 'cook' | 'receptionist' | 'exit';

export interface StaffSession {
  role: StaffRole;
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
}

// Compte client (Supabase Auth) — plus de rôle, toujours "customer" implicitement,
// rattaché à un seul restaurant.
export interface Customer {
  id: string;
  restaurant_id: string;
  full_name: string;
  phone: string;
  created_at: string;
}

// Ligne de la page admin "Clients avec compte" — lecture seule, agrège l'historique
// loyalty_points de chaque client (aucune action admin possible sur ces comptes).
export interface CustomerAccount {
  id: string;
  full_name: string;
  phone: string;
  created_at: string;
  points_earned: number;
  points_spent: number;
}

export interface Category {
  id: string;
  restaurant_id: string;
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
  restaurant_id: string;
  category_id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
  display_order: number;
  cook_duration: number;
  trend: boolean;
  created_at: string;
  category?: Category;
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'paid' | 'released' | 'cancelled';

export interface Order {
  id: string;
  restaurant_id: string;
  table_id: string;
  customer_id: string | null;
  status: OrderStatus;
  code?: string | null;
  notes?: string | null;
  total_amount: number | null;
  loyalty_points_spent: number;
  created_at: string;
  updated_at: string;
  table?: TableRecord;
  customer?: Customer;
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
  product_name?: string;
  product_image_url?: string;
  product_cook_duration?: number;
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
  restaurant_id: string;
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
  restaurant_id: string | null;
  event_type: string;
  description: string;
  user_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
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

export interface AdminStats {
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  total_customers: number;
  loyal_customers: number;
  orders_by_status: { status: string; count: number }[];
  top_products: {
    product_id: string;
    product_name: string;
    product_image_url: string | null;
    total_quantity: number;
    order_count: number;
  }[];
}

export interface SuperAdminStats {
  total_restaurants: number;
  active_restaurants: number;
  total_tables: number;
  total_orders: number;
}

export interface RecentOrder {
  id: string;
  table_number: string;
  status: OrderStatus;
  updated_at: string;
  total_amount: number | null;
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
