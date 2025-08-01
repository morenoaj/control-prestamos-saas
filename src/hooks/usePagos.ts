// src/hooks/usePagos.ts
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
  getDoc,
  writeBatch
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Pago, Prestamo } from '@/types/database'
import { useAuth } from '@/context/AuthContext'
import { convertirFecha } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

interface UsePagosReturn {
  pagos: Pago[]
  loading: boolean
  error: string | null
  crearPago: (pagoData: Omit<Pago, 'id' | 'empresaId' | 'numero' | 'fechaRegistro'>) => Promise<string>
  actualizarPago: (id: string, pagoData: Partial<Pago>) => Promise<void>
  eliminarPago: (id: string) => Promise<void>
  obtenerPago: (id: string) => Pago | undefined
  obtenerPagosPorPrestamo: (prestamoId: string) => Pago[]
  obtenerPagosPorCliente: (clienteId: string) => Pago[]
  procesarPagoAutomatico: (prestamoId: string, montoPagado: number, metodoPago: string, observaciones?: string) => Promise<string>
  recargarPagos: () => Promise<void>
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

// Función para generar número de pago único
const generarNumeroPago = async (empresaId: string): Promise<string> => {
  const fecha = new Date()
  const año = fecha.getFullYear().toString().slice(-2)
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0')
  const timestamp = Date.now().toString().slice(-6)
  
  return `PAG${año}${mes}${timestamp}`
}

// Función para distribuir el pago entre capital e intereses
const distribuirPago = (
  montoPagado: number,
  saldoCapital: number,
  interesesPendientes: number,
  moraAcumulada: number
): {
  montoMora: number
  montoIntereses: number
  montoCapital: number
} => {
  let montoRestante = montoPagado
  
  // 1. Pagar mora primero
  const montoMora = Math.min(montoRestante, moraAcumulada)
  montoRestante -= montoMora
  
  // 2. Pagar intereses
  const montoIntereses = Math.min(montoRestante, interesesPendientes)
  montoRestante -= montoIntereses
  
  // 3. El resto va a capital
  const montoCapital = Math.min(montoRestante, saldoCapital)
  
  return {
    montoMora,
    montoIntereses,
    montoCapital
  }
}

export function usePagos(): UsePagosReturn {
  const { empresaActual, user } = useAuth()
  const [pagos, setPagos] = useState<Pago[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Obtener referencia de la colección
  const getPagosCollection = useCallback(() => {
    if (!empresaActual?.id) return null
    return collection(db, 'pagos')
  }, [empresaActual?.id])

  // Cargar pagos en tiempo real
  useEffect(() => {
    if (!empresaActual?.id) {
      setPagos([])
      setLoading(false)
      return
    }

    const pagosRef = getPagosCollection()
    if (!pagosRef) return

    setLoading(true)
    setError(null)

    const q = query(
      pagosRef,
      where('empresaId', '==', empresaActual.id),
      orderBy('fechaRegistro', 'desc')
    )

    console.log('💳 Configurando listener para pagos de empresa:', empresaActual.id)

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const pagosData: Pago[] = []
        snapshot.forEach((doc) => {
          try {
            const data = doc.data()
            
            pagosData.push({
              id: doc.id,
              ...data,
              fechaPago: data.fechaPago as Timestamp,
              fechaRegistro: data.fechaRegistro as Timestamp,
            } as Pago)
          } catch (error) {
            console.error('Error procesando pago:', doc.id, error)
          }
        })
        
        console.log('✅ Pagos cargados:', pagosData.length)
        setPagos(pagosData)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('❌ Error cargando pagos:', err)
        setError('Error al cargar los pagos')
        setLoading(false)
        toast({
          title: "Error",
          description: "No se pudieron cargar los pagos",
          variant: "destructive"
        })
      }
    )

    return () => {
      console.log('🔄 Limpiando listener de pagos')
      unsubscribe()
    }
  }, [empresaActual?.id, getPagosCollection])

