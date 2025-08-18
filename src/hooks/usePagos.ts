// src/hooks/usePagos.ts - Versión completa con hook principal
import { useCallback } from 'react';
import { collection, doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  calcularInteresesPrestamoIndefinido, 
  esPrestamoIndefinido, 
  recalcularProximoPagoIndefinido,
  calcularProximaFechaQuincenal,
  formatCurrency 
} from '@/types/prestamos';

// Definir el tipo del préstamo
interface PrestamoIndefinido {
  id: string;
  saldoCapital?: number;
  monto: number;
  tasaInteres: number;
  fechaInicio: Date;
  interesesPendientes?: number;
  moraAcumulada?: number;
  clienteId: string;
  estado: string;
  interesesPagados?: number;
  esPlazoIndefinido?: boolean;
  tipoTasa?: string;
  plazo?: number;
}

// Función auxiliar para limpiar datos antes de enviar a Firebase
const limpiarDatosParaFirebase = (data: any) => {
  const cleaned = { ...data };
  
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined) {
      cleaned[key] = null;
    }
  });
  
  return cleaned;
};

// Función auxiliar para generar número de pago
const generarNumeroPago = async (): Promise<string> => {
  const fecha = new Date();
  const año = fecha.getFullYear().toString().slice(-2);
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const dia = fecha.getDate().toString().padStart(2, '0');
  
  const timestamp = Date.now().toString().slice(-4);
  return `PG${año}${mes}${dia}${timestamp}`;
};

// Distribución de pagos con validación de regla de capital
export const distribuirPagoPrestamoIndefinido = (
  montoPagado: number,
  saldoCapital: number,
  interesesPendientes: number,
  moraAcumulada: number = 0
): {
  montoMora: number;
  montoIntereses: number;
  montoCapital: number;
  sobrante: number;
  puedeAbonarCapital: boolean;
} => {
  let montoRestante = montoPagado;

  // 1. Pagar mora primero
  const montoMora = Math.min(montoRestante, moraAcumulada);
  montoRestante -= montoMora;

  // 2. Pagar intereses
  const montoIntereses = Math.min(montoRestante, interesesPendientes);
  montoRestante -= montoIntereses;

  // 3. REGLA CLAVE: Solo se puede abonar a capital si NO quedan intereses pendientes
  const interesesRestantes = interesesPendientes - montoIntereses;
  const puedeAbonarCapital = interesesRestantes <= 0;
  
  let montoCapital = 0;
  if (puedeAbonarCapital) {
    montoCapital = Math.min(montoRestante, saldoCapital);
    montoRestante -= montoCapital;
  }

  return {
    montoMora,
    montoIntereses,
    montoCapital,
    sobrante: montoRestante,
    puedeAbonarCapital
  };
};

