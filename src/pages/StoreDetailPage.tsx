import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Store, Product, Post } from '@/types';
import { useCart } from '@/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { FloatingCart } from '@/components/cart/FloatingCart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton, ProductSkeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Star, Clock, MapPin, Phone, Plus, Minus, Store as StoreIcon, Heart, Search, Scale, DollarSign, Package, TrendingUp, Eye, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generatePostInterestWhatsApp, generateWhatsAppUrl } from '@/lib/whatsapp';

// Componente para exibir um anúncio com tracking de visualização
function PostCard({ post, store }: { post: Post; store: Store }) {
  const { user } = useAuth();
  const { createNotification } = useNotifications();
  const { toast } = useToast();
  
  useEffect(() => {
    const trackView = async () => {
      try {
        await updateDoc(doc(db, 'posts', post.id), {
          views: increment(1)
        });
      } catch (error) {
        console.error('Error tracking post view:', error);
      }
    };
    trackView();
  }, [post.id]);
  
  const handleAproveitar = async () => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Por favor, faça login para aproveitar o anúncio.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Incrementar cliques
      await updateDoc(doc(db, 'posts', post.id), {
        clicks: increment(1)
      });
      
      // Criar notificação para o vendedor
      try {
        await createNotification(
          store.ownerId,
          'post_interest',
          'Interesse no seu anúncio!',
          `${user.name} demonstrou interesse no anúncio "${post.title}"`
        );
      } catch (error) {
        console.error('Error creating notification:', error);
      }
      
      // Gerar mensagem e abrir WhatsApp
      const message = generatePostInterestWhatsApp(post, undefined, store);
      const whatsappUrl = generateWhatsAppUrl(store.whatsappNumber, message);
      window.open(whatsappUrl, '_blank');
      
      toast({
        title: "Redirecionando para WhatsApp",
        description: "Você será redirecionado para conversar sobre o anúncio.",
      });
    } catch (error) {
      console.error('Error handling aproveitar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível processar sua solicitação.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <Card className={cn(post.isPromoted && "border-primary/50 bg-primary/5", "max-w-2xl mx-auto")}>
      <CardContent className="p-4">
        {post.imageUrl && (
          <div className="h-48 sm:h-64 md:h-72 rounded-lg bg-secondary overflow-hidden mb-3">
            <img 
              src={post.imageUrl} 
              alt={post.title} 
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-base">{post.title}</h3>
          {post.isPromoted && (
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
              ⭐ Impulsionado
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          {post.content}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {post.views || 0}
            </span>
            <span>👆 {post.clicks || 0}</span>
          </div>
          <Button
            size="sm"
            variant="whatsapp"
            onClick={handleAproveitar}
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            Aproveitar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StoreDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantityInput, setQuantityInput] = useState('1');
  const [weightInput, setWeightInput] = useState('1'); // em kg (padronizado)
  const [weightUnitInput, setWeightUnitInput] = useState<'kg' | 'g'>('kg'); // unidade do input do cliente
  const [valueInput, setValueInput] = useState('1'); // em reais
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
        const storeData = { id: storeDoc.id, ...storeDoc.data() } as Store;
        setStore(storeData);
        
        // Buscar anúncios da loja
        const postsQuery = query(
          collection(db, 'posts'),
          where('storeId', '==', storeData.id)
        );
        const postsSnapshot = await getDocs(postsQuery);
        const postsData = postsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        } as Post));
        setPosts(postsData);
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

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setQuantityInput('1');
    setWeightInput('1'); // Resetar para 1kg
    setWeightUnitInput('kg'); // Resetar unidade para kg
    setValueInput('1');
  };

  const handleAddToCartFromModal = () => {
    if (!store || !selectedProduct) return;

    let customQuantity: { type: 'weight' | 'value'; amount: number; displayLabel?: string } | undefined;

    if (selectedProduct.saleType === 'weight') {
      // Converter input do cliente para gramas
      const weightInGrams = convertWeightToGrams(weightInput, weightUnitInput);
      
      // Criar label de exibição (mostrar em kg se >= 1kg, senão em gramas)
      let displayLabel: string;
      if (weightInGrams >= 1000) {
        displayLabel = `${(weightInGrams / 1000).toFixed(weightInGrams % 1000 === 0 ? 0 : 2)}kg`;
      } else {
        displayLabel = `${weightInGrams}g`;
      }
      
      customQuantity = {
        type: 'weight',
        amount: weightInGrams, // sempre em gramas
        displayLabel: displayLabel
      };
    } else if (selectedProduct.saleType === 'value') {
      const valueAmount = parseFloat(valueInput) || 1;
      customQuantity = {
        type: 'value',
        amount: valueAmount,
        displayLabel: `R$ ${valueAmount.toFixed(2)}`
      };
    }

    // Para produtos por unidade, usar a quantidade do input
    const saleType = selectedProduct.saleType || 'unit';
    const quantity = saleType === 'unit' ? parseFloat(quantityInput) || 1 : 1;
    
    // Adicionar múltiplas vezes se quantidade > 1
    for (let i = 0; i < quantity; i++) {
      addToCart(selectedProduct, store.name, store.whatsappNumber, customQuantity);
    }
    
    toast({
      title: "Adicionado ao carrinho",
      description: `${quantity}x ${selectedProduct.name}`,
    });
    
    setSelectedProduct(null);
  };

  const handleAddToCart = (product: Product) => {
    if (!store) return;
    // Abre o modal ao invés de adicionar diretamente
    handleProductClick(product);
  };

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    updateQuantity(productId, newQuantity);
  };

  // Converte o preço do produto para sempre mostrar por kg
  const getPricePerKg = (product: Product): number => {
    if (product.saleType !== 'weight') return product.price;
    
    if (product.weightUnit === 'kg') {
      // Preço já está por kg
      return product.price;
    } else {
      // Preço está por 100g, converter para kg (multiplicar por 10)
      return product.price * 10;
    }
  };

  // Converte o input do cliente para gramas
  const convertWeightToGrams = (value: string, unit: 'kg' | 'g'): number => {
    const numValue = parseFloat(value) || 0;
    if (unit === 'kg') {
      return numValue * 1000; // converter kg para gramas
    }
    return numValue; // já está em gramas
  };

  const calculatePrice = (product: Product) => {
    const saleType = product.saleType || 'unit'; // Fallback para produtos antigos
    
    if (saleType === 'weight') {
      // Converter input do cliente para gramas
      const weightInGrams = convertWeightToGrams(weightInput, weightUnitInput);
      
      // Calcular preço baseado em gramas
      if (product.weightUnit === 'kg') {
        // Preço do vendedor é por kg, então dividir gramas por 1000
        const weightInKg = weightInGrams / 1000;
        return product.price * weightInKg;
      } else {
        // Preço do vendedor é por 100g, então dividir gramas por 100
        return product.price * (weightInGrams / 100);
      }
    } else if (saleType === 'value') {
      // Para produtos por valor, o cliente escolhe quanto quer gastar
      // O valor que ele escolheu é o preço que ele vai pagar
      const valueAmount = parseFloat(valueInput) || 1;
      return valueAmount;
    } else {
      const quantity = parseFloat(quantityInput) || 1;
      return product.price * quantity;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-20 bg-background">
        <div className="h-40 sm:h-56 md:h-64 bg-secondary" />
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

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(productSearchQuery.toLowerCase())
  );
  
  const availableProducts = filteredProducts.filter(p => p.isAvailable);
  const unavailableProducts = filteredProducts.filter(p => !p.isAvailable);

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Header Image */}
      <div className="relative h-40 sm:h-56 md:h-64 bg-secondary overflow-hidden">
        {store.bannerUrl ? (
          <img 
            src={store.bannerUrl} 
            alt={store.name} 
            className="h-full w-full object-cover object-center" 
          />
        ) : store.logoUrl ? (
          <img 
            src={store.logoUrl} 
            alt={store.name} 
            className="h-full w-full object-cover object-center" 
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
            <StoreIcon className="h-16 w-16 text-primary/30" />
          </div>
        )}
        {/* Overlay gradient para melhorar legibilidade */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
        <Link 
          to="/"
          className="absolute top-4 left-4 h-10 w-10 rounded-full bg-card/90 backdrop-blur flex items-center justify-center shadow-lg z-10"
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
        <div className="mb-3">
          <h2 className="font-bold text-lg mb-3">Produtos</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              value={productSearchQuery}
              onChange={(e) => setProductSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        {availableProducts.length > 0 ? (
          <div className="space-y-3">
            {availableProducts.map(product => {
              const quantity = getItemQuantity(product.id);
              
              return (
                <Card 
                  key={product.id} 
                  className="overflow-hidden cursor-pointer hover:bg-secondary/50 transition-colors"
                  onClick={() => handleProductClick(product)}
                >
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
                          <div>
                            <span className="text-primary font-bold">
                              R$ {product.saleType === 'weight' ? getPricePerKg(product).toFixed(2) : product.price.toFixed(2)}
                            </span>
                            {product.saleType === 'weight' && (
                              <p className="text-xs text-muted-foreground">
                                por kg
                              </p>
                            )}
                            {product.saleType === 'value' && product.valueQuantity && (
                              <p className="text-xs text-muted-foreground">
                                R$ 1,00 = {product.valueQuantity} {product.valueLabel || 'unidades'}
                              </p>
                            )}
                          </div>
                          
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

        {/* Posts/Anúncios */}
        {posts.length > 0 && store && (
          <div className="mt-6">
            <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Anúncios
            </h2>
            <div className="space-y-3">
              {posts.map(post => (
                <PostCard key={post.id} post={post} store={store} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedProduct.name}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Product Image */}
                {selectedProduct.imageUrl && (
                  <div className="h-48 w-full rounded-lg bg-secondary overflow-hidden">
                    <img 
                      src={selectedProduct.imageUrl} 
                      alt={selectedProduct.name} 
                      className="h-full w-full object-cover" 
                    />
                  </div>
                )}

                {/* Description */}
                {selectedProduct.description && (
                  <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>
                )}

                {/* Sale Type Info */}
                <div className="p-4 bg-secondary rounded-lg space-y-3">
                  {selectedProduct.saleType === 'unit' && (
                    <div className="flex items-start gap-3">
                      <Package className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">Vendido por Unidade</p>
                        <p className="text-xs text-muted-foreground">
                          Preço: R$ {selectedProduct.price.toFixed(2)} por {selectedProduct.unitLabel || 'unidade'}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedProduct.saleType === 'weight' && (
                    <div className="flex items-start gap-3">
                      <Scale className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-sm">Vendido por Peso</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          Preço: R$ {getPricePerKg(selectedProduct).toFixed(2)} por kg
                        </p>
                        <div className="flex items-center gap-2 mb-2">
                          <Input
                            type="number"
                            step={weightUnitInput === 'kg' ? '0.01' : '10'}
                            min="0"
                            value={weightInput}
                            onChange={(e) => setWeightInput(e.target.value)}
                            className="flex-1"
                            placeholder={weightUnitInput === 'kg' ? 'Ex: 0.8' : 'Ex: 800'}
                          />
                          <select
                            value={weightUnitInput}
                            onChange={(e) => {
                              setWeightUnitInput(e.target.value as 'kg' | 'g');
                              // Converter valor quando mudar unidade
                              const currentValue = parseFloat(weightInput) || 0;
                              if (e.target.value === 'kg' && weightUnitInput === 'g') {
                                // De gramas para kg
                                setWeightInput((currentValue / 1000).toFixed(2));
                              } else if (e.target.value === 'g' && weightUnitInput === 'kg') {
                                // De kg para gramas
                                setWeightInput((currentValue * 1000).toString());
                              }
                            }}
                            className="px-2 py-2 rounded-md border border-input bg-background text-sm"
                          >
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                          </select>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {(() => {
                            const weightInGrams = convertWeightToGrams(weightInput, weightUnitInput);
                            if (weightInGrams >= 1000) {
                              return `${(weightInGrams / 1000).toFixed(weightInGrams % 1000 === 0 ? 0 : 2)}kg`;
                            }
                            return `${weightInGrams}g`;
                          })()}
                        </p>
                        <p className="text-xs text-primary mt-2 font-medium">
                          Total: R$ {calculatePrice(selectedProduct).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedProduct.saleType === 'value' && selectedProduct.valueQuantity && (
                    <div className="flex items-start gap-3">
                      <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-sm">Vendido por Valor</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          R$ 1,00 = {selectedProduct.valueQuantity} {selectedProduct.valueLabel || 'unidades'}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">R$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={valueInput}
                            onChange={(e) => setValueInput(e.target.value)}
                            className="flex-1"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Você receberá: {((parseFloat(valueInput) || 1) * selectedProduct.valueQuantity).toFixed(0)} {selectedProduct.valueLabel || 'unidades'}
                        </p>
                        <p className="text-xs text-primary mt-1 font-medium">
                          Total: R$ {calculatePrice(selectedProduct).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quantity for unit type */}
                {selectedProduct.saleType === 'unit' && (
                  <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                    <span className="text-sm font-medium">Quantidade</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const qty = Math.max(1, parseFloat(quantityInput) - 1);
                          setQuantityInput(qty.toString());
                        }}
                        className="h-8 w-8 rounded-full bg-background flex items-center justify-center hover:bg-background/80 transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <Input
                        type="number"
                        min="1"
                        value={quantityInput}
                        onChange={(e) => setQuantityInput(e.target.value)}
                        className="w-16 text-center"
                      />
                      <button
                        onClick={() => {
                          const qty = parseFloat(quantityInput) + 1;
                          setQuantityInput(qty.toString());
                        }}
                        className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Total Price */}
                <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-primary">
                    R$ {calculatePrice(selectedProduct).toFixed(2)}
                  </span>
                </div>

                {/* Add to Cart Button */}
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleAddToCartFromModal}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Adicionar ao Carrinho
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <FloatingCart />
      <BottomNav />
    </div>
  );
}
