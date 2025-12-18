import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Store, Product, Service, Order, OrderStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { BottomNav } from '@/components/layout/BottomNav';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, Plus, Edit, Trash2, Store as StoreIcon, 
  Phone, MapPin, Upload, Package, Image as ImageIcon, Wrench,
  ShoppingBag, Clock, CheckCircle, Truck, XCircle, Camera
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PartnerDashboard() {
  console.log('🏪 PartnerDashboard component rendered');
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  console.log('👤 PartnerDashboard user:', user?.uid, 'role:', user?.role);
  
  const [store, setStore] = useState<Store | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { createNotification } = useNotifications();
  
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    imageUrl: ''
  });

  const isVendorProduct = user?.role === 'vendor_product';
  const isVendorService = user?.role === 'vendor_service';

  useEffect(() => {
    if (!user || (user.role !== 'vendor_product' && user.role !== 'vendor_service')) {
      navigate('/');
      return;
    }
    let unsubscribe: (() => void) | undefined;
    fetchData().then((unsub) => {
      unsubscribe = unsub;
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  // Listener separado para pedidos quando a loja for definida
  useEffect(() => {
    console.log('🔍 Orders useEffect triggered:', { isVendorProduct, hasStore: !!store, storeId: store?.id, storeName: store?.name });
    
    if (!isVendorProduct || !store) {
      console.log('⚠️ Orders listener not set up:', { isVendorProduct, hasStore: !!store, storeId: store?.id });
      setOrders([]);
      return;
    }

    console.log('📡 Setting up orders listener for store:', store.id, store.name);
    console.log('🔍 Store details:', { id: store.id, name: store.name, ownerId: store.ownerId });
    
    // Primeiro, vamos buscar TODOS os pedidos para debug
    getDocs(collection(db, 'orders')).then(allOrders => {
      console.log('🔍 DEBUG: All orders in database:', allOrders.docs.length);
      allOrders.docs.forEach(doc => {
        const data = doc.data();
        console.log('  - Order ID:', doc.id);
        console.log('    storeId in order:', data.storeId);
        console.log('    storeId expected:', store.id);
        console.log('    match:', data.storeId === store.id);
        console.log('    storeName:', data.storeName);
        console.log('    status:', data.status);
        console.log('    userId:', data.userId);
      });
    }).catch(err => {
      console.error('❌ Error fetching all orders for debug:', err);
    });
    
    const ordersQuery = query(
      collection(db, 'orders'),
      where('storeId', '==', store.id)
    );
    
    console.log('🔍 Query setup:', { collection: 'orders', filter: 'storeId', value: store.id });
    
    const unsubscribeOrders = onSnapshot(
      ordersQuery,
      (snapshot) => {
        console.log('📦 Partner orders snapshot received:', snapshot.docs.length, 'orders for storeId:', store.id, 'storeName:', store.name);
        
        if (snapshot.docs.length === 0) {
          console.log('⚠️ No orders found for storeId:', store.id);
          // Debug: verifica todos os pedidos no banco
          getDocs(collection(db, 'orders')).then(allOrders => {
            console.log('🔍 Debug: All orders in database:', allOrders.docs.length);
            allOrders.docs.forEach(doc => {
              const data = doc.data();
              console.log('  - Order:', doc.id, 'storeId:', data.storeId, 'expected:', store.id, 'match:', data.storeId === store.id, 'status:', data.status, 'storeName:', data.storeName);
            });
          }).catch(err => {
            console.error('❌ Error fetching all orders:', err);
          });
        } else {
          console.log('✅ Found orders! Processing...');
        }
        
        const ordersData = snapshot.docs.map(doc => {
          const data = doc.data();
          
          // Converte serverTimestamp para Date
          let createdAt: Date;
          if (data.createdAt?.toDate) {
            createdAt = data.createdAt.toDate();
          } else if (data.createdAt instanceof Date) {
            createdAt = data.createdAt;
          } else if (data.createdAt) {
            createdAt = new Date(data.createdAt);
          } else {
            createdAt = new Date();
          }

          let updatedAt: Date;
          if (data.updatedAt?.toDate) {
            updatedAt = data.updatedAt.toDate();
          } else if (data.updatedAt instanceof Date) {
            updatedAt = data.updatedAt;
          } else if (data.updatedAt) {
            updatedAt = new Date(data.updatedAt);
          } else {
            updatedAt = createdAt;
          }
          
          const order: Order = {
            id: doc.id,
            userId: data.userId,
            storeId: data.storeId,
            storeName: data.storeName,
            storeWhatsapp: data.storeWhatsapp,
            items: data.items || [],
            total: data.total || 0,
            address: data.address || '',
            status: data.status || 'pending',
            createdAt,
            updatedAt,
            whatsappMessageId: data.whatsappMessageId,
          };
          
          console.log('📋 Partner order:', order.id, 'storeId:', order.storeId, 'expected:', store.id, 'match:', order.storeId === store.id, 'status:', order.status);
          
          return order;
        });
        
        // Ordena por data (mais recente primeiro)
        ordersData.sort((a, b) => {
          const timeA = a.createdAt.getTime();
          const timeB = b.createdAt.getTime();
          return timeB - timeA;
        });
        
        console.log('✅ Partner orders loaded:', ordersData.length, 'orders');
        setOrders(ordersData);
      },
      (error) => {
        console.error('❌ Error fetching partner orders:', error);
      }
    );

    return () => {
      console.log('🧹 Cleaning up orders listener');
      unsubscribeOrders();
    };
  }, [isVendorProduct, store]);

  const fetchData = async (): Promise<(() => void) | undefined> => {
    if (!user) {
      console.log('⚠️ No user in fetchData');
      return;
    }
    
    console.log('🛒 fetchData called for user:', user.uid, 'role:', user.role);
    console.log('🔍 isVendorProduct:', isVendorProduct, 'isVendorService:', isVendorService);
    
    try {
      if (isVendorProduct) {
        console.log('📦 Fetching store for vendor:', user.uid);
        const storesQuery = query(collection(db, 'stores'), where('ownerId', '==', user.uid));
        const storesSnapshot = await getDocs(storesQuery);
        console.log('📦 Stores found:', storesSnapshot.docs.length);
        
        if (!storesSnapshot.empty) {
          const storeData = { id: storesSnapshot.docs[0].id, ...storesSnapshot.docs[0].data() } as Store;
          console.log('✅ Store found:', storeData.id, storeData.name);
          console.log('🔍 Store data:', { id: storeData.id, name: storeData.name, ownerId: storeData.ownerId });
          setStore(storeData);
          console.log('✅ Store state updated');

          const productsQuery = query(collection(db, 'products'), where('storeId', '==', storeData.id));
          const productsSnapshot = await getDocs(productsQuery);
          setProducts(productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));

          setLoading(false);
          // O listener de pedidos será configurado no useEffect separado quando store for definido
          return undefined;
        } else {
          console.log('⚠️ No store found for vendor');
          setLoading(false);
        }
      } else if (isVendorService) {
        const servicesQuery = query(collection(db, 'services'), where('ownerId', '==', user.uid));
        const servicesSnapshot = await getDocs(servicesQuery);
        if (!servicesSnapshot.empty) {
          setService({ id: servicesSnapshot.docs[0].id, ...servicesSnapshot.docs[0].data() } as Service);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
    return undefined;
  };

  const handleCreateStore = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const storeData = {
        ownerId: user.uid,
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        category: formData.get('category') as string,
        whatsappNumber: formData.get('whatsapp') as string,
        address: formData.get('address') as string,
        isOpen: true,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'stores'), storeData);
      setStore({ id: docRef.id, ...storeData, createdAt: new Date() } as Store);
      
      toast({ title: "Loja criada com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao criar loja", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const serviceData = {
        ownerId: user.uid,
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        category: formData.get('category') as string,
        whatsappNumber: formData.get('whatsapp') as string,
        priceRange: formData.get('priceRange') as string,
        portfolioImages: [],
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'services'), serviceData);
      setService({ id: docRef.id, ...serviceData, createdAt: new Date() } as Service);
      
      toast({ title: "Serviço criado com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao criar serviço", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStore = async () => {
    if (!store) return;
    
    try {
      await updateDoc(doc(db, 'stores', store.id), { isOpen: !store.isOpen });
      setStore({ ...store, isOpen: !store.isOpen });
      toast({ title: store.isOpen ? "Loja fechada" : "Loja aberta" });
    } catch (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleSaveProduct = async () => {
    if (!store) return;
    
    setSaving(true);
    try {
      const productData = {
        storeId: store.id,
        name: productForm.name,
        description: productForm.description,
        price: parseFloat(productForm.price),
        category: productForm.category,
        imageUrl: productForm.imageUrl,
        isAvailable: true,
        createdAt: serverTimestamp()
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productData);
        setProducts(products.map(p => p.id === editingProduct.id ? { ...p, ...productData, createdAt: p.createdAt } : p));
        toast({ title: "Produto atualizado!" });
      } else {
        const docRef = await addDoc(collection(db, 'products'), productData);
        const newProduct: Product = { 
          id: docRef.id, 
          storeId: store.id,
          name: productForm.name,
          description: productForm.description,
          price: parseFloat(productForm.price),
          category: productForm.category,
          imageUrl: productForm.imageUrl,
          isAvailable: true,
          createdAt: new Date() 
        };
        setProducts([...products, newProduct]);
        toast({ title: "Produto adicionado!" });
      }

      resetProductForm();
      setIsProductDialogOpen(false);
    } catch (error) {
      toast({ title: "Erro ao salvar produto", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteDoc(doc(db, 'products', productId));
      setProducts(products.filter(p => p.id !== productId));
      toast({ title: "Produto removido!" });
    } catch (error) {
      toast({ title: "Erro ao remover produto", variant: "destructive" });
    }
  };

  const handleToggleProduct = async (product: Product) => {
    try {
      await updateDoc(doc(db, 'products', product.id), { isAvailable: !product.isAvailable });
      setProducts(products.map(p => p.id === product.id ? { ...p, isAvailable: !p.isAvailable } : p));
    } catch (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const resetProductForm = () => {
    setProductForm({ name: '', description: '', price: '', category: '', imageUrl: '' });
    setEditingProduct(null);
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category: product.category || '',
      imageUrl: product.imageUrl || ''
    });
    setIsProductDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-20 bg-background p-4 space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <BottomNav />
      </div>
    );
  }

  // Show create form if no store/service exists
  if (isVendorProduct && !store) {
    return (
      <div className="min-h-screen pb-20 bg-background">
        <header className="sticky top-0 z-40 bg-card border-b p-4 flex items-center gap-3">
          <Link to="/" className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-bold text-lg">Cadastrar Loja</h1>
        </header>

        <form onSubmit={handleCreateStore} className="p-4 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nome da Loja *</label>
                <Input name="name" placeholder="Ex: Padaria do João" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Categoria *</label>
                <Input name="category" placeholder="Ex: Padaria, Mercado, Lanchonete" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">WhatsApp *</label>
                <Input name="whatsapp" placeholder="(00) 00000-0000" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Endereço</label>
                <Input name="address" placeholder="Rua, número, bairro" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Descrição</label>
                <Textarea name="description" placeholder="Fale um pouco sobre sua loja..." rows={3} />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full" disabled={saving}>
            {saving ? 'Salvando...' : 'Criar Loja'}
          </Button>
        </form>
        <BottomNav />
      </div>
    );
  }

  if (isVendorService && !service) {
    return (
      <div className="min-h-screen pb-20 bg-background">
        <header className="sticky top-0 z-40 bg-card border-b p-4 flex items-center gap-3">
          <Link to="/" className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-bold text-lg">Cadastrar Serviço</h1>
        </header>

        <form onSubmit={handleCreateService} className="p-4 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Título do Serviço *</label>
                <Input name="title" placeholder="Ex: Eletricista, Manicure" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Categoria *</label>
                <Input name="category" placeholder="Ex: Reparos, Beleza, Limpeza" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">WhatsApp *</label>
                <Input name="whatsapp" placeholder="(00) 00000-0000" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Faixa de Preço</label>
                <Input name="priceRange" placeholder="Ex: A partir de R$ 50" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Descrição</label>
                <Textarea name="description" placeholder="Descreva seus serviços, experiência..." rows={4} />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full" disabled={saving}>
            {saving ? 'Salvando...' : 'Criar Perfil'}
          </Button>
        </form>
        <BottomNav />
      </div>
    );
  }

  // Dashboard view
  return (
    <div className="min-h-screen pb-20 bg-background">
      <header className="sticky top-0 z-40 bg-card border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">Painel do Parceiro</h1>
            <p className="text-sm text-muted-foreground">
              {isVendorProduct ? store?.name : service?.title}
            </p>
          </div>
          {isVendorProduct && store && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {store.isOpen ? 'Aberto' : 'Fechado'}
              </span>
              <Switch checked={store.isOpen} onCheckedChange={handleToggleStore} />
            </div>
          )}
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Personalization Section */}
        {(isVendorProduct && store) || (isVendorService && service) ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Personalização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo Upload */}
              <div>
                <label className="text-sm font-medium mb-2 block">Logo {isVendorProduct ? 'da Loja' : 'do Serviço'}</label>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-lg bg-secondary flex-shrink-0 overflow-hidden border-2 border-dashed border-muted-foreground/20">
                    {isVendorProduct && store?.logoUrl ? (
                      <img src={store.logoUrl} alt="Logo" className="h-full w-full object-cover" />
                    ) : isVendorService && service?.logoUrl ? (
                      <img src={service.logoUrl} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          try {
                            setSaving(true);
                            const fileRef = ref(storage, `${isVendorProduct ? 'stores' : 'services'}/${isVendorProduct ? store?.id : service?.id}/logo_${Date.now()}`);
                            await uploadBytes(fileRef, file);
                            const url = await getDownloadURL(fileRef);
                            
                            if (isVendorProduct && store) {
                              await updateDoc(doc(db, 'stores', store.id), { logoUrl: url });
                              setStore({ ...store, logoUrl: url });
                            } else if (isVendorService && service) {
                              await updateDoc(doc(db, 'services', service.id), { logoUrl: url });
                              setService({ ...service, logoUrl: url });
                            }
                            
                            toast({ title: "Logo atualizado com sucesso!" });
                          } catch (error) {
                            toast({ title: "Erro ao fazer upload", variant: "destructive" });
                          } finally {
                            setSaving(false);
                          }
                        }}
                      />
                      <Button type="button" variant="outline" size="sm" className="w-full" disabled={saving}>
                        <Upload className="h-4 w-4 mr-2" />
                        {isVendorProduct && store?.logoUrl ? 'Alterar Logo' : isVendorService && service?.logoUrl ? 'Alterar Logo' : 'Adicionar Logo'}
                      </Button>
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">Imagem quadrada recomendada</p>
                  </div>
                </div>
              </div>

              {/* Banner Upload */}
              <div>
                <label className="text-sm font-medium mb-2 block">Capa {isVendorProduct ? 'da Loja' : 'do Serviço'}</label>
                <div className="space-y-2">
                  <div className="h-32 rounded-lg bg-secondary overflow-hidden border-2 border-dashed border-muted-foreground/20">
                    {isVendorProduct && store?.bannerUrl ? (
                      <img src={store.bannerUrl} alt="Banner" className="h-full w-full object-cover" />
                    ) : isVendorService && service?.bannerUrl ? (
                      <img src={service.bannerUrl} alt="Banner" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        try {
                          setSaving(true);
                          const fileRef = ref(storage, `${isVendorProduct ? 'stores' : 'services'}/${isVendorProduct ? store?.id : service?.id}/banner_${Date.now()}`);
                          await uploadBytes(fileRef, file);
                          const url = await getDownloadURL(fileRef);
                          
                          if (isVendorProduct && store) {
                            await updateDoc(doc(db, 'stores', store.id), { bannerUrl: url });
                            setStore({ ...store, bannerUrl: url });
                          } else if (isVendorService && service) {
                            await updateDoc(doc(db, 'services', service.id), { bannerUrl: url });
                            setService({ ...service, bannerUrl: url });
                          }
                          
                          toast({ title: "Capa atualizada com sucesso!" });
                        } catch (error) {
                          toast({ title: "Erro ao fazer upload", variant: "destructive" });
                        } finally {
                          setSaving(false);
                        }
                      }}
                    />
                    <Button type="button" variant="outline" size="sm" className="w-full" disabled={saving}>
                      <Upload className="h-4 w-4 mr-2" />
                      {isVendorProduct && store?.bannerUrl ? 'Alterar Capa' : isVendorService && service?.bannerUrl ? 'Alterar Capa' : 'Adicionar Capa'}
                    </Button>
                  </label>
                  <p className="text-xs text-muted-foreground">Imagem horizontal recomendada (16:9)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Store/Service Info Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {isVendorProduct ? <StoreIcon className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
              Informações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {isVendorProduct && store && (
              <>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {store.whatsappNumber}
                </div>
                {store.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {store.address}
                  </div>
                )}
              </>
            )}
            {isVendorService && service && (
              <>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {service.whatsappNumber}
                </div>
                {service.priceRange && (
                  <p className="text-primary font-medium">{service.priceRange}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Products Section (for vendors) */}
        {isVendorProduct && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg">Produtos ({products.length})</h2>
              <Dialog open={isProductDialogOpen} onOpenChange={(open) => {
                setIsProductDialogOpen(open);
                if (!open) resetProductForm();
              }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Nome *</label>
                      <Input 
                        value={productForm.name}
                        onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                        placeholder="Nome do produto"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Preço *</label>
                      <Input 
                        type="number"
                        step="0.01"
                        value={productForm.price}
                        onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Categoria</label>
                      <Input 
                        value={productForm.category}
                        onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                        placeholder="Ex: Pães, Bebidas"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">URL da Imagem</label>
                      <Input 
                        value={productForm.imageUrl}
                        onChange={(e) => setProductForm({...productForm, imageUrl: e.target.value})}
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Descrição</label>
                      <Textarea 
                        value={productForm.description}
                        onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                        placeholder="Descrição do produto"
                        rows={2}
                      />
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={handleSaveProduct}
                      disabled={!productForm.name || !productForm.price || saving}
                    >
                      {saving ? 'Salvando...' : (editingProduct ? 'Atualizar' : 'Adicionar')}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {products.length > 0 ? (
              <div className="space-y-2">
                {products.map(product => (
                  <Card key={product.id} className={cn(!product.isAvailable && "opacity-60")}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 rounded-lg bg-secondary flex-shrink-0 overflow-hidden">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{product.name}</h4>
                          <p className="text-sm text-primary font-semibold">
                            R$ {product.price.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Switch 
                            checked={product.isAvailable}
                            onCheckedChange={() => handleToggleProduct(product)}
                          />
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => openEditProduct(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum produto cadastrado</p>
                  <p className="text-sm">Adicione seu primeiro produto!</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Portfolio Section (for services) */}
        {isVendorService && service && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg">Portfólio</h2>
              <Button size="sm" variant="outline">
                <ImageIcon className="h-4 w-4 mr-1" />
                Adicionar Fotos
              </Button>
            </div>
            
            {service.portfolioImages && service.portfolioImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {service.portfolioImages.map((image, index) => (
                  <div key={index} className="aspect-square rounded-lg overflow-hidden bg-secondary">
                    <img src={image} alt={`Portfolio ${index + 1}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma foto no portfólio</p>
                  <p className="text-sm">Mostre seus trabalhos!</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Orders Section (for vendors) */}
        {isVendorProduct && store && (
          <div>
            <h2 className="font-bold text-lg mb-3">Pedidos ({orders.length})</h2>
            
            {orders.length > 0 ? (
              <div className="space-y-3">
                {orders.map(order => {
                  const statusConfig: Record<OrderStatus, { label: string; icon: any; color: string }> = {
                    pending: { label: 'Aguardando confirmação', icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
                    confirmed: { label: 'Confirmado', icon: CheckCircle, color: 'text-blue-600 bg-blue-50' },
                    preparing: { label: 'Preparando', icon: Package, color: 'text-orange-600 bg-orange-50' },
                    out_for_delivery: { label: 'Saiu para entrega', icon: Truck, color: 'text-purple-600 bg-purple-50' },
                    delivered: { label: 'Entregue', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
                    cancelled: { label: 'Cancelado', icon: XCircle, color: 'text-red-600 bg-red-50' },
                  };
                  const config = statusConfig[order.status];
                  const StatusIcon = config.icon;

                  const handleStatusChange = async (newStatus: OrderStatus) => {
                    try {
                      await updateDoc(doc(db, 'orders', order.id), {
                        status: newStatus,
                        updatedAt: serverTimestamp(),
                      });

                      // Cria notificação para o cliente
                      await createNotification(
                        order.userId,
                        `order_${newStatus}` as any,
                        `Pedido ${config.label.toLowerCase()}`,
                        `Seu pedido na ${order.storeName} está ${config.label.toLowerCase()}.`,
                        order.id
                      );

                      toast({ title: "Status atualizado com sucesso!" });
                    } catch (error: any) {
                      toast({
                        title: "Erro",
                        description: error.message || "Não foi possível atualizar o status.",
                        variant: "destructive"
                      });
                    }
                  };

                  return (
                    <Card key={order.id} id={`order-${order.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {format(order.createdAt, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                            </p>
                            <p className="font-semibold mt-1">Pedido #{order.id.slice(0, 8)}</p>
                          </div>
                          <span className={cn(
                            "text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1",
                            config.color
                          )}>
                            <StatusIcon className="h-3 w-3" />
                            {config.label}
                          </span>
                        </div>

                        <div className="space-y-2 mb-3">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">{item.quantity}x</span>
                              <span className="flex-1 truncate">{item.productName}</span>
                              <span className="font-medium">R$ {(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between mb-3 pt-3 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="font-bold text-lg text-primary">R$ {order.total.toFixed(2)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Endereço</p>
                            <p className="text-xs font-medium truncate max-w-[150px]">{order.address}</p>
                          </div>
                        </div>

                        {order.status !== 'delivered' && order.status !== 'cancelled' && (
                          <div className="space-y-2">
                            {order.status === 'pending' && (
                              <>
                                <Button
                                  onClick={() => handleStatusChange('confirmed')}
                                  className="w-full"
                                  size="sm"
                                >
                                  ✅ Confirmar pedido
                                </Button>
                                <Button
                                  onClick={() => handleStatusChange('cancelled')}
                                  variant="destructive"
                                  className="w-full"
                                  size="sm"
                                >
                                  ❌ Cancelar pedido
                                </Button>
                              </>
                            )}
                            {order.status === 'confirmed' && (
                              <>
                                <Button
                                  onClick={() => handleStatusChange('preparing')}
                                  className="w-full"
                                  size="sm"
                                >
                                  📦 Marcar como preparando
                                </Button>
                                <Button
                                  onClick={() => handleStatusChange('cancelled')}
                                  variant="destructive"
                                  className="w-full"
                                  size="sm"
                                >
                                  ❌ Cancelar pedido
                                </Button>
                              </>
                            )}
                            {order.status === 'preparing' && (
                              <>
                                <Button
                                  onClick={() => handleStatusChange('out_for_delivery')}
                                  className="w-full"
                                  size="sm"
                                >
                                  🚚 Saiu para entrega
                                </Button>
                                <Button
                                  onClick={() => handleStatusChange('cancelled')}
                                  variant="destructive"
                                  className="w-full"
                                  size="sm"
                                >
                                  ❌ Cancelar pedido
                                </Button>
                              </>
                            )}
                            {order.status === 'out_for_delivery' && (
                              <Button
                                onClick={() => handleStatusChange('delivered')}
                                className="w-full"
                                size="sm"
                              >
                                ✅ Marcar como entregue
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum pedido ainda</p>
                  <p className="text-sm">Os pedidos aparecerão aqui quando os clientes fizerem pedidos.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
