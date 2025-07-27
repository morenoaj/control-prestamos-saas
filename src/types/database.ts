// src/types/auth.ts
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

export interface UserSession {
  user: AuthUser;
  empresa: Empresa;
  rol: UsuarioEmpresa['rol'];
}

// src/types/api.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// src/types/database.ts
import { Timestamp } from 'firebase/firestore';

export interface Empresa {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  logo?: string;
  plan: 'basico' | 'premium' | 'enterprise';
  fechaRegistro: Timestamp;
  fechaVencimiento?: Timestamp;
  estado: 'activa' | 'suspendida' | 'cancelada';
  configuracion: {
    tasaInteresDefault: number;
    monedaDefault: string;
    diasGracia: number;
    colorTema: string;
  };
  limites: {
    maxClientes: number;
    maxPrestamos: number;
    maxUsuarios: number;
  };
}

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  telefono?: string;
  avatar?: string;
  fechaRegistro: Timestamp;
  empresas: UsuarioEmpresa[];
  configuracion: {
    idioma: string;
    tema: 'light' | 'dark';
    notificaciones: boolean;
  };
}

export interface UsuarioEmpresa {
  empresaId: string;
  rol: 'owner' | 'admin' | 'gestor' | 'viewer';
  fechaAsignacion: Timestamp;
}

export interface Cliente {
  id: string;
  empresaId: string;
  codigo: string;
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string;
  telefonoSecundario?: string;
  email?: string;
  direccion: string;
  referencias: Referencia[];
  estadoCivil: string;
  ocupacion: string;
  ingresosMensuales: number;
  foto?: string;
  documentos: string[];
  creditScore: number;
  observaciones?: string;
  fechaRegistro: Timestamp;
  estado: 'activo' | 'inactivo' | 'bloqueado';
}

export interface Referencia {
  nombre: string;
  telefono: string;
  relacion: string;
}

export interface Prestamo {
  id: string;
  empresaId: string;
  numero: string;
  clienteId: string;
  usuarioCreador: string;
  monto: number;
  tasaInteres: number;
  tipoTasa: 'quincenal' | 'mensual' | 'anual';
  plazo: number;
  fechaInicio: Timestamp;
  fechaVencimiento: Timestamp;
  metodoPago: string;
  garantia?: string;
  proposito: string;
  estado: 'pendiente' | 'activo' | 'finalizado' | 'atrasado' | 'cancelado';
  saldoCapital: number;
  interesesPendientes: number;
  interesesPagados: number;
  diasAtraso: number;
  moraAcumulada: number;
  fechaProximoPago: Timestamp;
  montoProximoPago: number;
  observaciones?: string;
}

export interface Pago {
  id: string;
  empresaId: string;
  numero: string;
  prestamoId: string;
  clienteId: string;
  usuarioRegistro: string;
  montoCapital: number;
  montoIntereses: number;
  montoMora: number;
  montoPagado: number;
  metodoPago: string;
  referenciaPago?: string;
  fechaPago: Timestamp;
  fechaRegistro: Timestamp;
  comprobante?: string;
  observaciones?: string;
}

export interface Notificacion {
  id: string;
  empresaId: string;
  usuarioId: string;
  tipo: 'pago_vencido' | 'pago_proximo' | 'prestamo_aprobado' | 'cliente_nuevo' | 'sistema';
  titulo: string;
  mensaje: string;
  data?: Record<string, any>;
  leida: boolean;
  fechaCreacion: Timestamp;
  fechaLectura?: Timestamp;
}

export interface MovimientoSistema {
  id: string;
  empresaId: string;
  fecha: Timestamp;
  tipo: string;
  categoria: 'operacion' | 'auditoria' | 'sistema';
  monto?: number;
  usuarioId: string;
  prestamoId?: string;
  clienteId?: string;
  pagoId?: string;
  origen: string;
  ipAddress: string;
  userAgent: string;
  descripcion: string;
}