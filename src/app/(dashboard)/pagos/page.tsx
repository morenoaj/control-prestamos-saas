// src/app/(dashboard)/pagos/page.tsx - CON FUNCIÓN DE REGISTRO DIRECTA
'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useClientes } from '@/hooks/useClientes'
import { usePrestamos } from '@/hooks/usePrestamos'
import { PagoForm } from '@/components/pagos/PagoForm' // Importa el formulario de pagos
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  doc,
  addDoc,
  serverTimestamp,
  writeBatch,
  getDoc
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  Receipt, 
  Plus, 
  Search, 
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Download,
  RefreshCw,
  Loader2,
  CheckCircle,
  Filter,
  Users,
  CreditCard,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'
import { formatCurrency, formatDate, convertirFecha } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

// ✅ Tipo simplificado para pagos
interface PagoSimple {
  id: string
  empresaId: string
  numero: string
  prestamoId: string
  clienteId: string
  montoPagado: number
  montoCapital: number
  montoIntereses: number
  montoMora: number
  metodoPago: string
  referenciaPago?: string
  fechaPago: Timestamp
  fechaRegistro: Timestamp
  observaciones?: string
  usuarioRegistro: string
}

export default function PagosPage() {
  const { empresaActual, user } = useAuth()
  const { clientes } = useClientes()
  const { prestamos } = usePrestamos()
  
  // Estados locales
  const [pagos, setPagos] = useState<PagoSimple[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Estados del formulario y filtros
  const [showPagoForm, setShowPagoForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [metodoPagoFilter, setMetodoPagoFilter] = useState('todos')
  const [estadoFilter, setEstadoFilter] = useState('todos')
  const [pagoAEliminar, setPagoAEliminar] = useState<PagoSimple | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ✅ Función para limpiar datos antes de enviar a Firebase
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

  // ✅ Función para generar número de pago único
  const generarNumeroPago = async (empresaId: string): Promise<string> => {
    const fecha = new Date()
    const año = fecha.getFullYear().toString().slice(-2)
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0')
    const timestamp = Date.now().toString().slice(-6)
    
    return `PAG${año}${mes}${timestamp}`
  }

  // ✅ Función para distribuir el pago entre capital e intereses
  const distribuirPago = (
    montoPagado: number,
    saldoCapital: number,
    interesesPendientes: number,
    moraAcumulada: number
  ) => {
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

  // ✅ Función principal para registrar pagos
  const procesarPagoAutomatico = useCallback(async (
    prestamoId: string,
    montoPagado: number,
    metodoPago: string,
    referenciaPago?: string,
    observaciones?: string
  ): Promise<void> => {
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

      const prestamo = { id: prestamoDoc.id, ...prestamoDoc.data() } as any

      // Distribuir el pago - con verificaciones de tipo
      const distribucion = distribuirPago(
        montoPagado,
        prestamo.saldoCapital || 0,
        prestamo.interesesPendientes || 0,
        prestamo.moraAcumulada || 0
      )

      // Crear el registro de pago
      const numero = await generarNumeroPago(empresaActual.id)
      
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
        ...(referenciaPago && { referenciaPago }),
        ...(observaciones && { observaciones })
      }

      // Usar batch para operaciones atómicas
      const batch = writeBatch(db)
      
      // Crear el pago
      const pagoRef = doc(collection(db, 'pagos'))
      batch.set(pagoRef, limpiarDatosParaFirebase(pagoData))

      // Actualizar el préstamo - con verificaciones de tipo
      const nuevoSaldoCapital = (prestamo.saldoCapital || 0) - distribucion.montoCapital
      const nuevosInteresesPendientes = (prestamo.interesesPendientes || 0) - distribucion.montoIntereses
      const nuevaMoraAcumulada = (prestamo.moraAcumulada || 0) - distribucion.montoMora
      const nuevosInteresesPagados = (prestamo.interesesPagados || 0) + distribucion.montoIntereses

      // Calcular próximo pago
      const fechaProximoPago = new Date()
      switch (prestamo.tipoTasa || 'mensual') {
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
      let nuevoEstado = prestamo.estado || 'activo'
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
        diasAtraso: distribucion.montoMora > 0 ? 0 : (prestamo.diasAtraso || 0),
        fechaProximoPago: nuevoEstado === 'finalizado' ? null : fechaProximoPago,
        montoProximoPago: nuevoEstado === 'finalizado' ? 0 : (prestamo.montoProximoPago || 0),
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

    } catch (error: any) {
      console.error('❌ Error procesando pago automático:', error)
      throw new Error(error.message || 'Error al procesar el pago')
    }
  }, [empresaActual?.id, user?.uid])

  // ✅ Cargar pagos directamente desde Firebase
  useEffect(() => {
    if (!empresaActual?.id) {
      setPagos([])
      setLoading(false)
      return
    }

    console.log('🔍 Configurando listener de pagos para empresa:', empresaActual.id)
    
    const pagosQuery = query(
      collection(db, 'pagos'),
      where('empresaId', '==', empresaActual.id),
      orderBy('fechaPago', 'desc')
    )

    const unsubscribe = onSnapshot(
      pagosQuery,
      (snapshot) => {
        console.log('📄 Documentos de pagos recibidos:', snapshot.size)
        
        const pagosData = snapshot.docs.map(doc => {
          const data = doc.data()
          console.log('💳 Pago encontrado:', {
            id: doc.id,
            numero: data.numero,
            montoPagado: data.montoPagado
          })
          
          return {
            id: doc.id,
            ...data
          } as PagoSimple
        })
        
        setPagos(pagosData)
        setLoading(false)
        setError(null)
        
        console.log('✅ Total pagos cargados:', pagosData.length)
      },
      (error) => {
        console.error('❌ Error cargando pagos:', error)
        setError(error.message)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [empresaActual?.id])

  // Preparar datos para el formulario
  const prestamosParaFormulario = useMemo(() => {
    if (!prestamos || !clientes) return []

    return prestamos
      .filter(prestamo => prestamo.estado === 'activo' || prestamo.estado === 'atrasado')
      .map(prestamo => {
        const cliente = clientes.find(c => c.id === prestamo.clienteId)
        return {
          id: prestamo.id,
          numero: prestamo.numero,
          clienteNombre: cliente?.nombre || 'Cliente no encontrado',
          saldoCapital: prestamo.saldoCapital,
          interesesPendientes: prestamo.interesesPendientes,
          moraAcumulada: prestamo.moraAcumulada,
          montoProximoPago: prestamo.montoProximoPago,
          fechaProximoPago: prestamo.fechaProximoPago ? convertirFecha(prestamo.fechaProximoPago) : null,
          estado: prestamo.estado
        }
      })
  }, [prestamos, clientes])

  // Procesar pagos con información del cliente y préstamo
  const pagosConInfo = useMemo(() => {
    if (!clientes || !prestamos) return []

    return pagos.map(pago => {
      const cliente = clientes.find(c => c.id === pago.clienteId)
      const prestamo = prestamos.find(p => p.id === pago.prestamoId)
      
      return {
        ...pago,
        clienteNombre: cliente?.nombre || 'Cliente no encontrado',
        prestamoNumero: prestamo?.numero || 'N/A',
        fechaPagoFormatted: pago.fechaPago ? convertirFecha(pago.fechaPago) : new Date(),
        fechaRegistroFormatted: pago.fechaRegistro ? convertirFecha(pago.fechaRegistro) : new Date()
      }
    })
  }, [pagos, clientes, prestamos])

  // Filtrar pagos
  const pagosFiltrados = useMemo(() => {
    return pagosConInfo.filter(pago => {
      const matchesSearch = searchTerm === '' || 
        pago.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pago.clienteNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pago.prestamoNumero.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesMetodo = metodoPagoFilter === 'todos' || pago.metodoPago === metodoPagoFilter

      // Para estado, podrías agregar más lógica si tienes estados en los pagos
      const matchesEstado = estadoFilter === 'todos'

      return matchesSearch && matchesMetodo && matchesEstado
    })
  }, [pagosConInfo, searchTerm, metodoPagoFilter, estadoFilter])

  // Calcular estadísticas
  const estadisticas = useMemo(() => {
    const totalPagos = pagosFiltrados.reduce((sum, pago) => sum + pago.montoPagado, 0)
    const totalCapital = pagosFiltrados.reduce((sum, pago) => sum + pago.montoCapital, 0)
    const totalIntereses = pagosFiltrados.reduce((sum, pago) => sum + pago.montoIntereses, 0)
    const totalMora = pagosFiltrados.reduce((sum, pago) => sum + pago.montoMora, 0)

    return {
      totalPagos,
      totalCapital,
      totalIntereses,
      totalMora,
      cantidadPagos: pagosFiltrados.length
    }
  }, [pagosFiltrados])

  const getEstadoBadgeColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'completado': return 'bg-green-100 text-green-800'
      case 'pendiente': return 'bg-yellow-100 text-yellow-800'
      case 'fallido': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getMetodoPagoIcon = (metodo: string) => {
    switch (metodo) {
      case 'efectivo': return <DollarSign className="h-4 w-4" />
      case 'transferencia': return <CreditCard className="h-4 w-4" />
      case 'cheque': return <Receipt className="h-4 w-4" />
      default: return <Receipt className="h-4 w-4" />
    }
  }

  const handleNuevoPago = () => {
    if (prestamosParaFormulario.length === 0) {
      toast({
        title: "No hay préstamos disponibles",
        description: "Primero debes crear un préstamo activo para registrar pagos",
        variant: "destructive"
      })
      return
    }
    
    setShowPagoForm(true)
  }

  const handleEliminarPago = async () => {
    // Placeholder - implementaremos después
    toast({
      title: "Próximamente",
      description: "La función de eliminar estará disponible pronto",
    })
    setPagoAEliminar(null)
  }

  const handleRecargarPagos = () => {
    // Los datos se recargan automáticamente con onSnapshot
    toast({
      title: "Datos actualizados",
      description: "Los pagos se mantienen actualizados automáticamente",
    })
  }

  const limpiarFiltros = () => {
    setSearchTerm('')
    setMetodoPagoFilter('todos')
    setEstadoFilter('todos')
  }

  const handlePagoSuccess = () => {
    // El listener automático actualizará la lista
    console.log('✅ Pago registrado exitosamente')
  }

  // Verificar autenticación
  if (!empresaActual) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-48">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Selecciona una empresa para ver los pagos</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ✅ Mostrar loading si los datos están cargando
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-48">
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Cargando pagos...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ✅ Mostrar error si hay problema
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200">
          <CardContent className="flex items-center justify-center h-48">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-2">Error cargando pagos</p>
              <p className="text-sm text-gray-600">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Pagos</h1>
          <p className="text-gray-600">
            Registra y monitorea los pagos de préstamos
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRecargarPagos}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={handleNuevoPago}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Pago
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recaudado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(estadisticas.totalPagos)}</div>
            <p className="text-xs text-muted-foreground">
              {estadisticas.cantidadPagos} pagos registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capital Pagado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(estadisticas.totalCapital)}
            </div>
            <p className="text-xs text-muted-foreground">
              Principal de préstamos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Intereses Cobrados</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(estadisticas.totalIntereses)}
            </div>
            <p className="text-xs text-muted-foreground">
              Ganancias por intereses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mora Cobrada</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(estadisticas.totalMora)}
            </div>
            <p className="text-xs text-muted-foreground">
              Penalizaciones por atraso
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por número, cliente o préstamo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={metodoPagoFilter} onValueChange={setMetodoPagoFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Método de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los métodos</SelectItem>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={limpiarFiltros}>
              <Filter className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Pagos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pagos Registrados</CardTitle>
            <Badge variant="outline">{pagosFiltrados.length} resultados</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {pagosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay pagos registrados</h3>
              <p className="text-gray-600 mb-4">
                {pagos.length === 0 
                  ? "Comienza registrando el primer pago de un préstamo"
                  : "No se encontraron pagos con los filtros aplicados"
                }
              </p>
              {prestamosParaFormulario.length > 0 && (
                <Button onClick={handleNuevoPago}>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Primer Pago
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {pagosFiltrados.map((pago) => (
                <div
                  key={pago.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className="font-mono">
                          {pago.numero}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {getMetodoPagoIcon(pago.metodoPago)}
                          <span className="text-sm text-gray-600 capitalize">
                            {pago.metodoPago}
                          </span>
                        </div>
                        {pago.referenciaPago && (
                          <Badge variant="secondary" className="text-xs">
                            {pago.referenciaPago}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Cliente y Préstamo</p>
                          <p className="font-semibold">{pago.clienteNombre}</p>
                          <p className="text-sm text-gray-600">
                            Préstamo: {pago.prestamoNumero}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600">Distribución del Pago</p>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Total:</span>
                              <span className="font-semibold">
                                {formatCurrency(pago.montoPagado)}
                              </span>
                            </div>
                            {pago.montoCapital > 0 && (
                              <div className="flex justify-between text-xs text-green-600">
                                <span>Capital:</span>
                                <span>{formatCurrency(pago.montoCapital)}</span>
                              </div>
                            )}
                            {pago.montoIntereses > 0 && (
                              <div className="flex justify-between text-xs text-blue-600">
                                <span>Intereses:</span>
                                <span>{formatCurrency(pago.montoIntereses)}</span>
                              </div>
                            )}
                            {pago.montoMora > 0 && (
                              <div className="flex justify-between text-xs text-orange-600">
                                <span>Mora:</span>
                                <span>{formatCurrency(pago.montoMora)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600">Fechas</p>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              <span>Pago: {formatDate(pago.fechaPagoFormatted)}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Registrado: {formatDate(pago.fechaRegistroFormatted)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {pago.observaciones && (
                        <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                          <strong>Observaciones:</strong> {pago.observaciones}
                        </div>
                      )}
                    </div>

                    <div className="ml-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar (Próximamente)
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => setPagoAEliminar(pago)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulario de Nuevo Pago */}
      <PagoForm
        open={showPagoForm}
        onOpenChange={setShowPagoForm}
        prestamos={prestamosParaFormulario}
        onSuccess={handlePagoSuccess}
        onPagoRegistrado={procesarPagoAutomatico}
      />

      {/* Dialog de Confirmación para Eliminar */}
      <AlertDialog 
        open={!!pagoAEliminar} 
        onOpenChange={() => setPagoAEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pago?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar el pago{' '}
              <strong>{pagoAEliminar?.numero}</strong>
              ? Esta función estará disponible pronto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleEliminarPago}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ✅ Estado actualizado */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-800">
                ✅ Paso 4 Completado: Sistema de Pagos Funcionando
              </h3>
              <p className="text-green-700">
                Sistema completo funcionando sin errores de hooks. Puedes registrar pagos para préstamos activos. 
                La página carga {pagos.length} pagos reales y tiene {prestamosParaFormulario.length} préstamos disponibles para registro.
                Función de registro de pagos integrada directamente en el componente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}