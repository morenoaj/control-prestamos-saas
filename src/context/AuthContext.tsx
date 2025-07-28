// src/context/AuthContext.tsx - VERSIÓN SIMPLIFICADA SIN LOOPS
'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Usuario, Empresa, UsuarioEmpresa } from '@/types/database';
import { AuthUser } from '@/types/auth';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: AuthUser | null;
  usuario: Usuario | null;
  empresaActual: Empresa | null;
  empresas: Empresa[];
  rolActual: UsuarioEmpresa['rol'] | null;
  loading: boolean;
  initialized: boolean; // Nuevo estado para saber cuándo está listo
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nombre: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  cambiarEmpresa: (empresaId: string) => Promise<void>;
  actualizarPerfil: (data: Partial<Usuario>) => Promise<void>;
  reloadUser: () => Promise<void>;
  necesitaOnboarding: () => boolean;
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
  const [initialized, setInitialized] = useState(false);
  
  // Ref para evitar múltiples ejecuciones
  const authSetup = useRef(false);

  // Función para verificar onboarding - ESTABLE
  const necesitaOnboarding = useCallback(() => {
    if (!user || !usuario) return false;
    return !usuario.empresas || usuario.empresas.length === 0;
  }, [user?.uid, usuario?.empresas?.length]); // Dependencies específicas

  // ÚNICO listener de auth - se ejecuta solo una vez
  useEffect(() => {
    if (authSetup.current) return;
    
    console.log('🔄 Configurando auth listener...');
    authSetup.current = true;
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔄 Auth state changed:', !!firebaseUser);
      
      try {
        if (firebaseUser) {
          const authUser: AuthUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified
          };
          
          setUser(authUser);
          await cargarDatosUsuario(firebaseUser);
        } else {
          limpiarEstado();
        }
      } catch (error) {
        console.error('❌ Error en auth state:', error);
        limpiarEstado();
      } finally {
        setLoading(false);
        setInitialized(true);
        console.log('✅ Auth inicializado completamente');
      }
    });

    return () => {
      unsubscribe();
      authSetup.current = false;
    };
  }, []);

  const limpiarEstado = useCallback(() => {
    setUser(null);
    setUsuario(null);
    setEmpresaActual(null);
    setEmpresas([]);
    setRolActual(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('empresaActual');
    }
  }, []);

  const cargarDatosUsuario = async (firebaseUser: User) => {
    try {
      console.log('📂 Cargando datos usuario:', firebaseUser.uid);
      
      const usuarioDoc = await getDoc(doc(db, 'usuarios', firebaseUser.uid));
      
      if (usuarioDoc.exists()) {
        const userData = { id: usuarioDoc.id, ...usuarioDoc.data() } as Usuario;
        console.log('✅ Usuario encontrado:', {
          id: userData.id,
          empresas: userData.empresas?.length || 0
        });
        
        setUsuario(userData);
        
        if (userData.empresas && userData.empresas.length > 0) {
          await cargarEmpresasUsuario(userData);
        } else {
          console.log('⚠️ Usuario sin empresas');
          setEmpresas([]);
          setEmpresaActual(null);
        }
      } else {
        console.log('📝 Creando usuario nuevo...');
        await crearUsuarioEnFirestore(firebaseUser);
      }
    } catch (error) {
      console.error('❌ Error cargando usuario:', error);
      await crearUsuarioEnFirestore(firebaseUser);
    }
  };

  const crearUsuarioEnFirestore = async (firebaseUser: User) => {
    try {
      const nuevoUsuario: Omit<Usuario, 'id'> = {
        email: firebaseUser.email || '',
        nombre: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
        fechaRegistro: serverTimestamp() as any,
        empresas: [], // Array vacío = necesita onboarding
        configuracion: {
          idioma: 'es',
          tema: 'light',
          notificaciones: true
        }
      };

      await setDoc(doc(db, 'usuarios', firebaseUser.uid), nuevoUsuario);
      console.log('✅ Usuario creado en Firestore');
      
      setUsuario({ id: firebaseUser.uid, ...nuevoUsuario });
      setEmpresas([]);
      setEmpresaActual(null);
    } catch (error) {
      console.error('❌ Error creando usuario:', error);
    }
  };

  const cargarEmpresasUsuario = async (userData: Usuario) => {
    try {
      if (!userData.empresas || userData.empresas.length === 0) {
        setEmpresas([]);
        setEmpresaActual(null);
        return;
      }

      console.log('🏢 Cargando empresas...', userData.empresas.length);
      
      const empresasIds = userData.empresas.map(e => e.empresaId);
      const empresasData: Empresa[] = [];
      
      // Cargar empresas
      const empresasQuery = query(
        collection(db, 'empresas'),
        where('__name__', 'in', empresasIds.slice(0, 10)) // Máximo 10
      );
      
      const empresasSnapshot = await getDocs(empresasQuery);
      empresasSnapshot.docs.forEach(doc => {
        empresasData.push({ id: doc.id, ...doc.data() } as Empresa);
      });

      console.log('✅ Empresas cargadas:', empresasData.length);
      setEmpresas(empresasData);

      // Establecer empresa actual
      let empresaActiva = empresasData[0]; // Por defecto la primera
      
      // Intentar desde localStorage
      if (typeof window !== 'undefined') {
        const empresaGuardada = localStorage.getItem('empresaActual');
        if (empresaGuardada) {
          const empresaEncontrada = empresasData.find(e => e.id === empresaGuardada);
          if (empresaEncontrada) empresaActiva = empresaEncontrada;
        }
      }

      if (empresaActiva) {
        setEmpresaActual(empresaActiva);
        const rolEmpresa = userData.empresas.find(e => e.empresaId === empresaActiva!.id);
        setRolActual(rolEmpresa?.rol || null);
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('empresaActual', empresaActiva.id);
        }
        
        console.log('✅ Empresa actual:', empresaActiva.nombre);
      }
    } catch (error) {
      console.error('❌ Error cargando empresas:', error);
      setEmpresas([]);
      setEmpresaActual(null);
    }
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, nombre: string) => {
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
    
    await updateProfile(firebaseUser, {
      displayName: nombre
    });

    await sendEmailVerification(firebaseUser);
    
    toast({
      title: "Cuenta creada",
      description: "Te hemos enviado un email de verificación",
    });
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('empresaActual');
    }
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
    toast({
      title: "Email enviado",
      description: "Te hemos enviado un enlace para restablecer tu contraseña",
    });
  };

  const cambiarEmpresa = useCallback(async (empresaId: string) => {
    const empresa = empresas.find(e => e.id === empresaId);
    if (empresa && usuario) {
      setEmpresaActual(empresa);
      const rolEmpresa = usuario.empresas.find(e => e.empresaId === empresaId);
      setRolActual(rolEmpresa?.rol || null);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('empresaActual', empresaId);
      }
    }
  }, [empresas, usuario]);

  const actualizarPerfil = useCallback(async (data: Partial<Usuario>) => {
    if (!user || !usuario) return;

    const datosActualizados = { ...usuario, ...data };
    await setDoc(doc(db, 'usuarios', user.uid), datosActualizados);
    setUsuario(datosActualizados);

    if (data.nombre && auth.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName: data.nombre
      });
    }

    toast({
      title: "Perfil actualizado",
      description: "Tus datos han sido actualizados correctamente",
    });
  }, [user, usuario]);

  const reloadUser = useCallback(async () => {
    if (user && auth.currentUser) {
      await cargarDatosUsuario(auth.currentUser);
    }
  }, [user]);

  const value = {
    user,
    usuario,
    empresaActual,
    empresas,
    rolActual,
    loading,
    initialized, // Nuevo
    signIn,
    signUp,
    signInWithGoogle,
    logout,
    resetPassword,
    cambiarEmpresa,
    actualizarPerfil,
    reloadUser,
    necesitaOnboarding
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}