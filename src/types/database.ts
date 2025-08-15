// src/types/database.ts - CÓDIGO COMPLETO ACTUALIZADO
import { Timestamp } from 'firebase/firestore';

// Importar tipos desde el archivo de préstamos
import { TipoTasa, EstadoPrestamo } from './prestamos';

// Interface Empresa
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

// Interface Usuario
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

// Interface Cliente
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
  fechaActualizacion: Timestamp;
  estado: 'activo' | 'inactivo' | 'suspendido';
}

export interface Referencia {
  nombre: string;
  telefono: string;
  relacion: string;
  direccion?: string;
}

// Interface Prestamo - ACTUALIZADA CON FECHA PERSONALIZADA
export interface Prestamo {
  id: string;
  empresaId: string;
  numero: string;
  clienteId: string;
  usuarioCreador: string;
  monto: number;
  tasaInteres: number;
  tipoTasa: TipoTasa;
  plazo?: number; // Opcional para préstamos indefinidos
  esPlazoIndefinido?: boolean; // Nuevo campo
  fechaInicio: Timestamp;
  fechaVencimiento?: Timestamp; // Opcional para préstamos indefinidos
  fechaCreacion: Timestamp; // NUEVA: Fecha de creación personalizada
  metodoPago: string;
  garantia?: string;
  proposito: string;
  estado: EstadoPrestamo;
  saldoCapital: number;
  interesesPendientes: number;
  interesesPagados: number;
  diasAtraso: number;
  moraAcumulada: number;
  fechaProximoPago?: Timestamp; // Opcional para préstamos indefinidos
  montoProximoPago?: number; // Opcional para préstamos indefinidos
  observaciones?: string;
  ultimaActualizacionIntereses?: Timestamp; // Nuevo campo para préstamos indefinidos
}

// Interface Pago
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
  montoExcedente?: number;
  metodoPago: 'efectivo' | 'transferencia' | 'cheque' | 'yappy' | 'nequi' | 'otro';
  referenciaPago?: string;
  fechaPago: Timestamp;
  fechaRegistro: Timestamp;
  comprobante?: string;
  documentos?: string[];
  observaciones?: string;
  estado: 'completado' | 'pendiente_verificacion' | 'rechazado';
  saldoAnterior: number;
  saldoNuevo: number;
  diasAtrasoAnterior: number;
  diasAtrasoNuevo: number;
}

// Interface Documento
export interface Documento {
  id: string;
  empresaId: string;
  nombre: string;
  tipo: 'cedula' | 'contrato' | 'comprobante_ingresos' | 'referencias' | 'comprobante_pago' | 'otro';
  url: string;
  tamano: number;
  fechaSubida: Timestamp;
  usuarioSubida: string;
  relacionadoId: string; // ID del cliente, préstamo o pago relacionado
  relacionadoTipo: 'cliente' | 'prestamo' | 'pago';
  estado: 'activo' | 'archivado' | 'eliminado';
}

// Interface Notificacion
export interface Notificacion {
  id: string;
  empresaId: string;
  usuarioId: string;
  tipo: 'pago_vencido' | 'pago_proximo' | 'prestamo_creado' | 'sistema' | 'recordatorio';
  titulo: string;
  mensaje: string;
  fechaCreacion: Timestamp;
  fechaLeida?: Timestamp;
  leida: boolean;
  datos?: any; // Datos adicionales específicos del tipo de notificación
  prioridad: 'baja' | 'media' | 'alta';
}

// Interface Configuracion
export interface Configuracion {
  id: string;
  empresaId: string;
  configuracion: {
    // Configuraciones generales
    monedaDefault: string;
    formatoFecha: string;
    formatoHora: string;
    zonaHoraria: string;
    
    // Configuraciones de préstamos
    tasaInteresDefault: number;
    tipoTasaDefault: TipoTasa;
    plazoDefault: number;
    metodoPagoDefault: string;
    
    // Configuraciones de pagos
    diasGracia: number;
    tasaMora: number;
    recordatoriosAutomaticos: boolean;
    diasAnticipacionRecordatorio: number;
    
    // Configuraciones de notificaciones
    notificacionesPorEmail: boolean;
    notificacionesPorSMS: boolean;
    emailsNotificacion: string[];
    
    // Configuraciones de reportes
    frecuenciaReportesAutomaticos: 'diario' | 'semanal' | 'mensual' | 'nunca';
    tiposReportesAutomaticos: string[];
    
    // Configuraciones de la interfaz
    colorTema: string;
    logoEmpresa?: string;
    mostrarLogo: boolean;
    
    // Configuraciones de backup
    backupAutomatico: boolean;
    frecuenciaBackup: 'diario' | 'semanal' | 'mensual';
  };
  fechaCreacion: Timestamp;
  fechaActualizacion: Timestamp;
  usuarioActualizacion: string;
}

