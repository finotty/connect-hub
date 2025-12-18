import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOrders } from '@/contexts/OrdersContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, Package, Truck, CheckCircle, Clock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { OrderStatus } from '@/types';

const statusConfig = {
  pending: { label: 'Aguardando confirmação', icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
  confirmed: { label: 'Confirmado', icon: CheckCircle, color: 'text-blue-600 bg-blue-50' },
  preparing: { label: 'Preparando', icon: Package, color: 'text-orange-600 bg-orange-50' },
  out_for_delivery: { label: 'Saiu para entrega', icon: Truck, color: 'text-purple-600 bg-purple-50' },
  delivered: { label: 'Recebido', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  cancelled: { label: 'Cancelado', icon: XCircle, color: 'text-red-600 bg-red-50' },
};

export default function OrdersPage() {
  const { orders, loading } = useOrders();
  const { user } = useAuth();
  const { createNotification } = useNotifications();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderIdRef = useRef<string | null>(null);
  
  const isVendor = user?.role === 'vendor_product';
  
  // Scroll para o pedido específico se houver orderId na URL
  useEffect(() => {
    const orderId = searchParams.get('orderId');
    if (orderId && orders.length > 0) {
      orderIdRef.current = orderId;
      setTimeout(() => {
        const element = document.getElementById(`order-${orderId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Remove o orderId da URL após scrollar
          navigate('/orders', { replace: true });
        }
      }, 300);
    }
  }, [orders, searchParams, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen pb-20 bg-background">
        <header className="sticky top-0 z-40 bg-card border-b p-4">
          <h1 className="font-bold text-lg">Meus Pedidos</h1>
        </header>
        <main className="p-4 space-y-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </main>
        <BottomNav />
      </div>
    );
  }

  const pendingOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
  const completedOrders = orders.filter(o => o.status === 'delivered' || o.status === 'cancelled');

  return (
    <div className="min-h-screen pb-20 bg-background">
      <header className="sticky top-0 z-40 bg-card border-b p-4">
        <h1 className="font-bold text-lg">{isVendor ? 'Pedidos da Loja' : 'Meus Pedidos'}</h1>
      </header>

      <main className="p-4 space-y-6">
        {orders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h2 className="font-semibold text-lg mb-1">Nenhum pedido ainda</h2>
              <p className="text-sm mb-4">
                {isVendor 
                  ? "Os pedidos da sua loja aparecerão aqui quando os clientes fizerem pedidos."
                  : "Seus pedidos feitos pelo app aparecerão aqui."
                }
              </p>
              {!isVendor && (
                <Link to="/" className="text-primary font-medium text-sm">
                  Explorar lojas
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {pendingOrders.length > 0 && (
              <section>
                <h2 className="font-semibold text-sm text-muted-foreground mb-3 uppercase">
                  Pedidos em andamento
                </h2>
                <div className="space-y-3">
                  {pendingOrders.map(order => {
                    const config = statusConfig[order.status];
                    const StatusIcon = config.icon;
                    
                    const handleStatusChange = async (newStatus: OrderStatus) => {
                      try {
                        await updateDoc(doc(db, 'orders', order.id), {
                          status: newStatus,
                          updatedAt: serverTimestamp(),
                        });

                        // Cria notificação para o cliente
                        await createNotification(
                          order.userId,
                          `order_${newStatus}` as any,
                          `Pedido ${config.label.toLowerCase()}`,
                          `Seu pedido na ${order.storeName} está ${config.label.toLowerCase()}.`,
                          order.id
                        );

                        toast({ title: "Status atualizado com sucesso!" });
                      } catch (error: any) {
                        toast({
                          title: "Erro",
                          description: error.message || "Não foi possível atualizar o status.",
                          variant: "destructive"
                        });
                      }
                    };
                    
                    return (
                      <Card 
                        key={order.id} 
                        id={`order-${order.id}`}
                        className={cn(
                          "overflow-hidden transition-all",
                          orderIdRef.current === order.id && "ring-2 ring-primary shadow-lg"
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold">{isVendor ? `Pedido #${order.id.slice(0, 8)}` : order.storeName}</h3>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(order.createdAt, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                            <span className={cn(
                              "text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1",
                              config.color
                            )}>
                              <StatusIcon className="h-3 w-3" />
                              {config.label}
                            </span>
                          </div>

                          <div className="space-y-2 mb-3">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">{item.quantity}x</span>
                                <span className="flex-1 truncate">{item.productName}</span>
                                <span className="font-medium">R$ {(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t mb-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Total</p>
                              <p className="font-bold text-lg text-primary">R$ {order.total.toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Endereço</p>
                              <p className="text-xs font-medium truncate max-w-[150px]">{order.address}</p>
                            </div>
                          </div>

                          {/* Botões de ação para vendedores */}
                          {isVendor && order.status !== 'delivered' && order.status !== 'cancelled' && (
                            <div className="space-y-2 pt-3 border-t">
                              {order.status === 'pending' && (
                                <>
                                  <Button
                                    onClick={() => handleStatusChange('confirmed')}
                                    className="w-full"
                                    size="sm"
                                  >
                                    ✅ Confirmar pedido
                                  </Button>
                                  <Button
                                    onClick={() => handleStatusChange('cancelled')}
                                    variant="destructive"
                                    className="w-full"
                                    size="sm"
                                  >
                                    ❌ Cancelar pedido
                                  </Button>
                                </>
                              )}
                              {order.status === 'confirmed' && (
                                <>
                                  <Button
                                    onClick={() => handleStatusChange('preparing')}
                                    className="w-full"
                                    size="sm"
                                  >
                                    📦 Marcar como preparando
                                  </Button>
                                  <Button
                                    onClick={() => handleStatusChange('cancelled')}
                                    variant="destructive"
                                    className="w-full"
                                    size="sm"
                                  >
                                    ❌ Cancelar pedido
                                  </Button>
                                </>
                              )}
                              {order.status === 'preparing' && (
                                <>
                                  <Button
                                    onClick={() => handleStatusChange('out_for_delivery')}
                                    className="w-full"
                                    size="sm"
                                  >
                                    🚚 Saiu para entrega
                                  </Button>
                                  <Button
                                    onClick={() => handleStatusChange('cancelled')}
                                    variant="destructive"
                                    className="w-full"
                                    size="sm"
                                  >
                                    ❌ Cancelar pedido
                                  </Button>
                                </>
                              )}
                              {order.status === 'out_for_delivery' && (
                                <Button
                                  onClick={() => handleStatusChange('delivered')}
                                  className="w-full"
                                  size="sm"
                                >
                                  ✅ Marcar como entregue
                                </Button>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {completedOrders.length > 0 && (
              <section>
                <h2 className="font-semibold text-sm text-muted-foreground mb-3 uppercase">
                  Pedidos finalizados
                </h2>
                <div className="space-y-3">
                  {completedOrders.map(order => {
                    const config = statusConfig[order.status];
                    const StatusIcon = config.icon;
                    
                    return (
                      <Card 
                        key={order.id} 
                        id={`order-${order.id}`}
                        className={cn(
                          "overflow-hidden opacity-75 transition-all",
                          orderIdRef.current === order.id && "ring-2 ring-primary shadow-lg opacity-100"
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold">{isVendor ? `Pedido #${order.id.slice(0, 8)}` : order.storeName}</h3>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(order.createdAt, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                            <span className={cn(
                              "text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1",
                              config.color
                            )}>
                              <StatusIcon className="h-3 w-3" />
                              {config.label}
                            </span>
                          </div>

                          <div className="space-y-2 mb-3">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">{item.quantity}x</span>
                                <span className="flex-1 truncate">{item.productName}</span>
                                <span className="font-medium">R$ {(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t">
                            <div>
                              <p className="text-xs text-muted-foreground">Total</p>
                              <p className="font-bold text-lg text-primary">R$ {order.total.toFixed(2)}</p>
                            </div>
                            {isVendor && (
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Endereço</p>
                                <p className="text-xs font-medium truncate max-w-[150px]">{order.address}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
