import { useNavigate, Link } from 'react-router-dom';
import { useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useToast } from '@/hooks/use-toast';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { 
  User, Settings, LogOut, ChevronRight, Store, Wrench, 
  ShoppingBag, Heart, Bell, HelpCircle, MapPin, Camera, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const { user, logout, updateUserProfile } = useAuth();
  const { unreadCount } = useNotifications();
  const { toast } = useToast();
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const handleAvatarClick = () => {
    if (user && avatarInputRef.current) {
      avatarInputRef.current.click();
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploadingAvatar(true);
      const fileRef = ref(storage, `users/${user.uid}/avatar/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      await updateUserProfile({ avatarUrl: url });
      toast({ title: "Foto atualizada com sucesso!" });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({ 
        title: "Erro ao fazer upload", 
        description: error.message || "Não foi possível atualizar a foto.",
        variant: "destructive" 
      });
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const menuItems = [
    ...(user?.role === 'admin' ? [{
      icon: Shield,
      label: 'Painel Administrativo',
      path: '/admin',
      badge: null
    }] : []),
    { 
      icon: user?.role?.startsWith('vendor') ? Store : ShoppingBag, 
      label: user?.role?.startsWith('vendor') ? 'Painel do Parceiro' : 'Meus Pedidos', 
      path: user?.role?.startsWith('vendor') ? '/partner' : '/orders',
      badge: null
    },
    { icon: Heart, label: 'Favoritos', path: '/favorites', badge: null },
    { icon: MapPin, label: 'Endereços', path: '/addresses', badge: null },
    { icon: Bell, label: 'Notificações', path: '/notifications', badge: unreadCount > 0 ? unreadCount.toString() : null },
    { icon: Settings, label: 'Configurações', path: '/settings', badge: null },
    { icon: HelpCircle, label: 'Ajuda', path: '/help', badge: null },
  ];

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'vendor_product': return 'Vendedor de Produtos';
      case 'vendor_service': return 'Prestador de Serviços';
      default: return 'Cliente';
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      <header className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 pb-12">
        <h1 className="font-bold text-lg mb-4">Meu Perfil</h1>
        
        {user ? (
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-primary-foreground/20 flex items-center justify-center overflow-hidden">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-8 w-8" />
                )}
              </div>
              <button
                onClick={handleAvatarClick}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
                title="Alterar foto"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div>
              <h2 className="font-bold text-lg">{user.name}</h2>
              <p className="text-sm opacity-90">{user.email}</p>
              <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-primary-foreground/20">
                {getRoleLabel(user.role)}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <User className="h-8 w-8" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Visitante</h2>
              <Link to="/auth" className="text-sm underline">
                Entre ou cadastre-se
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="p-4 -mt-6 max-w-6xl mx-auto">
        <Card className="mb-4">
          <CardContent className="p-2">
            {menuItems.map((item, index) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors",
                  index !== menuItems.length - 1 && "border-b"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="font-medium">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.badge && (
                    <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {user && (
          <Button 
            variant="outline" 
            className="w-full text-destructive hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair da Conta
          </Button>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          App do Bairro v1.0.0
        </p>
      </main>

      <BottomNav />
    </div>
  );
}
