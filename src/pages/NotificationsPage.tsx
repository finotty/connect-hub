import { Link } from 'react-router-dom';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Check, Package, Truck, CheckCircle, Clock, ShoppingBag } from 'lucide-react';
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
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

  if (loading) {
    return (
      <div className="min-h-screen pb-20 bg-background">
        <header className="sticky top-0 z-40 bg-card border-b p-4">
          <h1 className="font-bold text-lg">Notificações</h1>
        </header>
        <main className="p-4 space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </main>
        <BottomNav />
      </div>
    );
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      <header className="sticky top-0 z-40 bg-card border-b p-4 flex items-center justify-between">
        <h1 className="font-bold text-lg">Notificações</h1>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
            Marcar todas como lidas
          </Button>
        )}
      </header>

      <main className="p-4">
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
                          {isUnread && (
                            <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                          )}
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

