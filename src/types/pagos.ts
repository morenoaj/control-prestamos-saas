// src/types/pagos.ts - Tipos específicos para el módulo de pagos
import { Timestamp } from 'firebase/firestore'

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

export interface CalculoPago {
  montoCapitalPendiente: number
  montoInteresesPendientes: number
  montoMoraPendiente: number
  totalPendiente: number
  diasAtraso: number
  tasaMora: number
  fechaProximoPago: Date
  montoProximoPago: number
}

export interface DetallePago {
  concepto: string
  monto: number
  tipo: 'capital' | 'interes' | 'mora' | 'excedente'
}

export interface ResumenPagos {
  totalPagos: number
  montoTotalPagado: number
  capitalPagado: number
  interesesPagados: number
  moraPagada: number
  ultimoPago?: {
    fecha: Date
    monto: number
    metodo: string
  }
}

// Para el formulario de registro de pagos
export interface PagoFormData {
  prestamoId: string
  montoPagado: number
  metodoPago: string
  referenciaPago?: string
  fechaPago: Date
  observaciones?: string
  comprobante?: File
}