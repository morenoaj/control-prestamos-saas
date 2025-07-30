// src/hooks/useClientes.ts - CORREGIDO
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
  Timestamp 
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Cliente } from '@/types/database'
import { useAuth } from '@/context/AuthContext'
import { toast } from '@/hooks/use-toast'

interface UseClientesReturn {
  clientes: Cliente[]
  loading: boolean
  error: string | null
  crearCliente: (clienteData: Omit<Cliente, 'id' | 'empresaId' | 'fechaRegistro'>) => Promise<string>
  actualizarCliente: (id: string, clienteData: Partial<Cliente>) => Promise<void>
  eliminarCliente: (id: string) => Promise<void>
  obtenerCliente: (id: string) => Cliente | undefined
  recargarClientes: () => Promise<void>
}

// ✅ FUNCIÓN PARA LIMPIAR DATOS ANTES DE ENVIAR A FIREBASE
const limpiarDatosParaFirebase = (data: any): any => {
  const cleaned: any = {}
  
  for (const [key, value] of Object.entries(data)) {
    // Solo incluir campos que no sean undefined, null, o strings vacíos
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value === 'object' && !Array.isArray(value)) {
        // Si es un objeto, limpiarlo recursivamente
        const cleanedObject = limpiarDatosParaFirebase(value)
        if (Object.keys(cleanedObject).length > 0) {
          cleaned[key] = cleanedObject
        }
      } else if (Array.isArray(value)) {
        // Si es un array, limpiarlo también
        const cleanedArray = value.map(item => 
          typeof item === 'object' ? limpiarDatosParaFirebase(item) : item
        ).filter(item => item !== undefined && item !== null && item !== '')
        
        if (cleanedArray.length > 0) {
          cleaned[key] = cleanedArray
        }
      } else {
        cleaned[key] = value
      }
    }
  }
  
  return cleaned
}

