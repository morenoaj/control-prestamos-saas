// src/context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Usuario, Empresa, UsuarioEmpresa } from '@/types/database';
import { AuthUser, UserSession } from '@/types/auth';

interface AuthContextType {
  user: AuthUser | null;
  usuario: Usuario | null;
  empresaActual: Empresa | null;
  empresas: Empresa[];
  rolActual: UsuarioEmpresa['rol'] | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nombre: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  cambiarEmpresa: (empresaId: string) => Promise<void>;
  actualizarPerfil: (data: Partial<Usuario>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [empresaActual, setEmpresaActual] = useState<Empresa | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [rolActual, setRolActual] = useState<UsuarioEmpresa['rol'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const authUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified
        };
        
        setUser(authUser);
        await cargarDatosUsuario(firebaseUser.uid);
      } else {
        setUser(null);
        setUsuario(null);
        setEmpresaActual(null);
        setEmpresas([]);
        setRolActual(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const cargarDatosUsuario = async (uid: string) => {
    try {
      // Cargar datos del usuario
      const usuarioDoc = await getDoc(doc(db, 'usuarios', uid));
      
      if (usuarioDoc.exists()) {
        const userData = { id: usuarioDoc.id, ...usuarioDoc.data() } as Usuario;
        setUsuario(userData);

        // Cargar empresas del usuario
        const empresasIds = userData.empresas.map(e => e.empresaId);
        if (empresasIds.length > 0) {
          const empresasQuery = query(
            collection(db, 'empresas'),
            where('__name__', 'in', empresasIds)
          );
          const empresasSnapshot = await getDocs(empresasQuery);
          const empresasData = empresasSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Empresa[];

          setEmpresas(empresasData);

          // Establecer empresa actual (la primera activa o la primera disponible)
          const empresaActiva = empresasData.find(e => e.estado === 'activa') || empresasData[0];
          if (empresaActiva) {
            setEmpresaActual(empresaActiva);
            
            // Establecer rol actual
            const rolEmpresa = userData.empresas.find(e => e.empresaId === empresaActiva.id);
            setRolActual(rolEmpresa?.rol || null);

            // Guardar en localStorage para persistencia
            localStorage.setItem('empresaActual', empresaActiva.id);
          }
        }
      }
    } catch (error) {
      console.error('Error cargando datos del usuario:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, nombre: string) => {
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Actualizar perfil en Firebase Auth
    await updateProfile(firebaseUser, {
      displayName: nombre
    });

    // Crear documento de usuario en Firestore
    const nuevoUsuario: Omit<Usuario, 'id'> = {
      email,
      nombre,
      fechaRegistro: new Date() as any,
      empresas: [],
      configuracion: {
        idioma: 'es',
        tema: 'light',
        notificaciones: true
      }
    };

    await setDoc(doc(db, 'usuarios', firebaseUser.uid), nuevoUsuario);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const { user: firebaseUser } = await signInWithPopup(auth, provider);

    // Verificar si el usuario ya existe en Firestore
    const usuarioDoc = await getDoc(doc(db, 'usuarios', firebaseUser.uid));
    
    if (!usuarioDoc.exists()) {
      // Crear nuevo usuario si no existe
      const nuevoUsuario: Omit<Usuario, 'id'> = {
        email: firebaseUser.email || '',
        nombre: firebaseUser.displayName || '',
        fechaRegistro: new Date() as any,
        empresas: [],
        configuracion: {
          idioma: 'es',
          tema: 'light',
          notificaciones: true
        }
      };

      await setDoc(doc(db, 'usuarios', firebaseUser.uid), nuevoUsuario);
    }
  };

  const logout = async () => {
    localStorage.removeItem('empresaActual');
    await signOut(auth);
  };

  const cambiarEmpresa = async (empresaId: string) => {
    const empresa = empresas.find(e => e.id === empresaId);
    if (empresa && usuario) {
      setEmpresaActual(empresa);
      
      // Actualizar rol
      const rolEmpresa = usuario.empresas.find(e => e.empresaId === empresaId);
      setRolActual(rolEmpresa?.rol || null);
      
      // Persistir en localStorage
      localStorage.setItem('empresaActual', empresaId);
    }
  };

  const actualizarPerfil = async (data: Partial<Usuario>) => {
    if (!user || !usuario) return;

    const datosActualizados = { ...usuario, ...data };
    await setDoc(doc(db, 'usuarios', user.uid), datosActualizados);
    setUsuario(datosActualizados);

    // Actualizar Firebase Auth si es necesario
    if (data.nombre && auth.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName: data.nombre
      });
    }
  };

  const value = {
    user,
    usuario,
    empresaActual,
    empresas,
    rolActual,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
    cambiarEmpresa,
    actualizarPerfil
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}