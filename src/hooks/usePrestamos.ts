// src/hooks/usePrestamos.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDoc
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Prestamo, Cliente } from '@/types/database'
import { useAuth } from '@/context/AuthContext'
import { convertirFecha } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

interface UsePrestamosReturn {
  prestamos: Prestamo[]
  loading: boolean
  error: string | null
  crearPrestamo: (prestamoData: Omit<Prestamo, 'id' | 'empresaId' | 'numero' | 'fechaCreacion'>) => Promise<string>
  actualizarPrestamo: (id: string, prestamoData: Partial<Prestamo>) => Promise<void>
  eliminarPrestamo: (id: string) => Promise<void>
  obtenerPrestamo: (id: string) => Prestamo | undefined
  obtenerPrestamosPorCliente: (clienteId: string) => Prestamo[]
  calcularIntereses: (prestamo: Prestamo) => number
  calcularMontoCuota: (prestamo: Prestamo) => number
  actualizarEstadoPrestamo: (id: string, nuevoEstado: Prestamo['estado']) => Promise<void>
  recargarPrestamos: () => Promise<void>
}

// Función para limpiar datos antes de enviar a Firebase
const limpiarDatosParaFirebase = (data: any): any => {
  const cleaned: any = {}
  
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        const cleanedObject = limpiarDatosParaFirebase(value)
        if (Object.keys(cleanedObject).length > 0) {
          cleaned[key] = cleanedObject
        }
      } else {
        cleaned[key] = value
      }
    }
  }
  
  return cleaned
}

// Función para generar número de préstamo único
const generarNumeroPrestamo = async (empresaId: string): Promise<string> => {
  const fecha = new Date()
  const año = fecha.getFullYear().toString().slice(-2)
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0')
  const timestamp = Date.now().toString().slice(-6)
  
  return `PR${año}${mes}${timestamp}`
}

// Funciones de cálculo
export const calcularInteresesSimples = (
  capital: number, 
  tasaAnual: number, 
  periodos: number, 
  tipoPeriodo: 'quincenal' | 'mensual' | 'anual' = 'mensual'
): number => {
  let tasaPorPeriodo: number
  
  switch (tipoPeriodo) {
    case 'quincenal':
      tasaPorPeriodo = tasaAnual / 24 // 24 quincenas al año
      break
    case 'mensual':
      tasaPorPeriodo = tasaAnual / 12 // 12 meses al año
      break
    case 'anual':
      tasaPorPeriodo = tasaAnual
      break
    default:
      tasaPorPeriodo = tasaAnual / 12
  }
  
  return capital * (tasaPorPeriodo / 100) * periodos
}

export const calcularMontoCuotaFija = (
  capital: number,
  tasaAnual: number,
  periodos: number,
  tipoPeriodo: 'quincenal' | 'mensual' | 'anual' = 'mensual'
): number => {
  if (periodos === 0) return 0
  
  let tasaPorPeriodo: number
  
  switch (tipoPeriodo) {
    case 'quincenal':
      tasaPorPeriodo = tasaAnual / 24 / 100
      break
    case 'mensual':
      tasaPorPeriodo = tasaAnual / 12 / 100
      break
    case 'anual':
      tasaPorPeriodo = tasaAnual / 100
      break
    default:
      tasaPorPeriodo = tasaAnual / 12 / 100
  }
  
  if (tasaPorPeriodo === 0) {
    return capital / periodos
  }
  
  const factor = Math.pow(1 + tasaPorPeriodo, periodos)
  return capital * (tasaPorPeriodo * factor) / (factor - 1)
}

export const calcularDiasAtraso = (fechaVencimiento: Date | any): number => {
  const hoy = new Date()
  const vencimiento = convertirFecha(fechaVencimiento)
  const diferencia = hoy.getTime() - vencimiento.getTime()
  const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24))
  return Math.max(0, dias)
}

export const determinarEstadoPrestamo = (prestamo: Prestamo): Prestamo['estado'] => {
  const hoy = new Date()
  const fechaVencimiento = convertirFecha(prestamo.fechaVencimiento)
  
  if (prestamo.saldoCapital <= 0) {
    return 'finalizado'
  }
  
  if (hoy > fechaVencimiento) {
    return 'atrasado'
  }
  
  return prestamo.estado
}

