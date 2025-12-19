import { Order, Post, Service, Store } from '@/types';

/**
 * Gera URL do WhatsApp para mensagem de confirmação de pedido
 */
export function generateOrderConfirmationWhatsApp(order: Order, customerName: string): string {
  const itemsList = order.items.map(item => {
    let itemText = '';
    let itemPrice = 0;
    
    if (item.customQuantity) {
      if (item.customQuantity.type === 'weight') {
        const weightLabel = item.customQuantity.displayLabel || 
          (item.weightUnit === 'kg' 
            ? `${item.customQuantity.amount / 1000}kg` 
            : `${item.customQuantity.amount}g`);
        itemText = `${weightLabel} x ${item.productName}`;
        
        if (item.weightUnit === 'g') {
          itemPrice = item.price * (item.customQuantity.amount / 100) * item.quantity;
        } else {
          const weightInKg = item.customQuantity.amount / 1000;
          itemPrice = item.price * weightInKg * item.quantity;
        }
      } else if (item.customQuantity.type === 'value') {
        const valueAmount = item.customQuantity.amount;
        const unitsPerReal = item.valueQuantity || 1;
        const totalUnits = Math.round(valueAmount * unitsPerReal * item.quantity);
        itemText = `${totalUnits} x ${item.productName}`;
        itemPrice = valueAmount * item.quantity;
      }
    } else {
      itemText = `${item.quantity}x ${item.productName}`;
      itemPrice = item.price * item.quantity;
    }
    
    return `${itemText}   R$ ${itemPrice.toFixed(2)}`;
  }).join('\n');
  
  const message = `Olá ${customerName}! 👋\n\nSeu pedido foi *confirmado*! 🎉\n\n*Pedido #${order.id.slice(0, 8)}*\n\n${itemsList}\n\n*Total: R$ ${order.total.toFixed(2)}*\n\n📍 *Endereço:* ${order.address}\n\nContinue acompanhando pelo app! 📱\n\n🔗 Acesse: http://192.168.24.141:8080`;
  
  return message;
}

/**
 * Gera URL do WhatsApp para mensagem de saída para entrega
 */
export function generateOutForDeliveryWhatsApp(order: Order, customerName: string): string {
  const message = `Olá ${customerName}! 🚚\n\nSeu pedido *saiu para entrega*!\n\n*Pedido #${order.id.slice(0, 8)}*\n*Loja:* ${order.storeName}\n\n📍 *Endereço:* ${order.address}\n\nContinue acompanhando pelo app! 📱\n\n🔗 Acesse: http://192.168.24.141:8080`;
  
  return message;
}

/**
 * Gera URL do WhatsApp a partir de uma mensagem e número de telefone
 */
export function generateWhatsAppUrl(phoneNumber: string, message: string): string {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  return `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Gera mensagem do WhatsApp para interesse em anúncio
 */
export function generatePostInterestWhatsApp(post: Post, service?: Service, store?: Store): string {
  const ownerName = service?.title || store?.name || 'Anunciante';
  const message = `Olá! 👋\n\nVi seu anúncio "*${post.title}*" no App do Bairro e tenho interesse!\n\nGostaria de saber mais informações.`;
  
  return message;
}

/**
 * Gera mensagem inicial do pedido (quando o cliente faz o pedido)
 */
export function generateInitialOrderWhatsApp(order: Order): string {
  const itemsList = order.items.map(item => {
    let itemText = '';
    let itemPrice = 0;
    
    if (item.customQuantity) {
      if (item.customQuantity.type === 'weight') {
        const weightLabel = item.customQuantity.displayLabel || 
          (item.weightUnit === 'kg' 
            ? `${item.customQuantity.amount / 1000}kg` 
            : `${item.customQuantity.amount}g`);
        itemText = `${weightLabel} x ${item.productName}`;
        
        if (item.weightUnit === 'g') {
          itemPrice = item.price * (item.customQuantity.amount / 100) * item.quantity;
        } else {
          const weightInKg = item.customQuantity.amount / 1000;
          itemPrice = item.price * weightInKg * item.quantity;
        }
      } else if (item.customQuantity.type === 'value') {
        const valueAmount = item.customQuantity.amount;
        const unitsPerReal = item.valueQuantity || 1;
        const totalUnits = Math.round(valueAmount * unitsPerReal * item.quantity);
        itemText = `${totalUnits} x ${item.productName}`;
        itemPrice = valueAmount * item.quantity;
      }
    } else {
      itemText = `${item.quantity}x ${item.productName}`;
      itemPrice = item.price * item.quantity;
    }
    
    return `${itemText}   R$ ${itemPrice.toFixed(2)}`;
  }).join('\n');
  
  const message = `Olá! 👋\n\nVi no *App do Bairro* e gostaria de fazer um pedido:\n\n${itemsList}\n\n*Total: R$ ${order.total.toFixed(2)}*\n\n📍 *Endereço:* ${order.address}\n\nPode confirmar a disponibilidade?`;
  
  return message;
}