  // Crear pago manual
  const crearPago = useCallback(async (
    pagoData: Omit<Pago, 'id' | 'empresaId' | 'numero' | 'fechaRegistro'>
  ): Promise<string> => {
    if (!empresaActual?.id || !user?.uid) {
      throw new Error('No hay empresa o usuario seleccionado')
    }

    const pagosRef = getPagosCollection()
    if (!pagosRef) {
      throw new Error('No se pudo acceder a la colección de pagos')
    }

    try {
      console.log('💳 Creando pago para préstamo:', pagoData.prestamoId)

      // Verificar que el préstamo existe
      const prestamoDoc = await getDoc(doc(db, 'prestamos', pagoData.prestamoId))
      if (!prestamoDoc.exists()) {
        throw new Error('El préstamo seleccionado no existe')
      }

      // Generar número único
      const numero = await generarNumeroPago(empresaActual.id)

      const nuevoPago = {
        ...pagoData,
        empresaId: empresaActual.id,
        numero,
        usuarioRegistro: user.uid,
        fechaRegistro: serverTimestamp()
      }

      const datosLimpios = limpiarDatosParaFirebase(nuevoPago)
      const docRef = await addDoc(pagosRef, datosLimpios)
      
      console.log('✅ Pago creado con ID:', docRef.id)
      return docRef.id
    } catch (error: any) {
      console.error('❌ Error creando pago:', error)
      throw new Error(error.message || 'Error al crear el pago')
    }
  }, [empresaActual?.id, user?.uid, getPagosCollection])

  // Procesar pago automático (actualiza el préstamo)
  const procesarPagoAutomatico = useCallback(async (
    prestamoId: string,
    montoPagado: number,
    metodoPago: string,
    observaciones?: string
  ): Promise<string> => {
    if (!empresaActual?.id || !user?.uid) {
      throw new Error('No hay empresa o usuario seleccionado')
    }

    try {
      console.log('💳 Procesando pago automático para préstamo:', prestamoId)

      // Obtener datos del préstamo
      const prestamoDoc = await getDoc(doc(db, 'prestamos', prestamoId))
      if (!prestamoDoc.exists()) {
        throw new Error('El préstamo no existe')
      }

      const prestamo = { id: prestamoDoc.id, ...prestamoDoc.data() } as Prestamo

      // Distribuir el pago
      const distribucion = distribuirPago(
        montoPagado,
        prestamo.saldoCapital,
        prestamo.interesesPendientes,
        prestamo.moraAcumulada
      )

      // Crear el registro de pago
      const numero = await generarNumeroPago(empresaActual.id)
      
      const pagoData = {
        empresaId: empresaActual.id,
        numero,
        prestamoId,
        clienteId: prestamo.clienteId,
        usuarioRegistro: user.uid,
        montoCapital: distribucion.montoCapital,
        montoIntereses: distribucion.montoIntereses,
        montoMora: distribucion.montoMora,
        montoPagado,
        metodoPago,
        fechaPago: new Date(),
        fechaRegistro: serverTimestamp(),
        ...(observaciones && { observaciones: observaciones.trim() })
      }

      // Usar batch para operaciones atómicas
      const batch = writeBatch(db)
      
      // Crear el pago
      const pagoRef = doc(collection(db, 'pagos'))
      batch.set(pagoRef, limpiarDatosParaFirebase(pagoData))

      // Actualizar el préstamo
      const nuevoSaldoCapital = prestamo.saldoCapital - distribucion.montoCapital
      const nuevosInteresesPendientes = prestamo.interesesPendientes - distribucion.montoIntereses
      const nuevaMoraAcumulada = prestamo.moraAcumulada - distribucion.montoMora
      const nuevosInteresesPagados = prestamo.interesesPagados + distribucion.montoIntereses

      // Calcular próximo pago
      const fechaProximoPago = new Date()
      switch (prestamo.tipoTasa) {
        case 'quincenal':
          fechaProximoPago.setDate(fechaProximoPago.getDate() + 15)
          break
        case 'mensual':
          fechaProximoPago.setMonth(fechaProximoPago.getMonth() + 1)
          break
        case 'anual':
          fechaProximoPago.setFullYear(fechaProximoPago.getFullYear() + 1)
          break
      }

      // Determinar nuevo estado
      let nuevoEstado: Prestamo['estado'] = prestamo.estado
      if (nuevoSaldoCapital <= 0) {
        nuevoEstado = 'finalizado'
      } else if (prestamo.estado === 'atrasado' && distribucion.montoMora > 0) {
        nuevoEstado = 'activo' // Si pagó mora, vuelve a activo
      }

      const prestamoActualizado = {
        saldoCapital: Math.max(0, nuevoSaldoCapital),
        interesesPendientes: Math.max(0, nuevosInteresesPendientes),
        interesesPagados: nuevosInteresesPagados,
        moraAcumulada: Math.max(0, nuevaMoraAcumulada),
        diasAtraso: distribucion.montoMora > 0 ? 0 : prestamo.diasAtraso,
        fechaProximoPago: nuevoEstado === 'finalizado' ? null : fechaProximoPago,
        montoProximoPago: nuevoEstado === 'finalizado' ? 0 : prestamo.montoProximoPago,
        estado: nuevoEstado
      }

      const prestamoRef = doc(db, 'prestamos', prestamoId)
      batch.update(prestamoRef, limpiarDatosParaFirebase(prestamoActualizado))

      // Ejecutar transacción
      await batch.commit()

      console.log('✅ Pago procesado automáticamente:', pagoRef.id)
      
      // Mostrar resumen del pago
      const resumenPago = []
      if (distribucion.montoMora > 0) resumenPago.push(`Mora: $${distribucion.montoMora.toFixed(2)}`)
      if (distribucion.montoIntereses > 0) resumenPago.push(`Intereses: $${distribucion.montoIntereses.toFixed(2)}`)
      if (distribucion.montoCapital > 0) resumenPago.push(`Capital: $${distribucion.montoCapital.toFixed(2)}`)
      
      toast({
        title: "Pago procesado exitosamente",
        description: `Pago aplicado: ${resumenPago.join(', ')}. ${nuevoEstado === 'finalizado' ? '¡Préstamo finalizado!' : `Saldo restante: $${nuevoSaldoCapital.toFixed(2)}`}`,
      })

      return pagoRef.id
    } catch (error: any) {
      console.error('❌ Error procesando pago automático:', error)
      throw new Error(error.message || 'Error al procesar el pago')
    }
  }, [empresaActual?.id, user?.uid])