// Hook para préstamos indefinidos
export const usePagosIndefinidos = (empresaActual: { id: string } | null, user: { uid: string } | null) => {
  
  const procesarPagoPrestamoIndefinido = useCallback(async (
    prestamoId: string,
    montoPagado: number,
    metodoPago: string,
    referenciaPago?: string,
    observaciones?: string
  ): Promise<string> => {
    if (!empresaActual?.id || !user?.uid) {
      throw new Error('No hay empresa o usuario seleccionado');
    }

    try {
      // Obtener datos del préstamo
      const prestamoDoc = await getDoc(doc(db, 'prestamos', prestamoId));
      if (!prestamoDoc.exists()) {
        throw new Error('El préstamo no existe');
      }

      const prestamoData = prestamoDoc.data();
      const prestamo: PrestamoIndefinido = {
        id: prestamoDoc.id,
        monto: prestamoData.monto,
        tasaInteres: prestamoData.tasaInteres,
        clienteId: prestamoData.clienteId,
        estado: prestamoData.estado,
        ...prestamoData,
        fechaInicio: prestamoData.fechaInicio?.toDate?.() || prestamoData.fechaInicio || new Date(),
        esPlazoIndefinido: prestamoData.esPlazoIndefinido ?? true,
        saldoCapital: prestamoData.saldoCapital ?? prestamoData.monto,
        interesesPendientes: prestamoData.interesesPendientes ?? 0,
        moraAcumulada: prestamoData.moraAcumulada ?? 0,
        interesesPagados: prestamoData.interesesPagados ?? 0
      };

      // Calcular distribución del pago
      const distribucion = distribuirPagoPrestamoIndefinido(
        montoPagado,
        prestamo.saldoCapital || prestamo.monto,
        prestamo.interesesPendientes || 0,
        prestamo.moraAcumulada || 0
      );

      // Crear batch para transacción
      const batch = writeBatch(db);
      
      // Generar número de pago
      const numeroPago = await generarNumeroPago();

      // Preparar datos del pago
      const pagoData = limpiarDatosParaFirebase({
        numero: numeroPago,
        prestamoId,
        clienteId: prestamo.clienteId,
        empresaId: empresaActual.id,
        montoPagado,
        montoMora: distribucion.montoMora,
        montoIntereses: distribucion.montoIntereses,
        montoCapital: distribucion.montoCapital,
        sobrante: distribucion.sobrante,
        metodoPago,
        referenciaPago: referenciaPago || null,
        observaciones: observaciones || null,
        fechaPago: new Date(),
        fechaCreacion: serverTimestamp(),
        creadoPor: user.uid,
        estado: 'completado'
      });

      // Agregar el pago
      const pagoRef = doc(collection(db, 'pagos'));
      batch.set(pagoRef, pagoData);

      // Actualizar el préstamo
      const nuevoSaldoCapital = (prestamo.saldoCapital || prestamo.monto) - distribucion.montoCapital;
      const nuevosInteresesPendientes = (prestamo.interesesPendientes || 0) - distribucion.montoIntereses;
      const nuevosInteresesPagados = (prestamo.interesesPagados || 0) + distribucion.montoIntereses;
      const nuevaMoraAcumulada = (prestamo.moraAcumulada || 0) - distribucion.montoMora;

      const datosActualizacionPrestamo = limpiarDatosParaFirebase({
        saldoCapital: nuevoSaldoCapital,
        interesesPendientes: Math.max(0, nuevosInteresesPendientes),
        interesesPagados: nuevosInteresesPagados,
        moraAcumulada: Math.max(0, nuevaMoraAcumulada),
        ultimaActualizacion: serverTimestamp(),
        estado: nuevoSaldoCapital <= 0 ? 'pagado' : 'activo'
      });

      const prestamoRef = doc(db, 'prestamos', prestamoId);
      batch.update(prestamoRef, datosActualizacionPrestamo);

      // Ejecutar la transacción
      await batch.commit();

      console.log('✅ Pago procesado exitosamente:', numeroPago);
      return numeroPago;

    } catch (error: any) {
      console.error('❌ Error procesando pago:', error);
      throw new Error(error.message || 'Error al procesar el pago');
    }
  }, [empresaActual?.id, user?.uid]);

  return {
    procesarPagoPrestamoIndefinido,
    distribuirPagoPrestamoIndefinido
  };
};

// Hook principal que incluye todas las funcionalidades de pagos
export const usePagos = (empresaActual: { id: string } | null, user: { uid: string } | null) => {
  const pagosIndefinidos = usePagosIndefinidos(empresaActual, user);

  // Función genérica para procesar pagos (puede manejar diferentes tipos)
  const procesarPago = useCallback(async (
    prestamoId: string,
    montoPagado: number,
    metodoPago: string,
    referenciaPago?: string,
    observaciones?: string
  ): Promise<string> => {
    // Por ahora, asumimos que todos son préstamos indefinidos
    // Aquí puedes agregar lógica para determinar el tipo de préstamo
    return pagosIndefinidos.procesarPagoPrestamoIndefinido(
      prestamoId,
      montoPagado,
      metodoPago,
      referenciaPago,
      observaciones
    );
  }, [pagosIndefinidos]);

  return {
    // Funciones genéricas
    procesarPago,
    
    // Funciones específicas para préstamos indefinidos
    procesarPagoPrestamoIndefinido: pagosIndefinidos.procesarPagoPrestamoIndefinido,
    distribuirPagoPrestamoIndefinido: pagosIndefinidos.distribuirPagoPrestamoIndefinido,
    
    // Funciones de utilidad
    distribuirPago: distribuirPagoPrestamoIndefinido
  };
};