import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Store, Product } from '@/types';
import { useCart } from '@/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { FloatingCart } from '@/components/cart/FloatingCart';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton, ProductSkeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Star, Clock, MapPin, Phone, Plus, Minus, Store as StoreIcon, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StoreDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart, items, updateQuantity } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { toast } = useToast();

  useEffect(() => {
    if (id) fetchStoreData();
  }, [id]);

  const fetchStoreData = async () => {
    try {
      const storeDoc = await getDoc(doc(db, 'stores', id!));
      if (storeDoc.exists()) {
        setStore({ id: storeDoc.id, ...storeDoc.data() } as Store);
      }

      const productsQuery = query(
        collection(db, 'products'),
        where('storeId', '==', id)
      );
      const productsSnapshot = await getDocs(productsQuery);
      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching store:', error);
    } finally {
      setLoading(false);
    }
  };

  const getItemQuantity = (productId: string) => {
    const item = items.find(i => i.product.id === productId);
    return item?.quantity || 0;
  };

  const handleAddToCart = (product: Product) => {
    if (!store) return;
    addToCart(product, store.name, store.whatsappNumber);
    toast({
      title: "Adicionado ao carrinho",
      description: product.name,
    });
  };

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    updateQuantity(productId, newQuantity);
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-20 bg-background">
        <div className="h-48 bg-secondary" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="grid grid-cols-2 gap-3 mt-6">
            <ProductSkeleton />
            <ProductSkeleton />
            <ProductSkeleton />
            <ProductSkeleton />
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <StoreIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Loja não encontrada</h2>
          <Link to="/" className="text-primary">Voltar ao início</Link>
        </div>
      </div>
    );
  }

  const availableProducts = products.filter(p => p.isAvailable);
  const unavailableProducts = products.filter(p => !p.isAvailable);

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Header Image */}
      <div className="relative h-48 bg-secondary">
        {store.bannerUrl ? (
          <img src={store.bannerUrl} alt={store.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
            <StoreIcon className="h-16 w-16 text-primary/30" />
          </div>
        )}
        <Link 
          to="/"
          className="absolute top-4 left-4 h-10 w-10 rounded-full bg-card/90 backdrop-blur flex items-center justify-center shadow-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      {/* Store Info */}
      <div className="p-4 -mt-6 relative">
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-start gap-3 mb-3">
              {store.logoUrl && (
                <div className="h-16 w-16 rounded-lg bg-secondary flex-shrink-0 overflow-hidden border-2 border-background shadow-sm">
                  <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold truncate">{store.name}</h1>
                  <button
                    onClick={() => {
                      toggleFavorite(store.id, 'store');
                      toast({
                        title: isFavorite(store.id, 'store') ? 'Removido dos favoritos' : 'Adicionado aos favoritos',
                      });
                    }}
                    className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors flex-shrink-0"
                  >
                    <Heart className={cn(
                      "h-5 w-5",
                      isFavorite(store.id, 'store') ? "fill-red-500 text-red-500" : "text-muted-foreground"
                    )} />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">{store.category}</p>
              </div>
              <span className={cn(
                "text-xs px-3 py-1 rounded-full font-medium flex-shrink-0",
                store.isOpen 
                  ? "bg-success/10 text-success" 
                  : "bg-muted text-muted-foreground"
              )}>
                {store.isOpen ? 'Aberto' : 'Fechado'}
              </span>
            </div>

            {store.description && (
              <p className="text-sm text-muted-foreground mb-3">{store.description}</p>
            )}

            <div className="flex flex-wrap gap-3 text-sm">
              {store.rating && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  {store.rating.toFixed(1)}
                </span>
              )}
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                20-30 min
              </span>
              {store.address && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {store.address}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Products */}
        <h2 className="font-bold text-lg mb-3">Produtos</h2>
        
        {availableProducts.length > 0 ? (
          <div className="space-y-3">
            {availableProducts.map(product => {
              const quantity = getItemQuantity(product.id);
              
              return (
                <Card key={product.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex gap-3 p-3">
                      <div className="h-24 w-24 rounded-lg bg-secondary flex-shrink-0 overflow-hidden">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                            <span className="text-3xl">🛒</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <h3 className="font-semibold truncate">{product.name}</h3>
                        {product.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-auto">{product.description}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-primary font-bold">
                            R$ {product.price.toFixed(2)}
                          </span>
                          
                          {quantity > 0 ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleUpdateQuantity(product.id, quantity - 1)}
                                className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-6 text-center font-semibold">{quantity}</span>
                              <button
                                onClick={() => handleUpdateQuantity(product.id, quantity + 1)}
                                className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <Button 
                              size="sm"
                              onClick={() => handleAddToCart(product)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Adicionar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum produto disponível no momento</p>
          </div>
        )}

        {unavailableProducts.length > 0 && (
          <div className="mt-6">
            <h3 className="font-medium text-muted-foreground mb-3">Indisponíveis</h3>
            <div className="space-y-3 opacity-60">
              {unavailableProducts.map(product => (
                <Card key={product.id} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex gap-3">
                      <div className="h-16 w-16 rounded-lg bg-muted flex-shrink-0" />
                      <div>
                        <h4 className="font-medium line-through">{product.name}</h4>
                        <p className="text-sm text-muted-foreground">Indisponível</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <FloatingCart />
      <BottomNav />
    </div>
  );
}
