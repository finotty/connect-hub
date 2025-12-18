import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, query, where, addDoc, updateDoc, doc, onSnapshot, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order, OrderStatus } from '@/types';
import { useAuth } from './AuthContext';

interface OrdersContextType {
  orders: Order[];
  loading: boolean;
  createOrder: (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  getOrderById: (orderId: string) => Order | undefined;
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🛒 OrdersContext useEffect triggered, user:', user?.uid || 'none', 'role:', user?.role);
    
    if (!user) {
      console.log('⚠️ No user, clearing orders');
      setOrders([]);
      setLoading(false);
      return;
    }

    // Função auxiliar para configurar o listener de pedidos
    function setupOrdersListener(ordersQuery: any) {

      const unsubscribe = onSnapshot(
        ordersQuery,
        (snapshot) => {
          console.log('📦 Snapshot received:', snapshot.docs.length, 'orders');
          
          const ordersData = snapshot.docs.map(doc => {
            const data = doc.data();
            
            // Converte serverTimestamp (Timestamp do Firestore) para Date
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
            
            console.log('📋 Order:', order.id, order.storeName, 'status:', order.status, 'createdAt:', createdAt);
            
            return order;
          });
          
          // Ordena por data (mais recente primeiro)
          ordersData.sort((a, b) => {
            const timeA = a.createdAt.getTime();
            const timeB = b.createdAt.getTime();
            return timeB - timeA;
          });
          
          console.log('✅ Orders loaded:', ordersData.length, 'total');
          setOrders(ordersData);
          setLoading(false);
        },
        (error) => {
          console.error('❌ Error fetching orders:', error);
          setLoading(false);
        }
      );

      return unsubscribe;
    }

    let unsubscribe: (() => void) | undefined;

    // Se for vendedor de produtos, busca pedidos por storeId
    if (user.role === 'vendor_product') {
      console.log('📦 Vendor detected, fetching store first...');
      
      // Busca a loja do vendedor
      const storesQuery = query(
        collection(db, 'stores'),
        where('ownerId', '==', user.uid)
      );
      
      getDocs(storesQuery).then(storesSnapshot => {
        if (storesSnapshot.empty) {
          console.log('⚠️ No store found for vendor');
          setOrders([]);
          setLoading(false);
          return;
        }
        
        const storeData = storesSnapshot.docs[0];
        const storeId = storeData.id;
        console.log('✅ Store found:', storeId, storeData.data().name);
        console.log('📡 Setting up orders listener for store:', storeId);

        // Escuta pedidos da loja em tempo real
        const ordersQuery = query(
          collection(db, 'orders'),
          where('storeId', '==', storeId)
        );
        
        unsubscribe = setupOrdersListener(ordersQuery);
      }).catch(error => {
        console.error('❌ Error fetching store:', error);
        setOrders([]);
        setLoading(false);
      });
      
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }

    // Para clientes, busca pedidos por userId
    console.log('📡 Setting up orders listener for user:', user.uid);
    const ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid)
    );
    
    unsubscribe = setupOrdersListener(ordersQuery);
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const createOrder = useCallback(async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    console.log('📦 createOrder called in OrdersContext');
    
    if (!user) {
      console.error('❌ No user in createOrder');
      throw new Error('User must be logged in');
    }

    try {
      const orderDoc: any = {
        userId: orderData.userId,
        storeId: orderData.storeId,
        storeName: orderData.storeName,
        storeWhatsapp: orderData.storeWhatsapp,
        items: orderData.items,
        total: orderData.total,
        address: orderData.address,
        status: orderData.status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log('🛒 Creating order in Firestore:', {
        userId: orderData.userId,
        storeId: orderData.storeId,
        storeName: orderData.storeName,
        total: orderData.total,
        itemsCount: orderData.items.length,
        orderDocKeys: Object.keys(orderDoc),
        orderDocStoreId: orderDoc.storeId,
      });
      
      // Verifica se o storeId está correto
      if (!orderDoc.storeId) {
        console.error('❌ ERROR: storeId is missing in orderDoc!');
      }
      if (typeof orderDoc.storeId !== 'string') {
        console.error('❌ ERROR: storeId is not a string!', typeof orderDoc.storeId, orderDoc.storeId);
      }

      const docRef = await addDoc(collection(db, 'orders'), orderDoc);
      console.log('✅ Order created in Firestore:', docRef.id);
      console.log('📋 Order document:', {
        id: docRef.id,
        userId: orderData.userId,
        storeId: orderData.storeId,
      });
      
      // Verifica se o pedido foi salvo corretamente
      setTimeout(async () => {
        const { getDoc } = await import('firebase/firestore');
        const savedDoc = await getDoc(docRef);
        if (savedDoc.exists()) {
          console.log('✅ Order verified in Firestore:', savedDoc.data());
        } else {
          console.error('❌ Order not found in Firestore after creation!');
        }
      }, 1000);
      
      return docRef.id;
    } catch (error: any) {
      console.error('❌ Error creating order:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      throw error;
    }
  }, [user]);

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    await updateDoc(doc(db, 'orders', orderId), {
      status,
      updatedAt: serverTimestamp(),
    });
  }, []);

  const getOrderById = useCallback((orderId: string) => {
    return orders.find(order => order.id === orderId);
  }, [orders]);

  return (
    <OrdersContext.Provider value={{
      orders,
      loading,
      createOrder,
      updateOrderStatus,
      getOrderById,
    }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrdersContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrdersProvider');
  }
  return context;
}

