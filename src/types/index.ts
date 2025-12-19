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

export type SaleType = 'unit' | 'weight' | 'value'; // unidade, peso (kg/g), valor (R$)

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number; // Preço por unidade/kg/valor base
  imageUrl?: string;
  isAvailable: boolean;
  category: string;
  saleType: SaleType; // Tipo de venda
  unitLabel?: string; // Ex: "unidade", "pão", "kg", "g"
  weightUnit?: 'kg' | 'g'; // Se saleType for 'weight'
  valueQuantity?: number; // Se saleType for 'value', ex: R$ 1 = 5 pães
  valueLabel?: string; // Ex: "pães", "unidades"
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
  whatsappClicks?: number; // Contador de cliques no WhatsApp
  createdAt: Date;
}

export interface Post {
  id: string;
  ownerId: string;
  ownerType: 'store' | 'service';
  storeId?: string;
  serviceId?: string;
  title: string;
  content: string;
  imageUrl?: string;
  isPromoted: boolean;
  promotionEndsAt?: Date;
  views: number;
  clicks: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  product: Product;
  quantity: number; // Quantidade em unidades/peso/valor
  storeName: string;
  storeWhatsapp: string;
  customQuantity?: { // Para produtos por peso ou valor
    type: 'weight' | 'value';
    amount: number; // gramas/kg ou valor em R$
    displayLabel?: string; // Ex: "100g", "R$ 5,00"
  };
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
    // Informações para produtos por peso/valor
    saleType?: SaleType;
    customQuantity?: {
      type: 'weight' | 'value';
      amount: number;
      displayLabel?: string;
    };
    valueQuantity?: number; // Para produtos por valor (ex: R$ 1 = 3 pães)
    valueLabel?: string;
    weightUnit?: 'kg' | 'g';
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

export type NotificationType = 'new_order' | 'order_confirmed' | 'order_preparing' | 'order_out_for_delivery' | 'order_delivered' | 'order_cancelled' | 'post_interest';

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