  // Actualizar pago
  const actualizarPago = useCallback(async (
    id: string, 
    pagoData: Partial<Pago>
  ): Promise<void> => {
    if (!empresaActual?.id) {
      throw new Error('No hay empresa seleccionada')
    }

    try {
      console.log('📝 Actualizando pago:', id)

      const datosLimpios = limpiarDatosParaFirebase(pagoData)
      const pagoRef = doc(db, 'pagos', id)
      await updateDoc(pagoRef, datosLimpios)
      
      console.log('✅ Pago actualizado:', id)
    } catch (error: any) {
      console.error('❌ Error actualizando pago:', error)
      throw new Error(error.message || 'Error al actualizar el pago')
    }
  }, [empresaActual?.id])

  // Eliminar pago
  const eliminarPago = useCallback(async (id: string): Promise<void> => {
    if (!empresaActual?.id) {
      throw new Error('No hay empresa seleccionada')
    }

    try {
      console.log('🗑️ Eliminando pago:', id)

      // TODO: Revertir cambios en el préstamo si es necesario
      // Esto requiere lógica compleja para recalcular el estado del préstamo

      const pagoRef = doc(db, 'pagos', id)
      await deleteDoc(pagoRef)
      
      console.log('✅ Pago eliminado:', id)
    } catch (error: any) {
      console.error('❌ Error eliminando pago:', error)
      throw new Error(error.message || 'Error al eliminar el pago')
    }
  }, [empresaActual?.id])

  // Obtener pago por ID
  const obtenerPago = useCallback((id: string): Pago | undefined => {
    return pagos.find(pago => pago.id === id)
  }, [pagos])

  // Obtener pagos por préstamo
  const obtenerPagosPorPrestamo = useCallback((prestamoId: string): Pago[] => {
    return pagos.filter(pago => pago.prestamoId === prestamoId)
  }, [pagos])

  // Obtener pagos por cliente
  const obtenerPagosPorCliente = useCallback((clienteId: string): Pago[] => {
    return pagos.filter(pago => pago.clienteId === clienteId)
  }, [pagos])

  // Recargar pagos manualmente
  const recargarPagos = useCallback(async (): Promise<void> => {
    if (!empresaActual?.id) return

    const pagosRef = getPagosCollection()
    if (!pagosRef) return

    try {
      setLoading(true)
      setError(null)

      const q = query(
        pagosRef,
        where('empresaId', '==', empresaActual.id),
        orderBy('fechaRegistro', 'desc')
      )

      const snapshot = await getDocs(q)
      const pagosData: Pago[] = []
      
      snapshot.forEach((doc) => {
        const data = doc.data()
        pagosData.push({
          id: doc.id,
          ...data,
          fechaPago: data.fechaPago as Timestamp,
          fechaRegistro: data.fechaRegistro as Timestamp,
        } as Pago)
      })

      setPagos(pagosData)
      console.log('🔄 Pagos recargados:', pagosData.length)
    } catch (err: any) {
      console.error('❌ Error recargando pagos:', err)
      setError('Error al recargar los pagos')
      toast({
        title: "Error",
        description: "No se pudieron recargar los pagos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [empresaActual?.id, getPagosCollection])

  return {
    pagos,
    loading,
    error,
    crearPago,
    actualizarPago,
    eliminarPago,
    obtenerPago,
    obtenerPagosPorPrestamo,
    obtenerPagosPorCliente,
    procesarPagoAutomatico,
    recargarPagos
  }
}