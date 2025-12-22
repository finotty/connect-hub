import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, updateDoc, doc, orderBy, where, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Store, Service, Post, User, CreditRequest, Order } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/contexts/NotificationsContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, Store as StoreIcon, Wrench, Eye, EyeOff, Star, 
  TrendingUp, Users, ShoppingBag, Calendar, ArrowLeft, Settings,
  BarChart3, DollarSign, Clock, CheckCircle, XCircle, MessageSquare, Send, ChevronDown, ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createNotification } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [creditRequests, setCreditRequests] = useState<CreditRequest[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const [featuredDialogOpen, setFeaturedDialogOpen] = useState(false);
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [storePostsDialogOpen, setStorePostsDialogOpen] = useState(false);
  const [servicePostsDialogOpen, setServicePostsDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [globalMessageDialogOpen, setGlobalMessageDialogOpen] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [featuredDays, setFeaturedDays] = useState('7');
  const [featuredOrder, setFeaturedOrder] = useState('1');
  const [promotionDays, setPromotionDays] = useState('7');
  const [userCreditsEditing, setUserCreditsEditing] = useState<Record<string, string>>({});
  const [processingCreditRequest, setProcessingCreditRequest] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const storesQuery = query(collection(db, 'stores'), orderBy('createdAt', 'desc'));
      const storesSnapshot = await getDocs(storesQuery);
      const storesData = storesSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        featuredUntil: doc.data().featuredUntil?.toDate()
      } as Store));
      setStores(storesData);

      const servicesQuery = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
      const servicesSnapshot = await getDocs(servicesQuery);
      const servicesData = servicesSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        featuredUntil: doc.data().featuredUntil?.toDate()
      } as Service));
      setServices(servicesData);

      // Buscar anúncios (posts) criados por lojas e serviços
      const postsQuery = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc')
      );
      const postsSnapshot = await getDocs(postsQuery);
      const postsData = postsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        promotionEndsAt: doc.data().promotionEndsAt?.toDate()
      } as Post));
      setPosts(postsData);

      // Buscar usuários para gerenciar créditos de impulsionamento
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          uid: doc.id,
          name: data.name || 'Usuário',
          email: data.email || '',
          role: data.role || 'customer',
          phone: data.phone,
          avatarUrl: data.avatarUrl,
          promoCredits: data.promoCredits ?? 0,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
        } as User;
      });
      setUsers(usersData);

      // Buscar solicitações de crédito
      const creditRequestsQuery = query(
        collection(db, 'creditRequests'),
        orderBy('createdAt', 'desc')
      );
      const creditRequestsSnapshot = await getDocs(creditRequestsQuery);
      const creditRequestsData = creditRequestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        reviewedAt: doc.data().reviewedAt?.toDate()
      } as CreditRequest));
      setCreditRequests(creditRequestsData);

      // Buscar pedidos para calcular estatísticas
      const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const ordersSnapshot = await getDocs(ordersQuery);
      const ordersData = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      } as Order));
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessageToPartner = async (partnerId: string, partnerName: string) => {
    if (!messageTitle.trim() || !messageContent.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título e a mensagem.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSendingMessage(true);
      await createNotification(
        partnerId,
        'admin_message',
        messageTitle,
        messageContent
      );

      toast({
        title: "Mensagem enviada!",
        description: `A mensagem foi enviada para ${partnerName}.`
      });

      setMessageTitle('');
      setMessageContent('');
      setMessageDialogOpen(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem.",
        variant: "destructive"
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendGlobalMessage = async () => {
    if (!messageTitle.trim() || !messageContent.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título e a mensagem.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSendingMessage(true);
      
      // Enviar para todos os usuários
      const allUsers = users.filter(u => u.role !== 'admin');
      const promises = allUsers.map(u =>
        createNotification(
          u.uid,
          'global_message',
          messageTitle,
          messageContent
        )
      );

      await Promise.all(promises);

      toast({
        title: "Mensagem global enviada!",
        description: `A mensagem foi enviada para ${allUsers.length} usuário(s).`
      });

      setMessageTitle('');
      setMessageContent('');
      setGlobalMessageDialogOpen(false);
    } catch (error) {
      console.error('Error sending global message:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem global.",
        variant: "destructive"
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleToggleVisibility = async (type: 'store' | 'service', id: string, currentVisibility: boolean) => {
    try {
      const collectionName = type === 'store' ? 'stores' : 'services';
      await updateDoc(doc(db, collectionName, id), {
        isVisible: !currentVisibility
      });
      
      if (type === 'store') {
        setStores(prev => prev.map(s => s.id === id ? { ...s, isVisible: !currentVisibility } : s));
      } else {
        setServices(prev => prev.map(s => s.id === id ? { ...s, isVisible: !currentVisibility } : s));
      }
      
      toast({
        title: "Sucesso",
        description: `${type === 'store' ? 'Loja' : 'Serviço'} ${!currentVisibility ? 'visível' : 'oculto'}.`
      });
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a visibilidade.",
        variant: "destructive"
      });
    }
  };

  const handleSetFeatured = async (type: 'store' | 'service', id: string) => {
    try {
      const days = parseInt(featuredDays) || 7;
      const order = parseInt(featuredOrder) || 1;
      const featuredUntil = new Date();
      featuredUntil.setDate(featuredUntil.getDate() + days);

      const collectionName = type === 'store' ? 'stores' : 'services';
      await updateDoc(doc(db, collectionName, id), {
        isFeatured: true,
        featuredUntil: featuredUntil,
        featuredOrder: order,
        isVisible: true // Garantir que está visível quando destacado
      });

      if (type === 'store') {
        setStores(prev => prev.map(s => s.id === id ? { 
          ...s, 
          isFeatured: true, 
          featuredUntil, 
          featuredOrder: order,
          isVisible: true
        } : s));
      } else {
        setServices(prev => prev.map(s => s.id === id ? { 
          ...s, 
          isFeatured: true, 
          featuredUntil, 
          featuredOrder: order,
          isVisible: true
        } : s));
      }

      setFeaturedDialogOpen(false);
      setSelectedStore(null);
      setSelectedService(null);
      
      toast({
        title: "Destaque ativado!",
        description: `${type === 'store' ? 'Loja' : 'Serviço'} em destaque por ${days} dias.`
      });
    } catch (error) {
      console.error('Error setting featured:', error);
      toast({
        title: "Erro",
        description: "Não foi possível ativar o destaque.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveFeatured = async (type: 'store' | 'service', id: string) => {
    try {
      const collectionName = type === 'store' ? 'stores' : 'services';
      await updateDoc(doc(db, collectionName, id), {
        isFeatured: false,
        featuredUntil: null,
        featuredOrder: null
      });

      if (type === 'store') {
        setStores(prev => prev.map(s => s.id === id ? { 
          ...s, 
          isFeatured: false, 
          featuredUntil: undefined,
          featuredOrder: undefined
        } : s));
      } else {
        setServices(prev => prev.map(s => s.id === id ? { 
          ...s, 
          isFeatured: false, 
          featuredUntil: undefined,
          featuredOrder: undefined
        } : s));
      }
      
      toast({
        title: "Destaque removido!",
        description: `${type === 'store' ? 'Loja' : 'Serviço'} removido do destaque.`
      });
    } catch (error) {
      console.error('Error removing featured:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o destaque.",
        variant: "destructive"
      });
    }
  };

  const handlePromotePost = async (postId: string) => {
    try {
      const days = parseInt(promotionDays) || 7;
      const promotionEndsAt = new Date();
      promotionEndsAt.setDate(promotionEndsAt.getDate() + days);

      await updateDoc(doc(db, 'posts', postId), {
        isPromoted: true,
        promotionEndsAt
      });

      setPosts(prev =>
        prev.map(p =>
          p.id === postId ? { ...p, isPromoted: true, promotionEndsAt } : p
        )
      );

      setPromotionDialogOpen(false);
      setSelectedPost(null);

      toast({
        title: "Anúncio impulsionado!",
        description: `Anúncio será exibido com destaque por ${days} dias.`
      });
    } catch (error) {
      console.error('Error promoting post:', error);
      toast({
        title: "Erro",
        description: "Não foi possível impulsionar o anúncio.",
        variant: "destructive"
      });
    }
  };

  const handleRemovePromotion = async (postId: string) => {
    try {
      await updateDoc(doc(db, 'posts', postId), {
        isPromoted: false,
        promotionEndsAt: null
      });

      setPosts(prev =>
        prev.map(p =>
          p.id === postId ? { ...p, isPromoted: false, promotionEndsAt: undefined } : p
        )
      );

      toast({
        title: "Impulsionamento removido!",
        description: "O anúncio não será mais exibido como impulsionado."
      });
    } catch (error) {
      console.error('Error removing promotion:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o impulsionamento.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateUserCredits = async (userId: string) => {
    const currentUser = users.find(u => u.uid === userId);
    if (!currentUser) return;

    const raw = userCreditsEditing[userId] ?? String(currentUser.promoCredits ?? 0);
    const value = parseInt(raw, 10);
    if (isNaN(value) || value < 0) {
      toast({
        title: "Valor inválido",
        description: "Informe um número de créditos maior ou igual a zero.",
        variant: "destructive"
      });
      return;
    }

    try {
      await updateDoc(doc(db, 'users', userId), {
        promoCredits: value
      });

      setUsers(prev =>
        prev.map(u => u.uid === userId ? { ...u, promoCredits: value } : u)
      );

      toast({
        title: "Créditos atualizados",
        description: `O usuário agora possui ${value} crédito(s) para impulsionamento.`
      });
    } catch (error) {
      console.error('Error updating user credits:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar os créditos do usuário.",
        variant: "destructive"
      });
    }
  };

  const handleApproveCreditRequest = async (requestId: string) => {
    if (!user) return;
    
    const request = creditRequests.find(r => r.id === requestId);
    if (!request || request.status !== 'pending') return;

    try {
      setProcessingCreditRequest(requestId);

      // Atualizar status da solicitação
      await updateDoc(doc(db, 'creditRequests', requestId), {
        status: 'approved',
        reviewedBy: user.uid,
        reviewedAt: serverTimestamp()
      });

      // Adicionar créditos ao usuário
      const userDoc = await getDoc(doc(db, 'users', request.userId));
      if (userDoc.exists()) {
        const currentCredits = userDoc.data().promoCredits ?? 0;
        await updateDoc(doc(db, 'users', request.userId), {
          promoCredits: currentCredits + request.credits
        });

        // Atualizar estado local
        setUsers(prev =>
          prev.map(u => 
            u.uid === request.userId 
              ? { ...u, promoCredits: (u.promoCredits ?? 0) + request.credits }
              : u
          )
        );
      }

      // Atualizar estado local das solicitações
      setCreditRequests(prev =>
        prev.map(r => 
          r.id === requestId 
            ? { ...r, status: 'approved', reviewedBy: user.uid, reviewedAt: new Date() }
            : r
        )
      );

      toast({
        title: "Solicitação aprovada!",
        description: `${request.credits} crédito(s) foram adicionados à conta de ${request.userName}.`
      });
    } catch (error) {
      console.error('Error approving credit request:', error);
      toast({
        title: "Erro",
        description: "Não foi possível aprovar a solicitação.",
        variant: "destructive"
      });
    } finally {
      setProcessingCreditRequest(null);
    }
  };

  const handleRejectCreditRequest = async (requestId: string, reason?: string) => {
    if (!user) return;
    
    const request = creditRequests.find(r => r.id === requestId);
    if (!request || request.status !== 'pending') return;

    try {
      setProcessingCreditRequest(requestId);

      await updateDoc(doc(db, 'creditRequests', requestId), {
        status: 'rejected',
        reviewedBy: user.uid,
        reviewedAt: serverTimestamp(),
        rejectionReason: reason || 'Comprovante não aprovado.'
      });

      setCreditRequests(prev =>
        prev.map(r => 
          r.id === requestId 
            ? { ...r, status: 'rejected', reviewedBy: user.uid, reviewedAt: new Date(), rejectionReason: reason }
            : r
        )
      );

      toast({
        title: "Solicitação rejeitada",
        description: `A solicitação de ${request.userName} foi rejeitada.`
      });
    } catch (error) {
      console.error('Error rejecting credit request:', error);
      toast({
        title: "Erro",
        description: "Não foi possível rejeitar a solicitação.",
        variant: "destructive"
      });
    } finally {
      setProcessingCreditRequest(null);
    }
  };

  if (user?.role !== 'admin') {
    return null;
  }

  const featuredStores = stores.filter(s => s.isFeatured && (!s.featuredUntil || s.featuredUntil > new Date()));
  const featuredServices = services.filter(s => s.isFeatured && (!s.featuredUntil || s.featuredUntil > new Date()));
  const promotedPosts = posts.filter(p => p.isPromoted && (!p.promotionEndsAt || p.promotionEndsAt > new Date()));

  return (
    <div className="min-h-screen pb-20 bg-background">
      <header className="sticky top-0 z-40 bg-card border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="font-bold text-lg">Painel Administrativo</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-6 max-w-6xl mx-auto">
        {/* Estatísticas Gerais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <StoreIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Lojas</span>
              </div>
              <p className="text-2xl font-bold">{stores.length}</p>
              <p className="text-xs text-muted-foreground">
                {featuredStores.length} em destaque
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Serviços</span>
              </div>
              <p className="text-2xl font-bold">{services.length}</p>
              <p className="text-xs text-muted-foreground">
                {featuredServices.length} em destaque
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Visíveis</span>
              </div>
              <p className="text-2xl font-bold">
                {stores.filter(s => s.isVisible !== false).length + services.filter(s => s.isVisible !== false).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Destaques</span>
              </div>
              <p className="text-2xl font-bold">{featuredStores.length + featuredServices.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Créditos dos usuários */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Créditos para impulsionamento (usuários)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-xs text-muted-foreground">
              Defina quantos créditos cada usuário possui para impulsionar sua loja, serviço ou anúncios.
              Recomendação: mínimo de <span className="font-semibold">R$ 10,00</span> por recarga, onde
              <span className="font-semibold"> 1 crédito = R$ 1,00</span> em impulsionamento.
            </p>
            {users.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {users
                  .filter(u => u.role !== 'admin')
                  .map(u => (
                  <div
                    key={u.uid}
                    className="flex items-center gap-3 p-2 rounded-md border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Papel: {u.role === 'vendor_product' ? 'Loja' : u.role === 'vendor_service' ? 'Serviço' : 'Cliente'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-[11px] text-muted-foreground">Créditos</p>
                        <Input
                          type="number"
                          min="0"
                          className="h-8 w-20 text-right text-sm"
                          value={userCreditsEditing[u.uid] ?? String(u.promoCredits ?? 0)}
                          onChange={(e) => {
                            const value = e.target.value;
                            setUserCreditsEditing(prev => ({
                              ...prev,
                              [u.uid]: value
                            }));
                          }}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateUserCredits(u.uid)}
                      >
                        Salvar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nenhum usuário encontrado ainda.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Lojas */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <StoreIcon className="h-5 w-5" />
              Lojas ({stores.length})
            </h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="space-y-3">
              {stores.map(store => {
                const storePosts = posts.filter(p => p.storeId === store.id);

                return (
                <Card key={store.id} className={cn(
                  store.isFeatured && "border-primary/50 bg-primary/5",
                  store.isVisible === false && "opacity-50"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-16 w-16 rounded-lg bg-secondary flex-shrink-0 overflow-hidden">
                        {store.logoUrl ? (
                          <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <StoreIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="font-semibold">{store.name}</h3>
                            <p className="text-xs text-muted-foreground">{store.category}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {storePosts.length > 0 && (
                              <span className="text-[11px] px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                                {storePosts.length} anúncio(s)
                              </span>
                            )}
                            {store.isFeatured && (
                              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium flex items-center gap-1">
                                <Star className="h-3 w-3 fill-primary" />
                                Destaque
                              </span>
                            )}
                            {store.isVisible === false && (
                              <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                                Oculto
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                          <span>Criado: {format(store.createdAt, "dd/MM/yyyy", { locale: ptBR })}</span>
                          {store.isFeatured && store.featuredUntil && (
                            <span>Destaque até: {format(store.featuredUntil, "dd/MM/yyyy", { locale: ptBR })}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={store.isVisible !== false}
                            onCheckedChange={() => handleToggleVisibility('store', store.id, store.isVisible !== false)}
                          />
                          <Label className="text-sm">Visível na plataforma</Label>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {store.isFeatured ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveFeatured('store', store.id)}
                            >
                              Remover destaque
                            </Button>
                          ) : (
                            <>
                              <Dialog open={featuredDialogOpen && selectedStore?.id === store.id} onOpenChange={(open) => {
                                setFeaturedDialogOpen(open);
                                if (!open) {
                                  setSelectedStore(null);
                                }
                              }}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedStore(store);
                                      setFeaturedDialogOpen(true);
                                    }}
                                  >
                                    <Star className="h-4 w-4 mr-1" />
                                    Colocar em destaque
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Colocar loja em destaque</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 mt-4">
                                    <div>
                                      <Label htmlFor="days">Dias em destaque</Label>
                                      <Input
                                        id="days"
                                        type="number"
                                        min="1"
                                        value={featuredDays}
                                        onChange={(e) => setFeaturedDays(e.target.value)}
                                        placeholder="7"
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="order">Ordem de exibição (menor = aparece primeiro)</Label>
                                      <Input
                                        id="order"
                                        type="number"
                                        min="1"
                                        value={featuredOrder}
                                        onChange={(e) => setFeaturedOrder(e.target.value)}
                                        placeholder="1"
                                      />
                                    </div>
                                    <Button
                                      onClick={() => handleSetFeatured('store', store.id)}
                                      className="w-full"
                                    >
                                      Ativar Destaque
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </>
                          )}

                          {storePosts.length > 0 && (
                            <Dialog
                              open={storePostsDialogOpen && selectedStore?.id === store.id}
                              onOpenChange={(open) => {
                                setStorePostsDialogOpen(open);
                                if (!open) {
                                  setSelectedStore(null);
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedStore(store);
                                    setStorePostsDialogOpen(true);
                                  }}
                                >
                                  Ver anúncios ({storePosts.length})
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Anúncios da loja {store.name}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3 mt-4">
                                  {storePosts.map((post) => {
                                    const promoted = post.isPromoted && (!post.promotionEndsAt || post.promotionEndsAt > new Date());
                                    return (
                                      <div
                                        key={post.id}
                                        className={cn(
                                          "p-3 rounded-lg border bg-card",
                                          promoted && "border-primary/50 bg-primary/5"
                                        )}
                                      >
                                        <div className="flex items-start gap-3">
                                          <div className="h-12 w-12 rounded-md bg-secondary flex-shrink-0 overflow-hidden">
                                            {post.imageUrl ? (
                                              <img src={post.imageUrl} alt={post.title} className="h-full w-full object-cover" />
                                            ) : (
                                              <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                                <TrendingUp className="h-4 w-4" />
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                              <p className="font-semibold text-sm truncate">{post.title}</p>
                                              {promoted && (
                                                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground flex items-center gap-1">
                                                  <Star className="h-3 w-3 fill-primary-foreground" />
                                                  Impulsionado
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                                              {post.content}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mb-2">
                                              <span>👁️ {post.views || 0} views</span>
                                              <span>👆 {post.clicks || 0} cliques</span>
                                              {promoted && post.promotionEndsAt && (
                                                <span className="text-primary font-medium">
                                                  até {format(post.promotionEndsAt, "dd/MM/yyyy", { locale: ptBR })}
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                              {promoted ? (
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => handleRemovePromotion(post.id)}
                                                >
                                                  Remover impulsionamento
                                                </Button>
                                              ) : (
                                                <Dialog
                                                  open={promotionDialogOpen && selectedPost?.id === post.id}
                                                  onOpenChange={(open) => {
                                                    setPromotionDialogOpen(open);
                                                    if (!open) {
                                                      setSelectedPost(null);
                                                    }
                                                  }}
                                                >
                                                  <DialogTrigger asChild>
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      onClick={() => {
                                                        setSelectedPost(post);
                                                        setPromotionDialogOpen(true);
                                                      }}
                                                    >
                                                      Impulsionar anúncio
                                                    </Button>
                                                  </DialogTrigger>
                                                  <DialogContent>
                                                    <DialogHeader>
                                                      <DialogTitle>Impulsionar anúncio</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="space-y-4 mt-4">
                                                      <div>
                                                        <Label htmlFor="promo-days-store">Dias de impulsionamento</Label>
                                                        <Input
                                                          id="promo-days-store"
                                                          type="number"
                                                          min="1"
                                                          value={promotionDays}
                                                          onChange={(e) => setPromotionDays(e.target.value)}
                                                          placeholder="7"
                                                        />
                                                      </div>
                                                      <p className="text-xs text-muted-foreground">
                                                        O anúncio receberá selo de ⭐ Impulsionado nas páginas da loja durante o período selecionado.
                                                      </p>
                                                      <Button
                                                        className="w-full"
                                                        onClick={() => handlePromotePost(post.id)}
                                                      >
                                                        Confirmar impulsionamento
                                                      </Button>
                                                    </div>
                                                  </DialogContent>
                                                </Dialog>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                        
                        {/* Botão para expandir detalhes */}
                        <div className="mt-3 pt-3 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedStoreId(expandedStoreId === store.id ? null : store.id)}
                            className="w-full justify-between"
                          >
                            <span className="flex items-center gap-2">
                              <BarChart3 className="h-4 w-4" />
                              Ver detalhes e estatísticas
                            </span>
                            {expandedStoreId === store.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>

                        {/* Seção expandida com detalhes */}
                        {expandedStoreId === store.id && (
                          <div className="mt-3 pt-3 border-t space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 rounded-md bg-secondary/50">
                                <p className="text-xs text-muted-foreground mb-1">Total de Pedidos</p>
                                <p className="text-xl font-bold">
                                  {orders.filter(o => o.storeId === store.id).length}
                                </p>
                              </div>
                              <div className="p-3 rounded-md bg-secondary/50">
                                <p className="text-xs text-muted-foreground mb-1">Visualizações</p>
                                <p className="text-xl font-bold">
                                  {store.views || 0}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 rounded-md bg-secondary/50">
                                <p className="text-xs text-muted-foreground mb-1">Anúncios Criados</p>
                                <p className="text-lg font-semibold">{storePosts.length}</p>
                              </div>
                              <div className="p-3 rounded-md bg-secondary/50">
                                <p className="text-xs text-muted-foreground mb-1">Cliques no WhatsApp</p>
                                <p className="text-lg font-semibold">{store.whatsappClicks || 0}</p>
                              </div>
                            </div>
                            <div className="p-3 rounded-md bg-secondary/50">
                              <p className="text-xs text-muted-foreground mb-1">Total de Cliques (Anúncios)</p>
                              <p className="text-lg font-semibold">
                                {storePosts.reduce((sum, post) => sum + (post.clicks || 0), 0)}
                              </p>
                            </div>
                            <Dialog
                              open={messageDialogOpen && selectedStore?.id === store.id}
                              onOpenChange={(open) => {
                                setMessageDialogOpen(open);
                                if (!open) {
                                  setSelectedStore(null);
                                  setMessageTitle('');
                                  setMessageContent('');
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => {
                                    setSelectedStore(store);
                                    setMessageDialogOpen(true);
                                  }}
                                >
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Enviar mensagem para parceiro
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Enviar mensagem para {store.name}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 mt-4">
                                  <div>
                                    <Label htmlFor="message-title-store">Título da mensagem</Label>
                                    <Input
                                      id="message-title-store"
                                      value={messageTitle}
                                      onChange={(e) => setMessageTitle(e.target.value)}
                                      placeholder="Ex: Promoção especial"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="message-content-store">Mensagem</Label>
                                    <Textarea
                                      id="message-content-store"
                                      value={messageContent}
                                      onChange={(e) => setMessageContent(e.target.value)}
                                      placeholder="Digite sua mensagem aqui..."
                                      rows={5}
                                    />
                                  </div>
                                  <Button
                                    onClick={() => {
                                      const owner = users.find(u => u.uid === store.ownerId);
                                      if (owner) {
                                        handleSendMessageToPartner(store.ownerId, owner.name);
                                      }
                                    }}
                                    disabled={sendingMessage}
                                    className="w-full"
                                  >
                                    {sendingMessage ? (
                                      <>
                                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                                        Enviando...
                                      </>
                                    ) : (
                                      <>
                                        <Send className="h-4 w-4 mr-2" />
                                        Enviar mensagem
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
              })}
            </div>
          )}
        </section>

        {/* Serviços */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Serviços ({services.length})
            </h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="space-y-3">
              {services.map(service => {
                const servicePosts = posts.filter(p => p.serviceId === service.id);

                return (
                <Card key={service.id} className={cn(
                  service.isFeatured && "border-primary/50 bg-primary/5",
                  service.isVisible === false && "opacity-50"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-16 w-16 rounded-lg bg-secondary flex-shrink-0 overflow-hidden">
                        {service.portfolioImages?.[0] ? (
                          <img src={service.portfolioImages[0]} alt={service.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Wrench className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="font-semibold">{service.title}</h3>
                            <p className="text-xs text-muted-foreground">{service.category}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {servicePosts.length > 0 && (
                              <span className="text-[11px] px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                                {servicePosts.length} anúncio(s)
                              </span>
                            )}
                            {service.isFeatured && (
                              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium flex items-center gap-1">
                                <Star className="h-3 w-3 fill-primary" />
                                Destaque
                              </span>
                            )}
                            {service.isVisible === false && (
                              <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                                Oculto
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                          <span>Criado: {format(service.createdAt, "dd/MM/yyyy", { locale: ptBR })}</span>
                          {service.isFeatured && service.featuredUntil && (
                            <span>Destaque até: {format(service.featuredUntil, "dd/MM/yyyy", { locale: ptBR })}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={service.isVisible !== false}
                            onCheckedChange={() => handleToggleVisibility('service', service.id, service.isVisible !== false)}
                          />
                          <Label className="text-sm">Visível na plataforma</Label>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {service.isFeatured ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveFeatured('service', service.id)}
                            >
                              Remover destaque
                            </Button>
                          ) : (
                            <>
                              <Dialog open={featuredDialogOpen && selectedService?.id === service.id} onOpenChange={(open) => {
                                setFeaturedDialogOpen(open);
                                if (!open) {
                                  setSelectedService(null);
                                }
                              }}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedService(service);
                                      setFeaturedDialogOpen(true);
                                    }}
                                  >
                                    <Star className="h-4 w-4 mr-1" />
                                    Colocar em destaque
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Colocar serviço em destaque</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 mt-4">
                                    <div>
                                      <Label htmlFor="days-service">Dias em destaque</Label>
                                      <Input
                                        id="days-service"
                                        type="number"
                                        min="1"
                                        value={featuredDays}
                                        onChange={(e) => setFeaturedDays(e.target.value)}
                                        placeholder="7"
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor="order-service">Ordem de exibição (menor = aparece primeiro)</Label>
                                      <Input
                                        id="order-service"
                                        type="number"
                                        min="1"
                                        value={featuredOrder}
                                        onChange={(e) => setFeaturedOrder(e.target.value)}
                                        placeholder="1"
                                      />
                                    </div>
                                    <Button
                                      onClick={() => handleSetFeatured('service', service.id)}
                                      className="w-full"
                                    >
                                      Ativar Destaque
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </>
                          )}

                          {servicePosts.length > 0 && (
                            <Dialog
                              open={servicePostsDialogOpen && selectedService?.id === service.id}
                              onOpenChange={(open) => {
                                setServicePostsDialogOpen(open);
                                if (!open) {
                                  setSelectedService(null);
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedService(service);
                                    setServicePostsDialogOpen(true);
                                  }}
                                >
                                  Ver anúncios ({servicePosts.length})
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Anúncios do serviço {service.title}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3 mt-4">
                                  {servicePosts.map((post) => {
                                    const promoted = post.isPromoted && (!post.promotionEndsAt || post.promotionEndsAt > new Date());
                                    return (
                                      <div
                                        key={post.id}
                                        className={cn(
                                          "p-3 rounded-lg border bg-card",
                                          promoted && "border-primary/50 bg-primary/5"
                                        )}
                                      >
                                        <div className="flex items-start gap-3">
                                          <div className="h-12 w-12 rounded-md bg-secondary flex-shrink-0 overflow-hidden">
                                            {post.imageUrl ? (
                                              <img src={post.imageUrl} alt={post.title} className="h-full w-full object-cover" />
                                            ) : (
                                              <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                                <TrendingUp className="h-4 w-4" />
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                              <p className="font-semibold text-sm truncate">{post.title}</p>
                                              {promoted && (
                                                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground flex items-center gap-1">
                                                  <Star className="h-3 w-3 fill-primary-foreground" />
                                                  Impulsionado
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                                              {post.content}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mb-2">
                                              <span>👁️ {post.views || 0} views</span>
                                              <span>👆 {post.clicks || 0} cliques</span>
                                              {promoted && post.promotionEndsAt && (
                                                <span className="text-primary font-medium">
                                                  até {format(post.promotionEndsAt, "dd/MM/yyyy", { locale: ptBR })}
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                              {promoted ? (
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => handleRemovePromotion(post.id)}
                                                >
                                                  Remover impulsionamento
                                                </Button>
                                              ) : (
                                                <Dialog
                                                  open={promotionDialogOpen && selectedPost?.id === post.id}
                                                  onOpenChange={(open) => {
                                                    setPromotionDialogOpen(open);
                                                    if (!open) {
                                                      setSelectedPost(null);
                                                    }
                                                  }}
                                                >
                                                  <DialogTrigger asChild>
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      onClick={() => {
                                                        setSelectedPost(post);
                                                        setPromotionDialogOpen(true);
                                                      }}
                                                    >
                                                      Impulsionar anúncio
                                                    </Button>
                                                  </DialogTrigger>
                                                  <DialogContent>
                                                    <DialogHeader>
                                                      <DialogTitle>Impulsionar anúncio</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="space-y-4 mt-4">
                                                      <div>
                                                        <Label htmlFor="promo-days-service">Dias de impulsionamento</Label>
                                                        <Input
                                                          id="promo-days-service"
                                                          type="number"
                                                          min="1"
                                                          value={promotionDays}
                                                          onChange={(e) => setPromotionDays(e.target.value)}
                                                          placeholder="7"
                                                        />
                                                      </div>
                                                      <p className="text-xs text-muted-foreground">
                                                        O anúncio receberá selo de ⭐ Impulsionado na página do serviço durante o período selecionado.
                                                      </p>
                                                      <Button
                                                        className="w-full"
                                                        onClick={() => handlePromotePost(post.id)}
                                                      >
                                                        Confirmar impulsionamento
                                                      </Button>
                                                    </div>
                                                  </DialogContent>
                                                </Dialog>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                        
                        {/* Botão para expandir detalhes */}
                        <div className="mt-3 pt-3 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedServiceId(expandedServiceId === service.id ? null : service.id)}
                            className="w-full justify-between"
                          >
                            <span className="flex items-center gap-2">
                              <BarChart3 className="h-4 w-4" />
                              Ver detalhes e estatísticas
                            </span>
                            {expandedServiceId === service.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>

                        {/* Seção expandida com detalhes */}
                        {expandedServiceId === service.id && (
                          <div className="mt-3 pt-3 border-t space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 rounded-md bg-secondary/50">
                                <p className="text-xs text-muted-foreground mb-1">Visualizações</p>
                                <p className="text-xl font-bold">
                                  {service.views || 0}
                                </p>
                              </div>
                              <div className="p-3 rounded-md bg-secondary/50">
                                <p className="text-xs text-muted-foreground mb-1">Total de Cliques (Anúncios)</p>
                                <p className="text-xl font-bold">
                                  {servicePosts.reduce((sum, post) => sum + (post.clicks || 0), 0)}
                                </p>
                              </div>
                            </div>
                            <div className="p-3 rounded-md bg-secondary/50">
                              <p className="text-xs text-muted-foreground mb-1">Anúncios Criados</p>
                              <p className="text-lg font-semibold">{servicePosts.length}</p>
                            </div>
                            <div className="p-3 rounded-md bg-secondary/50">
                              <p className="text-xs text-muted-foreground mb-1">Cliques no WhatsApp</p>
                              <p className="text-lg font-semibold">{service.whatsappClicks || 0}</p>
                            </div>
                            <Dialog
                              open={messageDialogOpen && selectedService?.id === service.id}
                              onOpenChange={(open) => {
                                setMessageDialogOpen(open);
                                if (!open) {
                                  setSelectedService(null);
                                  setMessageTitle('');
                                  setMessageContent('');
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => {
                                    setSelectedService(service);
                                    setMessageDialogOpen(true);
                                  }}
                                >
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Enviar mensagem para parceiro
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Enviar mensagem para {service.title}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 mt-4">
                                  <div>
                                    <Label htmlFor="message-title-service">Título da mensagem</Label>
                                    <Input
                                      id="message-title-service"
                                      value={messageTitle}
                                      onChange={(e) => setMessageTitle(e.target.value)}
                                      placeholder="Ex: Promoção especial"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="message-content-service">Mensagem</Label>
                                    <Textarea
                                      id="message-content-service"
                                      value={messageContent}
                                      onChange={(e) => setMessageContent(e.target.value)}
                                      placeholder="Digite sua mensagem aqui..."
                                      rows={5}
                                    />
                                  </div>
                                  <Button
                                    onClick={() => {
                                      const owner = users.find(u => u.uid === service.ownerId);
                                      if (owner) {
                                        handleSendMessageToPartner(service.ownerId, owner.name);
                                      }
                                    }}
                                    disabled={sendingMessage}
                                    className="w-full"
                                  >
                                    {sendingMessage ? (
                                      <>
                                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                                        Enviando...
                                      </>
                                    ) : (
                                      <>
                                        <Send className="h-4 w-4 mr-2" />
                                        Enviar mensagem
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
              })}
            </div>
          )}
        </section>

        {/* Mensagem Global */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Mensagem Global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">
              Envie uma mensagem para todos os usuários da plataforma. Útil para comunicar mudanças importantes, 
              promoções gerais ou avisos importantes.
            </p>
            <Dialog open={globalMessageDialogOpen} onOpenChange={setGlobalMessageDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Enviar mensagem global
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Enviar mensagem global</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="global-message-title">Título da mensagem</Label>
                    <Input
                      id="global-message-title"
                      value={messageTitle}
                      onChange={(e) => setMessageTitle(e.target.value)}
                      placeholder="Ex: Nova funcionalidade disponível!"
                    />
                  </div>
                  <div>
                    <Label htmlFor="global-message-content">Mensagem</Label>
                    <Textarea
                      id="global-message-content"
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      placeholder="Digite sua mensagem aqui..."
                      rows={6}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Esta mensagem será enviada para todos os usuários da plataforma ({users.filter(u => u.role !== 'admin').length} usuário(s)).
                  </p>
                  <Button
                    onClick={handleSendGlobalMessage}
                    disabled={sendingMessage}
                    className="w-full"
                  >
                    {sendingMessage ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar para todos os usuários
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Solicitações de Crédito */}
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Solicitações de Crédito
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {creditRequests.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhuma solicitação de crédito encontrada.
              </p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {creditRequests.map((request) => {
                  const isPending = request.status === 'pending';
                  const isApproved = request.status === 'approved';
                  const isRejected = request.status === 'rejected';

                  return (
                    <div
                      key={request.id}
                      className={cn(
                        "p-3 rounded-lg border",
                        isPending && "border-yellow-500/50 bg-yellow-500/5",
                        isApproved && "border-green-500/50 bg-green-500/5",
                        isRejected && "border-red-500/50 bg-red-500/5"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">{request.userName}</span>
                            <span className="text-xs text-muted-foreground">({request.userEmail})</span>
                            {isPending && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500 text-white">
                                Pendente
                              </span>
                            )}
                            {isApproved && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500 text-white">
                                Aprovado
                              </span>
                            )}
                            {isRejected && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                                Rejeitado
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            Valor: <span className="font-semibold">R$ {request.amount.toFixed(2)}</span> • 
                            Créditos: <span className="font-semibold">{request.credits}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mb-2">
                            Enviado em: {format(request.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                          {request.reviewedAt && (
                            <p className="text-xs text-muted-foreground">
                              {isApproved ? 'Aprovado' : 'Rejeitado'} em: {format(request.reviewedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          )}
                          {request.rejectionReason && (
                            <p className="text-xs text-red-600 mt-1">
                              Motivo: {request.rejectionReason}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          {request.proofImageUrl && (
                            <img
                              src={request.proofImageUrl}
                              alt="Comprovante"
                              className="w-24 h-24 object-cover rounded-md border cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(request.proofImageUrl, '_blank')}
                            />
                          )}
                          {isPending && (
                            <div className="flex flex-col gap-1">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApproveCreditRequest(request.id)}
                                disabled={processingCreditRequest === request.id}
                                className="text-xs"
                              >
                                {processingCreditRequest === request.id ? (
                                  <>
                                    <Clock className="h-3 w-3 mr-1 animate-spin" />
                                    Processando...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Aprovar
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  const reason = prompt('Motivo da rejeição (opcional):');
                                  handleRejectCreditRequest(request.id, reason || undefined);
                                }}
                                disabled={processingCreditRequest === request.id}
                                className="text-xs"
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Rejeitar
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
