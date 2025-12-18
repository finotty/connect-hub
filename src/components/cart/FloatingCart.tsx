import { ShoppingBag, X, Plus, Minus, Trash2, MapPin, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useOrders } from '@/contexts/OrdersContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useAddresses } from '@/contexts/AddressesContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function FloatingCart() {
  const { items, getTotal, getItemCount, updateQuantity, removeFromCart, generateWhatsAppMessage, clearCart } = useCart();
  const { createOrder } = useOrders();
  const { createNotification } = useNotifications();
  const { addresses, defaultAddress } = useAddresses();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [address, setAddress] = useState(defaultAddress ? `${defaultAddress.street}, ${defaultAddress.number}${defaultAddress.complement ? ` - ${defaultAddress.complement}` : ''}, ${defaultAddress.neighborhood}, ${defaultAddress.city} - ${defaultAddress.state}` : '');
  const [useSavedAddress, setUseSavedAddress] = useState(!!defaultAddress);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const itemCount = getItemCount();
  const total = getTotal();

  console.log('🛒 FloatingCart rendered:', { itemCount, total, itemsCount: items.length, user: user?.uid || 'none', isOpen });

  if (itemCount === 0) return null;

  const handleCheckout = async () => {
    console.log('🛒 handleCheckout called');
    
    if (!address.trim()) {
      console.log('⚠️ No address provided');
      toast({
        title: "Endereço obrigatório",
        description: "Por favor, informe seu endereço para entrega.",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      console.log('⚠️ No user logged in');
      toast({
        title: "Login necessário",
        description: "Por favor, faça login para finalizar o pedido.",
        variant: "destructive"
      });
      return;
    }

    if (items.length === 0) {
      console.log('⚠️ Cart is empty');
      toast({
        title: "Carrinho vazio",
        description: "Adicione produtos ao carrinho antes de finalizar.",
        variant: "destructive"
      });
      return;
    }

    console.log('✅ All validations passed, starting checkout');
    setLoading(true);

    try {
      // Cria o pedido no Firestore
      const firstItem = items[0];
      const storeId = firstItem.product.storeId;
      
      console.log('🛒 Creating order with details:', {
        userId: user.uid,
        storeId: storeId,
        storeName: firstItem.storeName,
        productStoreId: firstItem.product.storeId,
        itemsCount: items.length,
        total: getTotal(),
        items: items.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
        }))
      });
      
      const orderData = {
        userId: user.uid,
        storeId: storeId,
        storeName: firstItem.storeName,
        storeWhatsapp: firstItem.storeWhatsapp,
        items: items.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          imageUrl: item.product.imageUrl,
        })),
        total: getTotal(),
        address: address.trim(),
        status: 'pending' as const,
      };
      
      console.log('📝 Order data prepared:', orderData);
      console.log('📞 Calling createOrder...');
      
      const orderId = await createOrder(orderData);
      
      console.log('✅ Order created successfully:', {
        orderId,
        storeId,
        storeName: firstItem.storeName,
        userId: user.uid
      });

      // Cria notificação para o vendedor
      try {
        const { getDoc, doc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const storeDoc = await getDoc(doc(db, 'stores', firstItem.product.storeId));
        if (storeDoc.exists()) {
          const storeData = storeDoc.data();
          console.log('📦 Creating notification for vendor:', storeData.ownerId);
          await createNotification(
            storeData.ownerId,
            'new_order',
            'Novo pedido recebido!',
            `Você recebeu um novo pedido de ${user.name} no valor de R$ ${getTotal().toFixed(2)}`,
            orderId
          );
          console.log('✅ Vendor notification created');
        } else {
          console.warn('⚠️ Store not found:', firstItem.product.storeId);
        }
      } catch (error) {
        console.error('❌ Error creating vendor notification:', error);
      }

      // Cria notificação para o cliente
      try {
        console.log('📦 Creating notification for customer:', user.uid);
        await createNotification(
          user.uid,
          'order_confirmed',
          'Pedido confirmado!',
          `Seu pedido foi enviado para ${firstItem.storeName}. Aguarde a confirmação.`,
          orderId
        );
        console.log('✅ Customer notification created');
      } catch (error) {
        console.error('❌ Error creating customer notification:', error);
      }

      // Abre WhatsApp
      const whatsappUrl = generateWhatsAppMessage(address);
      window.open(whatsappUrl, '_blank');

      // Limpa carrinho
      clearCart();
      setIsOpen(false);
      setAddress('');
      
      toast({
        title: "Pedido enviado!",
        description: "Você será redirecionado para o WhatsApp.",
      });
    } catch (error: any) {
      console.error('❌ Error in handleCheckout:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        name: error.name,
      });
      toast({
        title: "Erro ao criar pedido",
        description: error.message || "Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-20 right-4 z-[110] flex items-center gap-3 px-4 py-3 rounded-full",
          "bg-primary text-primary-foreground shadow-lg",
          "transition-all duration-300 hover:scale-105 active:scale-95",
          "animate-bounce-in"
        )}
      >
        <ShoppingBag className="h-5 w-5" />
        <div className="flex flex-col items-start">
          <span className="text-xs font-medium opacity-90">{itemCount} {itemCount === 1 ? 'item' : 'itens'}</span>
          <span className="text-sm font-bold">R$ {total.toFixed(2)}</span>
        </div>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Seu Carrinho
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {items.map((item) => (
              <div 
                key={item.product.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50"
              >
                {item.product.imageUrl && (
                  <img 
                    src={item.product.imageUrl} 
                    alt={item.product.name}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{item.product.name}</h4>
                  <p className="text-primary font-semibold text-sm">
                    R$ {(item.product.price * item.quantity).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="h-8 w-8 rounded-full bg-background flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="h-8 w-8 rounded-full bg-background flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="h-8 w-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors ml-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-4">
            {addresses.length > 0 && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useSavedAddress"
                  checked={useSavedAddress}
                  onChange={(e) => {
                    setUseSavedAddress(e.target.checked);
                    if (e.target.checked && defaultAddress) {
                      setAddress(`${defaultAddress.street}, ${defaultAddress.number}${defaultAddress.complement ? ` - ${defaultAddress.complement}` : ''}, ${defaultAddress.neighborhood}, ${defaultAddress.city} - ${defaultAddress.state}`);
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="useSavedAddress" className="text-sm cursor-pointer">
                  Usar endereço salvo
                </label>
              </div>
            )}

            {useSavedAddress && addresses.length > 0 ? (
              <Select
                value={addresses.find(addr => {
                  const addrStr = `${addr.street}, ${addr.number}${addr.complement ? ` - ${addr.complement}` : ''}, ${addr.neighborhood}, ${addr.city} - ${addr.state}`;
                  return addrStr === address;
                })?.id || ''}
                onValueChange={(value) => {
                  const selectedAddr = addresses.find(addr => addr.id === value);
                  if (selectedAddr) {
                    setAddress(`${selectedAddr.street}, ${selectedAddr.number}${selectedAddr.complement ? ` - ${selectedAddr.complement}` : ''}, ${selectedAddr.neighborhood}, ${selectedAddr.city} - ${selectedAddr.state}`);
                  }
                }}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Selecione um endereço" />
                </SelectTrigger>
                <SelectContent>
                  {addresses.map(addr => (
                    <SelectItem key={addr.id} value={addr.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{addr.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {addr.street}, {addr.number}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="Seu endereço para entrega"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-12"
              />
            )}

            {addresses.length > 0 && !useSavedAddress && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.location.href = '/addresses'}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Gerenciar endereços
              </Button>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="text-xl font-bold text-primary">R$ {total.toFixed(2)}</span>
            </div>

            <Button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔘 Finalizar button clicked');
                handleCheckout();
              }}
              variant="whatsapp"
              size="lg"
              className="w-full"
              disabled={loading}
              type="button"
            >
              {loading ? 'Processando...' : 'Finalizar via WhatsApp'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
