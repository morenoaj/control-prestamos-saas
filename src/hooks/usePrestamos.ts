// src/hooks/usePrestamos.ts - CÓDIGO COMPLETO
'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  Timestamp,
  getDoc
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { Prestamo } from '@/types/database'
import { TipoTasa, EstadoPrestamo } from '@/types/prestamos'

// Interfaz extendida para incluir fecha de creación personalizada
interface PrestamoConFechaPersonalizada extends Omit<Prestamo, 'id' | 'empresaId' | 'numero' | 'fechaCreacion'> {
  fechaCreacion?: Date
}

// Función para limpiar datos antes de enviar a Firebase
const limpiarDatosParaFirebase = (data: any) => {
  const cleaned = { ...data }
  
  // Convertir fechas a Timestamp si es necesario
  if (cleaned.fechaInicio && cleaned.fechaInicio instanceof Date) {
    cleaned.fechaInicio = Timestamp.fromDate(cleaned.fechaInicio)
  }
  if (cleaned.fechaVencimiento && cleaned.fechaVencimiento instanceof Date) {
    cleaned.fechaVencimiento = Timestamp.fromDate(cleaned.fechaVencimiento)
  }
  if (cleaned.fechaProximoPago && cleaned.fechaProximoPago instanceof Date) {
    cleaned.fechaProximoPago = Timestamp.fromDate(cleaned.fechaProximoPago)
  }
  if (cleaned.ultimaActualizacionIntereses && cleaned.ultimaActualizacionIntereses instanceof Date) {
    cleaned.ultimaActualizacionIntereses = Timestamp.fromDate(cleaned.ultimaActualizacionIntereses)
  }
  // Manejar fecha de creación personalizada
  if (cleaned.fechaCreacion && cleaned.fechaCreacion instanceof Date) {
    cleaned.fechaCreacion = Timestamp.fromDate(cleaned.fechaCreacion)
  }
  
  // Eliminar campos undefined
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined) {
      delete cleaned[key]
    }
  })
  
  return cleaned
}

// Generar número único de préstamo
const generarNumeroPrestamo = async (empresaId: string): Promise<string> => {
  const fecha = new Date()
  const año = fecha.getFullYear().toString().slice(-2)
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0')
  const dia = fecha.getDate().toString().padStart(2, '0')
  
  // Contar préstamos del día para generar secuencial
  const prestamosRef = collection(db, 'prestamos')
  const q = query(
    prestamosRef, 
    where('empresaId', '==', empresaId),
    where('fechaCreacion', '>=', Timestamp.fromDate(new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()))),
    where('fechaCreacion', '<', Timestamp.fromDate(new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1)))
  )
  
  return new Promise((resolve) => {
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const count = snapshot.size + 1
      const numero = `PR${año}${mes}${dia}${count.toString().padStart(3, '0')}`
      unsubscribe()
      resolve(numero)
    })
  })
}

// Calcular próxima fecha quincenal (15 y 30)
export const calcularProximaFechaQuincenal = (fechaBase: Date): Date => {
  const fecha = new Date(fechaBase)
  const dia = fecha.getDate()
  
  if (dia <= 15) {
    fecha.setDate(15)
  } else {
    fecha.setMonth(fecha.getMonth() + 1, 15)
  }
  
  return fecha
}

// Funciones de cálculo existentes
export const calcularInteresesSimples = (
  capital: number, 
  tasa: number, 
  plazo: number, 
  tipoTasa: TipoTasa
): number => {
  if (!capital || !tasa || !plazo) return 0
  
  let tasaDecimal = tasa / 100
  
  switch (tipoTasa) {
    case 'quincenal':
      return capital * tasaDecimal * plazo
    case 'mensual':
      return capital * tasaDecimal * plazo
    case 'anual':
      return capital * tasaDecimal * plazo
    default:
      return 0
  }
}

