import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, getDocs, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Store, Service } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { FloatingCart } from '@/components/cart/FloatingCart';
import { Card, CardContent } from '@/components/ui/card';
import { StoreSkeleton, BannerSkeleton } from '@/components/ui/skeleton';
import { MapPin, Star, Clock, ChevronRight, Store as StoreIcon, Utensils, Wrench, Search, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

const categories = [
  { id: 'mercado', label: 'Mercados', icon: StoreIcon },
  { id: 'lanche', label: 'Lanches', icon: Utensils },
  { id: 'servicos', label: 'Serviços', icon: Wrench },
];

export default function HomePage() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [stores, setStores] = useState<Store[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const storesQuery = query(collection(db, 'stores'), orderBy('createdAt', 'desc'), limit(10));
      const storesSnapshot = await getDocs(storesQuery);
      const storesData = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store));
      setStores(storesData);

      const servicesQuery = query(collection(db, 'services'), orderBy('createdAt', 'desc'), limit(10));
      const servicesSnapshot = await getDocs(servicesQuery);
      const servicesData = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
      setServices(servicesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStores = selectedCategory === 'servicos' 
    ? [] 
    : stores.filter(store => !selectedCategory || store.category?.toLowerCase().includes(selectedCategory));

  const filteredServices = selectedCategory === 'servicos' || !selectedCategory 
    ? services 
    : [];

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b safe-top">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">Olá, {user?.name?.split(' ')[0] || 'Visitante'} 👋</p>
              <div className="flex items-center gap-1 text-foreground font-semibold">
                <MapPin className="h-4 w-4 text-primary" />
                <span>Bairro Centro</span>
              </div>
            </div>
            {user && (
              <Link 
                to="/notifications" 
                className="relative p-2 rounded-full hover:bg-secondary transition-colors"
              >
                <Bell className="h-5 w-5 text-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            )}
          </div>
          
          {/* Search Bar */}
          <Link 
            to="/search"
            className="flex items-center gap-3 h-12 px-4 rounded-xl bg-secondary/50 text-muted-foreground"
          >
            <Search className="h-5 w-5" />
            <span>Buscar lojas, produtos...</span>
          </Link>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Banner */}
        {loading ? (
          <BannerSkeleton />
        ) : (
          <div className="relative h-36 rounded-2xl bg-gradient-to-r from-primary to-primary/80 overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJ3aGl0ZSIgZmlsbC1vcGFjaXR5PSIwLjEiLz48L3N2Zz4=')] opacity-50" />
            <div className="relative h-full flex flex-col justify-center p-5">
              <h2 className="text-primary-foreground text-xl font-bold mb-1">
                Compre do seu vizinho! 🏘️
              </h2>
              <p className="text-primary-foreground/90 text-sm">
                Apoie o comércio local do seu bairro
              </p>
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {categories.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSelectedCategory(selectedCategory === id ? null : id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all duration-200",
                selectedCategory === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium text-sm">{label}</span>
            </button>
          ))}
        </div>

        {/* Stores Section */}
        {(selectedCategory !== 'servicos') && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">Lojas perto de você</h3>
              <Link to="/search?type=stores" className="text-primary text-sm font-medium flex items-center gap-1">
                Ver todas <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            
            <div className="space-y-3">
              {loading ? (
                <>
                  <StoreSkeleton />
                  <StoreSkeleton />
                  <StoreSkeleton />
                </>
              ) : filteredStores.length > 0 ? (
                filteredStores.map(store => (
                  <Link key={store.id} to={`/store/${store.id}`}>
                    <Card className="overflow-hidden active:scale-[0.99] transition-transform">
                      <CardContent className="p-0">
                        <div className="flex gap-3 p-3">
                          <div className="h-20 w-20 rounded-lg bg-secondary flex-shrink-0 overflow-hidden">
                            {store.logoUrl ? (
                              <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" />
                            ) : store.bannerUrl ? (
                              <img src={store.bannerUrl} alt={store.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
                                <StoreIcon className="h-8 w-8 text-primary/50" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-semibold truncate">{store.name}</h4>
                              <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full flex-shrink-0",
                                store.isOpen 
                                  ? "bg-success/10 text-success" 
                                  : "bg-muted text-muted-foreground"
                              )}>
                                {store.isOpen ? 'Aberto' : 'Fechado'}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{store.category}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-sm">
                              {store.rating && (
                                <span className="flex items-center gap-1 text-foreground">
                                  <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                                  {store.rating.toFixed(1)}
                                </span>
                              )}
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                20-30 min
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <StoreIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma loja encontrada</p>
                  <p className="text-sm">Seja o primeiro a cadastrar!</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Services Section */}
        {(selectedCategory === 'servicos' || !selectedCategory) && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">Serviços disponíveis</h3>
              <Link to="/search?type=services" className="text-primary text-sm font-medium flex items-center gap-1">
                Ver todos <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {loading ? (
                <>
                  <StoreSkeleton />
                  <StoreSkeleton />
                </>
              ) : filteredServices.length > 0 ? (
                filteredServices.map(service => (
                  <Link key={service.id} to={`/service/${service.id}`}>
                    <Card className="overflow-hidden h-full active:scale-[0.99] transition-transform">
                      <CardContent className="p-3">
                        <div className="h-24 rounded-lg bg-secondary mb-2 overflow-hidden">
                          {service.portfolioImages?.[0] ? (
                            <img src={service.portfolioImages[0]} alt={service.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
                              <Wrench className="h-8 w-8 text-primary/50" />
                            </div>
                          )}
                        </div>
                        <h4 className="font-semibold text-sm truncate">{service.title}</h4>
                        <p className="text-xs text-muted-foreground truncate">{service.category}</p>
                        {service.priceRange && (
                          <p className="text-xs text-primary font-medium mt-1">{service.priceRange}</p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum serviço encontrado</p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <FloatingCart />
      <BottomNav />
    </div>
  );
}