// Interface Auditoria
export interface Auditoria {
  id: string;
  empresaId: string;
  usuarioId: string;
  accion: 'crear' | 'actualizar' | 'eliminar' | 'login' | 'logout';
  recurso: 'cliente' | 'prestamo' | 'pago' | 'usuario' | 'configuracion';
  recursoId: string;
  datosAnteriores?: any;
  datosNuevos?: any;
  ip: string;
  userAgent: string;
  fechaAccion: Timestamp;
  detalles?: string;
}

// Tipos de utilidad
export type EstadoGeneral = 'activo' | 'inactivo' | 'suspendido' | 'eliminado';

export type TipoDocumento = 'cedula' | 'contrato' | 'comprobante_ingresos' | 'referencias' | 'comprobante_pago' | 'otro';

export type TipoNotificacion = 'pago_vencido' | 'pago_proximo' | 'prestamo_creado' | 'sistema' | 'recordatorio';

export type MetodoPago = 'efectivo' | 'transferencia' | 'cheque' | 'yappy' | 'nequi' | 'otro';

export type RolUsuario = 'owner' | 'admin' | 'gestor' | 'viewer';

export type PlanEmpresa = 'basico' | 'premium' | 'enterprise';

// Interfaces para formularios
export interface ClienteFormData {
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string;
  telefonoSecundario?: string;
  email?: string;
  direccion: string;
  estadoCivil: string;
  ocupacion: string;
  ingresosMensuales: number;
  referencias: Referencia[];
  observaciones?: string;
}

export interface PrestamoFormData {
  clienteId: string;
  monto: number;
  tasaInteres: number;
  tipoTasa: TipoTasa;
  plazo?: number;
  metodoPago: string;
  proposito: string;
  garantia?: string;
  observaciones?: string;
  esPlazoIndefinido?: boolean;
  fechaCreacion?: Date; // NUEVA: Para fecha personalizada
  usarFechaPersonalizada?: boolean; // NUEVA: Para controlar el uso de fecha personalizada
}

export interface PagoFormData {
  prestamoId: string;
  montoPagado: number;
  metodoPago: MetodoPago;
  referenciaPago?: string;
  fechaPago: Date;
  observaciones?: string;
  comprobante?: File;
}

// Interfaces para estadísticas y reportes
export interface EstadisticasEmpresa {
  totalClientes: number;
  totalPrestamos: number;
  totalPagos: number;
  montoTotalPrestado: number;
  montoTotalRecuperado: number;
  saldoPendiente: number;
  tasaRecuperacion: number;
  clientesActivos: number;
  prestamosActivos: number;
  prestamosVencidos: number;
  moraAcumulada: number;
}

export interface ReporteMensual {
  mes: number;
  año: number;
  prestamosCreados: number;
  montoTotalPrestado: number;
  pagosRecibidos: number;
  montoTotalRecuperado: number;
  clientesNuevos: number;
  tasaRecuperacion: number;
}

// Funciones de utilidad para tipos
export const esPrestamoActivo = (prestamo: Prestamo): boolean => {
  return prestamo.estado === 'activo' && prestamo.saldoCapital > 0;
};

export const esPrestamoVencido = (prestamo: Prestamo): boolean => {
  return prestamo.estado === 'atrasado' || prestamo.diasAtraso > 0;
};

export const calcularSaldoTotal = (prestamo: Prestamo): number => {
  return prestamo.saldoCapital + prestamo.interesesPendientes + prestamo.moraAcumulada;
};
