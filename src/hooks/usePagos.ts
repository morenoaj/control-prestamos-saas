// src/hooks/usePagos.ts - Lógica mejorada para préstamos indefinidos

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
  
  // Convertir undefined a null para Firebase
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined) {
      cleaned[key] = null;
    }
    // Convertir Date objects a Timestamp si es necesario
    if (cleaned[key] instanceof Date) {
      // Mantener las fechas como Date objects, Firebase las convertirá automáticamente
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
  
  // Generar número secuencial simple
  const timestamp = Date.now().toString().slice(-4);
  return `PG${año}${mes}${dia}${timestamp}`;
};

// Distribución de pagos con validación de regla de capital
const distribuirPagoPrestamoIndefinido = (
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
    // Si está al día en intereses, el resto va a capital
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

// Hook principal para pagos de préstamos indefinidos
export const usePagosIndefinidos = (empresaActual: { id: string } | null, user: { uid: string } | null) => {
  
  // Función principal para procesar pagos en préstamos indefinidos
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
        // Asegurar que fechaInicio sea un Date object
        fechaInicio: prestamoData.fechaInicio?.toDate?.() || prestamoData.fechaInicio || new Date(),
        // Valores por defecto para propiedades opcionales
        esPlazoIndefinido: prestamoData.esPlazoIndefinido ?? true,
        tipoTasa: prestamoData.tipoTasa || 'fija',
        plazo: prestamoData.plazo || 0
      };

      // Verificar que es un préstamo indefinido
      if (!esPrestamoIndefinido(prestamo)) {
        throw new Error('Este proceso es solo para préstamos indefinidos');
      }

      // Calcular intereses acumulados hasta la fecha
      const calculoIntereses = calcularInteresesPrestamoIndefinido(
        prestamo.saldoCapital || prestamo.monto,
        prestamo.tasaInteres,
        prestamo.fechaInicio,
        new Date(),
        prestamo.interesesPendientes || 0
      );

      // Distribuir el pago según las reglas
      const distribucion = distribuirPagoPrestamoIndefinido(
        montoPagado,
        prestamo.saldoCapital || prestamo.monto,
        calculoIntereses.totalInteresesPendientes,
        prestamo.moraAcumulada || 0
      );

      // Crear el registro de pago
      const numero = await generarNumeroPago();
      
      const pagoData = {
        empresaId: empresaActual.id,
        numero,
        prestamoId,
        clienteId: prestamo.clienteId,
        usuarioRegistro: user.uid,
        montoPagado,
        montoCapital: distribucion.montoCapital,
        montoIntereses: distribucion.montoIntereses,
        montoMora: distribucion.montoMora,
        metodoPago,
        fechaPago: new Date(),
        fechaRegistro: serverTimestamp(),
        esPrestamoIndefinido: true,
        puedeAbonarCapital: distribucion.puedeAbonarCapital,
        ...(referenciaPago && { referenciaPago }),
        ...(observaciones && { observaciones })
      };

      // Calcular nuevos valores del préstamo
      const nuevoSaldoCapital = (prestamo.saldoCapital || prestamo.monto) - distribucion.montoCapital;
      const nuevosInteresesPendientes = calculoIntereses.totalInteresesPendientes - distribucion.montoIntereses;
      const nuevaMoraAcumulada = (prestamo.moraAcumulada || 0) - distribucion.montoMora;

      // Determinar el estado del préstamo
      let nuevoEstado = prestamo.estado;
      let fechaProximoPago: Date | null = null;
      let montoProximoPago = 0;

      if (nuevoSaldoCapital <= 0) {
        // Préstamo finalizado
        nuevoEstado = 'finalizado';
        fechaProximoPago = null;
        montoProximoPago = 0;
      } else {
        // Calcular próximo pago basado en el nuevo saldo capital
        nuevoEstado = 'activo';
        fechaProximoPago = calcularProximaFechaQuincenal(new Date());
        montoProximoPago = recalcularProximoPagoIndefinido(nuevoSaldoCapital, prestamo.tasaInteres);
      }

      // Usar batch para operaciones atómicas
      const batch = writeBatch(db);
      
      // Crear el pago
      const pagoRef = doc(collection(db, 'pagos'));
      batch.set(pagoRef, limpiarDatosParaFirebase(pagoData));

      // Actualizar el préstamo
      const prestamoActualizado = {
        saldoCapital: nuevoSaldoCapital,
        interesesPendientes: nuevosInteresesPendientes,
        moraAcumulada: nuevaMoraAcumulada,
        interesesPagados: (prestamo.interesesPagados || 0) + distribucion.montoIntereses,
        fechaUltimoPago: new Date(),
        fechaProximoPago,
        montoProximoPago,
        estado: nuevoEstado,
        // Actualizar fecha de última actualización de intereses
        fechaUltimaActualizacionIntereses: new Date()
      };

      const prestamoRef = doc(db, 'prestamos', prestamoId);
      batch.update(prestamoRef, limpiarDatosParaFirebase(prestamoActualizado));

      // Ejecutar transacción
      await batch.commit();

      // Mostrar resumen del pago
      const mensajes = [];
      if (distribucion.montoMora > 0) mensajes.push(`Mora: ${formatCurrency(distribucion.montoMora)}`);
      if (distribucion.montoIntereses > 0) mensajes.push(`Intereses: ${formatCurrency(distribucion.montoIntereses)}`);
      if (distribucion.montoCapital > 0) mensajes.push(`Capital: ${formatCurrency(distribucion.montoCapital)}`);
      if (!distribucion.puedeAbonarCapital && distribucion.sobrante > 0) {
        mensajes.push('⚠️ No se pudo abonar a capital: debe estar al día en intereses');
      }

      console.log('✅ Pago de préstamo indefinido procesado:', {
        pagoId: pagoRef.id,
        distribucion,
        nuevoSaldoCapital,
        nuevoEstado
      });

      return pagoRef.id;

    } catch (error: unknown) {
      console.error('❌ Error procesando pago de préstamo indefinido:', error);
      throw new Error(error instanceof Error ? error.message : 'Error al procesar el pago');
    }
  }, [empresaActual?.id, user?.uid]);

  return {
    procesarPagoPrestamoIndefinido,
    distribuirPagoPrestamoIndefinido
  };
};