export const calcularMontoCuotaFija = (
  capital: number, 
  tasa: number, 
  plazo: number, 
  tipoTasa: TipoTasa
): number => {
  if (!capital || !tasa || !plazo) return 0
  
  const intereses = calcularInteresesSimples(capital, tasa, plazo, tipoTasa)
  return (capital + intereses) / plazo
}

export const calcularDiasAtraso = (fechaVencimiento: Date): number => {
  const hoy = new Date()
  const diffTime = hoy.getTime() - fechaVencimiento.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

export const determinarEstadoPrestamo = (
  saldoCapital: number,
  fechaProximoPago?: Date,
  diasAtraso: number = 0  // ✅ Debe ser número, no objeto Prestamo
): EstadoPrestamo => {
  if (saldoCapital <= 0) return 'finalizado'
  if (diasAtraso > 30) return 'atrasado'
  if (fechaProximoPago && calcularDiasAtraso(fechaProximoPago) > 0) return 'atrasado'
  return 'activo'
}

export const usePrestamos = () => {
  const { empresaActual, user } = useAuth()
  const [prestamos, setPrestamos] = useState<Prestamo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Obtener referencia de colección
  const getPrestamosCollection = useCallback(() => {
    if (!empresaActual?.id) return null
    return collection(db, 'prestamos')
  }, [empresaActual?.id])

  // Cargar préstamos en tiempo real
  useEffect(() => {
    if (!empresaActual?.id) {
      setPrestamos([])
      setLoading(false)
      return
    }

    const prestamosRef = getPrestamosCollection()
    if (!prestamosRef) {
      setLoading(false)
      return
    }

    const q = query(
      prestamosRef,
      where('empresaId', '==', empresaActual.id),
      orderBy('fechaCreacion', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const prestamosData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Prestamo[]
        
        setPrestamos(prestamosData)
        setLoading(false)
        setError(null)
      },
      (error) => {
        console.error('Error obteniendo préstamos:', error)
        setError('Error al cargar los préstamos')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [empresaActual?.id, getPrestamosCollection])

  // Crear préstamo con fecha personalizada
  const crearPrestamo = useCallback(async (prestamoData: PrestamoConFechaPersonalizada): Promise<string> => {
    if (!empresaActual?.id || !user?.uid) {
      throw new Error('No hay empresa o usuario seleccionado')
    }

    const prestamosRef = getPrestamosCollection()
    if (!prestamosRef) {
      throw new Error('No se pudo acceder a la colección de préstamos')
    }

    try {
      console.log('💰 Creando préstamo:', prestamoData)

      // Verificar que el cliente existe
      const clienteDoc = await getDoc(doc(db, 'clientes', prestamoData.clienteId))
      if (!clienteDoc.exists()) {
        throw new Error('El cliente seleccionado no existe')
      }

      // Usar fecha personalizada o actual
      const fechaCreacionFinal = prestamoData.fechaCreacion || new Date()
      
      // Generar número único basado en la fecha de creación
      const numero = await generarNumeroPrestamo(empresaActual.id)

      // Detectar tipo de préstamo
      const esPrestamoIndefinido = prestamoData.esPlazoIndefinido || 
                                  prestamoData.tipoTasa === 'indefinido' || 
                                  !prestamoData.plazo || 
                                  prestamoData.plazo <= 0

      console.log('🔍 Tipo de préstamo en hook:', {
        esIndefinido: esPrestamoIndefinido,
        plazo: prestamoData.plazo,
        tipoTasa: prestamoData.tipoTasa,
        fechaCreacion: fechaCreacionFinal.toLocaleDateString('es-PA')
      })

      // Calcular fechas basadas en la fecha de creación personalizada
      const fechaInicio = fechaCreacionFinal
      let fechaVencimiento: Date | null = null
      let fechaProximoPago: Date
      let interesesTotales = 0
      let montoCuota = 0

      if (esPrestamoIndefinido) {
        // Préstamos indefinidos: próxima fecha quincenal basada en fecha de creación
        fechaProximoPago = calcularProximaFechaQuincenal(fechaInicio)
        montoCuota = prestamoData.monto * (prestamoData.tasaInteres / 100)
        fechaVencimiento = null
        
        console.log('📅 Préstamo indefinido - Próximo pago:', fechaProximoPago.toLocaleDateString())
      } else {
        // Préstamos con plazo fijo basados en fecha de creación
        fechaVencimiento = new Date(fechaInicio)
        fechaProximoPago = new Date(fechaInicio)
        
        switch (prestamoData.tipoTasa) {
          case 'quincenal':
            fechaVencimiento.setDate(fechaInicio.getDate() + (prestamoData.plazo! * 15))
            fechaProximoPago.setDate(fechaInicio.getDate() + 15)
            break
          case 'mensual':
            fechaVencimiento.setMonth(fechaInicio.getMonth() + prestamoData.plazo!)
            fechaProximoPago.setMonth(fechaInicio.getMonth() + 1)
            break
          case 'anual':
            fechaVencimiento.setFullYear(fechaInicio.getFullYear() + prestamoData.plazo!)
            fechaProximoPago.setFullYear(fechaInicio.getFullYear() + 1)
            break
        }

        // Calcular intereses y cuota para préstamos con plazo
        interesesTotales = calcularInteresesSimples(
          prestamoData.monto,
          prestamoData.tasaInteres,
          prestamoData.plazo!,
          prestamoData.tipoTasa
        )
        
        montoCuota = calcularMontoCuotaFija(
          prestamoData.monto,
          prestamoData.tasaInteres,
          prestamoData.plazo!,
          prestamoData.tipoTasa
        )

        console.log('📅 Préstamo con plazo - Vencimiento:', fechaVencimiento?.toLocaleDateString())
      }

      // Construir objeto préstamo final
      const nuevoPrestamo = {
        ...prestamoData,
        empresaId: empresaActual.id,
        numero,
        usuarioCreador: user.uid,
        fechaInicio: fechaInicio,
        fechaCreacion: fechaCreacionFinal, // Incluir fecha de creación personalizada
        ...(fechaVencimiento && !esPrestamoIndefinido && { fechaVencimiento }),
        plazo: esPrestamoIndefinido ? undefined : prestamoData.plazo,
        esPlazoIndefinido: esPrestamoIndefinido,
        saldoCapital: prestamoData.monto,
        interesesPendientes: interesesTotales,
        interesesPagados: 0,
        diasAtraso: 0,
        moraAcumulada: 0,
        fechaProximoPago: fechaProximoPago,
        montoProximoPago: isNaN(montoCuota) || montoCuota <= 0 ? 
          prestamoData.monto * (prestamoData.tasaInteres / 100) : montoCuota,
        estado: 'activo' as EstadoPrestamo,
        ...(esPrestamoIndefinido && { ultimaActualizacionIntereses: fechaInicio })
      }

      console.log('💾 Guardando préstamo:', {
        numero: nuevoPrestamo.numero,
        esIndefinido: esPrestamoIndefinido,
        fechaCreacion: fechaCreacionFinal.toLocaleDateString('es-PA'),
        tieneFechaVencimiento: !esPrestamoIndefinido
      })

      // Limpiar datos y guardar
      const datosLimpios = limpiarDatosParaFirebase(nuevoPrestamo)
      const docRef = await addDoc(prestamosRef, datosLimpios)
      
      console.log('✅ Préstamo creado con ID:', docRef.id)
      return docRef.id
    } catch (error: any) {
      console.error('❌ Error creando préstamo:', error)
      throw new Error(error.message || 'Error al crear el préstamo')
    }
  }, [empresaActual?.id, user?.uid, getPrestamosCollection])

  // Actualizar préstamo
  const actualizarPrestamo = useCallback(async (id: string, datosActualizacion: Partial<Prestamo>): Promise<void> => {
    if (!empresaActual?.id) {
      throw new Error('No hay empresa seleccionada')
    }

    try {
      const prestamoRef = doc(db, 'prestamos', id)
      const datosLimpios = limpiarDatosParaFirebase(datosActualizacion)
      await updateDoc(prestamoRef, datosLimpios)
      console.log('✅ Préstamo actualizado:', id)
    } catch (error: any) {
      console.error('❌ Error actualizando préstamo:', error)
      throw new Error(error.message || 'Error al actualizar el préstamo')
    }
  }, [empresaActual?.id])

  // Eliminar préstamo
  const eliminarPrestamo = useCallback(async (id: string): Promise<void> => {
    if (!empresaActual?.id) {
      throw new Error('No hay empresa seleccionada')
    }

    try {
      const prestamoRef = doc(db, 'prestamos', id)
      await deleteDoc(prestamoRef)
      console.log('✅ Préstamo eliminado:', id)
    } catch (error: any) {
      console.error('❌ Error eliminando préstamo:', error)
      throw new Error(error.message || 'Error al eliminar el préstamo')
    }
  }, [empresaActual?.id])

  // Funciones adicionales requeridas por la página
  const obtenerPrestamo = useCallback((id: string): Prestamo | undefined => {
    return prestamos.find(prestamo => prestamo.id === id)
  }, [prestamos])

  const obtenerPrestamosPorCliente = useCallback((clienteId: string): Prestamo[] => {
    return prestamos.filter(prestamo => prestamo.clienteId === clienteId)
  }, [prestamos])

  const calcularIntereses = useCallback((prestamo: Prestamo): number => {
    if (!prestamo.ultimaActualizacionIntereses) return 0
    
    const fechaUltimaActualizacion = prestamo.ultimaActualizacionIntereses.toDate()
    const fechaActual = new Date()
    const diasTranscurridos = Math.floor((fechaActual.getTime() - fechaUltimaActualizacion.getTime()) / (1000 * 60 * 60 * 24))
    
    return (prestamo.saldoCapital * (prestamo.tasaInteres / 100) * diasTranscurridos) / 15
  }, [])

  const calcularMontoCuota = useCallback((prestamo: Prestamo): number => {
    if (!prestamo.plazo || prestamo.esPlazoIndefinido) {
      // Para préstamos indefinidos, retornar intereses por quincena
      return prestamo.monto * (prestamo.tasaInteres / 100)
    }
    
    return calcularMontoCuotaFija(
      prestamo.monto,
      prestamo.tasaInteres,
      prestamo.plazo,
      prestamo.tipoTasa
    )
  }, [])

  const actualizarEstadoPrestamo = useCallback(async (
    id: string, 
    nuevoEstado: EstadoPrestamo
  ): Promise<void> => {
    await actualizarPrestamo(id, { estado: nuevoEstado })
  }, [actualizarPrestamo])

  const recargarPrestamos = useCallback(async (): Promise<void> => {
    if (!empresaActual?.id) {
      console.warn('No hay empresa seleccionada para recargar préstamos')
      return
    }

    // No necesitamos hacer nada especial aquí porque el useEffect
    // ya maneja la carga en tiempo real con onSnapshot
    console.log('🔄 Recargando préstamos (manejado por onSnapshot)')
  }, [empresaActual?.id])

  return {
    prestamos,
    loading,
    error,
    crearPrestamo,
    actualizarPrestamo,
    eliminarPrestamo,
    obtenerPrestamo,
    obtenerPrestamosPorCliente,
    calcularIntereses,
    calcularMontoCuota,
    actualizarEstadoPrestamo,
    recargarPrestamos,
    calcularProximaFechaQuincenal,
    calcularInteresesSimples,
    calcularMontoCuotaFija,
    calcularDiasAtraso,
    determinarEstadoPrestamo
  }
}
