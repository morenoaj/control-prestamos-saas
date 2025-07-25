// src/lib/auth.ts
import { auth } from './firebase';
import { User } from 'firebase/auth';

export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

export const getAuthToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    return await user.getIdToken();
  } catch (error) {
    console.error('Error obteniendo token:', error);
    return null;
  }
};

export const requireAuth = async () => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Usuario no autenticado');
  }
  return user;
};

export const requireRole = (userRole: string, requiredRoles: string[]) => {
  if (!requiredRoles.includes(userRole)) {
    throw new Error('No tienes permisos para realizar esta acción');
  }
};

// Utilidad para verificar permisos
export const hasPermission = (
  userRole: 'owner' | 'admin' | 'gestor' | 'viewer',
  action: 'create' | 'read' | 'update' | 'delete',
  resource: 'clientes' | 'prestamos' | 'pagos' | 'usuarios' | 'empresas'
): boolean => {
  const permissions = {
    owner: {
      clientes: ['create', 'read', 'update', 'delete'],
      prestamos: ['create', 'read', 'update', 'delete'],
      pagos: ['create', 'read', 'update', 'delete'],
      usuarios: ['create', 'read', 'update', 'delete'],
      empresas: ['create', 'read', 'update', 'delete']
    },
    admin: {
      clientes: ['create', 'read', 'update', 'delete'],
      prestamos: ['create', 'read', 'update', 'delete'],
      pagos: ['create', 'read', 'update', 'delete'],
      usuarios: ['read', 'update'],
      empresas: ['read', 'update']
    },
    gestor: {
      clientes: ['create', 'read', 'update'],
      prestamos: ['create', 'read', 'update'],
      pagos: ['create', 'read', 'update'],
      usuarios: ['read'],
      empresas: ['read']
    },
    viewer: {
      clientes: ['read'],
      prestamos: ['read'],
      pagos: ['read'],
      usuarios: ['read'],
      empresas: ['read']
    }
  };

  return permissions[userRole]?.[resource]?.includes(action) || false;
}; 