// src/context/AuthContext.tsx - VERSIÓN OPTIMIZADA
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
  initialized: boolean;
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
  
  // Estado para controlar si estamos en el cliente (post-hydration)
  const [isMounted, setIsMounted] = useState(false);
  
  // Refs para control de estado
  const authSetup = useRef(false);
  const isLoadingUserData = useRef(false);
  const lastUserLoaded = useRef<string>('');
  const dataLoadPromise = useRef<Promise<void> | null>(null);
  const reloadPromise = useRef<Promise<void> | null>(null);

  // Efecto para marcar cuando el componente está montado en el cliente
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Función estable para verificar onboarding (sin dependencias de localStorage)
  const necesitaOnboarding = useCallback(() => {
    if (!user || !usuario) return false;
    return !usuario.empresas || usuario.empresas.length === 0;
  }, [user?.uid, usuario?.empresas?.length]);

  // Limpiar estado de forma segura
  const limpiarEstado = useCallback(() => {
    console.log('🧹 Limpiando estado completo de auth');
    setUser(null);
    setUsuario(null);
    setEmpresaActual(null);
    setEmpresas([]);
    setRolActual(null);
    lastUserLoaded.current = '';
    isLoadingUserData.current = false;
    dataLoadPromise.current = null;
    reloadPromise.current = null;
    
    // Solo acceder a localStorage en el cliente
    if (isMounted && typeof window !== 'undefined') {
      localStorage.removeItem('empresaActual');
    }
  }, [isMounted]);

  // Cargar datos del usuario
  const cargarDatosUsuario = async (firebaseUser: User, forceReload = false): Promise<void> => {
    // Prevenir cargas duplicadas a menos que sea forzado
    if (!forceReload && lastUserLoaded.current === firebaseUser.uid) {
      if (dataLoadPromise.current) {
        console.log('⏳ Esperando carga existente del usuario');
        return dataLoadPromise.current;
      }
      console.log('✅ Datos del usuario ya cargados, usando cache');
      return;
    }

    if (isLoadingUserData.current && !forceReload) {
      console.log('⏳ Otra carga en progreso, esperando...');
      await new Promise(resolve => setTimeout(resolve, 500));
      if (lastUserLoaded.current === firebaseUser.uid && !forceReload) return;
    }

    isLoadingUserData.current = true;
    lastUserLoaded.current = firebaseUser.uid;

    dataLoadPromise.current = (async () => {
      try {
        console.log('📂 Cargando datos usuario:', firebaseUser.uid, forceReload ? '(forzado)' : '');
        
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
            console.log('⚠️ Usuario sin empresas - requiere onboarding');
            setEmpresas([]);
            setEmpresaActual(null);
            setRolActual(null);
          }
        } else {
          console.log('📝 Usuario no existe - creando perfil...');
          await crearUsuarioEnFirestore(firebaseUser);
        }
      } catch (error) {
        console.error('❌ Error cargando usuario:', error);
        await crearUsuarioEnFirestore(firebaseUser);
      }
    })();

    try {
      await dataLoadPromise.current;
    } finally {
      isLoadingUserData.current = false;
      dataLoadPromise.current = null;
    }
  };

  // Crear usuario en Firestore
  const crearUsuarioEnFirestore = async (firebaseUser: User) => {
    try {
      console.log('🆕 Creando usuario en Firestore...');
      const nuevoUsuario: Omit<Usuario, 'id'> = {
        email: firebaseUser.email || '',
        nombre: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
        fechaRegistro: serverTimestamp() as any,
        empresas: [],
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
      setRolActual(null);
    } catch (error) {
      console.error('❌ Error creando usuario:', error);
      throw error;
    }
  };

  // Cargar empresas del usuario
  const cargarEmpresasUsuario = async (userData: Usuario) => {
    try {
      if (!userData.empresas || userData.empresas.length === 0) {
        console.log('⚠️ Usuario sin empresas asignadas');
        setEmpresas([]);
        setEmpresaActual(null);
        setRolActual(null);
        return;
      }

      console.log('🏢 Cargando empresas...', userData.empresas.length);
      
      const empresasIds = userData.empresas.map(e => e.empresaId);
      const empresasData: Empresa[] = [];
      
      // Cargar empresas en batches
      const batchSize = 10;
      for (let i = 0; i < empresasIds.length; i += batchSize) {
        const batch = empresasIds.slice(i, i + batchSize);
        const empresasQuery = query(
          collection(db, 'empresas'),
          where('__name__', 'in', batch)
        );
        
        const empresasSnapshot = await getDocs(empresasQuery);
        empresasSnapshot.docs.forEach(doc => {
          empresasData.push({ id: doc.id, ...doc.data() } as Empresa);
        });
      }

      console.log('✅ Empresas cargadas:', empresasData.length);
      setEmpresas(empresasData);

      // Establecer empresa actual de forma segura
      if (empresasData.length > 0) {
        let empresaActiva = empresasData[0];
        
        // Solo acceder a localStorage si estamos en el cliente
        if (isMounted && typeof window !== 'undefined') {
          const empresaGuardada = localStorage.getItem('empresaActual');
          if (empresaGuardada) {
            const empresaEncontrada = empresasData.find(e => e.id === empresaGuardada);
            if (empresaEncontrada) {
              empresaActiva = empresaEncontrada;
            }
          }
        }

        setEmpresaActual(empresaActiva);
        const rolEmpresa = userData.empresas.find(e => e.empresaId === empresaActiva.id);
        setRolActual(rolEmpresa?.rol || null);
        
        // Guardar en localStorage solo en el cliente
        if (isMounted && typeof window !== 'undefined') {
          localStorage.setItem('empresaActual', empresaActiva.id);
        }
        
        console.log('✅ Empresa actual establecida:', empresaActiva.nombre);
      }
    } catch (error) {
      console.error('❌ Error cargando empresas:', error);
      setEmpresas([]);
      setEmpresaActual(null);
      setRolActual(null);
    }
  };

  // Listener de autenticación - solo se ejecuta después del mount
  useEffect(() => {
    if (!isMounted || authSetup.current) return;
    
    console.log('🔄 Configurando listener de autenticación...');
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
          console.log('👋 Usuario deslogueado');
          limpiarEstado();
        }
      } catch (error) {
        console.error('❌ Error en auth state change:', error);
        limpiarEstado();
      } finally {
        setLoading(false);
        setInitialized(true);
        console.log('✅ Auth inicializado:', !!firebaseUser);
      }
    });

    return () => {
      console.log('🔄 Limpiando listener de auth');
      unsubscribe();
      authSetup.current = false;
    };
  }, [isMounted, limpiarEstado]);

  // Funciones de autenticación
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
    console.log('👋 Cerrando sesión...');
    if (isMounted && typeof window !== 'undefined') {
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
      console.log('🔄 Cambiando empresa a:', empresa.nombre);
      setEmpresaActual(empresa);
      const rolEmpresa = usuario.empresas.find(e => e.empresaId === empresaId);
      setRolActual(rolEmpresa?.rol || null);
      
      if (isMounted && typeof window !== 'undefined') {
        localStorage.setItem('empresaActual', empresaId);
      }
    }
  }, [empresas, usuario, isMounted]);

  const actualizarPerfil = useCallback(async (data: Partial<Usuario>) => {
    if (!user || !usuario) return;

    console.log('📝 Actualizando perfil usuario...');
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
    if (!user || !auth.currentUser) {
      console.log('⚠️ No hay usuario para recargar');
      return;
    }

    // Evitar recargas duplicadas
    if (reloadPromise.current) {
      console.log('⏳ Recarga ya en progreso, esperando...');
      return reloadPromise.current;
    }

    console.log('🔄 Recargando datos del usuario...');
    
    reloadPromise.current = (async () => {
      try {
        // Forzar recarga de datos
        lastUserLoaded.current = '';
        isLoadingUserData.current = false;
        dataLoadPromise.current = null;
        
        await cargarDatosUsuario(auth.currentUser!, true);
        console.log('✅ Recarga de usuario completada');
      } catch (error) {
        console.error('❌ Error recargando usuario:', error);
        throw error;
      }
    })();

    try {
      await reloadPromise.current;
    } finally {
      reloadPromise.current = null;
    }
  }, [user]);

  const value = {
    user,
    usuario,
    empresaActual,
    empresas,
    rolActual,
    loading,
    initialized,
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