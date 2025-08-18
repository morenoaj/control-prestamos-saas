// src/types/prestamos.ts - CÓDIGO COMPLETO
import { z } from 'zod';

// Definir tipos constantes primero
export const TIPO_TASA_VALUES = ['quincenal', 'mensual', 'anual', 'indefinido'] as const;
export type TipoTasa = typeof TIPO_TASA_VALUES[number];

export const ESTADO_PRESTAMO_VALUES = ['pendiente', 'activo', 'finalizado', 'atrasado', 'cancelado'] as const;
export type EstadoPrestamo = typeof ESTADO_PRESTAMO_VALUES[number];

// Schema base original
export const prestamoSchema = z.object({
  clienteId: z.string().min(1, 'Debe seleccionar un cliente'),
  monto: z.number().min(5, 'El monto mínimo es $5'),
  tasaInteres: z.number().min(0.1, 'La tasa debe ser mayor a 0.1%').max(100, 'La tasa no puede ser mayor a 100%'),
  tipoTasa: z.enum(TIPO_TASA_VALUES, {
    message: 'Selecciona un tipo de tasa válido'
  }),
  plazo: z.number().min(1, 'El plazo mínimo es 1 período').optional(),
  metodoPago: z.string().min(1, 'Selecciona un método de pago'),
  proposito: z.string().min(5, 'Describe el propósito del préstamo'),
  garantia: z.string().optional().or(z.literal('')),
  observaciones: z.string().optional().or(z.literal('')),
  esPlazoIndefinido: z.boolean().optional(),
}).refine(
  (data) => {
    // Si no es plazo indefinido y no es tipo indefinido, debe tener plazo
    if (!data.esPlazoIndefinido && data.tipoTasa !== 'indefinido' && !data.plazo) {
      return false;
    }
    return true;
  },
  {
    message: "Para préstamos con plazo fijo, debe especificar la duración",
    path: ["plazo"],
  }
);

// Schema extendido con fecha de creación personalizada
export const prestamoSchemaExtendido = prestamoSchema.extend({
  fechaCreacion: z.date().optional(),
  usarFechaPersonalizada: z.boolean().optional()
}).refine(
  (data) => {
    // Si se marca usar fecha personalizada, debe proporcionar la fecha
    if (data.usarFechaPersonalizada && !data.fechaCreacion) {
      return false;
    }
    // La fecha no puede ser futura
    if (data.fechaCreacion && data.fechaCreacion > new Date()) {
      return false;
    }
    return true;
  },
  {
    message: "Debe proporcionar una fecha válida (no futura) cuando esté habilitada",
    path: ["fechaCreacion"],
  }
);

// Tipos inferidos
export type PrestamoFormData = z.infer<typeof prestamoSchema>;
export type PrestamoFormDataExtendido = z.infer<typeof prestamoSchemaExtendido>;

// Interfaces para sistema quincenal
export interface PeriodoQuincenal {
  fecha: Date;
  montoIntereses: number;
  vencido: boolean;
  diasVencido: number;
}

export interface CalculoQuincenal {
  interesesActuales: number;
  interesesAtrasados: number;
  totalInteresesPendientes: number;
  capitalPendiente: number;
  totalAPagar: number;
  proximaFechaPago: Date;
  periodosVencidos: PeriodoQuincenal[];
  periodoActual: PeriodoQuincenal;
}

// Interfaces para sistema diario (mantenidas por compatibilidad)
export interface CalculoIntereses {
  interesesDiarios: number;
  interesesAcumulados: number;
  diasTranscurridos: number;
}

export interface DistribucionPago {
  montoMora: number;
  montoIntereses: number;
  montoCapital: number;
  sobrante: number;
}

// Función de utilidad mejorada para formateo de moneda
export const formatCurrency = (amount: number | undefined | null): string => {
  // Manejar casos de valores no válidos
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '$0.00';
  }
  
  // Asegurar que es un número válido
  const validAmount = typeof amount === 'number' ? amount : parseFloat(String(amount));
  
  if (isNaN(validAmount)) {
    return '$0.00';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(validAmount);
};

