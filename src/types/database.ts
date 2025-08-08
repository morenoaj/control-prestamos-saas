// src/types/database.ts - ACTUALIZADO
import { Timestamp } from 'firebase/firestore';

// ✅ IMPORTAR TIPOS desde el archivo de préstamos
import { TipoTasa, EstadoPrestamo } from './prestamos';

// ... todas las interfaces existentes (Empresa, Usuario, Cliente, etc.) ...

// ✅ INTERFACE PRESTAMO ACTUALIZADA
export interface Prestamo {
  id: string;
  empresaId: string;
  numero: string;
  clienteId: string;
  usuarioCreador: string;
  monto: number;
  tasaInteres: number;
  tipoTasa: TipoTasa; // ✅ Usar el tipo definido en prestamos.ts
  plazo?: number; // ✅ OPCIONAL para préstamos indefinidos
  esPlazoIndefinido?: boolean; // ✅ NUEVO CAMPO
  fechaInicio: Timestamp;
  fechaVencimiento?: Timestamp; // ✅ OPCIONAL para préstamos indefinidos
  metodoPago: string;
  garantia?: string;
  proposito: string;
  estado: EstadoPrestamo; // ✅ Usar el tipo definido
  saldoCapital: number;
  interesesPendientes: number;
  interesesPagados: number;
  diasAtraso: number;
  moraAcumulada: number;
  fechaProximoPago?: Timestamp; // ✅ OPCIONAL para préstamos indefinidos
  montoProximoPago?: number; // ✅ OPCIONAL para préstamos indefinidos
  observaciones?: string;
  ultimaActualizacionIntereses?: Timestamp; // ✅ NUEVO CAMPO para préstamos indefinidos
}

// ... resto de interfaces existentes (Empresa, Usuario, Cliente, Pago, etc.) ...

// ✅ VERSIÓN COMPLETA DEL ARCHIVO (copia y pega esto):

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

export interface Pago {
  id: string
  empresaId: string
  numero: string // PG241130001, etc.
  prestamoId: string
  clienteId: string
  usuarioRegistro: string
  
  // Montos desglosados
  montoCapital: number
  montoIntereses: number
  montoMora: number
  montoPagado: number // Total pagado por el cliente
  montoExcedente?: number // Si paga más de lo debido
  
  // Detalles del pago
  metodoPago: 'efectivo' | 'transferencia' | 'cheque' | 'yappy' | 'nequi' | 'otro'
  referenciaPago?: string // Número de referencia, cheque, etc.
  fechaPago: Timestamp // Fecha en que se realizó el pago
  fechaRegistro: Timestamp // Fecha en que se registró en el sistema
  
  // Archivos
  comprobante?: string // URL del comprobante
  documentos?: string[] // URLs de documentos adicionales
  
  // Información adicional
  observaciones?: string
  estado: 'completado' | 'pendiente_verificacion' | 'rechazado'
  
  // Cálculos automáticos (se calculan al crear)
  saldoAnterior: number
  saldoNuevo: number
  diasAtrasoAnterior: number
  diasAtrasoNuevo: number
}