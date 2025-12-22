import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Store, Service } from '@/types';
import { BottomNav } from '@/components/layout/BottomNav';
import { FloatingCart } from '@/components/cart/FloatingCart';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { StoreSkeleton } from '@/components/ui/skeleton';
import { Search, Star, Clock, Store as StoreIcon, Wrench, ArrowLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'all' | 'stores' | 'services';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>((searchParams.get('type') as Tab) || 'all');
  const [stores, setStores] = useState<Store[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const storesQuery = query(collection(db, 'stores'), orderBy('createdAt', 'desc'));
      const storesSnapshot = await getDocs(storesQuery);
      let storesData = storesSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        featuredUntil: doc.data().featuredUntil?.toDate()
      } as Store));
      
      // Filtrar apenas visíveis
      storesData = storesData.filter(store => store.isVisible !== false);
      
      // Ordenar: primeiro destacados, depois por data
      storesData.sort((a, b) => {
        const now = new Date();
        const aIsFeatured = a.isFeatured && (!a.featuredUntil || a.featuredUntil > now);
        const bIsFeatured = b.isFeatured && (!b.featuredUntil || b.featuredUntil > now);
        
        if (aIsFeatured && !bIsFeatured) return -1;
        if (!aIsFeatured && bIsFeatured) return 1;
        if (aIsFeatured && bIsFeatured) {
          return (a.featuredOrder || 999) - (b.featuredOrder || 999);
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      
      setStores(storesData);

      const servicesQuery = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
      const servicesSnapshot = await getDocs(servicesQuery);
      let servicesData = servicesSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        featuredUntil: doc.data().featuredUntil?.toDate()
      } as Service));
      
      // Filtrar apenas visíveis
      servicesData = servicesData.filter(service => service.isVisible !== false);
      
      // Ordenar: primeiro destacados, depois por data
      servicesData.sort((a, b) => {
        const now = new Date();
        const aIsFeatured = a.isFeatured && (!a.featuredUntil || a.featuredUntil > now);
        const bIsFeatured = b.isFeatured && (!b.featuredUntil || b.featuredUntil > now);
        
        if (aIsFeatured && !bIsFeatured) return -1;
        if (!aIsFeatured && bIsFeatured) return 1;
        if (aIsFeatured && bIsFeatured) {
          return (a.featuredOrder || 999) - (b.featuredOrder || 999);
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      
      setServices(servicesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStores = stores.filter(store => 
    store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredServices = services.filter(service => 
    service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    { id: 'all', label: 'Todos' },
    { id: 'stores', label: 'Lojas' },
    { id: 'services', label: 'Serviços' },
  ];

  return (
    <div className="min-h-screen pb-20 bg-background">
      <header className="sticky top-0 z-40 bg-card border-b p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar lojas, serviços..."
              className="pl-10 pr-10 h-12"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-6xl mx-auto">
        {loading ? (
          <>
            <StoreSkeleton />
            <StoreSkeleton />
            <StoreSkeleton />
          </>
        ) : (
          <>
            {/* Stores */}
            {(activeTab === 'all' || activeTab === 'stores') && filteredStores.length > 0 && (
              <section>
                {activeTab === 'all' && <h2 className="font-bold mb-3">Lojas</h2>}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-w-full md:max-w-4xl">
                  {filteredStores.map(store => (
                    <Link key={store.id} to={`/store/${store.id}`}>
                      <Card className="overflow-hidden active:scale-[0.99] transition-transform h-full">
                        <CardContent className="p-3">
                          <div className="flex flex-col gap-2">
                            <div className="h-32 rounded-lg bg-secondary overflow-hidden">
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
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className="font-semibold text-sm truncate">{store.name}</h4>
                                <span className={cn(
                                  "text-xs px-1.5 py-0.5 rounded-full flex-shrink-0",
                                  store.isOpen 
                                    ? "bg-success/10 text-success" 
                                    : "bg-muted text-muted-foreground"
                                )}>
                                  {store.isOpen ? 'Aberto' : 'Fechado'}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate mb-1.5">{store.category}</p>
                              <div className="flex items-center gap-2 text-xs">
                                {store.rating && (
                                  <span className="flex items-center gap-1 text-foreground">
                                    <Star className="h-3 w-3 fill-primary text-primary" />
                                    {store.rating.toFixed(1)}
                                  </span>
                                )}
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  20-30 min
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Services */}
            {(activeTab === 'all' || activeTab === 'services') && filteredServices.length > 0 && (
              <section>
                {activeTab === 'all' && <h2 className="font-bold mb-3 mt-6">Serviços</h2>}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-w-full md:max-w-4xl">
                  {filteredServices.map(service => (
                    <Link key={service.id} to={`/service/${service.id}`}>
                      <Card className="overflow-hidden h-full active:scale-[0.99] transition-transform">
                        <CardContent className="p-3">
                          <div className="h-32 rounded-lg bg-secondary mb-2 overflow-hidden">
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
                  ))}
                </div>
              </section>
            )}

            {/* Empty state */}
            {((activeTab === 'stores' && filteredStores.length === 0) ||
              (activeTab === 'services' && filteredServices.length === 0) ||
              (activeTab === 'all' && filteredStores.length === 0 && filteredServices.length === 0)) && (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Nenhum resultado encontrado</p>
                <p className="text-sm">Tente buscar por outro termo</p>
              </div>
            )}
          </>
        )}
      </main>

      <FloatingCart />
      <BottomNav />
    </div>
  );
}
