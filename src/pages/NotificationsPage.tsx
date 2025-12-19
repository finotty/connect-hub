import { Link } from 'react-router-dom';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Check, Package, Truck, CheckCircle, Clock, ShoppingBag, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const notificationIcons = {
  new_order: ShoppingBag,
  order_confirmed: CheckCircle,
  order_preparing: Package,
  order_out_for_delivery: Truck,
  order_delivered: CheckCircle,
  order_cancelled: Clock,
};

export default function NotificationsPage() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, deleteAllRead } = useNotifications();
  const { toast } = useToast();

  if (loading) {
    return (
      <div className="min-h-screen pb-20 bg-background">
        <header className="sticky top-0 z-40 bg-card border-b p-4">
          <h1 className="font-bold text-lg">Notificações</h1>
        </header>
        <main className="p-4 space-y-3 max-w-6xl mx-auto">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </main>
        <BottomNav />
      </div>
    );
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    toast({ title: "Todas as notificações foram marcadas como lidas" });
  };

  const handleDeleteAllRead = async () => {
    const readCount = notifications.filter(n => n.read).length;
    if (readCount === 0) {
      toast({ title: "Não há notificações lidas para deletar", variant: "destructive" });
      return;
    }
    await deleteAllRead();
    toast({ title: `${readCount} notificação(ões) deletada(s)` });
  };

  const handleDeleteNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
    toast({ title: "Notificação deletada" });
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      <header className="sticky top-0 z-40 bg-card border-b p-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-bold text-lg">Notificações</h1>
          {notifications.filter(n => n.read).length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleDeleteAllRead}>
              <Trash2 className="h-4 w-4 mr-1" />
              Limpar lidas
            </Button>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" className="w-full" onClick={handleMarkAllAsRead}>
            Marcar todas como lidas
          </Button>
        )}
      </header>

      <main className="p-4 max-w-6xl mx-auto">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Bell className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h2 className="font-semibold text-lg mb-1">Nenhuma notificação</h2>
              <p className="text-sm">
                Você será notificado sobre seus pedidos e atualizações importantes.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map(notification => {
              const Icon = notificationIcons[notification.type] || Bell;
              const isUnread = !notification.read;

              return (
                <Card
                  key={notification.id}
                  className={cn(
                    "transition-all cursor-pointer",
                    isUnread && "bg-primary/5 border-primary/20"
                  )}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
                        isUnread ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className={cn(
                              "font-semibold text-sm",
                              isUnread && "font-bold"
                            )}>
                              {notification.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(notification.createdAt, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isUnread && (
                              <div className="h-2 w-2 rounded-full bg-primary mt-1" />
                            )}
                            <button
                              onClick={(e) => handleDeleteNotification(notification.id, e)}
                              className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        {notification.orderId && (
                          <Link
                            to={`/orders?orderId=${notification.orderId}`}
                            className="text-primary text-xs font-medium mt-2 inline-block hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                          >
                            Ver pedido →
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