export function useClientes(): UseClientesReturn {
  const { empresaActual } = useAuth()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Obtener referencia de la colección
  const getClientesCollection = useCallback(() => {
    if (!empresaActual?.id) return null
    return collection(db, 'clientes')
  }, [empresaActual?.id])

  // Cargar clientes en tiempo real
  useEffect(() => {
    if (!empresaActual?.id) {
      setClientes([])
      setLoading(false)
      return
    }

    const clientesRef = getClientesCollection()
    if (!clientesRef) return

    setLoading(true)
    setError(null)

    const q = query(
      clientesRef,
      where('empresaId', '==', empresaActual.id),
      orderBy('fechaRegistro', 'desc')
    )

    console.log('📊 Configurando listener para clientes de empresa:', empresaActual.id)

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const clientesData: Cliente[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          clientesData.push({
            id: doc.id,
            ...data,
            fechaRegistro: data.fechaRegistro as Timestamp
          } as Cliente)
        })
        
        console.log('✅ Clientes cargados:', clientesData.length)
        setClientes(clientesData)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('❌ Error cargando clientes:', err)
        setError('Error al cargar los clientes')
        setLoading(false)
        toast({
          title: "Error",
          description: "No se pudieron cargar los clientes",
          variant: "destructive"
        })
      }
    )

    return () => {
      console.log('🔄 Limpiando listener de clientes')
      unsubscribe()
    }
  }, [empresaActual?.id, getClientesCollection])

  // ✅ CREAR CLIENTE - CORREGIDO
  const crearCliente = useCallback(async (
    clienteData: Omit<Cliente, 'id' | 'empresaId' | 'fechaRegistro'>
  ): Promise<string> => {
    if (!empresaActual?.id) {
      throw new Error('No hay empresa seleccionada')
    }

    const clientesRef = getClientesCollection()
    if (!clientesRef) {
      throw new Error('No se pudo acceder a la colección de clientes')
    }

    try {
      console.log('🆕 Creando cliente:', clienteData.nombre, clienteData.apellido)

      // Verificar si ya existe un cliente con la misma cédula
      const existingQuery = query(
        clientesRef,
        where('empresaId', '==', empresaActual.id),
        where('cedula', '==', clienteData.cedula)
      )
      const existingSnapshot = await getDocs(existingQuery)
      
      if (!existingSnapshot.empty) {
        throw new Error('Ya existe un cliente con esta cédula')
      }

      // ✅ LIMPIAR DATOS ANTES DE CREAR EL DOCUMENTO
      const nuevoCliente = {
        ...clienteData,
        empresaId: empresaActual.id,
        fechaRegistro: serverTimestamp()
      }

      // Limpiar datos para Firebase (remover undefined, null, strings vacíos)
      const datosLimpios = limpiarDatosParaFirebase(nuevoCliente)
      
      console.log('🧹 Datos originales:', nuevoCliente)
      console.log('✨ Datos limpios:', datosLimpios)

      const docRef = await addDoc(clientesRef, datosLimpios)
      console.log('✅ Cliente creado con ID:', docRef.id)
      
      return docRef.id
    } catch (error: any) {
      console.error('❌ Error creando cliente:', error)
      throw new Error(error.message || 'Error al crear el cliente')
    }
  }, [empresaActual?.id, getClientesCollection])

  // ✅ ACTUALIZAR CLIENTE - CORREGIDO
  const actualizarCliente = useCallback(async (
    id: string, 
    clienteData: Partial<Cliente>
  ): Promise<void> => {
    if (!empresaActual?.id) {
      throw new Error('No hay empresa seleccionada')
    }

    try {
      console.log('📝 Actualizando cliente:', id)

      // Si se está actualizando la cédula, verificar que no exista
      if (clienteData.cedula) {
        const clientesRef = getClientesCollection()
        if (clientesRef) {
          const existingQuery = query(
            clientesRef,
            where('empresaId', '==', empresaActual.id),
            where('cedula', '==', clienteData.cedula)
          )
          const existingSnapshot = await getDocs(existingQuery)
          
          // Verificar si hay otro cliente con la misma cédula (excluyendo el actual)
          const otherClient = existingSnapshot.docs.find(doc => doc.id !== id)
          if (otherClient) {
            throw new Error('Ya existe otro cliente con esta cédula')
          }
        }
      }

      // ✅ LIMPIAR DATOS ANTES DE ACTUALIZAR
      const datosParaActualizar = {
        ...clienteData,
        empresaId: empresaActual.id // Mantener empresaId
      }

      const datosLimpios = limpiarDatosParaFirebase(datosParaActualizar)
      console.log('🧹 Datos de actualización limpios:', datosLimpios)

      const clienteRef = doc(db, 'clientes', id)
      await updateDoc(clienteRef, datosLimpios)
      
      console.log('✅ Cliente actualizado:', id)
    } catch (error: any) {
      console.error('❌ Error actualizando cliente:', error)
      throw new Error(error.message || 'Error al actualizar el cliente')
    }
  }, [empresaActual?.id, getClientesCollection])

  // Eliminar cliente
  const eliminarCliente = useCallback(async (id: string): Promise<void> => {
    if (!empresaActual?.id) {
      throw new Error('No hay empresa seleccionada')
    }

    try {
      console.log('🗑️ Eliminando cliente:', id)

      // TODO: Verificar si el cliente tiene préstamos activos
      // const prestamosQuery = query(
      //   collection(db, 'prestamos'),
      //   where('clienteId', '==', id),
      //   where('estado', 'in', ['pendiente', 'activo'])
      // )
      // const prestamosSnapshot = await getDocs(prestamosQuery)
      // if (!prestamosSnapshot.empty) {
      //   throw new Error('No se puede eliminar un cliente con préstamos activos')
      // }

      const clienteRef = doc(db, 'clientes', id)
      await deleteDoc(clienteRef)
      
      console.log('✅ Cliente eliminado:', id)
    } catch (error: any) {
      console.error('❌ Error eliminando cliente:', error)
      throw new Error(error.message || 'Error al eliminar el cliente')
    }
  }, [empresaActual?.id])

  // Obtener cliente por ID
  const obtenerCliente = useCallback((id: string): Cliente | undefined => {
    return clientes.find(cliente => cliente.id === id)
  }, [clientes])

  // Recargar clientes manualmente
  const recargarClientes = useCallback(async (): Promise<void> => {
    if (!empresaActual?.id) return

    const clientesRef = getClientesCollection()
    if (!clientesRef) return

    try {
      setLoading(true)
      setError(null)

      const q = query(
        clientesRef,
        where('empresaId', '==', empresaActual.id),
        orderBy('fechaRegistro', 'desc')
      )

      const snapshot = await getDocs(q)
      const clientesData: Cliente[] = []
      
      snapshot.forEach((doc) => {
        const data = doc.data()
        clientesData.push({
          id: doc.id,
          ...data,
          fechaRegistro: data.fechaRegistro as Timestamp
        } as Cliente)
      })

      setClientes(clientesData)
      console.log('🔄 Clientes recargados:', clientesData.length)
    } catch (err: any) {
      console.error('❌ Error recargando clientes:', err)
      setError('Error al recargar los clientes')
      toast({
        title: "Error",
        description: "No se pudieron recargar los clientes",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [empresaActual?.id, getClientesCollection])

  return {
    clientes,
    loading,
    error,
    crearCliente,
    actualizarCliente,
    eliminarCliente,
    obtenerCliente,
    recargarClientes
  }
}