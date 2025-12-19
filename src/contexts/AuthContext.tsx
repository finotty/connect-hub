import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { User, UserRole } from '@/types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, phone: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setUserRole: (role: UserRole) => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      
      if (fbUser) {
        const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as User);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, name: string, phone: string) => {
    if (!phone || !phone.trim()) {
      throw new Error('Telefone é obrigatório');
    }
    
    const { user: fbUser } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Remove formatação do telefone para armazenar apenas números
    const cleanPhone = phone.replace(/\D/g, '');
    
    const userData: User = {
      uid: fbUser.uid,
      name,
      email: fbUser.email!,
      role: 'customer',
      phone: cleanPhone,
      createdAt: new Date()
    };

    await setDoc(doc(db, 'users', fbUser.uid), {
      ...userData,
      createdAt: serverTimestamp()
    });

    setUser(userData);
  };

  const signInWithGoogle = async () => {
    const { user: fbUser } = await signInWithPopup(auth, googleProvider);
    
    const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
    
    if (!userDoc.exists()) {
      const userData: User = {
        uid: fbUser.uid,
        name: fbUser.displayName || 'Usuário',
        email: fbUser.email!,
        role: 'customer',
        avatarUrl: fbUser.photoURL || undefined,
        createdAt: new Date()
      };

      await setDoc(doc(db, 'users', fbUser.uid), {
        ...userData,
        createdAt: serverTimestamp()
      });

      setUser(userData);
    } else {
      setUser(userDoc.data() as User);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const setUserRole = async (role: UserRole) => {
    if (!firebaseUser) return;
    
    await setDoc(doc(db, 'users', firebaseUser.uid), { role }, { merge: true });
    setUser(prev => prev ? { ...prev, role } : null);
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (!firebaseUser) return;
    
    await setDoc(doc(db, 'users', firebaseUser.uid), data, { merge: true });
    setUser(prev => prev ? { ...prev, ...data } : null);
  };

  return (
    <AuthContext.Provider value={{
      firebaseUser,
      user,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      logout,
      setUserRole,
      updateUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
