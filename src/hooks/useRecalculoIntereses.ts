// src/hooks/useRecalculoIntereses.ts

import { useCallback, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { calcularInteresesPrestamoIndefinido, esPrestamoIndefinido } from '@/types/prestamos';

// Tipo para préstamo con propiedades necesarias
interface PrestamoData {
  id: string;
  fechaUltimaActualizacionIntereses?: { toDate(): Date };
  fechaInicio?: { toDate(): Date };
  saldoCapital?: number;
  monto?: number;
  tasaInteres: number;
  interesesPendientes?: number;
  numero?: string;
  esPlazoIndefinido?: boolean;
  tipoTasa?: string;
  plazo?: number;
}

export const useRecalculoIntereses = (empresaId: string) => {
  
  // Función para recalcular intereses de un préstamo específico
  const recalcularInteresesPrestamo = useCallback(async (prestamo: PrestamoData): Promise<boolean> => {
    try {
      if (!esPrestamoIndefinido(prestamo)) {
        return false; // Solo procesar préstamos indefinidos
      }

      const ahora = new Date();
      const fechaUltimaActualizacion = prestamo.fechaUltimaActualizacionIntereses?.toDate() || prestamo.fechaInicio?.toDate();
      
      if (!fechaUltimaActualizacion) {
        console.warn('Préstamo sin fecha de última actualización:', prestamo.id);
        return false;
      }

      // Calcular intereses desde la última actualización
      const calculoIntereses = calcularInteresesPrestamoIndefinido(
        prestamo.saldoCapital || prestamo.monto || 0,
        prestamo.tasaInteres || 0,
        fechaUltimaActualizacion,
        ahora,
        prestamo.interesesPendientes || 0
      );

      // Solo actualizar si hay nuevos intereses
      if (calculoIntereses.interesesAtrasados > 0) {
        const prestamoRef = doc(db, 'prestamos', prestamo.id);
        
        await updateDoc(prestamoRef, {
          interesesPendientes: calculoIntereses.totalInteresesPendientes,
          montoProximoPago: calculoIntereses.totalAPagar,
          fechaProximoPago: calculoIntereses.proximaFechaPago,
          fechaUltimaActualizacionIntereses: ahora,
          // Actualizar estado si está atrasado
          ...(ahora > calculoIntereses.proximaFechaPago && { estado: 'atrasado' })
        });

        console.log(`✅ Intereses recalculados para préstamo ${prestamo.numero}:`, {
          interesesNuevos: calculoIntereses.interesesAtrasados,
          totalPendientes: calculoIntereses.totalInteresesPendientes
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error recalculando intereses:', error);
      return false;
    }
  }, []);

  // Función para recalcular todos los préstamos indefinidos activos
  const recalcularTodosLosIntereses = useCallback(async (): Promise<number> => {
    if (!empresaId) return 0;

    try {
      console.log('🔄 Iniciando recálculo masivo de intereses...');

      const prestamosRef = collection(db, 'prestamos');
      const q = query(
        prestamosRef,
        where('empresaId', '==', empresaId),
        where('estado', 'in', ['activo', 'atrasado']),
        where('esPlazoIndefinido', '==', true)
      );

      return new Promise((resolve) => {
        const unsubscribe = onSnapshot(q, async (snapshot) => {
          unsubscribe(); // Solo ejecutar una vez
          
          const prestamos: PrestamoData[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as PrestamoData));

          let prestamosActualizados = 0;
          const batch = writeBatch(db);
          const ahora = new Date();

          for (const prestamo of prestamos) {
            try {
              const fechaUltimaActualizacion = prestamo.fechaUltimaActualizacionIntereses?.toDate() || prestamo.fechaInicio?.toDate();
              
              if (!fechaUltimaActualizacion) continue;

              const calculoIntereses = calcularInteresesPrestamoIndefinido(
                prestamo.saldoCapital || prestamo.monto || 0,
                prestamo.tasaInteres || 0,
                fechaUltimaActualizacion,
                ahora,
                prestamo.interesesPendientes || 0
              );

              if (calculoIntereses.interesesAtrasados > 0) {
                const prestamoRef = doc(db, 'prestamos', prestamo.id);
                
                batch.update(prestamoRef, {
                  interesesPendientes: calculoIntereses.totalInteresesPendientes,
                  montoProximoPago: calculoIntereses.totalAPagar,
                  fechaProximoPago: calculoIntereses.proximaFechaPago,
                  fechaUltimaActualizacionIntereses: ahora,
                  ...(ahora > calculoIntereses.proximaFechaPago && { estado: 'atrasado' })
                });

                prestamosActualizados++;
              }
            } catch (error) {
              console.error(`Error procesando préstamo ${prestamo.id}:`, error);
            }
          }

          if (prestamosActualizados > 0) {
            await batch.commit();
            console.log(`✅ ${prestamosActualizados} préstamos actualizados en recálculo masivo`);
          }

          resolve(prestamosActualizados);
        });
      });

    } catch (error) {
      console.error('❌ Error en recálculo masivo:', error);
      return 0;
    }
  }, [empresaId]);

  // Efecto para recálculo automático cada hora
  useEffect(() => {
    if (!empresaId) return;

    // Recálculo inicial
    recalcularTodosLosIntereses();

    // Configurar recálculo automático cada hora
    const interval = setInterval(() => {
      recalcularTodosLosIntereses();
    }, 60 * 60 * 1000); // 1 hora

    return () => clearInterval(interval);
  }, [empresaId, recalcularTodosLosIntereses]);

  return {
    recalcularInteresesPrestamo,
    recalcularTodosLosIntereses
  };
};