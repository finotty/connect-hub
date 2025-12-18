import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Favorite, Store, Service } from '@/types';
import { useAuth } from './AuthContext';

interface FavoritesContextType {
  favorites: Favorite[];
  favoriteStores: Store[];
  favoriteServices: Service[];
  loading: boolean;
  isFavorite: (itemId: string, itemType: 'store' | 'service') => boolean;
  toggleFavorite: (itemId: string, itemType: 'store' | 'service', itemData?: Store | Service) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favoriteStores, setFavoriteStores] = useState<Store[]>([]);
  const [favoriteServices, setFavoriteServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setFavorites([]);
      setFavoriteStores([]);
      setFavoriteServices([]);
      setLoading(false);
      return;
    }

    // Escuta favoritos do usuário em tempo real
    const favoritesQuery = query(
      collection(db, 'favorites'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(favoritesQuery, async (snapshot) => {
      const favoritesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Favorite[];

      setFavorites(favoritesData);

      // Busca dados das lojas e serviços favoritos
      const storeIds = favoritesData.filter(f => f.itemType === 'store').map(f => f.itemId);
      const serviceIds = favoritesData.filter(f => f.itemType === 'service').map(f => f.itemId);

      if (storeIds.length > 0) {
        const storesPromises = storeIds.map(async (storeId) => {
          try {
            const storeDoc = await getDoc(doc(db, 'stores', storeId));
            if (storeDoc.exists()) {
              return { id: storeDoc.id, ...storeDoc.data() } as Store;
            }
          } catch (error) {
            console.error(`Error fetching store ${storeId}:`, error);
          }
          return null;
        });
        const stores = (await Promise.all(storesPromises)).filter(Boolean) as Store[];
        setFavoriteStores(stores);
      } else {
        setFavoriteStores([]);
      }

      if (serviceIds.length > 0) {
        const servicesPromises = serviceIds.map(async (serviceId) => {
          try {
            const serviceDoc = await getDoc(doc(db, 'services', serviceId));
            if (serviceDoc.exists()) {
              return { id: serviceDoc.id, ...serviceDoc.data() } as Service;
            }
          } catch (error) {
            console.error(`Error fetching service ${serviceId}:`, error);
          }
          return null;
        });
        const services = (await Promise.all(servicesPromises)).filter(Boolean) as Service[];
        setFavoriteServices(services);
      } else {
        setFavoriteServices([]);
      }

      setLoading(false);
    }, (error) => {
      console.error('Error fetching favorites:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const isFavorite = useCallback((itemId: string, itemType: 'store' | 'service') => {
    return favorites.some(fav => fav.itemId === itemId && fav.itemType === itemType);
  }, [favorites]);

  const toggleFavorite = useCallback(async (itemId: string, itemType: 'store' | 'service') => {
    if (!user) throw new Error('User must be logged in');

    const existingFavorite = favorites.find(fav => fav.itemId === itemId && fav.itemType === itemType);

    if (existingFavorite) {
      // Remove favorito
      await deleteDoc(doc(db, 'favorites', existingFavorite.id));
    } else {
      // Adiciona favorito
      await addDoc(collection(db, 'favorites'), {
        userId: user.uid,
        itemId,
        itemType,
        createdAt: new Date(),
      });
    }
  }, [user, favorites]);

  return (
    <FavoritesContext.Provider value={{
      favorites,
      favoriteStores,
      favoriteServices,
      loading,
      isFavorite,
      toggleFavorite,
    }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}

