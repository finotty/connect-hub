import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Service } from '@/types';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useToast } from '@/hooks/use-toast';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Star, Phone, Wrench, MessageCircle, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [service, setService] = useState<Service | null>(null);
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
        setService({ id: serviceDoc.id, ...serviceDoc.data() } as Service);
      }
    } catch (error) {
      console.error('Error fetching service:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppClick = () => {
    if (!service) return;
    const message = `Olá! Vi seu perfil no App do Bairro e gostaria de saber mais sobre seus serviços de ${service.title}.`;
    const url = `https://wa.me/55${service.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-32 bg-background">
        <div className="h-64 bg-secondary" />
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
      <div className="relative h-64 bg-secondary">
        {service.bannerUrl ? (
          <img 
            src={service.bannerUrl} 
            alt={service.title} 
            className="h-full w-full object-cover"
          />
        ) : service.portfolioImages?.[0] ? (
          <img 
            src={selectedImage || service.portfolioImages[0]} 
            alt={service.title} 
            className="h-full w-full object-cover transition-all duration-300"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
            <Wrench className="h-20 w-20 text-primary/30" />
          </div>
        )}
        <Link 
          to="/"
          className="absolute top-4 left-4 h-10 w-10 rounded-full bg-card/90 backdrop-blur flex items-center justify-center shadow-lg"
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
              <p className="text-sm text-muted-foreground leading-relaxed">
                {service.description}
              </p>
            )}
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
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <Button 
          variant="whatsapp"
          size="xl"
          className="w-full"
          onClick={handleWhatsAppClick}
        >
          <MessageCircle className="h-5 w-5 mr-2" />
          Chamar no WhatsApp
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}
