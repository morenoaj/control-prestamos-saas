// src/types/prestamos.ts
import { z } from 'zod';

// ✅ DEFINIR TIPOS CONSTANTES PRIMERO (esto solucionará el error de TypeScript)
export const TIPO_TASA_VALUES = ['quincenal', 'mensual', 'anual', 'indefinido'] as const;
export type TipoTasa = typeof TIPO_TASA_VALUES[number];

export const ESTADO_PRESTAMO_VALUES = ['pendiente', 'activo', 'finalizado', 'atrasado', 'cancelado'] as const;
export type EstadoPrestamo = typeof ESTADO_PRESTAMO_VALUES[number];

// ✅ SCHEMA ZOD CORREGIDO para el formulario
export const prestamoSchema = z.object({
  clienteId: z.string().min(1, 'Debe seleccionar un cliente'),
  monto: z.number().min(5, 'El monto mínimo es $5'), // ✅ $5 mínimo
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

// ✅ TIPO INFERIDO del schema
export type PrestamoFormData = z.infer<typeof prestamoSchema>;

// ✅ INTERFACES PARA SISTEMA QUINCENAL
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

// ✅ INTERFACES PARA SISTEMA DIARIO (mantenidas por compatibilidad)
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

// ✅ FUNCIONES DE UTILIDAD
/**
 * Formatea un número como moneda USD, manejando casos de NaN y undefined
 */
export const formatCurrency = (amount: number | undefined | null): string => {
  // Manejar casos de valores no válidos
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '$0.00';
  }
  
  // Asegurar que es un número válido
  const validAmount = typeof amount === 'number' ? amount : 0;
  
  if (isNaN(validAmount)) {
    return '$0.00';
  }
  
  // Formatear como moneda USD
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(validAmount);
};

/**
 * Calcula la próxima fecha de pago quincenal (15 o 30)
 */
export const calcularProximaFechaQuincenal = (fechaActual: Date = new Date()): Date => {
  const fecha = new Date(fechaActual);
  const dia = fecha.getDate();
  
  if (dia < 15) {
    // Si estamos antes del 15, el próximo pago es el 15
    fecha.setDate(15);
  } else if (dia === 15) {
    // Si es exactamente el 15, el próximo pago es el 30
    fecha.setDate(30);
    // Ajustar para febrero (28 o 29 días)
    if (fecha.getDate() !== 30) {
      fecha.setDate(0); // Último día del mes
    }
  } else if (dia < 30) {
    // Si estamos entre el 15 y el 30, el próximo pago es el 30
    fecha.setDate(30);
    // Ajustar para meses con menos de 30 días
    if (fecha.getDate() !== 30) {
      fecha.setDate(0); // Último día del mes
    }
  } else {
    // Si ya pasó el 30, el próximo pago es el 15 del siguiente mes
    fecha.setMonth(fecha.getMonth() + 1, 15);
  }
  
  return fecha;
};

/**
 * Genera todas las fechas de pago quincenales desde una fecha inicio hasta hoy
 */
export const generarFechasQuincenales = (
  fechaInicio: Date, 
  fechaActual: Date = new Date()
): Date[] => {
  const fechas: Date[] = [];
  let fecha = new Date(fechaInicio);
  
  // Ajustar la primera fecha al próximo 15 o 30
  if (fecha.getDate() <= 15) {
    fecha.setDate(15);
  } else {
    fecha.setDate(30);
    if (fecha.getDate() !== 30) {
      fecha.setDate(0); // Último día del mes
    }
  }
  
  while (fecha <= fechaActual) {
    fechas.push(new Date(fecha));
    
    // Avanzar a la siguiente fecha quincenal
    if (fecha.getDate() === 15) {
      fecha.setDate(30);
      if (fecha.getDate() !== 30) {
        fecha.setDate(0); // Último día del mes
      }
    } else {
      fecha.setMonth(fecha.getMonth() + 1, 15);
    }
  }
  
  return fechas;
};

/**
 * ✅ FUNCIÓN PRINCIPAL - Calcula todos los intereses quincenales (actuales y atrasados)
 */
export const calcularInteresesQuincenales = (
  prestamo: {
    monto: number;
    saldoCapital: number;
    tasaInteres: number;
    fechaInicio: Date;
    esPlazoIndefinido?: boolean;
  },
  pagosRealizados: { fecha: Date; montoIntereses: number }[] = [],
  fechaActual: Date = new Date()
): CalculoQuincenal => {
  
  if (!prestamo.esPlazoIndefinido) {
    // Para préstamos con plazo fijo, devolver valores básicos
    return {
      interesesActuales: 0,
      interesesAtrasados: 0,
      totalInteresesPendientes: 0,
      capitalPendiente: prestamo.saldoCapital || 0,
      totalAPagar: 0,
      proximaFechaPago: new Date(),
      periodosVencidos: [],
      periodoActual: {
        fecha: new Date(),
        montoIntereses: 0,
        vencido: false,
        diasVencido: 0
      }
    };
  }

  // Validar datos de entrada
  const saldoCapital = prestamo.saldoCapital || 0;
  const tasaInteres = prestamo.tasaInteres || 0;
  
  if (saldoCapital <= 0 || tasaInteres <= 0) {
    return {
      interesesActuales: 0,
      interesesAtrasados: 0,
      totalInteresesPendientes: 0,
      capitalPendiente: saldoCapital,
      totalAPagar: 0,
      proximaFechaPago: calcularProximaFechaQuincenal(fechaActual),
      periodosVencidos: [],
      periodoActual: {
        fecha: calcularProximaFechaQuincenal(fechaActual),
        montoIntereses: 0,
        vencido: false,
        diasVencido: 0
      }
    };
  }

  // Generar todas las fechas de pago quincenales desde el inicio
  const fechasPago = generarFechasQuincenales(prestamo.fechaInicio, fechaActual);
  const interesesPorQuincena = saldoCapital * (tasaInteres / 100);
  
  // Crear períodos con información de vencimiento
  const periodosVencidos: PeriodoQuincenal[] = [];
  let totalInteresesAtrasados = 0;
  
  fechasPago.forEach(fechaPago => {
    const diasVencido = Math.floor((fechaActual.getTime() - fechaPago.getTime()) / (1000 * 60 * 60 * 24));
    
    // Verificar si este período fue pagado
    const pagoEncontrado = pagosRealizados.find(pago => {
      const diferenciaDias = Math.abs((pago.fecha.getTime() - fechaPago.getTime()) / (1000 * 60 * 60 * 24));
      return diferenciaDias <= 7 && pago.montoIntereses >= interesesPorQuincena;
    });
    
    if (!pagoEncontrado && diasVencido > 0) {
      const periodo: PeriodoQuincenal = {
        fecha: fechaPago,
        montoIntereses: interesesPorQuincena,
        vencido: true,
        diasVencido
      };
      periodosVencidos.push(periodo);
      totalInteresesAtrasados += interesesPorQuincena;
    }
  });
  
  // Calcular próxima fecha de pago
  const proximaFechaPago = calcularProximaFechaQuincenal(fechaActual);
  
  // Período actual (próximo a vencer)
  const periodoActual: PeriodoQuincenal = {
    fecha: proximaFechaPago,
    montoIntereses: interesesPorQuincena,
    vencido: false,
    diasVencido: 0
  };
  
  // Intereses actuales (de la quincena presente)
  const interesesActuales = interesesPorQuincena;
  
  return {
    interesesActuales: interesesActuales || 0,
    interesesAtrasados: totalInteresesAtrasados || 0,
    totalInteresesPendientes: (totalInteresesAtrasados + interesesActuales) || 0,
    capitalPendiente: saldoCapital,
    totalAPagar: (totalInteresesAtrasados + interesesActuales) || 0,
    proximaFechaPago,
    periodosVencidos,
    periodoActual
  };
};

/**
 * Formatea la información del próximo pago para mostrar en la UI
 */
export const formatearProximoPago = (calculo: CalculoQuincenal): string => {
  const fecha = calculo.proximaFechaPago.toLocaleDateString('es-PA');
  
  if (calculo.interesesAtrasados > 0) {
    return `${fecha} - ${formatCurrency(calculo.totalAPagar)} (${calculo.periodosVencidos.length} quincenas atrasadas)`;
  } else {
    return `${fecha} - ${formatCurrency(calculo.interesesActuales)} (intereses actuales)`;
  }
};

/**
 * Obtiene el estado del préstamo basado en los pagos
 */
export const obtenerEstadoPrestamo = (
  calculo: CalculoQuincenal,
  saldoCapital: number
): 'activo' | 'atrasado' | 'finalizado' => {
  if (saldoCapital <= 0.01) {
    return 'finalizado';
  }
  
  if (calculo.periodosVencidos.length > 0) {
    return 'atrasado';
  }
  
  return 'activo';
};

// ✅ FUNCIONES PARA SISTEMA DIARIO (mantenidas por compatibilidad)
export const calcularInteresesAcumulados = (
  capitalActual: number,
  tasaInteresAnual: number,
  fechaUltimaActualizacion: Date,
  fechaActual: Date = new Date()
): CalculoIntereses => {
  const diasTranscurridos = Math.floor(
    (fechaActual.getTime() - fechaUltimaActualizacion.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (diasTranscurridos <= 0) {
    return {
      interesesDiarios: 0,
      interesesAcumulados: 0,
      diasTranscurridos: 0
    };
  }

  const tasaDiaria = tasaInteresAnual / 365 / 100;
  const interesesDiarios = capitalActual * tasaDiaria;
  const interesesAcumulados = interesesDiarios * diasTranscurridos;

  return {
    interesesDiarios,
    interesesAcumulados,
    diasTranscurridos
  };
};

export const distribuirPago = (
  montoPagado: number,
  saldoCapital: number,
  interesesPendientes: number,
  moraAcumulada: number
): DistribucionPago => {
  let montoRestante = montoPagado;

  // 1. Primero se paga la mora
  const montoMora = Math.min(montoRestante, moraAcumulada);
  montoRestante -= montoMora;

  // 2. Luego los intereses
  const montoIntereses = Math.min(montoRestante, interesesPendientes);
  montoRestante -= montoIntereses;

  // 3. Finalmente el capital
  const montoCapital = Math.min(montoRestante, saldoCapital);
  montoRestante -= montoCapital;

  return {
    montoMora,
    montoIntereses,
    montoCapital,
    sobrante: montoRestante
  };
};

export const estaPrestamoFinalizado = (saldoCapital: number): boolean => {
  return saldoCapital <= 0.01; // Considerar centavos como finalizado
};

export const calcularPagoSugeridoIndefinido = (
  saldoCapital: number,
  interesesPendientes: number,
  porcentajeCapital: number = 0.1 // 10% del capital por defecto
): number => {
  const pagoCapital = saldoCapital * porcentajeCapital;
  return pagoCapital + interesesPendientes;
};