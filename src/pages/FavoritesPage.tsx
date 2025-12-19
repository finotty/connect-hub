import { Link } from 'react-router-dom';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { useFavorites } from '@/contexts/FavoritesContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, Store as StoreIcon, Wrench, Clock, Star, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FavoritesPage() {
  const { favoriteStores, favoriteServices, loading } = useFavorites();

  if (loading) {
    return (
      <div className="min-h-screen pb-20 bg-background">
        <header className="sticky top-0 z-40 bg-card border-b p-4">
          <h1 className="font-bold text-lg">Favoritos</h1>
        </header>
        <main className="p-4 space-y-3 max-w-6xl mx-auto">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </main>
        <BottomNav />
      </div>
    );
  }

  const hasFavorites = favoriteStores.length > 0 || favoriteServices.length > 0;

  return (
    <div className="min-h-screen pb-20 bg-background">
      <header className="sticky top-0 z-40 bg-card border-b p-4">
        <h1 className="font-bold text-lg">Favoritos</h1>
      </header>

      <main className="p-4 space-y-6 max-w-6xl mx-auto">
        {!hasFavorites ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Heart className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h2 className="font-semibold text-lg mb-1">Nenhum favorito ainda</h2>
              <p className="text-sm mb-4">
                Adicione lojas e serviços aos seus favoritos para encontrá-los facilmente.
              </p>
              <Link to="/" className="text-primary font-medium text-sm">
                Explorar lojas
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {favoriteStores.length > 0 && (
              <section>
                <h2 className="font-semibold text-sm text-muted-foreground mb-3 uppercase">
                  Lojas Favoritas
                </h2>
                <div className="space-y-3">
                  {favoriteStores.map(store => (
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
                  ))}
                </div>
              </section>
            )}

            {favoriteServices.length > 0 && (
              <section>
                <h2 className="font-semibold text-sm text-muted-foreground mb-3 uppercase">
                  Serviços Favoritos
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {favoriteServices.map(service => (
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
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

