// src/app/(dashboard)/pagos/page.tsx - CORREGIDO
'use client'

import { useState, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useClientes } from '@/hooks/useClientes'
import { usePrestamos } from '@/hooks/usePrestamos'
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
  CheckCircle,
  CreditCard,
  FileText,
  Filter
} from 'lucide-react'
import { formatCurrency, formatDate, convertirFecha } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

// Tipos temporales hasta implementar el hook completo
interface PagoTemp {
  id: string
  numero: string
  clienteId: string
  prestamoId: string
  montoPagado: number
  montoCapital: number
  montoIntereses: number
  montoMora: number
  metodoPago: string
  referenciaPago?: string
  fechaPago: any
  fechaRegistro: any
  estado: string
  observaciones?: string
  saldoAnterior: number
  saldoNuevo: number
}

export default function PagosPage() {
  const { empresaActual } = useAuth()
  const { clientes } = useClientes()
  const { prestamos } = usePrestamos()

  // Estados temporales mientras implementamos el hook real
  const [pagos] = useState<PagoTemp[]>([]) // Hook temporal
  const [loading] = useState(false)
  const [error] = useState<string | null>(null)

  // Estados para UI
  const [searchTerm, setSearchTerm] = useState('')
  const [metodoPagoFilter, setMetodoPagoFilter] = useState<string>('todos')
  const [estadoFilter, setEstadoFilter] = useState<string>('todos')
  const [showPagoForm, setShowPagoForm] = useState(false)
  const [prestamoSeleccionado, setPrestamoSeleccionado] = useState<any>(null)
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null)
  const [pagoAEliminar, setPagoAEliminar] = useState<PagoTemp | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Pagos filtrados
  const pagosFiltrados = useMemo(() => {
    let filtered = pagos

    // Filtro por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(pago => {
        const cliente = clientes.find(c => c.id === pago.clienteId)
        const prestamo = prestamos.find(p => p.id === pago.prestamoId)
        const clienteNombre = cliente ? `${cliente.nombre} ${cliente.apellido}`.toLowerCase() : ''
        const prestamoNumero = prestamo?.numero.toLowerCase() || ''
        
        return (
          pago.numero.toLowerCase().includes(term) ||
          clienteNombre.includes(term) ||
          prestamoNumero.includes(term) ||
          pago.referenciaPago?.toLowerCase().includes(term) ||
          cliente?.cedula.includes(term)
        )
      })
    }

    // Filtro por método de pago
    if (metodoPagoFilter !== 'todos') {
      filtered = filtered.filter(pago => pago.metodoPago === metodoPagoFilter)
    }

    // Filtro por estado
    if (estadoFilter !== 'todos') {
      filtered = filtered.filter(pago => pago.estado === estadoFilter)
    }

    return filtered
  }, [pagos, clientes, prestamos, searchTerm, metodoPagoFilter, estadoFilter])

  // Estadísticas calculadas
  const stats = useMemo(() => {
    const total = pagos.length
    const completados = pagos.filter(p => p.estado === 'completado').length
    const pendientes = pagos.filter(p => p.estado === 'pendiente_verificacion').length
    
    const montoTotalRecaudado = pagos
      .filter(p => p.estado === 'completado')
      .reduce((sum, p) => sum + p.montoPagado, 0)
    
    const capitalRecaudado = pagos
      .filter(p => p.estado === 'completado')
      .reduce((sum, p) => sum + p.montoCapital, 0)
    
    const interesesRecaudados = pagos
      .filter(p => p.estado === 'completado')
      .reduce((sum, p) => sum + p.montoIntereses, 0)
    
    const moraRecaudada = pagos
      .filter(p => p.estado === 'completado')
      .reduce((sum, p) => sum + p.montoMora, 0)

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
      montoMesActual
    }
  }, [pagos])

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
      case 'cheque': return <FileText className="h-4 w-4" />
      default: return <Receipt className="h-4 w-4" />
    }
  }

  const handleNuevoPago = () => {
    if (prestamos.length === 0) {
      toast({
        title: "No hay préstamos disponibles",
        description: "Primero debes tener préstamos activos para registrar pagos",
        variant: "destructive"
      })
      return
    }
    setShowPagoForm(true)
  }

  const handleGuardarPago = async (pagoData: any) => {
    try {
      // TODO: Implementar con el hook real
      console.log('Guardar pago:', pagoData)
      
      toast({
        title: "Pago registrado",
        description: `Pago de ${formatCurrency(pagoData.montoPagado)} registrado correctamente`,
      })
      setShowPagoForm(false)
    } catch (error: any) {
      console.error('Error guardando pago:', error)
      toast({
        title: "Error",
        description: error.message || "Error al registrar el pago",
        variant: "destructive"
      })
    }
  }

  const handleEliminarPago = async () => {
    if (!pagoAEliminar) return

    setIsDeleting(true)
    try {
      // TODO: Implementar eliminación
      console.log('Eliminar pago:', pagoAEliminar.id)
      
      toast({
        title: "Pago eliminado",
        description: `El pago ${pagoAEliminar.numero} ha sido eliminado`,
      })
      setPagoAEliminar(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el pago",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const limpiarFiltros = () => {
    setSearchTerm('')
    setMetodoPagoFilter('todos')
    setEstadoFilter('todos')
  }

  const recargarPagos = () => {
    // TODO: Implementar recarga
    console.log('Recargar pagos')
  }

  const obtenerNombreCliente = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId)
    return cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Cliente no encontrado'
  }

  const obtenerNumeroPrestamo = (prestamoId: string) => {
    const prestamo = prestamos.find(p => p.id === prestamoId)
    return prestamo?.numero || 'Préstamo no encontrado'
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar pagos</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={recargarPagos} variant="outline">
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
            {loading && <Loader2 className="h-6 w-6 animate-spin text-purple-600" />}
          </h1>
          <p className="text-gray-600 mt-2">
            Registra y administra todos los pagos de préstamos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={recargarPagos} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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

      {/* Stats Cards */}
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

      {/* Alertas */}
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

      {/* Estado vacío o cargando */}
      <div className="grid gap-6">
        {loading && pagos.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                <span className="text-lg text-gray-600">Cargando pagos...</span>
              </div>
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
                  <Button onClick={handleNuevoPago} className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Primer Pago
                  </Button>
                ) : (
                  <>
                    <Button onClick={limpiarFiltros} variant="outline">
                      Limpiar Filtros
                    </Button>
                    <Button onClick={handleNuevoPago} className="bg-purple-600 hover:bg-purple-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo Pago
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          // Lista de pagos (se renderizará cuando tengamos datos)
          pagosFiltrados.map((pago) => {
            const cliente = clientes.find(c => c.id === pago.clienteId)
            const prestamo = prestamos.find(p => p.id === pago.prestamoId)
            
            return (
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
                        
                        {/* Resto del contenido del pago */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span className="font-medium">
                              {cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Cliente no encontrado'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            <span>Préstamo: {prestamo?.numero || 'No encontrado'}</span>
                          </div>
                        </div>

                        <div className="text-sm text-gray-600">
                          <p><strong>Monto pagado:</strong> {formatCurrency(pago.montoPagado)}</p>
                          <p><strong>Fecha:</strong> {formatearFechaSegura(pago.fechaPago)}</p>
                        </div>
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
            )
          })
        )}
      </div>

      {/* Placeholder para el formulario de pago */}
      {showPagoForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Registrar Pago</CardTitle>
              <CardDescription>
                Funcionalidad en desarrollo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                El formulario de pagos estará disponible cuando implementes el hook usePagos.
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

      {/* Dialog de Confirmación de Eliminación */}
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
              ? Esta acción revertirá los cambios en el préstamo y no se puede deshacer.
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
    </div>
  )
}