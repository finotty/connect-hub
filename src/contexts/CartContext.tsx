import React, { createContext, useContext, useState, useCallback } from 'react';
import { Product, CartItem } from '@/types';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, storeName: string, storeWhatsapp: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  generateWhatsAppMessage: (address: string) => string;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = useCallback((product: Product, storeName: string, storeWhatsapp: string) => {
    setItems(prev => {
      const existingItem = prev.find(item => item.product.id === product.id);
      
      if (existingItem) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      
      return [...prev, { product, quantity: 1, storeName, storeWhatsapp }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setItems(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getTotal = useCallback(() => {
    return items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  }, [items]);

  const getItemCount = useCallback(() => {
    return items.reduce((count, item) => count + item.quantity, 0);
  }, [items]);

  const generateWhatsAppMessage = useCallback((address: string) => {
    if (items.length === 0) return '';
    
    const storeWhatsapp = items[0].storeWhatsapp;
    const storeName = items[0].storeName;
    
    const itemsList = items
      .map(item => `${item.quantity}x ${item.product.name} (R$ ${(item.product.price * item.quantity).toFixed(2)})`)
      .join('\n');
    
    const total = getTotal();
    
    const message = `Olá! 👋\n\nVi no *App do Bairro* e gostaria de fazer um pedido:\n\n${itemsList}\n\n*Total: R$ ${total.toFixed(2)}*\n\n📍 *Endereço:* ${address}\n\nPode confirmar a disponibilidade?`;
    
    return `https://wa.me/55${storeWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  }, [items, getTotal]);

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotal,
      getItemCount,
      generateWhatsAppMessage
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
