// src/context/AuthContext.tsx - CORREGIDO CON COOKIES
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

  // ✅ FUNCIÓN PARA MANEJAR COOKIES
  const setCookies = useCallback(async (firebaseUser: User | null, empresa: Empresa | null) => {
    if (typeof window === 'undefined') return;

    if (firebaseUser) {
      try {
        // Setear cookie de autenticación
        const token = await firebaseUser.getIdToken();
        document.cookie = `auth-token=${token}; path=/; max-age=3600; samesite=lax${window.location.protocol === 'https:' ? '; secure' : ''}`;
        
        if (empresa) {
          // Setear cookie de empresa
          document.cookie = `empresa-actual=${empresa.id}; path=/; max-age=86400; samesite=lax${window.location.protocol === 'https:' ? '; secure' : ''}`;
        } else {
          // Limpiar cookie de empresa si no hay empresa
          document.cookie = 'empresa-actual=; path=/; max-age=0';
        }
      } catch (error) {
        console.error('Error setting cookies:', error);
      }
    } else {
      // Limpiar todas las cookies
      document.cookie = 'auth-token=; path=/; max-age=0';
      document.cookie = 'empresa-actual=; path=/; max-age=0';
    }
  }, []);

  // Función para verificar onboarding
  const necesitaOnboarding = useCallback(() => {
    if (!user || !usuario) return false;
    return !usuario.empresas || usuario.empresas.length === 0;
  }, [user, usuario]);

  // Limpiar estado
  const limpiarEstado = useCallback(() => {
    console.log('🧹 Limpiando estado de auth');
    setUser(null);
    setUsuario(null);
    setEmpresaActual(null);
    setEmpresas([]);
    setRolActual(null);
    
    // Limpiar localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('empresaActual');
    }
  }, []);

  // Cargar datos del usuario
  const cargarDatosUsuario = async (firebaseUser: User) => {
    try {
      console.log('📂 Cargando datos usuario:', firebaseUser.uid);
      
      const usuarioDoc = await getDoc(doc(db, 'usuarios', firebaseUser.uid));
      
      if (usuarioDoc.exists()) {
        const userData = { id: usuarioDoc.id, ...usuarioDoc.data() } as Usuario;
        console.log('✅ Usuario encontrado:', userData.nombre);
        
        setUsuario(userData);
        
        if (userData.empresas && userData.empresas.length > 0) {
          await cargarEmpresasUsuario(userData);
        } else {
          console.log('⚠️ Usuario sin empresas - requiere onboarding');
          setEmpresas([]);
          setEmpresaActual(null);
          setRolActual(null);
          // No setear cookie de empresa
          await setCookies(firebaseUser, null);
        }
      } else {
        console.log('📝 Usuario no existe - creando perfil...');
        await crearUsuarioEnFirestore(firebaseUser);
      }
    } catch (error) {
      console.error('❌ Error cargando usuario:', error);
      await crearUsuarioEnFirestore(firebaseUser);
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
      
      // Setear solo cookie de auth, sin empresa
      await setCookies(firebaseUser, null);
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

      // Establecer empresa actual
      if (empresasData.length > 0) {
        let empresaActiva = empresasData[0];
        
        // Intentar cargar desde localStorage
        if (typeof window !== 'undefined') {
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
        
        // Guardar en localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('empresaActual', empresaActiva.id);
        }
        
        // ✅ SETEAR COOKIES CON EMPRESA
        await setCookies(auth.currentUser, empresaActiva);
        
        console.log('✅ Empresa actual establecida:', empresaActiva.nombre);
      }
    } catch (error) {
      console.error('❌ Error cargando empresas:', error);
      setEmpresas([]);
      setEmpresaActual(null);
      setRolActual(null);
    }
  };

  // Listener de autenticación
  useEffect(() => {
    console.log('🔄 Configurando listener de autenticación...');
    
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
          await setCookies(null, null);
        }
      } catch (error) {
        console.error('❌ Error en auth state change:', error);
        limpiarEstado();
        await setCookies(null, null);
      } finally {
        setLoading(false);
        setInitialized(true);
        console.log('✅ Auth inicializado:', !!firebaseUser);
      }
    });

    return () => {
      console.log('🔄 Limpiando listener de auth');
      unsubscribe();
    };
  }, [limpiarEstado, setCookies]);

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
    if (typeof window !== 'undefined') {
      localStorage.removeItem('empresaActual');
    }
    await setCookies(null, null);
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
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('empresaActual', empresaId);
      }
      
      // ✅ ACTUALIZAR COOKIE DE EMPRESA
      await setCookies(auth.currentUser, empresa);
    }
  }, [empresas, usuario, setCookies]);

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

    console.log('🔄 Recargando datos del usuario...');
    setLoading(true);
    
    try {
      await cargarDatosUsuario(auth.currentUser);
      console.log('✅ Recarga de usuario completada');
    } catch (error) {
      console.error('❌ Error recargando usuario:', error);
      throw error;
    } finally {
      setLoading(false);
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