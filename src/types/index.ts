export type UserRole = 'customer' | 'vendor_product' | 'vendor_service';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  createdAt: Date;
}

export interface Store {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  category: string;
  whatsappNumber: string;
  address: string;
  logoUrl?: string;
  bannerUrl?: string;
  isOpen: boolean;
  rating?: number;
  createdAt: Date;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  category: string;
  createdAt: Date;
}

export interface Service {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: string;
  whatsappNumber: string;
  logoUrl?: string;
  bannerUrl?: string;
  portfolioImages: string[];
  priceRange?: string;
  rating?: number;
  createdAt: Date;
}

export interface CartItem {
  product: Product;
  quantity: number;
  storeName: string;
  storeWhatsapp: string;
}

export interface CartStore {
  storeId: string;
  storeName: string;
  storeWhatsapp: string;
  items: CartItem[];
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  userId: string;
  storeId: string;
  storeName: string;
  storeWhatsapp: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    imageUrl?: string;
  }[];
  total: number;
  address: string;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  whatsappMessageId?: string;
}

export interface Address {
  id: string;
  userId: string;
  label: string; // Ex: "Casa", "Trabalho"
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface Favorite {
  id: string;
  userId: string;
  itemId: string; // ID da loja ou serviço
  itemType: 'store' | 'service';
  createdAt: Date;
}

export type NotificationType = 'new_order' | 'order_confirmed' | 'order_preparing' | 'order_out_for_delivery' | 'order_delivered' | 'order_cancelled';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  orderId?: string;
  read: boolean;
  createdAt: Date;
}