// src/app/(dashboard)/prestamos/page.tsx - COMPLETO SIN DEBUG INFO
'use client'

import { useState, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePrestamos } from '@/hooks/usePrestamos'
import { useClientes } from '@/hooks/useClientes'
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
import { PrestamoForm } from '@/components/prestamos/PrestamoForm'
import { PagoForm } from '@/components/pagos/PagoForm'
import { CronogramaPagos } from '@/components/prestamos/CronogramaPagos'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { usePagos } from '@/hooks/usePagos'
import { 
  CreditCard, 
  Plus, 
  Search, 
  MoreHorizontal,
  Edit,
  Eye,
  Trash2,
  User,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Download,
  RefreshCw,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Percent
} from 'lucide-react'
import { Prestamo } from '@/types/database'
import { formatCurrency, formatDate, convertirFecha } from '@/lib/utils'
import { calcularDiasAtraso, determinarEstadoPrestamo } from '@/hooks/usePrestamos'
import { toast } from '@/hooks/use-toast'

export default function PrestamosPage() {
  const { empresaActual } = useAuth()
  const { clientes } = useClientes()
  const {
    prestamos,
    loading,
    error,
    crearPrestamo,
    actualizarPrestamo,
    eliminarPrestamo,
    calcularIntereses,
    calcularMontoCuota,
    recargarPrestamos
  } = usePrestamos()
  const { procesarPagoAutomatico } = usePagos()

  // Estados para UI
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [showPrestamoForm, setShowPrestamoForm] = useState(false)
  const [prestamoEditando, setPrestamoEditando] = useState<Prestamo | null>(null)
  const [prestamoAEliminar, setPrestamoAEliminar] = useState<Prestamo | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [prestamoDetalle, setPrestamoDetalle] = useState<Prestamo | null>(null)
  const [prestamoParaPago, setPrestamoParaPago] = useState<Prestamo | null>(null)

  // Préstamos filtrados
  const prestamosFiltrados = useMemo(() => {
    let filtered = prestamos

    // Filtro por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(prestamo => {
        const cliente = clientes.find(c => c.id === prestamo.clienteId)
        const clienteNombre = cliente ? `${cliente.nombre} ${cliente.apellido}`.toLowerCase() : ''
        
        return (
          prestamo.numero.toLowerCase().includes(term) ||
          clienteNombre.includes(term) ||
          cliente?.cedula.includes(term) ||
          prestamo.proposito.toLowerCase().includes(term)
        )
      })
    }

    // Filtro por estado
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(prestamo => prestamo.estado === statusFilter)
    }

    return filtered
  }, [prestamos, clientes, searchTerm, statusFilter])

  // Estadísticas calculadas
  const stats = useMemo(() => {
    const total = prestamos.length
    const activos = prestamos.filter(p => p.estado === 'activo').length
    const atrasados = prestamos.filter(p => p.estado === 'atrasado').length
    const finalizados = prestamos.filter(p => p.estado === 'finalizado').length
    
    const montoTotal = prestamos.reduce((sum, p) => sum + p.monto, 0)
    const saldoPendiente = prestamos
      .filter(p => p.estado === 'activo' || p.estado === 'atrasado')
      .reduce((sum, p) => sum + p.saldoCapital, 0)
    const interesesGenerados = prestamos.reduce((sum, p) => sum + p.interesesPagados, 0)
    
    const tasaPromedioRecuperacion = total > 0 ? (finalizados / total) * 100 : 0

    return { 
      total, 
      activos, 
      atrasados, 
      finalizados, 
      montoTotal, 
      saldoPendiente, 
      interesesGenerados,
      tasaPromedioRecuperacion
    }
  }, [prestamos])

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'activo': return 'bg-green-100 text-green-800'
      case 'atrasado': return 'bg-red-100 text-red-800'
      case 'finalizado': return 'bg-blue-100 text-blue-800'
      case 'cancelado': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'activo': return <CheckCircle className="h-4 w-4" />
      case 'atrasado': return <AlertCircle className="h-4 w-4" />
      case 'finalizado': return <CheckCircle className="h-4 w-4" />
      case 'cancelado': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const handleNuevoPrestamo = () => {
    if (clientes.length === 0) {
      toast({
        title: "No hay clientes disponibles",
        description: "Primero debes registrar al menos un cliente para crear préstamos",
        variant: "destructive"
      })
      return
    }
    setPrestamoEditando(null)
    setShowPrestamoForm(true)
  }

  const handleEditarPrestamo = (prestamo: Prestamo) => {
    setPrestamoEditando(prestamo)
    setShowPrestamoForm(true)
  }

  const handleVerDetalles = (prestamo: Prestamo) => {
    setPrestamoDetalle(prestamo)
  }

  const handleRegistrarPago = (prestamo: Prestamo) => {
    setPrestamoParaPago(prestamo)
  }

  const handlePagoRegistrado = async (
    prestamoId: string,
    montoPagado: number,
    metodoPago: string,
    referenciaPago?: string,
    observaciones?: string
  ) => {
    await procesarPagoAutomatico(prestamoId, montoPagado, metodoPago, observaciones)
    await recargarPrestamos()
  }

  const handleGuardarPrestamo = async (prestamoData: Omit<Prestamo, 'id' | 'empresaId' | 'numero' | 'fechaCreacion'>) => {
    try {
      if (prestamoEditando) {
        await actualizarPrestamo(prestamoEditando.id, prestamoData)
        toast({
          title: "Préstamo actualizado",
          description: `El préstamo ${prestamoEditando.numero} ha sido actualizado correctamente`,
        })
      } else {
        await crearPrestamo(prestamoData)
        toast({
          title: "Préstamo creado",
          description: `El préstamo ha sido creado correctamente`,
        })
      }
      setShowPrestamoForm(false)
      setPrestamoEditando(null)
    } catch (error: any) {
      console.error('Error guardando préstamo:', error)
      // El error ya se maneja en el hook usePrestamos
    }
  }

  const handleEliminarPrestamo = async () => {
    if (!prestamoAEliminar) return

    setIsDeleting(true)
    try {
      await eliminarPrestamo(prestamoAEliminar.id)
      toast({
        title: "Préstamo eliminado",
        description: `El préstamo ${prestamoAEliminar.numero} ha sido eliminado`,
      })
      setPrestamoAEliminar(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el préstamo",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const limpiarFiltros = () => {
    setSearchTerm('')
    setStatusFilter('todos')
  }

  const obtenerNombreCliente = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId)
    return cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Cliente no encontrado'
  }

  // Helper para formatear fechas de forma segura
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

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-red-500 mb-4">
              <AlertCircle className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar préstamos</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={recargarPrestamos} variant="outline">
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
            <div className="p-2 bg-green-100 rounded-lg">
              <CreditCard className="h-8 w-8 text-green-600" />
            </div>
            Gestión de Préstamos
            {loading && <Loader2 className="h-6 w-6 animate-spin text-green-600" />}
          </h1>
          <p className="text-gray-600 mt-2">
            Administra la cartera de préstamos y seguimiento de pagos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={recargarPrestamos} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Recargar
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={handleNuevoPrestamo} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Préstamo
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Préstamos</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">Cartera total</span>
              <span className="text-gray-500 ml-1">de préstamos</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Préstamos Activos</p>
                <p className="text-3xl font-bold text-gray-900">{stats.activos}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600">
                {stats.total > 0 ? Math.round((stats.activos / stats.total) * 100) : 0}%
              </span>
              <span className="text-gray-500 ml-1">del total</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Saldo Pendiente</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.saldoPendiente)}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-yellow-600">Capital</span>
              <span className="text-gray-500 ml-1">por cobrar</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Intereses Generados</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.interesesGenerados)}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Percent className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-purple-600">Ganancias</span>
              <span className="text-gray-500 ml-1">generadas</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas y Estado de la Cartera */}
      {stats.atrasados > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-800">
                  Atención: {stats.atrasados} préstamo{stats.atrasados > 1 ? 's' : ''} atrasado{stats.atrasados > 1 ? 's' : ''}
                </h3>
                <p className="text-red-700">
                  Revisa los préstamos vencidos y contacta a los clientes para regularizar los pagos
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
                  placeholder="Buscar por número, cliente, cédula o propósito..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="activo">Activos</SelectItem>
                  <SelectItem value="atrasado">Atrasados</SelectItem>
                  <SelectItem value="finalizado">Finalizados</SelectItem>
                  <SelectItem value="cancelado">Cancelados</SelectItem>
                </SelectContent>
              </Select>

              {(searchTerm || statusFilter !== 'todos') && (
                <Button variant="outline" size="sm" onClick={limpiarFiltros}>
                  Limpiar
                </Button>
              )}
            </div>
          </div>
          
          {(searchTerm || statusFilter !== 'todos') && (
            <div className="mt-4 text-sm text-gray-600">
              Mostrando {prestamosFiltrados.length} de {prestamos.length} préstamos
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loans List */}
      <div className="grid gap-6">
        {loading && prestamos.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                <span className="text-lg text-gray-600">Cargando préstamos...</span>
              </div>
            </CardContent>
          </Card>
        ) : prestamosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {prestamos.length === 0 
                  ? 'No tienes préstamos registrados'
                  : 'No se encontraron préstamos'
                }
              </h3>
              <p className="text-gray-600 mb-6">
                {prestamos.length === 0 
                  ? 'Comienza creando tu primer préstamo para gestionar tu cartera'
                  : 'Intenta ajustar los filtros de búsqueda o crear un nuevo préstamo'
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {prestamos.length === 0 ? (
                  <Button onClick={handleNuevoPrestamo} className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primer Préstamo
                  </Button>
                ) : (
                  <>
                    <Button onClick={limpiarFiltros} variant="outline">
                      Limpiar Filtros
                    </Button>
                    <Button onClick={handleNuevoPrestamo} className="bg-green-600 hover:bg-green-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo Préstamo
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          prestamosFiltrados.map((prestamo) => {
            const cliente = clientes.find(c => c.id === prestamo.clienteId)
            
            // Validar fechas antes de usarlas
            let fechaVencimiento: Date;
            let diasAtraso = 0;
            
            try {
              fechaVencimiento = convertirFecha(prestamo.fechaVencimiento)
              diasAtraso = calcularDiasAtraso(fechaVencimiento)
            } catch (error) {
              console.error('Error procesando fechas del préstamo:', prestamo.id, error)
              fechaVencimiento = new Date()
              diasAtraso = 0
            }
            
            const estadoCalculado = determinarEstadoPrestamo(prestamo)
            
            return (
              <Card key={prestamo.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        <CreditCard className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {prestamo.numero}
                          </h3>
                          <Badge className={getStatusColor(estadoCalculado)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(estadoCalculado)}
                              <span className="capitalize">{estadoCalculado}</span>
                            </div>
                          </Badge>
                          {diasAtraso > 0 && estadoCalculado === 'atrasado' && (
                            <Badge variant="outline" className="border-red-500 text-red-700">
                              {diasAtraso} días de atraso
                            </Badge>
                          )}
                        </div>
                        
                        {/* Información del Cliente */}
                        <div className="flex items-center gap-2 mb-3">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Cliente no encontrado'}
                          </span>
                          {cliente && (
                            <span className="text-sm text-gray-500">
                              (Score: {cliente.creditScore})
                            </span>
                          )}
                        </div>
                        
                        {/* Información Financiera */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <div>
                              <span className="text-xs text-gray-500">Monto:</span>
                              <div className="font-semibold text-green-600">
                                {formatCurrency(prestamo.monto)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Percent className="h-4 w-4 text-blue-600" />
                            <div>
                              <span className="text-xs text-gray-500">Tasa:</span>
                              <div className="font-semibold text-blue-600">
                                {prestamo.tasaInteres}% {prestamo.tipoTasa}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-purple-600" />
                            <div>
                              <span className="text-xs text-gray-500">Plazo:</span>
                              <div className="font-semibold text-purple-600">
                                {prestamo.plazo} {prestamo.tipoTasa === 'mensual' ? 'meses' : 
                                                 prestamo.tipoTasa === 'quincenal' ? 'quincenas' : 'años'}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-orange-600" />
                            <div>
                              <span className="text-xs text-gray-500">Saldo:</span>
                              <div className="font-semibold text-orange-600">
                                {formatCurrency(prestamo.saldoCapital)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Fechas Importantes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                          <div>
                            <strong>Inicio:</strong> {formatearFechaSegura(prestamo.fechaInicio)}
                          </div>
                          <div>
                            <strong>Vencimiento:</strong> {formatearFechaSegura(prestamo.fechaVencimiento)}
                          </div>
                        </div>

                        {/* Propósito */}
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            <strong>Propósito:</strong> {prestamo.proposito}
                          </p>
                          {prestamo.garantia && (
                            <p className="text-sm text-gray-700 mt-1">
                              <strong>Garantía:</strong> {prestamo.garantia}
                            </p>
                          )}
                        </div>

                        {/* Próximo Pago */}
                        {(estadoCalculado === 'activo' || estadoCalculado === 'atrasado') && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-blue-800">
                                Próximo pago:
                              </span>
                              <span className="font-bold text-blue-900">
                                {formatCurrency(prestamo.montoProximoPago)}
                              </span>
                            </div>
                            <div className="text-xs text-blue-600 mt-1">
                              Fecha: {formatearFechaSegura(prestamo.fechaProximoPago)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="flex-shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleVerDetalles(prestamo)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRegistrarPago(prestamo)}>
                          <DollarSign className="h-4 w-4 mr-2" />
                          Registrar Pago
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditarPrestamo(prestamo)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => setPrestamoAEliminar(prestamo)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Detalle del Préstamo */}
      <Dialog open={!!prestamoDetalle} onOpenChange={() => setPrestamoDetalle(null)}>
codex/add-functionality-for-loan-actions-la0yct
        <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detalles del préstamo {prestamoDetalle?.numero}
            </DialogTitle>
          </DialogHeader>
          {prestamoDetalle && (
            <CronogramaPagos prestamo={prestamoDetalle} />
          )}
        </DialogContent>
      </Dialog>

      {/* Formulario de Pago */}
      <PagoForm
        open={!!prestamoParaPago}
        onOpenChange={(open) => {
          if (!open) setPrestamoParaPago(null)
        }}
        prestamos={prestamoParaPago ? [{
          id: prestamoParaPago.id,
          numero: prestamoParaPago.numero,
          clienteNombre: obtenerNombreCliente(prestamoParaPago.clienteId),
          saldoCapital: prestamoParaPago.saldoCapital,
          interesesPendientes: prestamoParaPago.interesesPendientes,
          moraAcumulada: prestamoParaPago.moraAcumulada,
          montoProximoPago: prestamoParaPago.montoProximoPago,
          fechaProximoPago: prestamoParaPago.fechaProximoPago,
          estado: prestamoParaPago.estado
        }] : []}
        onPagoRegistrado={handlePagoRegistrado}
      />

      {/* Formulario de Préstamo */}
      <PrestamoForm
        isOpen={showPrestamoForm}
        onClose={() => {
          setShowPrestamoForm(false)
          setPrestamoEditando(null)
        }}
        prestamo={prestamoEditando}
        onSave={handleGuardarPrestamo}
      />

      {/* Dialog de Confirmación de Eliminación */}
      <AlertDialog 
        open={!!prestamoAEliminar} 
        onOpenChange={() => setPrestamoAEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar préstamo?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar el préstamo{' '}
              <strong>{prestamoAEliminar?.numero}</strong>
              ? Esta acción no se puede deshacer y se perderán todos los datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleEliminarPrestamo}
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
    </div>
  )
}
