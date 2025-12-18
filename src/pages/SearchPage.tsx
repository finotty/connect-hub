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
      setStores(storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store)));

      const servicesQuery = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
      const servicesSnapshot = await getDocs(servicesQuery);
      setServices(servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
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

      <main className="p-4 space-y-4">
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
                <div className="space-y-3">
                  {filteredStores.map(store => (
                    <Link key={store.id} to={`/store/${store.id}`}>
                      <Card className="overflow-hidden active:scale-[0.99] transition-transform">
                        <CardContent className="p-0">
                          <div className="flex gap-3 p-3">
                            <div className="h-20 w-20 rounded-lg bg-secondary flex-shrink-0 overflow-hidden">
                              {store.bannerUrl ? (
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
                                  <span className="flex items-center gap-1">
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
                  ))}
                </div>
              </section>
            )}

            {/* Services */}
            {(activeTab === 'all' || activeTab === 'services') && filteredServices.length > 0 && (
              <section>
                {activeTab === 'all' && <h2 className="font-bold mb-3 mt-6">Serviços</h2>}
                <div className="grid grid-cols-2 gap-3">
                  {filteredServices.map(service => (
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
