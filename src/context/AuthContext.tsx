// src/context/AuthContext.tsx - VERSIÓN CON DEBUG MEJORADO
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
  
  // Refs para evitar re-renders y loops
  const authListenerSetup = useRef(false);
  const loadingUserData = useRef(false);

  // Helper para verificar si el usuario necesita onboarding
  const necesitaOnboarding = useCallback(() => {
    const hasUser = !!user;
    const hasUsuario = !!usuario;
    const hasEmpresas = usuario?.empresas && usuario.empresas.length > 0;
    const result = hasUser && hasUsuario && !hasEmpresas;
    
    console.log('🔍 NECESITA ONBOARDING - DEBUG:', {
      hasUser,
      hasUsuario,
      empresasArray: usuario?.empresas,
      empresasLength: usuario?.empresas?.length || 0,
      hasEmpresas,
      result,
      userEmail: user?.email,
      usuarioNombre: usuario?.nombre
    });
    
    return result;
  }, [user, usuario]);

  // Debug effect para monitorear cambios de estado
  useEffect(() => {
    console.log('🔍 ESTADO COMPLETO - DEBUG:', {
      user: user ? { email: user.email, uid: user.uid } : null,
      usuario: usuario ? { 
        id: usuario.id, 
        nombre: usuario.nombre, 
        empresasCount: usuario.empresas?.length || 0,
        empresas: usuario.empresas
      } : null,
      empresaActual: empresaActual ? { id: empresaActual.id, nombre: empresaActual.nombre } : null,
      empresasCount: empresas.length,
      loading,
      necesitaOnboarding: necesitaOnboarding(),
      authListenerSetup: authListenerSetup.current,
      loadingUserData: loadingUserData.current
    });
  }, [user, usuario, empresaActual, empresas, loading, necesitaOnboarding]);

  // Setup del listener de autenticación (solo una vez)
  useEffect(() => {
    if (authListenerSetup.current) return;
    
    console.log('🔄 Configurando listener de autenticación...');
    authListenerSetup.current = true;
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Evitar procesar si ya estamos cargando datos
      if (loadingUserData.current) {
        console.log('⏸️ Ya cargando datos de usuario, saltando...');
        return;
      }
      
      console.log('🔄 Auth state changed:', firebaseUser ? `Usuario: ${firebaseUser.email}` : 'No hay usuario');
      
      try {
        if (firebaseUser) {
          loadingUserData.current = true;
          
          const authUser: AuthUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified
          };
          
          console.log('✅ Estableciendo usuario auth:', authUser);
          setUser(authUser);
          await cargarDatosUsuario(firebaseUser);
        } else {
          console.log('❌ No hay usuario - limpiando estado');
          limpiarEstado();
        }
      } catch (error) {
        console.error('❌ Error en auth state change:', error);
        limpiarEstado();
      } finally {
        loadingUserData.current = false;
        setLoading(false);
        console.log('✅ Loading terminado');
      }
    });

    return () => {
      console.log('🧹 Limpiando listener de auth');
      unsubscribe();
      authListenerSetup.current = false;
    };
  }, []); // Array vacío - solo se ejecuta una vez

  const limpiarEstado = useCallback(() => {
    console.log('🧹 Limpiando estado completo');
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
      console.log('📂 Cargando datos del usuario:', firebaseUser.uid);
      
      const usuarioDoc = await getDoc(doc(db, 'usuarios', firebaseUser.uid));
      
      if (usuarioDoc.exists()) {
        const userData = { id: usuarioDoc.id, ...usuarioDoc.data() } as Usuario;
        console.log('✅ Usuario encontrado en Firestore:', {
          id: userData.id,
          nombre: userData.nombre,
          email: userData.email,
          empresas: userData.empresas,
          empresasLength: userData.empresas?.length || 0
        });
        
        setUsuario(userData);
        
        // Solo cargar empresas si tiene
        if (userData.empresas && userData.empresas.length > 0) {
          console.log('🏢 Usuario tiene empresas, cargándolas...');
          await cargarEmpresasUsuario(userData);
        } else {
          console.log('⚠️ Usuario SIN empresas - necesita onboarding');
          console.log('📊 Empresas array:', userData.empresas);
          setEmpresas([]);
          setEmpresaActual(null);
          setRolActual(null);
        }
      } else {
        console.log('❌ Usuario NO encontrado en Firestore - creando...');
        await crearUsuarioEnFirestore(firebaseUser);
      }
    } catch (error: any) {
      console.error('❌ Error cargando datos del usuario:', error);
      await crearUsuarioEnFirestore(firebaseUser);
    }
  };

  const crearUsuarioEnFirestore = async (firebaseUser: User) => {
    try {
      console.log('📝 Creando usuario en Firestore...');
      
      const nuevoUsuario: Omit<Usuario, 'id'> = {
        email: firebaseUser.email || '',
        nombre: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
        fechaRegistro: serverTimestamp() as any,
        empresas: [], // ← IMPORTANTE: Array vacío para usuario nuevo
        configuracion: {
          idioma: 'es',
          tema: 'light',
          notificaciones: true
        }
      };

      console.log('📝 Datos del nuevo usuario:', nuevoUsuario);

      await setDoc(doc(db, 'usuarios', firebaseUser.uid), nuevoUsuario);
      console.log('✅ Usuario creado en Firestore exitosamente');
      
      const usuarioConId = { id: firebaseUser.uid, ...nuevoUsuario };
      console.log('📊 Estableciendo usuario con empresas vacías:', usuarioConId);
      
      setUsuario(usuarioConId);
      setEmpresas([]);
      setEmpresaActual(null);
      setRolActual(null);
      
      console.log('✅ Estado establecido - usuario necesita onboarding');
      
    } catch (error) {
      console.error('❌ Error creando usuario en Firestore:', error);
      setUsuario(null);
    }
  };

  const cargarEmpresasUsuario = async (userData: Usuario) => {
    try {
      if (!userData.empresas || userData.empresas.length === 0) {
        console.log('⚠️ No hay empresas para cargar');
        setEmpresas([]);
        setEmpresaActual(null);
        setRolActual(null);
        return;
      }

      console.log('🏢 Cargando empresas del usuario...', userData.empresas);
      const empresasIds = userData.empresas.map(e => e.empresaId);
      
      const empresasData: Empresa[] = [];
      
      // Cargar empresas en lotes
      const batchSize = 10;
      for (let i = 0; i < empresasIds.length; i += batchSize) {
        const batch = empresasIds.slice(i, i + batchSize);
        const empresasQuery = query(
          collection(db, 'empresas'),
          where('__name__', 'in', batch)
        );
        const empresasSnapshot = await getDocs(empresasQuery);
        const batchData = empresasSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Empresa[];
        
        empresasData.push(...batchData);
      }

      console.log('✅ Empresas cargadas:', empresasData.length, empresasData);
      setEmpresas(empresasData);

      // Establecer empresa actual
      let empresaActiva: Empresa | undefined;
      
      // Intentar desde localStorage
      if (typeof window !== 'undefined') {
        const empresaGuardada = localStorage.getItem('empresaActual');
        if (empresaGuardada) {
          empresaActiva = empresasData.find(e => e.id === empresaGuardada);
          console.log('🏢 Empresa desde localStorage:', empresaActiva?.nombre);
        }
      }
      
      // Si no hay en localStorage, tomar la primera activa
      if (!empresaActiva) {
        empresaActiva = empresasData.find(e => e.estado === 'activa') || empresasData[0];
        console.log('🏢 Empresa seleccionada automáticamente:', empresaActiva?.nombre);
      }

      if (empresaActiva) {
        setEmpresaActual(empresaActiva);
        
        const rolEmpresa = userData.empresas.find(e => e.empresaId === empresaActiva!.id);
        setRolActual(rolEmpresa?.rol || null);

        if (typeof window !== 'undefined') {
          localStorage.setItem('empresaActual', empresaActiva.id);
        }
        
        console.log('✅ Empresa actual establecida:', {
          empresa: empresaActiva.nombre,
          rol: rolEmpresa?.rol
        });
      }
    } catch (error) {
      console.error('❌ Error cargando empresas:', error);
      setEmpresas([]);
      setEmpresaActual(null);
      setRolActual(null);
    }
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      console.log('🔑 Iniciando sesión para:', email);
      await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Sesión iniciada exitosamente');
    } catch (error: any) {
      console.error('❌ Error en signIn:', error);
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  const signUp = async (email: string, password: string, nombre: string) => {
    try {
      console.log('📝 Registrando usuario:', email);
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      
      await updateProfile(firebaseUser, {
        displayName: nombre
      });

      console.log('✅ Usuario registrado exitosamente');
      await sendEmailVerification(firebaseUser);
      
      toast({
        title: "Cuenta creada",
        description: "Te hemos enviado un email de verificación",
      });
      
    } catch (error: any) {
      console.error('❌ Error en signUp:', error);
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log('🔑 Iniciando sesión con Google...');
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      console.log('✅ Sesión con Google iniciada exitosamente');
    } catch (error: any) {
      console.error('❌ Error en signInWithGoogle:', error);
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  const logout = async () => {
    try {
      console.log('👋 Cerrando sesión...');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('empresaActual');
      }
      await signOut(auth);
      console.log('✅ Sesión cerrada exitosamente');
    } catch (error: any) {
      console.error('❌ Error en logout:', error);
      throw new Error('Error al cerrar sesión');
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Email enviado",
        description: "Te hemos enviado un enlace para restablecer tu contraseña",
      });
    } catch (error: any) {
      console.error('❌ Error en resetPassword:', error);
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  const cambiarEmpresa = useCallback(async (empresaId: string) => {
    const empresa = empresas.find(e => e.id === empresaId);
    if (empresa && usuario) {
      console.log('🔄 Cambiando a empresa:', empresa.nombre);
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

    try {
      console.log('📝 Actualizando perfil con:', data);
      const datosActualizados = { ...usuario, ...data };
      await setDoc(doc(db, 'usuarios', user.uid), datosActualizados);
      
      console.log('✅ Perfil actualizado en Firestore');
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
    } catch (error: any) {
      console.error('❌ Error actualizando perfil:', error);
      throw new Error('Error al actualizar el perfil');
    }
  }, [user, usuario]);

  const reloadUser = useCallback(async () => {
    if (user && auth.currentUser && !loadingUserData.current) {
      console.log('🔄 Recargando datos del usuario...');
      loadingUserData.current = true;
      try {
        await cargarDatosUsuario(auth.currentUser);
      } finally {
        loadingUserData.current = false;
      }
    }
  }, [user]);

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

function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No existe una cuenta con este email';
    case 'auth/wrong-password':
      return 'Contraseña incorrecta';
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta con este email';
    case 'auth/weak-password':
      return 'La contraseña es muy débil';
    case 'auth/invalid-email':
      return 'Email inválido';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Intenta más tarde';
    case 'auth/network-request-failed':
      return 'Error de conexión. Verifica tu internet';
    case 'auth/popup-closed-by-user':
      return 'Ventana de autenticación cerrada';
    case 'auth/cancelled-popup-request':
      return 'Autenticación cancelada';
    default:
      return 'Error de autenticación. Intenta nuevamente';
  }
}