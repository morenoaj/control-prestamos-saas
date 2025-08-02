// src/app/(dashboard)/pagos/page.tsx - PASO 2 + usePagos SIMPLIFICADO
'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useClientes } from '@/hooks/useClientes'
import { usePrestamos } from '@/hooks/usePrestamos'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp
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
  estado: string
}

export default function PagosPage() {
  // ✅ Hooks que funcionan
  const { empresaActual, usuario } = useAuth()
  const { clientes, loading: loadingClientes } = useClientes()
  const { prestamos, loading: loadingPrestamos } = usePrestamos()
  
  // ✅ Hook simplificado para pagos (directamente en el componente)
  const [pagos, setPagos] = useState<PagoSimple[]>([])
  const [loadingPagos, setLoadingPagos] = useState(true)
  const [errorPagos, setErrorPagos] = useState<string | null>(null)

  // ✅ Cargar pagos directamente en el componente
  useEffect(() => {
    if (!empresaActual?.id) {
      setPagos([])
      setLoadingPagos(false)
      return
    }

    setLoadingPagos(true)
    setErrorPagos(null)

    const q = query(
      collection(db, 'pagos'),
      where('empresaId', '==', empresaActual.id),
      orderBy('fechaRegistro', 'desc')
    )

    console.log('💳 Cargando pagos de empresa:', empresaActual.id)

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const pagosData: PagoSimple[] = []
        snapshot.forEach((doc) => {
          try {
            const data = doc.data()
            pagosData.push({
              id: doc.id,
              ...data,
              fechaPago: data.fechaPago as Timestamp,
              fechaRegistro: data.fechaRegistro as Timestamp,
            } as PagoSimple)
          } catch (error) {
            console.error('Error procesando pago:', doc.id, error)
          }
        })
        
        console.log('✅ Pagos cargados:', pagosData.length)
        setPagos(pagosData)
        setLoadingPagos(false)
        setErrorPagos(null)
      },
      (err) => {
        console.error('❌ Error cargando pagos:', err)
        setErrorPagos('Error al cargar los pagos')
        setLoadingPagos(false)
      }
    )

    return unsubscribe
  }, [empresaActual?.id])

  // Estados básicos para UI
  const [searchTerm, setSearchTerm] = useState('')
  const [metodoPagoFilter, setMetodoPagoFilter] = useState<string>('todos')
  const [estadoFilter, setEstadoFilter] = useState<string>('todos')
  const [showPagoForm, setShowPagoForm] = useState(false)
  const [pagoAEliminar, setPagoAEliminar] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ✅ Función para obtener nombre de cliente real
  const obtenerNombreCliente = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId)
    return cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Cliente no encontrado'
  }

  // ✅ Función para obtener número de préstamo real
  const obtenerNumeroPrestamo = (prestamoId: string) => {
    const prestamo = prestamos.find(p => p.id === prestamoId)
    return prestamo?.numero || 'Préstamo no encontrado'
  }

  // ✅ Función para formatear fechas de forma segura
  const formatearFechaSegura = (fecha: any, fallback = 'Fecha no disponible') => {
    try {
      const fechaConvertida = convertirFecha(fecha)
      if (isNaN(fechaConvertida.getTime())) {
        return fallback
      }
      return formatDate(fechaConvertida)
    } catch (error) {
      console.error('Error formateando fecha:', error)
      return fallback
    }
  }

  // ✅ Filtros con pagos reales
  const pagosFiltrados = useMemo(() => {
    let filtered = pagos

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(pago => {
        const clienteNombre = obtenerNombreCliente(pago.clienteId).toLowerCase()
        const prestamoNumero = obtenerNumeroPrestamo(pago.prestamoId).toLowerCase()
        
        return (
          pago.numero.toLowerCase().includes(term) ||
          clienteNombre.includes(term) ||
          prestamoNumero.includes(term) ||
          pago.referenciaPago?.toLowerCase().includes(term)
        )
      })
    }

    if (metodoPagoFilter !== 'todos') {
      filtered = filtered.filter(pago => pago.metodoPago === metodoPagoFilter)
    }

    if (estadoFilter !== 'todos') {
      filtered = filtered.filter(pago => pago.estado === estadoFilter)
    }

    return filtered
  }, [pagos, searchTerm, metodoPagoFilter, estadoFilter, clientes, prestamos])

  // ✅ Estadísticas con datos reales
  const stats = useMemo(() => {
    const total = pagos.length
    const completados = pagos.filter(p => p.estado === 'completado').length
    const pendientes = pagos.filter(p => p.estado === 'pendiente_verificacion').length
    
    const montoTotalRecaudado = pagos
      .filter(p => p.estado === 'completado')
      .reduce((sum, p) => sum + p.montoPagado, 0)
    
    const capitalRecaudado = pagos
      .filter(p => p.estado === 'completado')
      .reduce((sum, p) => sum + (p.montoCapital || 0), 0)
    
    const interesesRecaudados = pagos
      .filter(p => p.estado === 'completado')
      .reduce((sum, p) => sum + (p.montoIntereses || 0), 0)
    
    const moraRecaudada = pagos
      .filter(p => p.estado === 'completado')
      .reduce((sum, p) => sum + (p.montoMora || 0), 0)

    // Pagos del mes actual
    const fechaActual = new Date()
    const inicioMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1)
    const pagosMesActual = pagos.filter(p => {
      try {
        const fechaPago = convertirFecha(p.fechaPago)
        return fechaPago >= inicioMes && p.estado === 'completado'
      } catch {
        return false
      }
    })
    const montoMesActual = pagosMesActual.reduce((sum, p) => sum + p.montoPagado, 0)

    return { 
      total, 
      completados, 
      pendientes, 
      montoTotalRecaudado, 
      capitalRecaudado, 
      interesesRecaudados, 
      moraRecaudada,
      pagosMesActual: pagosMesActual.length,
      montoMesActual,
      // Estadísticas de clientes y préstamos
      totalClientes: clientes.length,
      totalPrestamos: prestamos.length,
      prestamosActivos: prestamos.filter(p => p.estado === 'activo').length
    }
  }, [pagos, clientes, prestamos])

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'completado': return 'bg-green-100 text-green-800'
      case 'pendiente_verificacion': return 'bg-yellow-100 text-yellow-800'
      case 'rechazado': return 'bg-red-100 text-red-800'
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
    if (prestamos.length === 0) {
      toast({
        title: "No hay préstamos disponibles",
        description: "Primero debes crear un préstamo para registrar pagos",
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

  // ✅ Mostrar loading si los datos se están cargando
  const isLoading = loadingClientes || loadingPrestamos || loadingPagos

  // ✅ Mostrar error si hay problemas cargando pagos
  if (errorPagos) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-red-500 mb-4">
              <AlertCircle className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar pagos</h3>
            <p className="text-gray-600 mb-6">{errorPagos}</p>
            <Button onClick={handleRecargarPagos} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Receipt className="h-8 w-8 text-purple-600" />
            </div>
            Gestión de Pagos
            {isLoading && <Loader2 className="h-6 w-6 animate-spin text-purple-600" />}
          </h1>
          <p className="text-gray-600 mt-2">
            {/* ✅ Información actualizada con pagos reales */}
            Registra y administra todos los pagos de {empresaActual.nombre} • {stats.totalClientes} clientes • {stats.totalPrestamos} préstamos • {stats.total} pagos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleRecargarPagos} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Recargar
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={handleNuevoPago} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-2" />
            Registrar Pago
          </Button>
        </div>
      </div>

      {/* ✅ Stats Cards con estadísticas reales de pagos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pagos</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Receipt className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">{stats.completados} completados</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Recaudado</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.montoTotalRecaudado)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">Ingresos totales</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pagos Este Mes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.pagosMesActual}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-blue-600">{formatCurrency(stats.montoMesActual)}</span>
              <span className="text-gray-500 ml-1">recaudado</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Intereses + Mora</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(stats.interesesRecaudados + stats.moraRecaudada)}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-orange-600">Ganancias</span>
              <span className="text-gray-500 ml-1">adicionales</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ✅ Alertas con datos reales */}
      {stats.pendientes > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-800">
                  {stats.pendientes} pago{stats.pendientes > 1 ? 's' : ''} pendiente{stats.pendientes > 1 ? 's' : ''} de verificación
                </h3>
                <p className="text-yellow-700">
                  Revisa los pagos pendientes para confirmar su validez
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {prestamos.length === 0 && !isLoading && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-800">
                  No hay préstamos disponibles
                </h3>
                <p className="text-yellow-700">
                  Para registrar pagos necesitas tener préstamos creados. Ve a la sección de Préstamos para crear uno.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por número, cliente, préstamo, referencia..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={metodoPagoFilter} onValueChange={setMetodoPagoFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los métodos</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="yappy">Yappy</SelectItem>
                  <SelectItem value="nequi">Nequi</SelectItem> 
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>

              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="completado">Completados</SelectItem>
                  <SelectItem value="pendiente_verificacion">Pendientes</SelectItem>
                  <SelectItem value="rechazado">Rechazados</SelectItem>
                </SelectContent>
              </Select>

              {(searchTerm || metodoPagoFilter !== 'todos' || estadoFilter !== 'todos') && (
                <Button variant="outline" size="sm" onClick={limpiarFiltros}>
                  <Filter className="h-4 w-4 mr-2" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>
          
          {(searchTerm || metodoPagoFilter !== 'todos' || estadoFilter !== 'todos') && (
            <div className="mt-4 text-sm text-gray-600">
              Mostrando {pagosFiltrados.length} de {pagos.length} pagos
            </div>
          )}
        </CardContent>
      </Card>

      {/* ✅ Lista de Pagos REALES */}
      <div className="grid gap-6">
        {isLoading && pagos.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
              <p className="text-gray-600">Cargando pagos...</p>
            </CardContent>
          </Card>
        ) : pagosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {pagos.length === 0 
                  ? 'No hay pagos registrados'
                  : 'No se encontraron pagos'
                }
              </h3>
              <p className="text-gray-600 mb-6">
                {pagos.length === 0 
                  ? 'Comienza registrando el primer pago de un préstamo'
                  : 'Intenta ajustar los filtros de búsqueda'
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {pagos.length === 0 ? (
                  <Button onClick={handleNuevoPago} className="bg-purple-600 hover:bg-purple-700" disabled={prestamos.length === 0}>
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Primer Pago
                  </Button>
                ) : (
                  <>
                    <Button onClick={limpiarFiltros} variant="outline">
                      Limpiar Filtros
                    </Button>
                    <Button onClick={handleNuevoPago} className="bg-purple-600 hover:bg-purple-700" disabled={prestamos.length === 0}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo Pago
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          // ✅ Lista de pagos reales con opciones de menú
          pagosFiltrados.map((pago) => (
            <Card key={pago.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                      <Receipt className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {pago.numero}
                        </h3>
                        <Badge className={getEstadoColor(pago.estado)}>
                          <div className="flex items-center gap-1">
                            {pago.estado === 'completado' && <CheckCircle className="h-4 w-4" />}
                            {pago.estado === 'pendiente_verificacion' && <AlertCircle className="h-4 w-4" />}
                            <span className="capitalize">{pago.estado.replace('_', ' ')}</span>
                          </div>
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getMetodoPagoIcon(pago.metodoPago)}
                          <span className="ml-1 capitalize">{pago.metodoPago}</span>
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3 text-sm text-gray-600">
                        <div>
                          <strong>Cliente:</strong> {obtenerNombreCliente(pago.clienteId)}
                        </div>
                        <div>
                          <strong>Préstamo:</strong> {obtenerNumeroPrestamo(pago.prestamoId)}
                        </div>
                      </div>

                      <div className="text-sm text-gray-600">
                        <p><strong>Monto pagado:</strong> {formatCurrency(pago.montoPagado)}</p>
                        <p><strong>Fecha:</strong> {formatearFechaSegura(pago.fechaPago)}</p>
                        {pago.observaciones && (
                          <p><strong>Observaciones:</strong> {pago.observaciones}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ✅ Menú de opciones para cada pago */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalles
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        Descargar Recibo
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
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
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal placeholder para nuevo pago */}
      {showPagoForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Registrar Pago</CardTitle>
              <CardDescription>
                Hook simplificado funcionando
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Los pagos ahora se cargan correctamente desde Firebase.
                Formulario completo disponible en el próximo paso.
              </p>
              <Button 
                onClick={() => setShowPagoForm(false)}
                className="w-full"
              >
                Cerrar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ✅ Dialog de eliminación */}
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
                ✅ Paso 3 Funcionando: Pagos Reales Cargados
              </h3>
              <p className="text-green-700">
                Hook simplificado funcionando correctamente. La página carga {pagos.length} pagos reales desde Firebase.
                El error de hooks se solucionó usando Firebase directamente en el componente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}