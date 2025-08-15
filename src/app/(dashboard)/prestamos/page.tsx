// src/app/(dashboard)/prestamos/page.tsx - VERSIÓN MEJORADA Y SIMPLIFICADA
'use client'

import { useState, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePrestamos } from '@/hooks/usePrestamos'
import { useClientes } from '@/hooks/useClientes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { usePagos } from '@/hooks/usePagos'
import { 
  CreditCard, 
  Plus, 
  Search, 
  MoreHorizontal,
  Edit,
  Eye,
  Trash2,
  DollarSign,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Calendar,
  Infinity,
  Users,
  Filter,
  Clock
} from 'lucide-react'
import { Prestamo } from '@/types/database'
import { formatCurrency, formatDate, convertirFecha } from '@/lib/utils'
import { determinarEstadoPrestamo } from '@/hooks/usePrestamos'
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
  const [prestamoParaPago, setPrestamoParaPago] = useState<Prestamo | null>(null)

  // Helper para obtener cliente
  const obtenerClientePorId = (clienteId: string) => {
    return clientes.find(c => c.id === clienteId)
  }

  // Helper para formatear fechas
  const formatearFechaSegura = (fecha: any, fallback = 'N/A') => {
    try {
      const fechaConvertida = convertirFecha(fecha)
      if (isNaN(fechaConvertida.getTime())) return fallback
      return formatDate(fechaConvertida)
    } catch {
      return fallback
    }
  }

  // Préstamos filtrados
  const prestamosFiltrados = useMemo(() => {
    let filtered = prestamos

    // Filtro por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(prestamo => {
        const cliente = obtenerClientePorId(prestamo.clienteId)
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
    
    return { total, activos, atrasados, finalizados, montoTotal, saldoPendiente }
  }, [prestamos])

  // Manejar eliminación
  const handleEliminar = async () => {
    if (!prestamoAEliminar) return
    
    setIsDeleting(true)
    try {
      await eliminarPrestamo(prestamoAEliminar.id)
      toast({
        title: "Préstamo eliminado",
        description: `Préstamo ${prestamoAEliminar.numero} eliminado correctamente`,
      })
      setPrestamoAEliminar(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el préstamo",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
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
            <div className="p-2 bg-blue-100 rounded-lg">
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
            Préstamos
            {loading && <Loader2 className="h-6 w-6 animate-spin text-blue-600" />}
          </h1>
          <p className="text-gray-600 mt-1">
            Gestiona tu cartera de préstamos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={recargarPrestamos} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button onClick={() => setShowPrestamoForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Préstamo
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.activos}</div>
                <div className="text-xs text-gray-500">Activos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.atrasados}</div>
                <div className="text-xs text-gray-500">Atrasados</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-gray-600" />
              <div>
                <div className="text-2xl font-bold text-gray-600">{stats.finalizados}</div>
                <div className="text-xs text-gray-500">Finalizados</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-sm font-bold text-purple-600">{formatCurrency(stats.montoTotal)}</div>
                <div className="text-xs text-gray-500">Prestado</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <div>
                <div className="text-sm font-bold text-orange-600">{formatCurrency(stats.saldoPendiente)}</div>
                <div className="text-xs text-gray-500">Pendiente</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por número, cliente, cédula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="atrasado">Atrasados</SelectItem>
            <SelectItem value="finalizado">Finalizados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Préstamos */}
      <div className="grid gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Cargando préstamos...</span>
          </div>
        ) : prestamosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'todos' ? 'No se encontraron préstamos' : 'No hay préstamos registrados'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter !== 'todos' 
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Comienza creando tu primer préstamo'
                }
              </p>
              {!searchTerm && statusFilter === 'todos' && (
                <Button onClick={() => setShowPrestamoForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primer Préstamo
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          prestamosFiltrados.map((prestamo) => {
            const cliente = obtenerClientePorId(prestamo.clienteId)
            const montoCuota = calcularMontoCuota(prestamo)
            
            // ✅ CORRECCIÓN: Pasar prestamo.diasAtraso en lugar de prestamo
            const estadoCalculado = determinarEstadoPrestamo(
              prestamo.saldoCapital,
              prestamo.fechaProximoPago ? convertirFecha(prestamo.fechaProximoPago) : undefined,
              prestamo.diasAtraso // ✅ CORRECTO: número de días de atraso
            )

            return (
              <Card key={prestamo.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        estadoCalculado === 'activo' ? 'bg-green-100' :
                        estadoCalculado === 'atrasado' ? 'bg-red-100' :
                        estadoCalculado === 'finalizado' ? 'bg-gray-100' : 'bg-blue-100'
                      }`}>
                        {estadoCalculado === 'activo' && <CheckCircle className="h-5 w-5 text-green-600" />}
                        {estadoCalculado === 'atrasado' && <AlertCircle className="h-5 w-5 text-red-600" />}
                        {estadoCalculado === 'finalizado' && <XCircle className="h-5 w-5 text-gray-600" />}
                        {estadoCalculado === 'pendiente' && <Clock className="h-5 w-5 text-blue-600" />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">
                          #{prestamo.numero}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Cliente no encontrado'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        estadoCalculado === 'activo' ? 'default' :
                        estadoCalculado === 'atrasado' ? 'destructive' :
                        estadoCalculado === 'finalizado' ? 'secondary' : 'outline'
                      }>
                        {estadoCalculado.charAt(0).toUpperCase() + estadoCalculado.slice(1)}
                      </Badge>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPrestamoParaPago(prestamo)}>
                            <DollarSign className="h-4 w-4 mr-2" />
                            Registrar pago
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setPrestamoEditando(prestamo)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setPrestamoAEliminar(prestamo)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Información Principal */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-gray-500">Monto</div>
                      <div className="font-semibold text-green-600">{formatCurrency(prestamo.monto)}</div>
                    </div>
                    
                    <div>
                      <div className="text-xs text-gray-500">Saldo</div>
                      <div className="font-semibold text-orange-600">{formatCurrency(prestamo.saldoCapital)}</div>
                    </div>
                    
                    <div>
                      <div className="text-xs text-gray-500">Tasa</div>
                      <div className="font-semibold">{prestamo.tasaInteres}% {prestamo.tipoTasa}</div>
                    </div>
                    
                    <div>
                      <div className="text-xs text-gray-500">Tipo</div>
                      <div className="font-semibold flex items-center gap-1">
                        {prestamo.esPlazoIndefinido ? (
                          <>
                            <Infinity className="h-3 w-3" />
                            Indefinido
                          </>
                        ) : (
                          <>
                            <Calendar className="h-3 w-3" />
                            {prestamo.plazo} {prestamo.tipoTasa === 'mensual' ? 'meses' : 
                                             prestamo.tipoTasa === 'quincenal' ? 'quincenas' : 'años'}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Próximo Pago */}
                  {(estadoCalculado === 'activo' || estadoCalculado === 'atrasado') && (
                    <div className={`p-3 rounded-lg border ${
                      estadoCalculado === 'atrasado' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${
                          estadoCalculado === 'atrasado' ? 'text-red-800' : 'text-blue-800'
                        }`}>
                          {estadoCalculado === 'atrasado' ? 'Pago atrasado:' : 'Próximo pago:'}
                        </span>
                        <span className={`font-bold ${
                          estadoCalculado === 'atrasado' ? 'text-red-900' : 'text-blue-900'
                        }`}>
                          {formatCurrency(prestamo.montoProximoPago || montoCuota)}
                        </span>
                      </div>
                      {prestamo.fechaProximoPago && (
                        <div className={`text-xs mt-1 ${
                          estadoCalculado === 'atrasado' ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          Fecha: {formatearFechaSegura(prestamo.fechaProximoPago)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Propósito */}
                  <div className="mt-3 text-sm text-gray-600">
                    <strong>Propósito:</strong> {prestamo.proposito}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Formulario de Préstamo */}
      <PrestamoForm
        isOpen={showPrestamoForm || !!prestamoEditando}
        onClose={() => {
          setShowPrestamoForm(false)
          setPrestamoEditando(null)
        }}
        prestamo={prestamoEditando}
        onSave={async (prestamoData) => {
          try {
            if (prestamoEditando) {
              await actualizarPrestamo(prestamoEditando.id, prestamoData as Partial<Prestamo>)
            } else {
              await crearPrestamo(prestamoData)
            }
          } catch (error) {
            console.error('Error al guardar préstamo:', error)
          }
        }}
      />

      {/* Formulario de Pago */}
      {prestamoParaPago && (
        <PagoForm
          open={!!prestamoParaPago}
          onOpenChange={(open) => !open && setPrestamoParaPago(null)}
          prestamos={[{
            id: prestamoParaPago.id,
            numero: prestamoParaPago.numero,
            clienteNombre: obtenerClientePorId(prestamoParaPago.clienteId)?.nombre + ' ' + 
                          obtenerClientePorId(prestamoParaPago.clienteId)?.apellido || 'Cliente',
            saldoCapital: prestamoParaPago.saldoCapital,
            interesesPendientes: prestamoParaPago.interesesPendientes,
            moraAcumulada: prestamoParaPago.moraAcumulada,
            montoProximoPago: prestamoParaPago.montoProximoPago || calcularMontoCuota(prestamoParaPago),
            fechaProximoPago: prestamoParaPago.fechaProximoPago ? convertirFecha(prestamoParaPago.fechaProximoPago) : null,
            estado: prestamoParaPago.estado
          }]}
          onPagoRegistrado={async (prestamoId, montoPagado, metodoPago, referenciaPago, observaciones) => {
            try {
              await procesarPagoAutomatico(prestamoId, montoPagado, metodoPago, observaciones)
              setPrestamoParaPago(null)
            } catch (error: any) {
              toast({
                title: "Error",
                description: error.message || "Error al procesar el pago",
                variant: "destructive"
              })
            }
          }}
        />
      )}

      {/* Diálogo de Confirmación de Eliminación */}
      <AlertDialog open={!!prestamoAEliminar} onOpenChange={() => setPrestamoAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar préstamo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el préstamo{' '}
              <strong>#{prestamoAEliminar?.numero}</strong> y todos sus datos relacionados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminar}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
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