// Función para formatear fechas
export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return 'No definida';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Fecha inválida';
    }
    
    return dateObj.toLocaleDateString('es-PA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return 'Error en fecha';
  }
};

// Función para convertir Timestamp a Date
export const convertirFecha = (timestamp: unknown): Date => {
  if (!timestamp) return new Date();
  
  // Si ya es un Date
  if (timestamp instanceof Date) return timestamp;
  
  // Si es un Timestamp de Firebase
  if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp && typeof (timestamp as { toDate: () => Date }).toDate === 'function') {
    return (timestamp as { toDate: () => Date }).toDate();
  }
  
  // Si es un string o número
  try {
    return new Date(timestamp);
  } catch {
    return new Date();
  }
};

// Función para validar rango de fechas
export const validarRangoFechas = (fechaInicio: Date, fechaFin: Date): boolean => {
  return fechaInicio <= fechaFin;
};

// Función para calcular días entre fechas
export const calcularDiasEntreFechas = (fechaInicio: Date, fechaFin: Date): number => {
  const diffTime = Math.abs(fechaFin.getTime() - fechaInicio.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Constantes útiles
export const PERIODOS_QUINCENAL = {
  PRIMER_PERIODO: 15,
  SEGUNDO_PERIODO: 30,
  DIAS_POR_QUINCENA: 15
};

export const LIMITES_SISTEMA = {
  MONTO_MINIMO: 5,
  MONTO_MAXIMO: 1000000,
  TASA_MINIMA: 0.1,
  TASA_MAXIMA: 100,
  PLAZO_MINIMO: 1,
  PLAZO_MAXIMO: 360
};

// Función para calcular próxima fecha quincenal
export const calcularProximaFechaQuincenal = (fechaBase: Date): Date => {
  const fecha = new Date(fechaBase);
  const dia = fecha.getDate();
  
  if (dia <= 15) {
    fecha.setDate(15);
  } else {
    fecha.setMonth(fecha.getMonth() + 1, 15);
  }
  
  return fecha;
};

// Función para calcular intereses quincenales
export const calcularInteresesQuincenales = (
  capital: number,
  tasaInteres: number,
  fechaInicio: Date,
  fechaActual: Date = new Date()
): CalculoQuincenal => {
  const fechaBase = new Date(fechaInicio);
  const interesesPorQuincena = capital * (tasaInteres / 100);
  
  // Calcular períodos vencidos
  const periodosVencidos: PeriodoQuincenal[] = [];
  let totalInteresesAtrasados = 0;
  
  let fechaIteracion = new Date(fechaBase);
  while (fechaIteracion < fechaActual) {
    const proximaFecha = calcularProximaFechaQuincenal(fechaIteracion);
    
    if (proximaFecha <= fechaActual) {
      const diasVencido = Math.floor((fechaActual.getTime() - proximaFecha.getTime()) / (1000 * 60 * 60 * 24));
      
      periodosVencidos.push({
        fecha: proximaFecha,
        montoIntereses: interesesPorQuincena,
        vencido: true,
        diasVencido
      });
      
      totalInteresesAtrasados += interesesPorQuincena;
    }
    
    fechaIteracion = proximaFecha;
  }
  
  // Próxima fecha de pago
  const proximaFechaPago = calcularProximaFechaQuincenal(fechaActual);
  
  // Período actual
  const periodoActual: PeriodoQuincenal = {
    fecha: proximaFechaPago,
    montoIntereses: interesesPorQuincena,
    vencido: false,
    diasVencido: 0
  };
  
  return {
    interesesActuales: interesesPorQuincena,
    interesesAtrasados: totalInteresesAtrasados,
    totalInteresesPendientes: totalInteresesAtrasados + interesesPorQuincena,
    capitalPendiente: capital,
    totalAPagar: totalInteresesAtrasados + interesesPorQuincena,
    proximaFechaPago,
    periodosVencidos,
    periodoActual
  };
};

// Función para formatear información del próximo pago
export const formatearProximoPago = (calculo: CalculoQuincenal): string => {
  const fecha = calculo.proximaFechaPago.toLocaleDateString('es-PA');
  const monto = formatCurrency(calculo.totalAPagar);
  
  if (calculo.interesesAtrasados > 0) {
    return `${monto} - ${fecha} (Incluye ${formatCurrency(calculo.interesesAtrasados)} vencidos)`;
  }
  
  return `${monto} - ${fecha} (Intereses quincenales)`;
};

// Función para validar si un préstamo es indefinido
export const esPrestamoIndefinido = (prestamo: {
  esPlazoIndefinido?: boolean;
  tipoTasa?: string;
  plazo?: number;
}): boolean => {
  return prestamo.esPlazoIndefinido || 
         prestamo.tipoTasa === 'indefinido' || 
         !prestamo.plazo || 
         prestamo.plazo <= 0;
};

// Función para calcular monto válido para próximo pago
export const calcularMontoProximoPagoSeguro = (
  prestamo: {
    monto: number;
    saldoCapital?: number;
    tasaInteres: number;
    esPlazoIndefinido?: boolean;
    tipoTasa?: string;
    plazo?: number;
    montoProximoPago?: number;
  }
): number => {
  const saldoCapital = prestamo.saldoCapital || prestamo.monto || 0;
  const tasaInteres = prestamo.tasaInteres || 0;

  // Validación básica
  if (saldoCapital <= 0 || tasaInteres <= 0) {
    return 0;
  }

  // Para préstamos indefinidos, calcular intereses quincenales
  if (esPrestamoIndefinido(prestamo)) {
    return saldoCapital * (tasaInteres / 100);
  }

  // Para préstamos con plazo fijo, usar el monto existente o calcular básico
  let montoCalculado = prestamo.montoProximoPago || 0;
  
  if (isNaN(montoCalculado) || montoCalculado <= 0) {
    const plazo = prestamo.plazo || 1;
    montoCalculado = (saldoCapital + (saldoCapital * tasaInteres / 100)) / plazo;
  }

  return isNaN(montoCalculado) ? 0 : montoCalculado;
};

// Tipos para reportes y estadísticas
export interface EstadisticasPrestamo {
  totalPrestamos: number;
  montoTotalPrestado: number;
  montoTotalPendiente: number;
  promedioMontoPrestamo: number;
  prestamosPorEstado: Record<EstadoPrestamo, number>;
  prestamosPorTipoTasa: Record<TipoTasa, number>;
}

export interface ResumenMensual {
  mes: number;
  año: number;
  prestamosCreados: number;
  montoTotalCreado: number;
  prestamosFinalizados: number;
  montoTotalRecuperado: number;
}

// Función para validar datos de préstamo antes de guardar
export const validarDatosPrestamo = (prestamo: Record<string, unknown>): { esValido: boolean; errores: string[] } => {
  const errores: string[] = [];

  // Validaciones básicas
  if (!prestamo.monto || prestamo.monto < 5) {
    errores.push('El monto debe ser mayor a $5');
  }

  if (!prestamo.tasaInteres || prestamo.tasaInteres <= 0) {
    errores.push('La tasa de interés debe ser mayor a 0');
  }

  if (!prestamo.clienteId) {
    errores.push('Debe seleccionar un cliente');
  }

  // Validar plazo para préstamos no indefinidos
  const esIndefinido = esPrestamoIndefinido(prestamo);
  if (!esIndefinido && (!prestamo.plazo || prestamo.plazo <= 0)) {
    errores.push('Para préstamos con plazo fijo, debe especificar la duración');
  }

  // Validar montoProximoPago
  const montoProximoPago = calcularMontoProximoPagoSeguro(prestamo);
  if (isNaN(montoProximoPago) || montoProximoPago <= 0) {
    errores.push('No se pudo calcular el monto del próximo pago');
  }

  return {
    esValido: errores.length === 0,
    errores
  };
};



// Función mejorada para calcular intereses quincenales en préstamos indefinidos
export const calcularInteresesPrestamoIndefinido = (
  saldoCapital: number,
  tasaInteres: number,
  fechaInicio: Date,
  fechaActual: Date = new Date(),
  interesesPendientesAnteriores: number = 0
): CalculoQuincenal => {
  const fechaBase = new Date(fechaInicio);
  
  // Los intereses SIEMPRE se calculan sobre el saldo capital actual
  const interesesPorQuincena = saldoCapital * (tasaInteres / 100);
  
  // Calcular períodos vencidos desde la fecha de inicio
  const periodosVencidos: PeriodoQuincenal[] = [];
  let totalInteresesNuevos = 0;
  
  let fechaIteracion = new Date(fechaBase);
  while (fechaIteracion < fechaActual) {
    const proximaFecha = calcularProximaFechaQuincenal(fechaIteracion);
    
    if (proximaFecha <= fechaActual) {
      const diasVencido = Math.floor((fechaActual.getTime() - proximaFecha.getTime()) / (1000 * 60 * 60 * 24));
      
      periodosVencidos.push({
        fecha: proximaFecha,
        montoIntereses: interesesPorQuincena,
        vencido: true,
        diasVencido
      });
      
      totalInteresesNuevos += interesesPorQuincena;
    }
    
    fechaIteracion = proximaFecha;
  }
  
  // Total de intereses pendientes = anteriores + nuevos generados
  const totalInteresesPendientes = interesesPendientesAnteriores + totalInteresesNuevos;
  
  // Próxima fecha de pago
  const proximaFechaPago = calcularProximaFechaQuincenal(fechaActual);
  
  // Período actual
  const periodoActual: PeriodoQuincenal = {
    fecha: proximaFechaPago,
    montoIntereses: interesesPorQuincena,
    vencido: false,
    diasVencido: 0
  };
  
  return {
    interesesActuales: interesesPorQuincena,
    interesesAtrasados: totalInteresesNuevos,
    totalInteresesPendientes,
    capitalPendiente: saldoCapital,
    totalAPagar: totalInteresesPendientes, // Solo intereses hasta estar al día
    proximaFechaPago,
    periodosVencidos,
    periodoActual
  };
};

// Validar si se puede abonar a capital (REGLA CLAVE)
export const puedeAbonarCapital = (interesesPendientes: number): boolean => {
  return interesesPendientes <= 0;
};

// Función para recalcular próximo pago en préstamos indefinidos
export const recalcularProximoPagoIndefinido = (
  saldoCapitalActual: number,
  tasaInteres: number
): number => {
  // Si el capital es 0, no hay próximo pago
  if (saldoCapitalActual <= 0) {
    return 0;
  }
  
  // El próximo pago son solo los intereses sobre el capital restante
  return saldoCapitalActual * (tasaInteres / 100);
};

// Actualizar el export default para incluir las nuevas funciones
const prestamoUtils = {
  formatCurrency,
  formatDate,
  convertirFecha,
  validarRangoFechas,
  calcularDiasEntreFechas,
  calcularProximaFechaQuincenal,
  calcularInteresesQuincenales,
  calcularInteresesPrestamoIndefinido, // NUEVA
  formatearProximoPago,
  esPrestamoIndefinido,
  calcularMontoProximoPagoSeguro,
  validarDatosPrestamo,
  puedeAbonarCapital, // NUEVA
  recalcularProximoPagoIndefinido, // NUEVA
  PERIODOS_QUINCENAL,
  LIMITES_SISTEMA
};

export default prestamoUtils;