import { ShoppingBag, X, Plus, Minus, Trash2, MapPin, ChevronDown, Store as StoreIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useOrders } from '@/contexts/OrdersContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useAddresses } from '@/contexts/AddressesContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function FloatingCart() {
  const { items, getTotal, getItemCount, updateQuantity, removeFromCart, generateWhatsAppMessage, clearCart } = useCart();
  const { createOrder } = useOrders();
  const { createNotification } = useNotifications();
  const { addresses, defaultAddress } = useAddresses();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [address, setAddress] = useState(defaultAddress ? `${defaultAddress.street}, ${defaultAddress.number}${defaultAddress.complement ? ` - ${defaultAddress.complement}` : ''}, ${defaultAddress.neighborhood}, ${defaultAddress.city} - ${defaultAddress.state}` : '');
  const [useSavedAddress, setUseSavedAddress] = useState(!!defaultAddress);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const itemCount = getItemCount();
  const total = getTotal();

  // Função para gerar mensagem WhatsApp para uma loja específica
  const generateWhatsAppMessageForStore = (
    storeItems: typeof items,
    storeName: string,
    storeWhatsapp: string,
    address: string,
    storeTotal: number
  ): string => {
    const itemsList = storeItems.map(item => {
      let itemText = '';
      let itemPrice = 0;
      
      if (item.customQuantity) {
        if (item.customQuantity.type === 'weight') {
          const weightLabel = item.customQuantity.displayLabel || 
            (item.product.weightUnit === 'kg' 
              ? `${item.customQuantity.amount / 1000}kg` 
              : `${item.customQuantity.amount}g`);
          itemText = `${weightLabel} x ${item.product.name}`;
          
          if (item.product.weightUnit === 'g') {
            itemPrice = item.product.price * (item.customQuantity.amount / 100) * item.quantity;
          } else {
            const weightInKg = item.customQuantity.amount / 1000;
            itemPrice = item.product.price * weightInKg * item.quantity;
          }
        } else if (item.customQuantity.type === 'value') {
          const valueAmount = item.customQuantity.amount;
          const unitsPerReal = item.product.valueQuantity || 1;
          const totalUnits = Math.round(valueAmount * unitsPerReal * item.quantity);
          const unitLabel = item.product.valueLabel || 'unidades';
          itemText = `${totalUnits} x ${item.product.name}`;
          itemPrice = valueAmount * item.quantity;
        }
      } else {
        itemText = `${item.quantity}x ${item.product.name}`;
        itemPrice = item.product.price * item.quantity;
      }
      
      itemText += `   R$ ${itemPrice.toFixed(2)}`;
      return itemText;
    }).join('\n');
    
    const message = `Olá! 👋\n\nVi no *App do Bairro* e gostaria de fazer um pedido:\n\n${itemsList}\n\n*Total: R$ ${storeTotal.toFixed(2)}*\n\n📍 *Endereço:* ${address}\n\nPode confirmar a disponibilidade?`;
    
    return `https://wa.me/55${storeWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  };

  console.log('🛒 FloatingCart rendered:', { itemCount, total, itemsCount: items.length, user: user?.uid || 'none', isOpen });

  if (itemCount === 0) return null;

  const handleCheckout = async () => {
    console.log('🛒 handleCheckout called');
    
    if (!user) {
      console.log('⚠️ No user logged in');
      setIsOpen(false);
      toast({
        title: "Login necessário",
        description: "Redirecionando para a tela de login...",
      });
      navigate('/auth');
      return;
    }

    // Verificar se o usuário tem telefone cadastrado
    if (!user.phone || !user.phone.trim()) {
      console.log('⚠️ No phone number');
      toast({
        title: "Telefone obrigatório",
        description: "Por favor, cadastre seu número de telefone nas configurações para fazer pedidos.",
        variant: "destructive"
      });
      return;
    }

    // Verificar se o usuário tem pelo menos 1 endereço cadastrado
    if (!addresses || addresses.length === 0) {
      console.log('⚠️ No addresses');
      toast({
        title: "Endereço obrigatório",
        description: "Por favor, cadastre pelo menos um endereço de entrega nas configurações.",
        variant: "destructive"
      });
      return;
    }
    
    if (!address.trim()) {
      console.log('⚠️ No address provided');
      toast({
        title: "Endereço obrigatório",
        description: "Por favor, selecione ou informe seu endereço para entrega.",
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
      // Agrupar itens por loja
      const itemsByStore = new Map<string, typeof items>();
      
      items.forEach(item => {
        const storeId = item.product.storeId;
        if (!itemsByStore.has(storeId)) {
          itemsByStore.set(storeId, []);
        }
        itemsByStore.get(storeId)!.push(item);
      });

      console.log('🛒 Items grouped by store:', {
        storesCount: itemsByStore.size,
        stores: Array.from(itemsByStore.keys())
      });

      const createdOrders: string[] = [];
      const storeNames: string[] = [];
      const whatsappUrls: string[] = [];

      // Criar um pedido para cada loja
      for (const [storeId, storeItems] of itemsByStore.entries()) {
        const firstItem = storeItems[0];
        
        // Calcular total para esta loja
        const storeTotal = storeItems.reduce((total, item) => {
          if (item.customQuantity) {
            if (item.customQuantity.type === 'weight') {
              if (item.product.weightUnit === 'g') {
                const priceForWeight = item.product.price * (item.customQuantity.amount / 100);
                return total + (priceForWeight * item.quantity);
              } else {
                const weightInKg = item.customQuantity.amount / 1000;
                return total + (item.product.price * weightInKg * item.quantity);
              }
            } else if (item.customQuantity.type === 'value') {
              return total + (item.customQuantity.amount * item.quantity);
            }
          }
          return total + (item.product.price * item.quantity);
        }, 0);
        
        console.log('🛒 Creating order for store:', {
          storeId,
          storeName: firstItem.storeName,
          itemsCount: storeItems.length,
          total: storeTotal
        });
        
        const orderData = {
          userId: user.uid,
          storeId: storeId,
          storeName: firstItem.storeName,
          storeWhatsapp: firstItem.storeWhatsapp,
          items: storeItems.map(item => {
            const itemData: any = {
              productId: item.product.id,
              productName: item.product.name,
              quantity: item.quantity,
              price: item.product.price,
              imageUrl: item.product.imageUrl,
              saleType: item.product.saleType,
            };
            
            // Adicionar informações de customQuantity se existir
            if (item.customQuantity) {
              itemData.customQuantity = item.customQuantity;
            }
            
            // Adicionar informações específicas do tipo de venda
            if (item.product.saleType === 'value') {
              itemData.valueQuantity = item.product.valueQuantity;
              itemData.valueLabel = item.product.valueLabel;
            } else if (item.product.saleType === 'weight') {
              itemData.weightUnit = item.product.weightUnit;
            }
            
            return itemData;
          }),
          total: storeTotal,
          address: address.trim(),
          status: 'pending' as const,
        };
        
        const orderId = await createOrder(orderData);
        createdOrders.push(orderId);
        storeNames.push(firstItem.storeName);

        // Cria notificação para o vendedor
        try {
          const { getDoc, doc } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          const storeDoc = await getDoc(doc(db, 'stores', storeId));
          if (storeDoc.exists()) {
            const storeData = storeDoc.data();
            await createNotification(
              storeData.ownerId,
              'new_order',
              'Novo pedido recebido!',
              `Você recebeu um novo pedido de ${user.name} no valor de R$ ${storeTotal.toFixed(2)}`,
              orderId
            );
          }
        } catch (error) {
          console.error('❌ Error creating vendor notification:', error);
        }

        // Gerar mensagem WhatsApp para esta loja
        const whatsappMessage = generateWhatsAppMessageForStore(storeItems, firstItem.storeName, firstItem.storeWhatsapp, address, storeTotal);
        whatsappUrls.push(whatsappMessage);
      }

      // Cria notificação para o cliente
      try {
        const storesText = storeNames.length === 1 
          ? storeNames[0]
          : `${storeNames.length} lojas (${storeNames.join(', ')})`;
        
        await createNotification(
          user.uid,
          'order_confirmed',
          'Pedidos enviados!',
          `Seus pedidos foram enviados para ${storesText}. Aguarde a confirmação.`,
          createdOrders[0] // Usar o primeiro orderId como referência
        );
      } catch (error) {
        console.error('❌ Error creating customer notification:', error);
      }

      // Abrir WhatsApp apenas se for uma única loja
      // Se forem múltiplas lojas, o usuário pode abrir manualmente na página de pedidos
      if (whatsappUrls.length === 1) {
        // Se for apenas uma loja, abrir WhatsApp diretamente
        window.open(whatsappUrls[0], '_blank');
      }

      // Limpa carrinho
      clearCart();
      setIsOpen(false);
      setAddress('');
      
      const storesCount = itemsByStore.size;
      
      // Se houver múltiplas lojas, redirecionar para página de pedidos
      if (storesCount > 1) {
        toast({
          title: `${storesCount} pedidos enviados!`,
          description: `Redirecionando para a página de pedidos... Você pode acessar o WhatsApp de cada pedido individualmente.`,
          duration: 4000,
        });
        
        // Redirecionar para página de pedidos após 1.5 segundos
        setTimeout(() => {
          navigate('/orders');
        }, 1500);
      } else {
        // Uma única loja: WhatsApp já foi aberto automaticamente
        toast({
          title: "Pedido enviado!",
          description: `Você foi redirecionado para o WhatsApp de ${storeNames[0]}.`,
        });
      }
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
            {(() => {
              // Agrupar itens por loja para exibição
              const itemsByStore = new Map<string, typeof items>();
              items.forEach(item => {
                const storeId = item.product.storeId;
                if (!itemsByStore.has(storeId)) {
                  itemsByStore.set(storeId, []);
                }
                itemsByStore.get(storeId)!.push(item);
              });

              const storesArray = Array.from(itemsByStore.entries());
              
              return storesArray.map(([storeId, storeItems]) => (
                <div key={storeId} className="space-y-2">
                  {storesArray.length > 1 && (
                    <div className="flex items-center gap-2 px-2">
                      <StoreIcon className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-primary">
                        {storeItems[0].storeName}
                      </span>
                    </div>
                  )}
                  {storeItems.map((item) => (
                    <div 
                      key={`${item.product.id}-${item.customQuantity?.amount || ''}`}
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
                        {item.customQuantity && (
                          <p className="text-xs text-muted-foreground">
                            {item.customQuantity.displayLabel || 
                              (item.customQuantity.type === 'weight' 
                                ? `${item.customQuantity.amount}g`
                                : `R$ ${item.customQuantity.amount.toFixed(2)}`)}
                          </p>
                        )}
                        <p className="text-primary font-semibold text-sm">
                          R$ {(() => {
                            if (item.customQuantity) {
                              if (item.customQuantity.type === 'weight') {
                                if (item.product.weightUnit === 'g') {
                                  return (item.product.price * (item.customQuantity.amount / 100) * item.quantity).toFixed(2);
                                } else {
                                  const weightInKg = item.customQuantity.amount / 1000;
                                  return (item.product.price * weightInKg * item.quantity).toFixed(2);
                                }
                              } else {
                                return (item.customQuantity.amount * item.quantity).toFixed(2);
                              }
                            }
                            return (item.product.price * item.quantity).toFixed(2);
                          })()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.customQuantity)}
                          className="h-8 w-8 rounded-full bg-background flex items-center justify-center hover:bg-muted transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-6 text-center font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.customQuantity)}
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
              ));
            })()}
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
