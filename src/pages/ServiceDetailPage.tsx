import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, increment, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Service, Post } from '@/types';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useToast } from '@/hooks/use-toast';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ArrowLeft, Star, Phone, Wrench, MessageCircle, Heart, TrendingUp, Eye, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generatePostInterestWhatsApp, generateWhatsAppUrl } from '@/lib/whatsapp';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';

// Componente para exibir um anúncio com tracking de visualização
function PostCard({ post, service }: { post: Post; service: Service }) {
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
      
      // Criar notificação para o prestador de serviço
      try {
        await createNotification(
          service.ownerId,
          'post_interest',
          'Interesse no seu anúncio!',
          `${user.name} demonstrou interesse no anúncio "${post.title}"`
        );
      } catch (error) {
        console.error('Error creating notification:', error);
      }
      
      // Gerar mensagem e abrir WhatsApp
      const message = generatePostInterestWhatsApp(post, service);
      const whatsappUrl = generateWhatsAppUrl(service.whatsappNumber, message);
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
    <Card className={cn(post.isPromoted && "border-primary/50 bg-primary/5")}>
      <CardContent className="p-3">
        {post.imageUrl && (
          <div className="h-32 sm:h-40 md:h-48 rounded-lg bg-secondary overflow-hidden mb-2">
            <img 
              src={post.imageUrl} 
              alt={post.title} 
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="flex items-start justify-between mb-1.5">
          <h3 className="font-semibold text-sm">{post.title}</h3>
          {post.isPromoted && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              ⭐ Patrocinado
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-2 line-clamp-2">
          {post.content}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
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
            className="text-xs h-7 px-2"
          >
            <MessageCircle className="h-3 w-3 mr-1" />
            Aproveitar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [service, setService] = useState<Service | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { toast } = useToast();

  useEffect(() => {
    if (id) fetchServiceData();
  }, [id]);

  const fetchServiceData = async () => {
    try {
      const serviceDoc = await getDoc(doc(db, 'services', id!));
      if (serviceDoc.exists()) {
        const serviceData = { id: serviceDoc.id, ...serviceDoc.data() } as Service;
        setService(serviceData);
        
        // Buscar anúncios do serviço
        const postsQuery = query(
          collection(db, 'posts'),
          where('serviceId', '==', serviceData.id)
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
    } catch (error) {
      console.error('Error fetching service:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppClick = async () => {
    if (!service) return;
    
    // Registra o clique no WhatsApp
    try {
      const serviceRef = doc(db, 'services', service.id);
      await updateDoc(serviceRef, {
        whatsappClicks: increment(1)
      });
    } catch (error) {
      console.error('Error tracking WhatsApp click:', error);
      // Não bloqueia a abertura do WhatsApp se o tracking falhar
    }
    
    const message = `Olá! Vi seu perfil no App do Bairro e gostaria de saber mais sobre seus serviços de ${service.title}.`;
    const url = `https://wa.me/55${service.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-32 bg-background">
        <div className="h-40 sm:h-56 md:h-64 bg-secondary" />
        <div className="p-4 space-y-4 -mt-6">
          <Card>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="aspect-square rounded-lg" />
            <Skeleton className="aspect-square rounded-lg" />
            <Skeleton className="aspect-square rounded-lg" />
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Wrench className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Serviço não encontrado</h2>
          <Link to="/" className="text-primary">Voltar ao início</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 bg-background">
      {/* Header Image */}
      <div className="relative h-40 sm:h-56 md:h-64 bg-secondary overflow-hidden">
        {service.bannerUrl ? (
          <img 
            src={service.bannerUrl} 
            alt={service.title} 
            className="h-full w-full object-cover object-center"
          />
        ) : service.logoUrl ? (
          <img 
            src={service.logoUrl} 
            alt={service.title} 
            className="h-full w-full object-cover object-center"
          />
        ) : service.portfolioImages?.[0] ? (
          <img 
            src={service.portfolioImages[0]} 
            alt={service.title} 
            className="h-full w-full object-cover object-center"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
            <Wrench className="h-20 w-20 text-primary/30" />
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

      {/* Service Info */}
      <div className="p-4 -mt-6 relative">
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-start gap-3 mb-3">
              {service.logoUrl && (
                <div className="h-16 w-16 rounded-lg bg-secondary flex-shrink-0 overflow-hidden border-2 border-background shadow-sm">
                  <img src={service.logoUrl} alt={service.title} className="h-full w-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold truncate">{service.title}</h1>
                  <button
                    onClick={() => {
                      toggleFavorite(service.id, 'service');
                      toast({
                        title: isFavorite(service.id, 'service') ? 'Removido dos favoritos' : 'Adicionado aos favoritos',
                      });
                    }}
                    className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors flex-shrink-0"
                  >
                    <Heart className={cn(
                      "h-5 w-5",
                      isFavorite(service.id, 'service') ? "fill-red-500 text-red-500" : "text-muted-foreground"
                    )} />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">{service.category}</p>
              </div>
              {service.rating && (
                <span className="flex items-center gap-1 text-sm font-medium flex-shrink-0">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  {service.rating.toFixed(1)}
                </span>
              )}
            </div>

            {service.priceRange && (
              <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
                {service.priceRange}
              </div>
            )}

            {service.description && (
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                {service.description}
              </p>
            )}

            {/* Botão WhatsApp */}
            <Button
              variant="whatsapp"
              className="w-full mt-3"
              onClick={handleWhatsAppClick}
            >
              <Phone className="h-4 w-4 mr-2" />
              Entrar em contato via WhatsApp
            </Button>
          </CardContent>
        </Card>

        {/* Portfolio Gallery */}
        {service.portfolioImages && service.portfolioImages.length > 0 && (
          <div className="mb-4">
            <h2 className="font-bold text-lg mb-3">Trabalhos realizados</h2>
            <div className="grid grid-cols-3 gap-2 max-w-md md:max-w-lg lg:max-w-xl mx-auto">
              {service.portfolioImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedImageIndex(index);
                    setImageModalOpen(true);
                  }}
                  className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all"
                >
                  <img 
                    src={image} 
                    alt={`Trabalho ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Modal de visualização de imagem */}
        <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
          <DialogContent className="max-w-4xl w-full p-0 bg-black/95 border-none">
            <div className="relative">
              {service.portfolioImages && selectedImageIndex !== null && (
                <>
                  <button
                    onClick={() => setImageModalOpen(false)}
                    className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  
                  {service.portfolioImages.length > 1 && (
                    <>
                      {selectedImageIndex > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImageIndex(selectedImageIndex - 1);
                          }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                      )}
                      
                      {selectedImageIndex < service.portfolioImages.length - 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImageIndex(selectedImageIndex + 1);
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      )}
                    </>
                  )}
                  
                  <div className="flex items-center justify-center min-h-[400px] max-h-[80vh] p-4">
                    <img 
                      src={service.portfolioImages[selectedImageIndex]} 
                      alt={`Trabalho ${selectedImageIndex + 1}`}
                      className="max-w-full max-h-[80vh] object-contain rounded-lg"
                    />
                  </div>
                  
                  {service.portfolioImages.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                      <span className="px-3 py-1 rounded-full bg-black/50 text-white text-sm">
                        {selectedImageIndex + 1} / {service.portfolioImages.length}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Posts/Anúncios */}
        {posts.length > 0 && service && (
          <div className="mb-4">
            <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Anúncios
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {posts.map(post => (
                <PostCard key={post.id} post={post} service={service} />
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
