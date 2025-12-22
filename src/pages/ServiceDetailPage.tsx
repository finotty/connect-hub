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
import { ArrowLeft, Star, Phone, Wrench, MessageCircle, Heart, TrendingUp, Eye } from 'lucide-react';
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

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [service, setService] = useState<Service | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
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
            src={selectedImage || service.portfolioImages[0]} 
            alt={service.title} 
            className="h-full w-full object-cover object-center transition-all duration-300"
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
            <div className="grid grid-cols-3 gap-2">
              {service.portfolioImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(image)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage === image ? 'border-primary' : 'border-transparent'
                  }`}
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

        {/* Posts/Anúncios */}
        {posts.length > 0 && service && (
          <div className="mb-4">
            <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Anúncios
            </h2>
            <div className="space-y-3">
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
