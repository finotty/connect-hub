import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Address } from '@/types';
import { useAuth } from './AuthContext';

interface AddressesContextType {
  addresses: Address[];
  loading: boolean;
  defaultAddress: Address | null;
  addAddress: (addressData: Omit<Address, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateAddress: (addressId: string, addressData: Partial<Address>) => Promise<void>;
  deleteAddress: (addressId: string) => Promise<void>;
  setDefaultAddress: (addressId: string) => Promise<void>;
}

const AddressesContext = createContext<AddressesContextType | undefined>(undefined);

export function AddressesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAddresses([]);
      setLoading(false);
      return;
    }

    // Escuta endereços do usuário em tempo real
    const addressesQuery = query(
      collection(db, 'addresses'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(addressesQuery, (snapshot) => {
      const addressesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Address[];
      setAddresses(addressesData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching addresses:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const defaultAddress = addresses.find(addr => addr.isDefault) || null;

  const addAddress = useCallback(async (addressData: Omit<Address, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) throw new Error('User must be logged in');

    // Se for o primeiro endereço ou se marcar como padrão, desmarca outros
    if (addressData.isDefault || addresses.length === 0) {
      const updates = addresses
        .filter(addr => addr.isDefault)
        .map(addr => updateDoc(doc(db, 'addresses', addr.id), { isDefault: false }));
      await Promise.all(updates);
    }

    await addDoc(collection(db, 'addresses'), {
      ...addressData,
      userId: user.uid,
      createdAt: serverTimestamp(),
    });
  }, [user, addresses]);

  const updateAddress = useCallback(async (addressId: string, addressData: Partial<Address>) => {
    await updateDoc(doc(db, 'addresses', addressId), addressData);
  }, []);

  const deleteAddress = useCallback(async (addressId: string) => {
    await deleteDoc(doc(db, 'addresses', addressId));
  }, []);

  const setDefaultAddress = useCallback(async (addressId: string) => {
    // Desmarca todos os outros como padrão
    const updates = addresses
      .filter(addr => addr.isDefault && addr.id !== addressId)
      .map(addr => updateDoc(doc(db, 'addresses', addr.id), { isDefault: false }));
    
    await Promise.all(updates);
    await updateDoc(doc(db, 'addresses', addressId), { isDefault: true });
  }, [addresses]);

  return (
    <AddressesContext.Provider value={{
      addresses,
      loading,
      defaultAddress,
      addAddress,
      updateAddress,
      deleteAddress,
      setDefaultAddress,
    }}>
      {children}
    </AddressesContext.Provider>
  );
}

export function useAddresses() {
  const context = useContext(AddressesContext);
  if (context === undefined) {
    throw new Error('useAddresses must be used within an AddressesProvider');
  }
  return context;
}

