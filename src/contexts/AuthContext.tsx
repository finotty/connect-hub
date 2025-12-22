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
          let userData = userDoc.data() as User;
          
          // Se o email for admin@adm.com, garantir que o role seja 'admin'
          if (fbUser.email === 'admin@adm.com' && userData.role !== 'admin') {
            await setDoc(doc(db, 'users', fbUser.uid), { role: 'admin' }, { merge: true });
            userData = { ...userData, role: 'admin' };
          }
          
          setUser(userData);
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
    const { user: fbUser } = await signInWithEmailAndPassword(auth, email, password);

    const userRef = doc(db, 'users', fbUser.uid);
    const userDoc = await getDoc(userRef);
    const isAdminEmail = fbUser.email === 'admin@adm.com';

    if (!userDoc.exists()) {
      // Se não existir documento do usuário, criar um com role adequado
      const newUser: User = {
        uid: fbUser.uid,
        name: fbUser.displayName || (isAdminEmail ? 'Administrador' : 'Usuário'),
        email: fbUser.email!,
        role: isAdminEmail ? 'admin' : 'customer',
        // Começa sem créditos de impulsionamento
        promoCredits: 0,
        createdAt: new Date()
      };

      await setDoc(userRef, {
        ...newUser,
        createdAt: serverTimestamp()
      }, { merge: true });

      setUser(newUser);
      return;
    }

    let userData = userDoc.data() as User;

    // Se o email for admin@adm.com, garantir que o role seja 'admin'
    if (isAdminEmail && userData.role !== 'admin') {
      await setDoc(userRef, { role: 'admin' }, { merge: true });
      userData = { ...userData, role: 'admin' };
    }

    setUser(userData);
  };

  const signUp = async (email: string, password: string, name: string, phone: string) => {
    if (!phone || !phone.trim()) {
      throw new Error('Telefone é obrigatório');
    }
    
    const { user: fbUser } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Remove formatação do telefone para armazenar apenas números
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Determinar o role inicial baseado no email
    const initialRole = email === 'admin@adm.com' ? 'admin' : 'customer';
    
    const userData: User = {
      uid: fbUser.uid,
      name,
      email: fbUser.email!,
      role: initialRole,
      phone: cleanPhone,
      promoCredits: 0,
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
    
    // Determinar o role inicial baseado no email
    const initialRole = fbUser.email === 'admin@adm.com' ? 'admin' : 'customer';
    
    if (!userDoc.exists()) {
      const userData: User = {
        uid: fbUser.uid,
        name: fbUser.displayName || 'Usuário',
        email: fbUser.email!,
        role: initialRole,
        avatarUrl: fbUser.photoURL || undefined,
        promoCredits: 0,
        createdAt: new Date()
      };

      await setDoc(doc(db, 'users', fbUser.uid), {
        ...userData,
        createdAt: serverTimestamp()
      });

      setUser(userData);
    } else {
      let userData = userDoc.data() as User;
      
      // Se o email for admin@adm.com, garantir que o role seja 'admin'
      if (fbUser.email === 'admin@adm.com' && userData.role !== 'admin') {
        await setDoc(doc(db, 'users', fbUser.uid), { role: 'admin' }, { merge: true });
        userData = { ...userData, role: 'admin' };
      }
      
      setUser(userData);
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
