import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, query, where, addDoc, updateDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Notification, NotificationType } from '@/types';
import { useAuth } from './AuthContext';

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  createNotification: (userId: string, type: NotificationType, title: string, message: string, orderId?: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔔 NotificationsContext useEffect triggered, user:', user?.uid || 'none');
    
    if (!user) {
      console.log('⚠️ No user, clearing notifications');
      setNotifications([]);
      setLoading(false);
      return;
    }

    console.log('📡 Setting up notifications listener for user:', user.uid);

    // Escuta notificações do usuário em tempo real
    // Usamos apenas where para evitar problemas de índice composto
    // Ordenamos manualmente no código
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        console.log('📬 Snapshot received:', snapshot.docs.length, 'notifications');
        
        const notificationsData = snapshot.docs.map(doc => {
          const data = doc.data();
          
          // Converte serverTimestamp (Timestamp do Firestore) para Date
          let createdAt: Date;
          if (data.createdAt?.toDate) {
            // É um Timestamp do Firestore
            createdAt = data.createdAt.toDate();
          } else if (data.createdAt instanceof Date) {
            // Já é uma Date
            createdAt = data.createdAt;
          } else if (data.createdAt) {
            // Tenta converter de string ou número
            createdAt = new Date(data.createdAt);
          } else {
            // Fallback para data atual
            createdAt = new Date();
          }
          
          const notification: Notification = {
            id: doc.id,
            userId: data.userId,
            type: data.type,
            title: data.title,
            message: data.message,
            orderId: data.orderId || undefined,
            read: data.read || false,
            createdAt,
          };
          
          console.log('📋 Notification:', notification.id, notification.title, 'createdAt:', createdAt);
          
          return notification;
        });
        
        // Ordena por data (mais recente primeiro)
        notificationsData.sort((a, b) => {
          const timeA = a.createdAt.getTime();
          const timeB = b.createdAt.getTime();
          return timeB - timeA;
        });
        
        console.log('✅ Notifications loaded:', notificationsData.length, 'total');
        setNotifications(notificationsData);
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error fetching notifications:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = useCallback(async (notificationId: string) => {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    
    const unreadNotifications = notifications.filter(n => !n.read);
    const updates = unreadNotifications.map(n => 
      updateDoc(doc(db, 'notifications', n.id), { read: true })
    );
    await Promise.all(updates);
  }, [user, notifications]);

  const createNotification = useCallback(async (
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    orderId?: string
  ) => {
    try {
      const notificationData: any = {
        userId,
        type,
        title,
        message,
        read: false,
        createdAt: serverTimestamp(),
      };
      
      if (orderId) {
        notificationData.orderId = orderId;
      }
      
      const notificationRef = await addDoc(collection(db, 'notifications'), notificationData);
      console.log('✅ Notification created:', {
        id: notificationRef.id,
        userId,
        type,
        title,
        orderId: orderId || 'none'
      });
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
  }, []);

  return (
    <NotificationsContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      markAsRead,
      markAllAsRead,
      createNotification,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}