export function usePrestamos(): UsePrestamosReturn {
  const { empresaActual, user } = useAuth()
  const [prestamos, setPrestamos] = useState<Prestamo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Obtener referencia de la colección
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
    if (!prestamosRef) return

    setLoading(true)
    setError(null)

    const q = query(
      prestamosRef,
      where('empresaId', '==', empresaActual.id),
      orderBy('fechaInicio', 'desc')
    )

    console.log('💰 Configurando listener para préstamos de empresa:', empresaActual.id)

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const prestamosData: Prestamo[] = []
        snapshot.forEach((doc) => {
          try {
            const data = doc.data()
            
            // Procesar el préstamo incluso si algunas fechas están pendientes
            // Solo validar que los campos existan (pueden ser placeholders)
            if (!data.fechaInicio && !data.fechaVencimiento && !data.fechaProximoPago) {
              console.warn('Préstamo sin fechas:', doc.id, data)
              return // Solo saltar si NO hay ninguna fecha
            }
            
            // Verificar si hay serverTimestamp placeholders
            const fechasConPlaceholder = [
              data.fechaInicio, 
              data.fechaVencimiento, 
              data.fechaProximoPago
            ].filter(fecha => fecha && typeof fecha === 'object' && fecha._methodName === 'serverTimestamp')
            
            if (fechasConPlaceholder.length > 0) {
              console.log(`⏳ Préstamo ${doc.id} tiene ${fechasConPlaceholder.length} fecha(s) con serverTimestamp pendiente, pero será incluido`)
            }
            
            prestamosData.push({
              id: doc.id,
              ...data,
              fechaInicio: data.fechaInicio as Timestamp,
              fechaVencimiento: data.fechaVencimiento as Timestamp,
              fechaProximoPago: data.fechaProximoPago as Timestamp,
            } as Prestamo)
          } catch (error) {
            console.error('Error procesando préstamo:', doc.id, error)
            // Continuar con el siguiente documento
          }
        })
        
        console.log('✅ Préstamos cargados:', prestamosData.length)
        setPrestamos(prestamosData)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('❌ Error cargando préstamos:', err)
        setError('Error al cargar los préstamos')
        setLoading(false)
        toast({
          title: "Error",
          description: "No se pudieron cargar los préstamos",
          variant: "destructive"
        })
      }
    )

    return () => {
      console.log('🔄 Limpiando listener de préstamos')
      unsubscribe()
    }
  }, [empresaActual?.id, getPrestamosCollection])

  // Crear préstamo
  const crearPrestamo = useCallback(async (
    prestamoData: Omit<Prestamo, 'id' | 'empresaId' | 'numero' | 'fechaCreacion'>
  ): Promise<string> => {
    if (!empresaActual?.id || !user?.uid) {
      throw new Error('No hay empresa o usuario seleccionado')
    }

    const prestamosRef = getPrestamosCollection()
    if (!prestamosRef) {
      throw new Error('No se pudo acceder a la colección de préstamos')
    }

    try {
      console.log('💰 Creando préstamo para cliente:', prestamoData.clienteId)

      // Verificar que el cliente existe
      const clienteDoc = await getDoc(doc(db, 'clientes', prestamoData.clienteId))
      if (!clienteDoc.exists()) {
        throw new Error('El cliente seleccionado no existe')
      }

      // Generar número único
      const numero = await generarNumeroPrestamo(empresaActual.id)

      // Calcular fechas y montos
      const fechaInicio = new Date()
      const fechaVencimiento = new Date()
      
      // Calcular fecha de vencimiento según el plazo y tipo de tasa
      switch (prestamoData.tipoTasa) {
        case 'quincenal':
          fechaVencimiento.setDate(fechaInicio.getDate() + (prestamoData.plazo * 15))
          break
        case 'mensual':
          fechaVencimiento.setMonth(fechaInicio.getMonth() + prestamoData.plazo)
          break
        case 'anual':
          fechaVencimiento.setFullYear(fechaInicio.getFullYear() + prestamoData.plazo)
          break
      }

      // Fecha del próximo pago
      const fechaProximoPago = new Date(fechaInicio)
      switch (prestamoData.tipoTasa) {
        case 'quincenal':
          fechaProximoPago.setDate(fechaInicio.getDate() + 15)
          break
        case 'mensual':
          fechaProximoPago.setMonth(fechaInicio.getMonth() + 1)
          break
        case 'anual':
          fechaProximoPago.setFullYear(fechaInicio.getFullYear() + 1)
          break
      }

      // Calcular montos
      const interesesTotales = calcularInteresesSimples(
        prestamoData.monto,
        prestamoData.tasaInteres,
        prestamoData.plazo,
        prestamoData.tipoTasa
      )
      
      const montoCuota = calcularMontoCuotaFija(
        prestamoData.monto,
        prestamoData.tasaInteres,
        prestamoData.plazo,
        prestamoData.tipoTasa
      )

      console.log('📅 Fechas calculadas:', {
        inicio: fechaInicio,
        vencimiento: fechaVencimiento,
        proximoPago: fechaProximoPago
      })

      const nuevoPrestamo = {
        ...prestamoData,
        empresaId: empresaActual.id,
        numero,
        usuarioCreador: user.uid,
        fechaInicio: fechaInicio, // ✅ Usar Date real en lugar de serverTimestamp
        fechaVencimiento: fechaVencimiento, // ✅ Usar Date object
        saldoCapital: prestamoData.monto,
        interesesPendientes: interesesTotales,
        interesesPagados: 0,
        diasAtraso: 0,
        moraAcumulada: 0,
        fechaProximoPago: fechaProximoPago, // ✅ Usar Date object
        montoProximoPago: montoCuota,
        estado: 'activo' as const
      }

      // Validar fechas antes de guardar
      const fechasParaValidar = {
        fechaVencimiento,
        fechaProximoPago
      }
      
      for (const [nombre, fecha] of Object.entries(fechasParaValidar)) {
        if (!fecha || isNaN(fecha.getTime())) {
          throw new Error(`${nombre} es inválida: ${fecha}`)
        }
      }

      const datosLimpios = limpiarDatosParaFirebase(nuevoPrestamo)
      console.log('✨ Datos de préstamo limpios:', datosLimpios)
      console.log('📅 Fechas a guardar:', {
        fechaInicio: 'serverTimestamp()',
        fechaVencimiento: fechaVencimiento.toISOString(),
        fechaProximoPago: fechaProximoPago.toISOString()
      })

      const docRef = await addDoc(prestamosRef, datosLimpios)
      console.log('✅ Préstamo creado con ID:', docRef.id)
      
      return docRef.id
    } catch (error: any) {
      console.error('❌ Error creando préstamo:', error)
      throw new Error(error.message || 'Error al crear el préstamo')
    }
  }, [empresaActual?.id, user?.uid, getPrestamosCollection])

  // Actualizar préstamo
  const actualizarPrestamo = useCallback(async (
    id: string, 
    prestamoData: Partial<Prestamo>
  ): Promise<void> => {
    if (!empresaActual?.id) {
      throw new Error('No hay empresa seleccionada')
    }

    try {
      console.log('📝 Actualizando préstamo:', id)

      const datosLimpios = limpiarDatosParaFirebase(prestamoData)
      const prestamoRef = doc(db, 'prestamos', id)
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
      console.log('🗑️ Eliminando préstamo:', id)

      // TODO: Verificar si el préstamo tiene pagos asociados
      // const pagosQuery = query(
      //   collection(db, 'pagos'),
      //   where('prestamoId', '==', id)
      // )
      // const pagosSnapshot = await getDocs(pagosQuery)
      // if (!pagosSnapshot.empty) {
      //   throw new Error('No se puede eliminar un préstamo con pagos registrados')
      // }

      const prestamoRef = doc(db, 'prestamos', id)
      await deleteDoc(prestamoRef)
      
      console.log('✅ Préstamo eliminado:', id)
    } catch (error: any) {
      console.error('❌ Error eliminando préstamo:', error)
      throw new Error(error.message || 'Error al eliminar el préstamo')
    }
  }, [empresaActual?.id])

  // Obtener préstamo por ID
  const obtenerPrestamo = useCallback((id: string): Prestamo | undefined => {
    return prestamos.find(prestamo => prestamo.id === id)
  }, [prestamos])

  // Obtener préstamos por cliente
  const obtenerPrestamosPorCliente = useCallback((clienteId: string): Prestamo[] => {
    return prestamos.filter(prestamo => prestamo.clienteId === clienteId)
  }, [prestamos])

  // Calcular intereses de un préstamo
  const calcularIntereses = useCallback((prestamo: Prestamo): number => {
    return calcularInteresesSimples(
      prestamo.monto,
      prestamo.tasaInteres,
      prestamo.plazo,
      prestamo.tipoTasa
    )
  }, [])

  // Calcular monto de cuota
  const calcularMontoCuota = useCallback((prestamo: Prestamo): number => {
    return calcularMontoCuotaFija(
      prestamo.monto,
      prestamo.tasaInteres,
      prestamo.plazo,
      prestamo.tipoTasa
    )
  }, [])

  // Actualizar estado del préstamo
  const actualizarEstadoPrestamo = useCallback(async (
    id: string, 
    nuevoEstado: Prestamo['estado']
  ): Promise<void> => {
    await actualizarPrestamo(id, { estado: nuevoEstado })
  }, [actualizarPrestamo])

  // Recargar préstamos manualmente
  const recargarPrestamos = useCallback(async (): Promise<void> => {
    if (!empresaActual?.id) return

    const prestamosRef = getPrestamosCollection()
    if (!prestamosRef) return

    try {
      setLoading(true)
      setError(null)

      const q = query(
        prestamosRef,
        where('empresaId', '==', empresaActual.id),
        orderBy('fechaInicio', 'desc')
      )

      const snapshot = await getDocs(q)
      const prestamosData: Prestamo[] = []
      
      snapshot.forEach((doc) => {
        const data = doc.data()
        prestamosData.push({
          id: doc.id,
          ...data,
          fechaInicio: data.fechaInicio as Timestamp,
          fechaVencimiento: data.fechaVencimiento as Timestamp,
          fechaProximoPago: data.fechaProximoPago as Timestamp,
        } as Prestamo)
      })

      setPrestamos(prestamosData)
      console.log('🔄 Préstamos recargados:', prestamosData.length)
    } catch (err: any) {
      console.error('❌ Error recargando préstamos:', err)
      setError('Error al recargar los préstamos')
      toast({
        title: "Error",
        description: "No se pudieron recargar los préstamos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [empresaActual?.id, getPrestamosCollection])

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
    recargarPrestamos
  }
}