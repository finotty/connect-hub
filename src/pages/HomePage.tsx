import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, getDocs, orderBy, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Store, Service, Post } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useToast } from '@/hooks/use-toast';
import { generatePostInterestWhatsApp, generateWhatsAppUrl } from '@/lib/whatsapp';
import { BottomNav } from '@/components/layout/BottomNav';
import { FloatingCart } from '@/components/cart/FloatingCart';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StoreSkeleton, BannerSkeleton } from '@/components/ui/skeleton';
import { MapPin, Star, Clock, ChevronRight, Store as StoreIcon, Utensils, Wrench, Search, Bell, BarChart3, Shield, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const categories = [
  { id: 'mercado', label: 'Mercados', icon: StoreIcon },
  { id: 'lanche', label: 'Lanches', icon: Utensils },
  { id: 'servicos', label: 'Serviços', icon: Wrench },
];

export default function HomePage() {
  const { user } = useAuth();
  const { unreadCount, createNotification } = useNotifications();
  const { toast } = useToast();
  const [stores, setStores] = useState<Store[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  // Função para incrementar visualizações de loja
  const handleStoreView = async (storeId: string) => {
    try {
      await updateDoc(doc(db, 'stores', storeId), {
        views: increment(1)
      });
    } catch (error) {
      console.error('Error tracking store view:', error);
      // Não bloqueia a navegação se o tracking falhar
    }
  };

  // Função para incrementar visualizações de serviço
  const handleServiceView = async (serviceId: string) => {
    try {
      await updateDoc(doc(db, 'services', serviceId), {
        views: increment(1)
      });
    } catch (error) {
      console.error('Error tracking service view:', error);
      // Não bloqueia a navegação se o tracking falhar
    }
  };
  const [featuredStores, setFeaturedStores] = useState<Store[]>([]);
  const [featuredServices, setFeaturedServices] = useState<Service[]>([]);
  const [promotedPosts, setPromotedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Buscar todas as lojas
      const storesQuery = query(collection(db, 'stores'));
      const storesSnapshot = await getDocs(storesQuery);
      let storesData = storesSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        featuredUntil: doc.data().featuredUntil?.toDate()
      } as Store));

      const now = new Date();

      // Filtrar apenas visíveis
      storesData = storesData.filter(store => store.isVisible !== false);

      // Calcular destacados válidos
      const currentFeaturedStores = storesData
        .filter(store => store.isFeatured && (!store.featuredUntil || store.featuredUntil > now))
        .sort((a, b) => (a.featuredOrder || 999) - (b.featuredOrder || 999))
        .slice(0, 10); // limitar quantidade no destaque

      // Ordenar lista geral: primeiro destacados (por ordem), depois por data de criação
      storesData.sort((a, b) => {
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
      setFeaturedStores(currentFeaturedStores);

      // Buscar todos os serviços
      const servicesQuery = query(collection(db, 'services'));
      const servicesSnapshot = await getDocs(servicesQuery);
      let servicesData = servicesSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        featuredUntil: doc.data().featuredUntil?.toDate()
      } as Service));

      // Filtrar apenas visíveis
      servicesData = servicesData.filter(service => service.isVisible !== false);

      // Calcular destacados válidos
      const currentFeaturedServices = servicesData
        .filter(service => service.isFeatured && (!service.featuredUntil || service.featuredUntil > now))
        .sort((a, b) => (a.featuredOrder || 999) - (b.featuredOrder || 999))
        .slice(0, 10);

      // Ordenar lista geral: primeiro destacados (por ordem), depois por data de criação
      servicesData.sort((a, b) => {
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
      setFeaturedServices(currentFeaturedServices);

      // Buscar anúncios impulsionados (posts)
      const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
      const postsSnapshot = await getDocs(postsQuery);
      const postsData = postsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        promotionEndsAt: doc.data().promotionEndsAt?.toDate()
      } as Post));

      const promoted = postsData
        .filter(p => p.isPromoted && (!p.promotionEndsAt || p.promotionEndsAt > now))
        .slice(0, 10);

      setPromotedPosts(promoted);
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

  const selectedOwnerStore = selectedPost && selectedPost.storeId
    ? stores.find(s => s.id === selectedPost.storeId)
    : undefined;
  const selectedOwnerService = selectedPost && selectedPost.serviceId
    ? services.find(s => s.id === selectedPost.serviceId)
    : undefined;

  const handleAproveitarPost = async () => {
    if (!selectedPost) return;

    const ownerStore = selectedOwnerStore;
    const ownerService = selectedOwnerService;

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
      await updateDoc(doc(db, 'posts', selectedPost.id), {
        clicks: increment(1)
      });

      // Criar notificação para o dono do anúncio
      const ownerId = ownerStore?.ownerId || ownerService?.ownerId;
      if (ownerId) {
        try {
          await createNotification(
            ownerId,
            'post_interest',
            'Interesse no seu anúncio!',
            `${user.name} demonstrou interesse no anúncio "${selectedPost.title}"`
          );
        } catch (error) {
          console.error('Error creating notification:', error);
        }
      }

      // Gerar mensagem e abrir WhatsApp
      const whatsappNumber = ownerStore?.whatsappNumber || ownerService?.whatsappNumber;
      if (!whatsappNumber) {
        toast({
          title: "Erro",
          description: "Não foi possível encontrar o WhatsApp do vendedor.",
          variant: "destructive"
        });
        return;
      }

      const message = ownerService
        ? generatePostInterestWhatsApp(selectedPost, ownerService)
        : generatePostInterestWhatsApp(selectedPost, undefined, ownerStore);

      const whatsappUrl = generateWhatsAppUrl(whatsappNumber, message);
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

      <main className="p-4 space-y-6 max-w-6xl mx-auto">
        {/* Admin Dashboard Link */}
        {user && user.role === 'admin' && (
          <Link to="/admin">
            <Card className="bg-gradient-to-r from-purple-500/10 to-purple-500/5 border-purple-500/20 hover:from-purple-500/15 hover:to-purple-500/10 transition-all active:scale-[0.99]">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Painel Administrativo</h3>
                    <p className="text-xs text-muted-foreground">
                      Gerencie lojas, serviços e destaque
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Partner Dashboard Link */}
        {user && (user.role === 'vendor_product' || user.role === 'vendor_service') && (
          <Link to="/partner">
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 hover:from-primary/15 hover:to-primary/10 transition-all active:scale-[0.99]">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Painel do Parceiro</h3>
                    <p className="text-xs text-muted-foreground">
                      {user.role === 'vendor_product' ? 'Gerencie sua loja e pedidos' : 'Gerencie seu serviço'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        )}

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

        {/* Featured Section (Lojas/Serviços) */}
        {!loading && (featuredStores.length > 0 || featuredServices.length > 0) && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary fill-primary" />
                  Em destaque no seu bairro
                </h3>
                <p className="text-xs text-muted-foreground">
                  Anúncios impulsionados de lojas e serviços da sua região
                </p>
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {featuredStores.map(store => (
                <Link 
                  key={`featured-store-${store.id}`} 
                  to={`/store/${store.id}`} 
                  className="min-w-[260px] max-w-[280px]"
                  onClick={() => handleStoreView(store.id)}
                >
                  <Card className="overflow-hidden h-full border-primary/30 bg-primary/5 active:scale-[0.99] transition-transform">
                    <CardContent className="p-3 flex flex-col gap-2">
                      <div className="relative h-28 rounded-lg bg-secondary overflow-hidden">
                        {store.logoUrl ? (
                          <img
                            src={store.logoUrl}
                            alt={store.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
                            <StoreIcon className="h-8 w-8 text-primary/60" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-semibold flex items-center gap-1 shadow-sm">
                            <Star className="h-3 w-3 fill-primary-foreground" />
                            Destaque
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-wide text-primary font-semibold mb-0.5">
                            Loja
                          </p>
                          <h4 className="font-semibold text-sm truncate">{store.name}</h4>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {store.category}
                          </p>
                        </div>
                        {store.rating && (
                          <span className="flex items-center gap-1 text-xs text-foreground">
                            <Star className="h-3 w-3 fill-primary text-primary" />
                            {store.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}

              {featuredServices.map(service => (
                <Link 
                  key={`featured-service-${service.id}`} 
                  to={`/service/${service.id}`} 
                  className="min-w-[260px] max-w-[280px]"
                  onClick={() => handleServiceView(service.id)}
                >
                  <Card className="overflow-hidden h-full border-primary/30 bg-primary/5 active:scale-[0.99] transition-transform">
                    <CardContent className="p-3 flex flex-col gap-2">
                      <div className="relative h-28 rounded-lg bg-secondary overflow-hidden">
                        {service.portfolioImages?.[0] ? (
                          <img
                            src={service.portfolioImages[0]}
                            alt={service.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
                            <Wrench className="h-8 w-8 text-primary/60" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-semibold flex items-center gap-1 shadow-sm">
                            <Star className="h-3 w-3 fill-primary-foreground" />
                            Destaque
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-wide text-primary font-semibold mb-0.5">
                            Serviço
                          </p>
                          <h4 className="font-semibold text-sm truncate">{service.title}</h4>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {service.category}
                          </p>
                        </div>
                        {service.rating && (
                          <span className="flex items-center gap-1 text-xs text-foreground">
                            <Star className="h-3 w-3 fill-primary text-primary" />
                            {service.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Anúncios impulsionados (posts) */}
        {!loading && promotedPosts.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Ofertas Patrocinadas
                </h3>
                <p className="text-xs text-muted-foreground">
                  Anúncios especiais criados por lojas e prestadores do seu bairro
                </p>
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {promotedPosts.map((post) => {
                const ownerStore = stores.find(s => (post.storeId && s.id === post.storeId));
                const ownerService = services.find(s => (post.serviceId && s.id === post.serviceId));
                const ownerName = ownerStore?.name || ownerService?.title || 'Parceiro';

                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => setSelectedPost(post)}
                    className="min-w-[260px] max-w-[280px] text-left"
                  >
                    <Card className="overflow-hidden h-full border-primary/40 bg-primary/5 active:scale-[0.99] transition-transform">
                      <CardContent className="p-3 flex flex-col gap-2">
                        <div className="relative h-28 rounded-lg bg-secondary overflow-hidden">
                          {post.imageUrl ? (
                            <img
                              src={post.imageUrl}
                              alt={post.title}
                              className="h-full w-full object-cover"
                            />
                          ) : ownerStore?.logoUrl || ownerService?.logoUrl ? (
                            <img
                              src={(ownerStore as any)?.logoUrl || (ownerService as any)?.logoUrl}
                              alt={ownerName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
                              <TrendingUp className="h-8 w-8 text-primary/60" />
                            </div>
                          )}
                          <div className="absolute top-2 left-2 flex flex-col gap-1">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-semibold flex items-center gap-1 shadow-sm">
                              <Star className="h-3 w-3 fill-primary-foreground" />
                              Patrocinado
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-background/80 text-xs text-muted-foreground line-clamp-1">
                              {ownerName}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{post.title}</h4>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {post.content}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {post.views || 0} views
                            </span>
                            <span>👆 {post.clicks || 0} cliques</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                );
              })}
            </div>
          </section>
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-w-full md:max-w-4xl">
              {loading ? (
                <>
                  <StoreSkeleton />
                  <StoreSkeleton />
                  <StoreSkeleton />
                  <StoreSkeleton />
                  <StoreSkeleton />
                  <StoreSkeleton />
                </>
              ) : filteredStores.length > 0 ? (
                filteredStores.slice(0, 6).map(store => (
                  <Link 
                    key={store.id} 
                    to={`/store/${store.id}`}
                    onClick={() => handleStoreView(store.id)}
                  >
                    <Card className="overflow-hidden active:scale-[0.99] transition-transform h-full">
                      <CardContent className="p-3">
                        <div className="flex flex-col gap-2">
                          <div className="relative h-32 rounded-lg bg-secondary overflow-hidden">
                            {store.logoUrl ? (
                              <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" />
                            ) : store.bannerUrl ? (
                              <img src={store.bannerUrl} alt={store.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
                                <StoreIcon className="h-8 w-8 text-primary/50" />
                              </div>
                            )}
                            {store.isFeatured && (!store.featuredUntil || store.featuredUntil > new Date()) && (
                              <div className="absolute top-2 right-2">
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-medium flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-primary-foreground" />
                                  Destaque
                                </span>
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
                ))
              ) : (
                <div className="col-span-full text-center py-8 text-muted-foreground">
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-w-full md:max-w-4xl">
              {loading ? (
                <>
                  <StoreSkeleton />
                  <StoreSkeleton />
                  <StoreSkeleton />
                  <StoreSkeleton />
                  <StoreSkeleton />
                  <StoreSkeleton />
                </>
              ) : filteredServices.length > 0 ? (
                filteredServices.slice(0, 6).map(service => (
                  <Link 
                    key={service.id} 
                    to={`/service/${service.id}`}
                    onClick={() => handleServiceView(service.id)}
                  >
                    <Card className="overflow-hidden h-full active:scale-[0.99] transition-transform">
                      <CardContent className="p-3">
                        <div className="relative h-32 rounded-lg bg-secondary mb-2 overflow-hidden">
                          {service.portfolioImages?.[0] ? (
                            <img src={service.portfolioImages[0]} alt={service.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
                              <Wrench className="h-8 w-8 text-primary/50" />
                            </div>
                          )}
                          {service.isFeatured && (!service.featuredUntil || service.featuredUntil > new Date()) && (
                            <div className="absolute top-2 right-2">
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-medium flex items-center gap-1">
                                <Star className="h-3 w-3 fill-primary-foreground" />
                                Destaque
                              </span>
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
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum serviço encontrado</p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Modal para anúncio impulsionado */}
      <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {selectedPost && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base flex flex-col gap-1">
                  <span className="text-xs font-medium text-primary flex items-center gap-1">
                    <Star className="h-3 w-3 fill-primary" />
                    Anúncio patrocinado
                  </span>
                  {selectedPost.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2 text-sm">
                {selectedPost.imageUrl && (
                  <div className="h-40 rounded-lg bg-secondary overflow-hidden">
                    <img
                      src={selectedPost.imageUrl}
                      alt={selectedPost.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <p className="text-muted-foreground whitespace-pre-line">
                  {selectedPost.content}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {selectedPost.views || 0} views
                  </span>
                  <span>👆 {selectedPost.clicks || 0} cliques</span>
                </div>
                <Button
                  className="w-full"
                  size="sm"
                  variant="whatsapp"
                  onClick={handleAproveitarPost}
                >
                  Aproveitar no WhatsApp
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
