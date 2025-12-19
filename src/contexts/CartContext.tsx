import React, { createContext, useContext, useState, useCallback } from 'react';
import { Product, CartItem } from '@/types';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, storeName: string, storeWhatsapp: string, customQuantity?: { type: 'weight' | 'value'; amount: number; displayLabel?: string }) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number, customQuantity?: { type: 'weight' | 'value'; amount: number; displayLabel?: string }) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  generateWhatsAppMessage: (address: string) => string;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = useCallback((product: Product, storeName: string, storeWhatsapp: string, customQuantity?: { type: 'weight' | 'value'; amount: number; displayLabel?: string }) => {
    setItems(prev => {
      const existingItem = prev.find(item => {
        if (item.product.id !== product.id) return false;
        // Se ambos têm customQuantity, comparar
        if (customQuantity && item.customQuantity) {
          return item.customQuantity.type === customQuantity.type && 
                 item.customQuantity.amount === customQuantity.amount;
        }
        // Se nenhum tem customQuantity, são iguais
        return !customQuantity && !item.customQuantity;
      });
      
      if (existingItem) {
        return prev.map(item => {
          if (item.product.id === product.id) {
            // Verificar se é o mesmo item (mesmo customQuantity)
            const isSameItem = customQuantity && item.customQuantity
              ? item.customQuantity.type === customQuantity.type && 
                item.customQuantity.amount === customQuantity.amount
              : !customQuantity && !item.customQuantity;
            
            if (isSameItem) {
              return { ...item, quantity: item.quantity + 1 };
            }
          }
          return item;
        });
      }
      
      return [...prev, { 
        product, 
        quantity: 1, 
        storeName, 
        storeWhatsapp,
        customQuantity 
      }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number, customQuantity?: { type: 'weight' | 'value'; amount: number; displayLabel?: string }) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setItems(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          // Se tem customQuantity, precisa verificar se é o mesmo item
          if (customQuantity && item.customQuantity) {
            const isSameItem = item.customQuantity.type === customQuantity.type && 
                             item.customQuantity.amount === customQuantity.amount;
            if (isSameItem) {
              return { ...item, quantity };
            }
          } else if (!customQuantity && !item.customQuantity) {
            return { ...item, quantity };
          }
        }
        return item;
      })
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getTotal = useCallback(() => {
    return items.reduce((total, item) => {
      if (item.customQuantity) {
        if (item.customQuantity.type === 'weight') {
          // Se for por peso, calcular baseado no peso
          if (item.product.weightUnit === 'g') {
            // Preço é por 100g, então calcular baseado em quantos "100g" o cliente quer
            const priceForWeight = item.product.price * (item.customQuantity.amount / 100);
            return total + (priceForWeight * item.quantity);
          } else {
            // Preço é por kg
            const weightInKg = item.customQuantity.amount / 1000; // converter gramas para kg
            return total + (item.product.price * weightInKg * item.quantity);
          }
        } else if (item.customQuantity.type === 'value') {
          // Se for por valor, o valor que o cliente escolheu é o preço que ele vai pagar
          const valueAmount = item.customQuantity.amount;
          return total + (valueAmount * item.quantity);
        }
      }
      return total + (item.product.price * item.quantity);
    }, 0);
  }, [items]);

  const getItemCount = useCallback(() => {
    return items.reduce((count, item) => count + item.quantity, 0);
  }, [items]);

  const generateWhatsAppMessage = useCallback((address: string) => {
    if (items.length === 0) return '';
    
    const storeWhatsapp = items[0].storeWhatsapp;
    const storeName = items[0].storeName;
    
    const itemsList = items.map(item => {
      let itemText = '';
      let itemPrice = 0;
      
      if (item.customQuantity) {
        if (item.customQuantity.type === 'weight') {
          // Para produtos por peso: mostrar peso x produto
          const weightLabel = item.customQuantity.displayLabel || 
            (item.product.weightUnit === 'kg' 
              ? `${item.customQuantity.amount / 1000}kg` 
              : `${item.customQuantity.amount}g`);
          itemText = `${weightLabel} x ${item.product.name}`;
          
          // Calcular preço
          if (item.product.weightUnit === 'g') {
            itemPrice = item.product.price * (item.customQuantity.amount / 100) * item.quantity;
          } else {
            const weightInKg = item.customQuantity.amount / 1000;
            itemPrice = item.product.price * weightInKg * item.quantity;
          }
        } else if (item.customQuantity.type === 'value') {
          // Para produtos por valor: calcular quantidade de unidades e mostrar
          const valueAmount = item.customQuantity.amount;
          const unitsPerReal = item.product.valueQuantity || 1;
          const totalUnits = Math.round(valueAmount * unitsPerReal * item.quantity);
          const unitLabel = item.product.valueLabel || 'unidades';
          itemText = `${totalUnits} x ${item.product.name}`;
          
          // O valor que o cliente escolheu é o preço que ele vai pagar
          itemPrice = valueAmount * item.quantity;
        }
      } else {
        // Produtos por unidade
        itemText = `${item.quantity}x ${item.product.name}`;
        itemPrice = item.product.price * item.quantity;
      }
      
      itemText += `   R$ ${itemPrice.toFixed(2)}`;
      return itemText;
    }).join('\n');
    
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
