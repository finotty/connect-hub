import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, onSnapshot, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { generateOrderConfirmationWhatsApp, generateOutForDeliveryWhatsApp, generateWhatsAppUrl } from '@/lib/whatsapp';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Store, Product, Service, Order, OrderStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  ShoppingBag, Clock, CheckCircle, Truck, XCircle, Camera,
  BarChart3, TrendingUp, DollarSign, Search, Calendar, ChevronDown, ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfDay, endOfDay, isSameDay, parseISO } from 'date-fns';
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
    imageUrl: '',
    saleType: 'unit' as 'unit' | 'weight' | 'value',
    unitLabel: '',
    weightUnit: 'kg' as 'kg' | 'g',
    valueQuantity: '',
    valueLabel: ''
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const productImageInputRef = useRef<HTMLInputElement>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string>('');
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [statsDateFilter, setStatsDateFilter] = useState<'day' | 'month' | 'year' | 'all'>('all');
  const [statsCustomDate, setStatsCustomDate] = useState<Date | null>(null);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [isPersonalizationExpanded, setIsPersonalizationExpanded] = useState(false);
  const [isProductsExpanded, setIsProductsExpanded] = useState(false);
  const [isPostsExpanded, setIsPostsExpanded] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [postForm, setPostForm] = useState({
    title: '',
    content: '',
    imageUrl: ''
  });
  const postImageInputRef = useRef<HTMLInputElement>(null);
  const [postImagePreview, setPostImagePreview] = useState<string>('');

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const isVendorProduct = user?.role === 'vendor_product';
  const isVendorService = user?.role === 'vendor_service';

  // Buscar categorias existentes
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const productsSnapshot = await getDocs(collection(db, 'products'));
        const categoriesSet = new Set<string>();
        productsSnapshot.docs.forEach(doc => {
          const category = doc.data().category;
          if (category && category.trim()) {
            categoriesSet.add(category.trim());
          }
        });
        setCategories(Array.from(categoriesSet).sort());
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Filtrar sugestões de categoria
  useEffect(() => {
    if (productForm.category.trim()) {
      const filtered = categories.filter(cat =>
        cat.toLowerCase().includes(productForm.category.toLowerCase())
      );
      setCategorySuggestions(filtered.slice(0, 5));
      setShowCategorySuggestions(filtered.length > 0);
    } else {
      setCategorySuggestions([]);
      setShowCategorySuggestions(false);
    }
  }, [productForm.category, categories]);

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
          const serviceData = { id: servicesSnapshot.docs[0].id, ...servicesSnapshot.docs[0].data() } as Service;
          setService(serviceData);
          
          // Buscar posts do serviço
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
          }));
          setPosts(postsData);
        }
      }
      
      // Buscar posts da loja se for vendedor de produtos
      if (isVendorProduct && store) {
        const postsQuery = query(
          collection(db, 'posts'),
          where('storeId', '==', store.id)
        );
        const postsSnapshot = await getDocs(postsQuery);
        const postsData = postsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        }));
        setPosts(postsData);
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
        whatsappClicks: 0,
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
      let imageUrl = productForm.imageUrl;

      // Upload da imagem se houver arquivo selecionado
      if (productImageFile) {
        try {
          const fileRef = ref(storage, `products/${store.id}/${Date.now()}_${productImageFile.name}`);
          await uploadBytes(fileRef, productImageFile);
          imageUrl = await getDownloadURL(fileRef);
        } catch (error) {
          console.error('Error uploading product image:', error);
          toast({ title: "Erro ao fazer upload da imagem", variant: "destructive" });
          setSaving(false);
          return;
        }
      }

      const productData: any = {
        storeId: store.id,
        name: productForm.name,
        description: productForm.description,
        price: parseFloat(productForm.price),
        category: productForm.category.trim(),
        imageUrl: imageUrl || null,
        saleType: productForm.saleType,
        isAvailable: true,
        createdAt: serverTimestamp()
      };

      // Adicionar campos específicos do tipo de venda
      if (productForm.saleType === 'unit') {
        if (productForm.unitLabel) {
          productData.unitLabel = productForm.unitLabel;
        }
      } else if (productForm.saleType === 'weight') {
        productData.weightUnit = productForm.weightUnit;
      } else if (productForm.saleType === 'value') {
        productData.valueQuantity = parseFloat(productForm.valueQuantity || '1');
        productData.valueLabel = productForm.valueLabel || 'unidades';
      }

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
          category: productForm.category.trim(),
          imageUrl: imageUrl || undefined,
          saleType: productForm.saleType,
          unitLabel: productForm.saleType === 'unit' ? productForm.unitLabel : undefined,
          weightUnit: productForm.saleType === 'weight' ? productForm.weightUnit : undefined,
          valueQuantity: productForm.saleType === 'value' ? parseFloat(productForm.valueQuantity || '1') : undefined,
          valueLabel: productForm.saleType === 'value' ? productForm.valueLabel : undefined,
          isAvailable: true,
          createdAt: new Date() 
        };
        setProducts([...products, newProduct]);
        toast({ title: "Produto adicionado!" });
      }

      resetProductForm();
      setIsProductDialogOpen(false);
    } catch (error) {
      console.error('Error saving product:', error);
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
    setProductForm({ 
      name: '', 
      description: '', 
      price: '', 
      category: '', 
      imageUrl: '',
      saleType: 'unit',
      unitLabel: '',
      weightUnit: 'kg',
      valueQuantity: '',
      valueLabel: ''
    });
    setEditingProduct(null);
    setProductImageFile(null);
    setProductImagePreview('');
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category: product.category || '',
      imageUrl: product.imageUrl || '',
      saleType: product.saleType || 'unit',
      unitLabel: product.unitLabel || '',
      weightUnit: product.weightUnit || 'kg',
      valueQuantity: product.valueQuantity?.toString() || '',
      valueLabel: product.valueLabel || ''
    });
    setProductImagePreview(product.imageUrl || '');
    setIsProductDialogOpen(true);
  };

  // Filtro de pedidos por data (mostra apenas do dia atual por padrão)
  const filteredOrders = selectedDate
    ? orders.filter(order => isSameDay(order.createdAt, selectedDate))
    : orders.filter(order => isSameDay(order.createdAt, new Date()));

  // Estatísticas dos pedidos
  const getStats = () => {
    let ordersToAnalyze = orders;

    if (statsDateFilter === 'day') {
      const date = statsCustomDate || new Date();
      ordersToAnalyze = orders.filter(order => isSameDay(order.createdAt, date));
    } else if (statsDateFilter === 'month') {
      const date = statsCustomDate || new Date();
      ordersToAnalyze = orders.filter(order => {
        const orderDate = order.createdAt;
        return orderDate.getMonth() === date.getMonth() && orderDate.getFullYear() === date.getFullYear();
      });
    } else if (statsDateFilter === 'year') {
      const date = statsCustomDate || new Date();
      ordersToAnalyze = orders.filter(order => order.createdAt.getFullYear() === date.getFullYear());
    }

    const total = ordersToAnalyze.length;
    const delivered = ordersToAnalyze.filter(o => o.status === 'delivered').length;
    const cancelled = ordersToAnalyze.filter(o => o.status === 'cancelled').length;
    const revenue = ordersToAnalyze
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + o.total, 0);

    return { total, delivered, cancelled, revenue };
  };

  const stats = getStats();

  // Filtro de produtos
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    product.category?.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

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

      <main className="p-4 space-y-4 max-w-6xl mx-auto">
        {/* Statistics Dashboard */}
        {isVendorProduct && store && (
          <Card>
            <CardHeader className="pb-2">
              <button
                onClick={() => setIsStatsExpanded(!isStatsExpanded)}
                className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
              >
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Estatísticas
                </CardTitle>
                {isStatsExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CardHeader>
            {isStatsExpanded && (
              <CardContent className="space-y-4">
              {/* Date Filter */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={statsDateFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStatsDateFilter('all');
                    setStatsCustomDate(null);
                  }}
                >
                  Todos
                </Button>
                <Button
                  variant={statsDateFilter === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStatsDateFilter('day');
                    setStatsCustomDate(new Date());
                  }}
                >
                  Hoje
                </Button>
                <Button
                  variant={statsDateFilter === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStatsDateFilter('month');
                    setStatsCustomDate(new Date());
                  }}
                >
                  Este Mês
                </Button>
                <Button
                  variant={statsDateFilter === 'year' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStatsDateFilter('year');
                    setStatsCustomDate(new Date());
                  }}
                >
                  Este Ano
                </Button>
              </div>

              {/* Custom Date Input */}
              {(statsDateFilter === 'day' || statsDateFilter === 'month' || statsDateFilter === 'year') && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {statsDateFilter === 'day' ? 'Selecionar dia:' : statsDateFilter === 'month' ? 'Selecionar mês:' : 'Selecionar ano:'}
                  </label>
                  <Input
                    type={statsDateFilter === 'day' ? 'date' : statsDateFilter === 'month' ? 'month' : 'number'}
                    value={
                      statsCustomDate
                        ? statsDateFilter === 'day'
                          ? format(statsCustomDate, 'yyyy-MM-dd')
                          : statsDateFilter === 'month'
                          ? format(statsCustomDate, 'yyyy-MM')
                          : statsCustomDate.getFullYear().toString()
                        : ''
                    }
                    onChange={(e) => {
                      if (statsDateFilter === 'day') {
                        setStatsCustomDate(e.target.value ? parseISO(e.target.value) : null);
                      } else if (statsDateFilter === 'month') {
                        setStatsCustomDate(e.target.value ? parseISO(e.target.value + '-01') : null);
                      } else {
                        const year = parseInt(e.target.value);
                        if (year) {
                          const date = new Date();
                          date.setFullYear(year);
                          setStatsCustomDate(date);
                        } else {
                          setStatsCustomDate(null);
                        }
                      }
                    }}
                    className="w-full"
                  />
                </div>
              )}

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">Total de Pedidos</p>
                  <p className="text-2xl font-bold text-primary">{stats.total}</p>
                </div>
                <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                  <p className="text-xs text-muted-foreground mb-1">Entregues</p>
                  <p className="text-2xl font-bold text-success">{stats.delivered}</p>
                </div>
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-xs text-muted-foreground mb-1">Cancelados</p>
                  <p className="text-2xl font-bold text-destructive">{stats.cancelled}</p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Faturado
                  </p>
                  <p className="text-2xl font-bold text-primary">R$ {stats.revenue.toFixed(2)}</p>
                </div>
              </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Personalization Section */}
        {(isVendorProduct && store) || (isVendorService && service) ? (
          <Card>
            <CardHeader className="pb-2">
              <button
                onClick={() => setIsPersonalizationExpanded(!isPersonalizationExpanded)}
                className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
              >
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Personalização
                </CardTitle>
                {isPersonalizationExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CardHeader>
            {isPersonalizationExpanded && (
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
                    <input
                      ref={logoInputRef}
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
                          console.error('Error uploading logo:', error);
                          toast({ title: "Erro ao fazer upload", variant: "destructive" });
                        } finally {
                          setSaving(false);
                        }
                      }}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="w-full" 
                      disabled={saving}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isVendorProduct && store?.logoUrl ? 'Alterar Logo' : isVendorService && service?.logoUrl ? 'Alterar Logo' : 'Adicionar Logo'}
                    </Button>
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
                  <input
                    ref={bannerInputRef}
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
                        console.error('Error uploading banner:', error);
                        toast({ title: "Erro ao fazer upload", variant: "destructive" });
                      } finally {
                        setSaving(false);
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="w-full" 
                    disabled={saving}
                    onClick={() => bannerInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isVendorProduct && store?.bannerUrl ? 'Alterar Capa' : isVendorService && service?.bannerUrl ? 'Alterar Capa' : 'Adicionar Capa'}
                  </Button>
                  <p className="text-xs text-muted-foreground">Imagem horizontal recomendada (16:9)</p>
                </div>
              </div>
              </CardContent>
            )}
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
                {service.whatsappClicks !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    📱 {service.whatsappClicks} clique(s) no WhatsApp
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Service Edit Section */}
        {isVendorService && service && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Informações do Serviço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Nome do Serviço</Label>
                <Input
                  value={service.title}
                  onChange={async (e) => {
                    const newTitle = e.target.value;
                    try {
                      await updateDoc(doc(db, 'services', service.id), { title: newTitle });
                      setService({ ...service, title: newTitle });
                      toast({ title: "Nome atualizado!" });
                    } catch (error) {
                      console.error('Error updating title:', error);
                      toast({ title: "Erro ao atualizar", variant: "destructive" });
                    }
                  }}
                  placeholder="Nome do serviço"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Descrição</Label>
                <Textarea
                  value={service.description}
                  onChange={async (e) => {
                    const newDescription = e.target.value;
                    try {
                      await updateDoc(doc(db, 'services', service.id), { description: newDescription });
                      setService({ ...service, description: newDescription });
                      toast({ title: "Descrição atualizada!" });
                    } catch (error) {
                      console.error('Error updating description:', error);
                      toast({ title: "Erro ao atualizar", variant: "destructive" });
                    }
                  }}
                  placeholder="Descreva seu serviço..."
                  rows={4}
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Preço (ex: A partir de R$ 50,00)</Label>
                <Input
                  value={service.priceRange || ''}
                  onChange={async (e) => {
                    const newPriceRange = e.target.value;
                    try {
                      await updateDoc(doc(db, 'services', service.id), { priceRange: newPriceRange || null });
                      setService({ ...service, priceRange: newPriceRange || undefined });
                      toast({ title: "Preço atualizado!" });
                    } catch (error) {
                      console.error('Error updating priceRange:', error);
                      toast({ title: "Erro ao atualizar", variant: "destructive" });
                    }
                  }}
                  placeholder="A partir de R$ 50,00"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Products Section (for vendors) */}
        {isVendorProduct && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setIsProductsExpanded(!isProductsExpanded)}
                  className="flex-1 flex items-center justify-between hover:opacity-80 transition-opacity"
                >
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Produtos ({filteredProducts.length})
                  </CardTitle>
                  {isProductsExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                <Dialog open={isProductDialogOpen} onOpenChange={(open) => {
                  setIsProductDialogOpen(open);
                  if (!open) resetProductForm();
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="ml-2">
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4 max-h-[80vh] overflow-y-auto">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Nome *</label>
                      <Input 
                        value={productForm.name}
                        onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                        placeholder="Nome do produto"
                      />
                    </div>
                    {/* Tipo de Venda */}
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Tipo de Venda *</label>
                      <Select
                        value={productForm.saleType}
                        onValueChange={(value: 'unit' | 'weight' | 'value') => 
                          setProductForm({...productForm, saleType: value})
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unit">Por Unidade</SelectItem>
                          <SelectItem value="weight">Por Peso (Kg/G)</SelectItem>
                          <SelectItem value="value">Por Valor (R$)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Campos específicos por tipo */}
                    {productForm.saleType === 'unit' && (
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Rótulo da Unidade (opcional)</label>
                        <Input 
                          value={productForm.unitLabel}
                          onChange={(e) => setProductForm({...productForm, unitLabel: e.target.value})}
                          placeholder="Ex: unidade, pão, peça"
                        />
                      </div>
                    )}

                    {productForm.saleType === 'weight' && (
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Unidade de Peso</label>
                        <Select
                          value={productForm.weightUnit}
                          onValueChange={(value: 'kg' | 'g') => 
                            setProductForm({...productForm, weightUnit: value})
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kg">Quilograma (Kg)</SelectItem>
                            <SelectItem value="g">Grama (g)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {productForm.saleType === 'value' && (
                      <>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">Quantidade por R$ 1,00</label>
                          <Input 
                            type="number"
                            step="0.01"
                            value={productForm.valueQuantity}
                            onChange={(e) => setProductForm({...productForm, valueQuantity: e.target.value})}
                            placeholder="Ex: 5 (R$ 1 = 5 unidades)"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">Rótulo</label>
                          <Input 
                            value={productForm.valueLabel}
                            onChange={(e) => setProductForm({...productForm, valueLabel: e.target.value})}
                            placeholder="Ex: pães, unidades"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Preço {productForm.saleType === 'unit' ? 'por Unidade' : productForm.saleType === 'weight' ? `por ${productForm.weightUnit === 'kg' ? 'Kg' : '100g'}` : 'Base'} *</label>
                      <Input 
                        type="number"
                        step="0.01"
                        value={productForm.price}
                        onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                        placeholder="0.00"
                      />
                      {productForm.saleType === 'weight' && productForm.weightUnit === 'g' && (
                        <p className="text-xs text-muted-foreground mt-1">Preço por 100g</p>
                      )}
                    </div>

                    {/* Categoria com autocomplete */}
                    <div className="relative">
                      <label className="text-sm font-medium mb-1.5 block">Categoria</label>
                      <Input 
                        value={productForm.category}
                        onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                        onFocus={() => {
                          if (categorySuggestions.length > 0) {
                            setShowCategorySuggestions(true);
                          }
                        }}
                        placeholder="Ex: Pães, Bebidas"
                      />
                      {showCategorySuggestions && categorySuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {categorySuggestions.map((cat, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-secondary text-sm"
                              onClick={() => {
                                setProductForm({...productForm, category: cat});
                                setShowCategorySuggestions(false);
                              }}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Upload de Imagem */}
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Foto do Produto</label>
                      <div className="space-y-2">
                        {(productImagePreview || productForm.imageUrl) && (
                          <div className="h-32 rounded-lg bg-secondary overflow-hidden border-2 border-dashed border-muted-foreground/20">
                            <img 
                              src={productImagePreview || productForm.imageUrl} 
                              alt="Preview" 
                              className="h-full w-full object-cover" 
                            />
                          </div>
                        )}
                        <input
                          ref={productImageInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setProductImageFile(file);
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setProductImagePreview(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => productImageInputRef.current?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {productImagePreview || productForm.imageUrl ? 'Alterar Foto' : 'Adicionar Foto'}
                          </Button>
                          {(productImagePreview || productForm.imageUrl) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setProductImageFile(null);
                                setProductImagePreview('');
                                setProductForm({...productForm, imageUrl: ''});
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">Ou use URL da imagem abaixo</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1.5 block">URL da Imagem (alternativa)</label>
                      <Input 
                        value={productForm.imageUrl}
                        onChange={(e) => {
                          setProductForm({...productForm, imageUrl: e.target.value});
                          if (e.target.value) {
                            setProductImagePreview(e.target.value);
                          }
                        }}
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
            </CardHeader>
            {isProductsExpanded && (
              <CardContent className="space-y-4">
                {/* Product Search */}
                <div>
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

                {filteredProducts.length > 0 ? (
                  <div className="space-y-2">
                    {filteredProducts.map(product => (
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
              </CardContent>
            )}
          </Card>
        )}

        {/* Portfolio Section (for services) */}
        {isVendorService && service && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg">Portfólio</h2>
              <div>
                <input
                  ref={portfolioInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;
                    
                    try {
                      setUploadingPortfolio(true);
                      const uploadPromises = files.map(async (file) => {
                        const fileRef = ref(storage, `services/${service.id}/portfolio/${Date.now()}_${file.name}`);
                        await uploadBytes(fileRef, file);
                        return await getDownloadURL(fileRef);
                      });
                      
                      const newImageUrls = await Promise.all(uploadPromises);
                      const updatedPortfolioImages = [...(service.portfolioImages || []), ...newImageUrls];
                      
                      await updateDoc(doc(db, 'services', service.id), { 
                        portfolioImages: updatedPortfolioImages 
                      });
                      
                      setService({ ...service, portfolioImages: updatedPortfolioImages });
                      toast({ title: `${files.length} foto(s) adicionada(s) com sucesso!` });
                      
                      // Limpa o input para permitir adicionar as mesmas fotos novamente se necessário
                      if (portfolioInputRef.current) {
                        portfolioInputRef.current.value = '';
                      }
                    } catch (error) {
                      console.error('Error uploading portfolio images:', error);
                      toast({ 
                        title: "Erro ao fazer upload", 
                        description: "Não foi possível adicionar as fotos. Tente novamente.",
                        variant: "destructive" 
                      });
                    } finally {
                      setUploadingPortfolio(false);
                    }
                  }}
                />
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => portfolioInputRef.current?.click()}
                  disabled={uploadingPortfolio}
                >
                  <ImageIcon className="h-4 w-4 mr-1" />
                  {uploadingPortfolio ? 'Enviando...' : 'Adicionar Fotos'}
                </Button>
              </div>
            </div>
            
            {service.portfolioImages && service.portfolioImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {service.portfolioImages.map((image, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-secondary group">
                    <img src={image} alt={`Portfolio ${index + 1}`} className="h-full w-full object-cover" />
                    <button
                      onClick={async () => {
                        try {
                          const updatedImages = service.portfolioImages?.filter((_, i) => i !== index) || [];
                          await updateDoc(doc(db, 'services', service.id), { 
                            portfolioImages: updatedImages 
                          });
                          setService({ ...service, portfolioImages: updatedImages });
                          toast({ title: "Foto removida com sucesso!" });
                        } catch (error) {
                          console.error('Error removing portfolio image:', error);
                          toast({ 
                            title: "Erro ao remover foto", 
                            variant: "destructive" 
                          });
                        }
                      }}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
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

        {/* Posts/Anúncios Section */}
        {(isVendorProduct && store) || (isVendorService && service) ? (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setIsPostsExpanded(!isPostsExpanded)}
                  className="flex-1 flex items-center justify-between hover:opacity-80 transition-opacity"
                >
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Anúncios ({posts.length})
                  </CardTitle>
                  {isPostsExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                <Dialog open={isPostDialogOpen} onOpenChange={(open) => {
                  setIsPostDialogOpen(open);
                  if (!open) {
                    setEditingPost(null);
                    setPostForm({ title: '', content: '', imageUrl: '' });
                    setPostImagePreview('');
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="ml-2">
                      <Plus className="h-4 w-4 mr-1" />
                      Criar Anúncio
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingPost ? 'Editar Anúncio' : 'Novo Anúncio'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label className="text-sm font-medium mb-1.5 block">Título</Label>
                        <Input
                          value={postForm.title}
                          onChange={(e) => setPostForm({...postForm, title: e.target.value})}
                          placeholder="Título do anúncio"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium mb-1.5 block">Conteúdo</Label>
                        <Textarea
                          value={postForm.content}
                          onChange={(e) => setPostForm({...postForm, content: e.target.value})}
                          placeholder="Descreva sua oferta, promoção ou novidade..."
                          rows={4}
                        />
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium mb-1.5 block">Foto (opcional)</Label>
                        {(postImagePreview || postForm.imageUrl) && (
                          <div className="h-32 rounded-lg bg-secondary overflow-hidden border-2 border-dashed border-muted-foreground/20 mb-2">
                            <img 
                              src={postImagePreview || postForm.imageUrl} 
                              alt="Preview" 
                              className="h-full w-full object-cover" 
                            />
                          </div>
                        )}
                        <input
                          ref={postImageInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                setSaving(true);
                                const fileRef = ref(
                                  storage, 
                                  `${isVendorProduct ? 'stores' : 'services'}/${isVendorProduct ? store?.id : service?.id}/posts/${Date.now()}_${file.name}`
                                );
                                await uploadBytes(fileRef, file);
                                const url = await getDownloadURL(fileRef);
                                setPostForm({...postForm, imageUrl: url});
                                setPostImagePreview(url);
                                toast({ title: "Foto adicionada!" });
                              } catch (error) {
                                console.error('Error uploading image:', error);
                                toast({ title: "Erro ao fazer upload", variant: "destructive" });
                              } finally {
                                setSaving(false);
                              }
                            }
                          }}
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => postImageInputRef.current?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {postImagePreview || postForm.imageUrl ? 'Alterar Foto' : 'Adicionar Foto'}
                          </Button>
                          {(postImagePreview || postForm.imageUrl) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPostForm({...postForm, imageUrl: ''});
                                setPostImagePreview('');
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        className="w-full"
                        onClick={async () => {
                          if (!postForm.title || !postForm.content) {
                            toast({
                              title: "Campos obrigatórios",
                              description: "Preencha título e conteúdo.",
                              variant: "destructive"
                            });
                            return;
                          }
                          
                          try {
                            setSaving(true);
                            const postData: any = {
                              ownerId: user!.uid,
                              ownerType: isVendorProduct ? 'store' : 'service',
                              title: postForm.title,
                              content: postForm.content,
                              imageUrl: postForm.imageUrl || null,
                              isPromoted: false,
                              views: 0,
                              clicks: 0,
                              createdAt: serverTimestamp(),
                              updatedAt: serverTimestamp(),
                            };
                            
                            if (isVendorProduct && store) {
                              postData.storeId = store.id;
                            } else if (isVendorService && service) {
                              postData.serviceId = service.id;
                            }
                            
                            if (editingPost) {
                              await updateDoc(doc(db, 'posts', editingPost.id), {
                                ...postData,
                                createdAt: editingPost.createdAt,
                                updatedAt: serverTimestamp(),
                              });
                              setPosts(posts.map(p => p.id === editingPost.id ? { ...p, ...postData } : p));
                              toast({ title: "Anúncio atualizado!" });
                            } else {
                              const docRef = await addDoc(collection(db, 'posts'), postData);
                              const newPost = {
                                id: docRef.id,
                                ...postData,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                              };
                              setPosts([...posts, newPost]);
                              toast({ title: "Anúncio criado!" });
                            }
                            
                            setIsPostDialogOpen(false);
                            setPostForm({ title: '', content: '', imageUrl: '' });
                            setPostImagePreview('');
                            setEditingPost(null);
                          } catch (error) {
                            console.error('Error saving post:', error);
                            toast({ title: "Erro ao salvar anúncio", variant: "destructive" });
                          } finally {
                            setSaving(false);
                          }
                        }}
                        disabled={saving || !postForm.title || !postForm.content}
                      >
                        {saving ? 'Salvando...' : (editingPost ? 'Atualizar' : 'Criar Anúncio')}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            {isPostsExpanded && (
              <CardContent className="space-y-4">
                {posts.length > 0 ? (
                  <div className="space-y-3">
                    {posts.map(post => (
                      <Card key={post.id}>
                        <CardContent className="p-4">
                          {post.imageUrl && (
                            <div className="h-32 rounded-lg bg-secondary overflow-hidden mb-3">
                              <img src={post.imageUrl} alt={post.title} className="h-full w-full object-cover" />
                            </div>
                          )}
                          <h3 className="font-semibold mb-1">{post.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{post.content}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                            <span>👁️ {post.views || 0} visualizações</span>
                            <span>👆 {post.clicks || 0} cliques</span>
                            {post.isPromoted && (
                              <span className="text-primary font-medium">⭐ Impulsionado</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingPost(post);
                                setPostForm({
                                  title: post.title,
                                  content: post.content,
                                  imageUrl: post.imageUrl || ''
                                });
                                setPostImagePreview(post.imageUrl || '');
                                setIsPostDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive"
                              onClick={async () => {
                                if (confirm('Tem certeza que deseja excluir este anúncio?')) {
                                  try {
                                    await deleteDoc(doc(db, 'posts', post.id));
                                    setPosts(posts.filter(p => p.id !== post.id));
                                    toast({ title: "Anúncio excluído!" });
                                  } catch (error) {
                                    console.error('Error deleting post:', error);
                                    toast({ title: "Erro ao excluir", variant: "destructive" });
                                  }
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Excluir
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum anúncio criado</p>
                      <p className="text-sm">Crie anúncios para promover suas ofertas!</p>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            )}
          </Card>
        ) : null}

        {/* Orders Section (for vendors) */}
        {isVendorProduct && store && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg">Pedidos ({filteredOrders.length})</h2>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(parseISO(e.target.value));
                    } else {
                      setSelectedDate(null);
                    }
                  }}
                  className="w-auto"
                />
                {selectedDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDate(null)}
                  >
                    Hoje
                  </Button>
                )}
              </div>
            </div>
            
            {filteredOrders.length > 0 ? (
              <div className="space-y-3">
                {filteredOrders.map(order => {
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

                  // Função auxiliar para formatar o texto do item do pedido
                  const formatOrderItem = (item: any) => {
                    let displayText = '';
                    let itemPrice = 0;
                    
                    if (item.customQuantity) {
                      if (item.customQuantity.type === 'weight') {
                        // Para produtos por peso: mostrar peso x produto
                        const weightLabel = item.customQuantity.displayLabel || 
                          (item.weightUnit === 'kg' 
                            ? `${item.customQuantity.amount / 1000}kg` 
                            : `${item.customQuantity.amount}g`);
                        displayText = `${weightLabel} x ${item.productName}`;
                        
                        // Calcular preço
                        if (item.weightUnit === 'g') {
                          itemPrice = item.price * (item.customQuantity.amount / 100) * item.quantity;
                        } else {
                          const weightInKg = item.customQuantity.amount / 1000;
                          itemPrice = item.price * weightInKg * item.quantity;
                        }
                      } else if (item.customQuantity.type === 'value') {
                        // Para produtos por valor: calcular quantidade de unidades
                        const valueAmount = item.customQuantity.amount;
                        const unitsPerReal = item.valueQuantity || 1;
                        const totalUnits = Math.round(valueAmount * unitsPerReal * item.quantity);
                        displayText = `${totalUnits} x ${item.productName}`;
                        
                        // O valor que o cliente escolheu é o preço que ele vai pagar
                        itemPrice = valueAmount * item.quantity;
                      }
                    } else {
                      // Produtos por unidade
                      displayText = `${item.quantity}x ${item.productName}`;
                      itemPrice = item.price * item.quantity;
                    }
                    
                    return { displayText, itemPrice };
                  };

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

                      // Envia mensagem via WhatsApp para o cliente quando confirmado ou saiu para entrega
                      if (newStatus === 'confirmed' || newStatus === 'out_for_delivery') {
                        try {
                          // Busca dados do cliente
                          const userDoc = await getDoc(doc(db, 'users', order.userId));
                          if (userDoc.exists()) {
                            const userData = userDoc.data();
                            const customerPhone = userData.phone;
                            const customerName = userData.name || 'Cliente';

                            if (customerPhone) {
                              let message = '';
                              if (newStatus === 'confirmed') {
                                message = generateOrderConfirmationWhatsApp(order, customerName);
                              } else if (newStatus === 'out_for_delivery') {
                                message = generateOutForDeliveryWhatsApp(order, customerName);
                              }

                              const whatsappUrl = generateWhatsAppUrl(customerPhone, message);
                              // Abre WhatsApp em nova aba
                              window.open(whatsappUrl, '_blank');
                            } else {
                              console.warn('⚠️ Cliente não tem número de telefone cadastrado');
                            }
                          }
                        } catch (whatsappError) {
                          console.error('❌ Erro ao enviar WhatsApp:', whatsappError);
                          // Não bloqueia a atualização do status se o WhatsApp falhar
                        }
                      }

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
                          {order.items.map((item, idx) => {
                            const { displayText, itemPrice } = formatOrderItem(item);
                            return (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground flex-1 truncate">{displayText}</span>
                                <span className="font-medium">R$ {itemPrice.toFixed(2)}</span>
                              </div>
                            );
                          })}
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
