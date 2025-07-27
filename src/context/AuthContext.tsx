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

  // Helper para verificar si el usuario necesita onboarding
  const necesitaOnboarding = () => {
    return user && usuario && (!usuario.empresas || usuario.empresas.length === 0);
  };

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
        // Limpiar localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('empresaActual');
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const cargarDatosUsuario = async (uid: string, retries = 3) => {
    try {
      // Cargar datos del usuario
      const usuarioDoc = await getDoc(doc(db, 'usuarios', uid));
      
      if (usuarioDoc.exists()) {
        const userData = { id: usuarioDoc.id, ...usuarioDoc.data() } as Usuario;
        setUsuario(userData);

        // Cargar empresas del usuario
        if (userData.empresas && userData.empresas.length > 0) {
          const empresasIds = userData.empresas.map(e => e.empresaId);
          
          // Si hay más de 10 empresas, hacer consultas por lotes
          const empresasData: Empresa[] = [];
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

          setEmpresas(empresasData);

          // Establecer empresa actual
          const empresaGuardada = typeof window !== 'undefined' ? 
            localStorage.getItem('empresaActual') : null;
          
          let empresaActiva: Empresa | undefined;
          
          if (empresaGuardada) {
            empresaActiva = empresasData.find(e => e.id === empresaGuardada);
          }
          
          if (!empresaActiva) {
            empresaActiva = empresasData.find(e => e.estado === 'activa') || empresasData[0];
          }

          if (empresaActiva) {
            setEmpresaActual(empresaActiva);
            
            // Establecer rol actual
            const rolEmpresa = userData.empresas.find(e => e.empresaId === empresaActiva!.id);
            setRolActual(rolEmpresa?.rol || null);

            // Guardar en localStorage
            if (typeof window !== 'undefined') {
              localStorage.setItem('empresaActual', empresaActiva.id);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error cargando datos del usuario:', error);
      
      // Reintentar si es un error de conectividad y tenemos intentos restantes
      if (retries > 0 && (
        error.code === 'unavailable' || 
        error.message?.includes('offline') ||
        error.message?.includes('network')
      )) {
        console.log(`Reintentando carga de datos... (${retries} intentos restantes)`);
        setTimeout(() => cargarDatosUsuario(uid, retries - 1), 2000);
        return;
      }
      
      toast({
        title: "Error de conexión",
        description: "No se pudieron cargar los datos. Verifica tu conexión a internet.",
        variant: "destructive"
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Error en signIn:', error);
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  const signUp = async (email: string, password: string, nombre: string) => {
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Actualizar perfil en Firebase Auth
      await updateProfile(firebaseUser, {
        displayName: nombre
      });

      // Crear documento de usuario en Firestore
      const nuevoUsuario: Omit<Usuario, 'id'> = {
        email,
        nombre,
        fechaRegistro: serverTimestamp() as any,
        empresas: [],
        configuracion: {
          idioma: 'es',
          tema: 'light',
          notificaciones: true
        }
      };

      await setDoc(doc(db, 'usuarios', firebaseUser.uid), nuevoUsuario);

      // Enviar email de verificación
      await sendEmailVerification(firebaseUser);
      
      toast({
        title: "Cuenta creada",
        description: "Te hemos enviado un email de verificación",
      });
      
    } catch (error: any) {
      console.error('Error en signUp:', error);
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const { user: firebaseUser } = await signInWithPopup(auth, provider);

      // Verificar si el usuario ya existe en Firestore
      const usuarioDoc = await getDoc(doc(db, 'usuarios', firebaseUser.uid));
      
      if (!usuarioDoc.exists()) {
        // Crear nuevo usuario si no existe
        const nuevoUsuario: Omit<Usuario, 'id'> = {
          email: firebaseUser.email || '',
          nombre: firebaseUser.displayName || '',
          fechaRegistro: serverTimestamp() as any,
          empresas: [],
          configuracion: {
            idioma: 'es',
            tema: 'light',
            notificaciones: true
          }
        };

        await setDoc(doc(db, 'usuarios', firebaseUser.uid), nuevoUsuario);
      }
    } catch (error: any) {
      console.error('Error en signInWithGoogle:', error);
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  const logout = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('empresaActual');
      }
      await signOut(auth);
    } catch (error: any) {
      console.error('Error en logout:', error);
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
      console.error('Error en resetPassword:', error);
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  const cambiarEmpresa = async (empresaId: string) => {
    const empresa = empresas.find(e => e.id === empresaId);
    if (empresa && usuario) {
      setEmpresaActual(empresa);
      
      // Actualizar rol
      const rolEmpresa = usuario.empresas.find(e => e.empresaId === empresaId);
      setRolActual(rolEmpresa?.rol || null);
      
      // Persistir en localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('empresaActual', empresaId);
      }
    }
  };

  const actualizarPerfil = async (data: Partial<Usuario>) => {
    if (!user || !usuario) return;

    try {
      const datosActualizados = { ...usuario, ...data };
      await setDoc(doc(db, 'usuarios', user.uid), datosActualizados);
      setUsuario(datosActualizados);

      // Actualizar Firebase Auth si es necesario
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
      console.error('Error actualizando perfil:', error);
      throw new Error('Error al actualizar el perfil');
    }
  };

  const reloadUser = async () => {
    if (user) {
      await cargarDatosUsuario(user.uid);
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

// Función helper para mensajes de error más amigables
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
    default:
      return 'Error de autenticación. Intenta nuevamente';
  }
}