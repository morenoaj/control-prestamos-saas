// src/app/(dashboard)/prestamos/page.tsx - VERSIÓN COMPLETA CON IMPORTACIÓN
'use client'

import { useState, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePrestamos } from '@/hooks/usePrestamos'
import { useClientes } from '@/hooks/useClientes'
import { usePagos } from '@/hooks/usePagos'
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
import { PrestamoImportExportDialog } from '@/components/prestamos/PrestamoImportExportDialog'
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
  Clock,
  Upload,
  Download,
  FileSpreadsheet
} from 'lucide-react'
import { Prestamo } from '@/types/database'
import { formatCurrency, formatDate, convertirFecha } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { Timestamp, doc, addDoc, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function PrestamosPage() {
  const { empresaActual, usuario } = useAuth()
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
  const [prestamoSeleccionado, setPrestamoSeleccionado] = useState<Prestamo | null>(null)
  const [showPagoForm, setShowPagoForm] = useState(false)
  const [prestamoParaPago, setPrestamoParaPago] = useState<Prestamo | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [prestamoAEliminar, setPrestamoAEliminar] = useState<Prestamo | null>(null)
  const [showImportExportDialog, setShowImportExportDialog] = useState(false)

  // Estados para operaciones async
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filtrar préstamos
  const prestamosFiltrados = useMemo(() => {
    return prestamos.filter(prestamo => {
      const cliente = clientes.find(c => c.id === prestamo.clienteId)
      const nombreCompleto = cliente ? `${cliente.nombre} ${cliente.apellido}`.toLowerCase() : ''
      const numero = prestamo.numero.toLowerCase()
      
      const matchesSearch = searchTerm === '' || 
        nombreCompleto.includes(searchTerm.toLowerCase()) ||
        numero.includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === 'todos' || prestamo.estado === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [prestamos, clientes, searchTerm, statusFilter])

  // Estadísticas
  const estadisticas = useMemo(() => {
    const total = prestamos.length
    const activos = prestamos.filter(p => p.estado === 'activo').length
    const enMora = prestamos.filter(p => p.diasAtraso > 0 || p.estado === 'atrasado').length
    const completados = prestamos.filter(p => p.estado === 'finalizado').length
    
    const montoTotal = prestamos.reduce((sum, p) => sum + p.monto, 0)
    const saldoPendiente = prestamos
      .filter(p => p.estado === 'activo')
      .reduce((sum, p) => sum + p.saldoCapital, 0)
    
    return {
      total,
      activos,
      enMora,
      completados,
      montoTotal,
      saldoPendiente
    }
  }, [prestamos])

  // Función para generar número único de préstamo
  const generarNumeroPrestamo = (): string => {
    const año = new Date().getFullYear()
    const mes = String(new Date().getMonth() + 1).padStart(2, '0')
    const ultimoNumero = prestamos.length + 1
    const secuencial = String(ultimoNumero).padStart(3, '0')
    return `PRES${año}${mes}${secuencial}`
  }

  // Handlers
  const handleCrearPrestamo = async (data: any) => {
    try {
      if (!empresaActual?.id || !usuario?.id) {
        throw new Error('Información de empresa o usuario no disponible')
      }

      const prestamoData = {
        numero: data.numero || generarNumeroPrestamo(),
        empresaId: empresaActual.id,
        usuarioCreador: usuario.id,
        clienteId: data.clienteId,
        monto: data.monto,
        tasaInteres: data.tasaInteres,
        tipoTasa: data.tipoTasa,
        plazo: data.esPlazoIndefinido ? undefined : data.plazo,
        esPlazoIndefinido: data.esPlazoIndefinido,
        fechaInicio: data.fechaInicio ? Timestamp.fromDate(new Date(data.fechaInicio)) : Timestamp.now(),
        fechaCreacion: data.fechaCreacion ? data.fechaCreacion : new Date(),
        fechaVencimiento: data.esPlazoIndefinido ? undefined : (() => {
          const fechaInicio = data.fechaInicio ? new Date(data.fechaInicio) : new Date()
          fechaInicio.setDate(fechaInicio.getDate() + (data.plazo || 0))
          return Timestamp.fromDate(fechaInicio)
        })(),
        metodoPago: data.metodoPago || 'efectivo',
        proposito: data.proposito || '',
        garantia: data.garantia || '',
        estado: 'activo' as const,
        saldoCapital: data.monto,
        interesesPendientes: 0,
        interesesPagados: 0,
        diasAtraso: 0,
        moraAcumulada: 0,
        observaciones: data.observaciones || ''
      }

      await crearPrestamo(prestamoData)
      setShowPrestamoForm(false)
      
      toast({
        title: "Préstamo creado",
        description: `Préstamo ${prestamoData.numero} creado exitosamente`,
      })
    } catch (error: any) {
      console.error('Error creando préstamo:', error)
      toast({
        title: "Error al crear préstamo",
        description: error.message || "No se pudo crear el préstamo",
        variant: "destructive"
      })
    }
  }

  const handleEditarPrestamo = async (data: any) => {
    try {
      if (!prestamoSeleccionado) return

      await actualizarPrestamo(prestamoSeleccionado.id, data)
      setShowPrestamoForm(false)
      setPrestamoSeleccionado(null)
      
      toast({
        title: "Préstamo actualizado",
        description: "Los cambios se guardaron correctamente",
      })
    } catch (error: any) {
      console.error('Error actualizando préstamo:', error)
      toast({
        title: "Error al actualizar",
        description: error.message || "No se pudieron guardar los cambios",
        variant: "destructive"
      })
    }
  }

  const handleEliminarPrestamo = async () => {
    if (!prestamoAEliminar) return
    
    setIsDeleting(true)
    try {
      await eliminarPrestamo(prestamoAEliminar.id)
      setShowDeleteDialog(false)
      setPrestamoAEliminar(null)
      
      toast({
        title: "Préstamo eliminado",
        description: "El préstamo se eliminó correctamente",
      })
    } catch (error: any) {
      console.error('Error eliminando préstamo:', error)
      toast({
        title: "Error al eliminar",
        description: error.message || "No se pudo eliminar el préstamo",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleProcesarPago = async (prestamoId: string, montoPagado: number, metodoPago: string, referenciaPago?: string, observaciones?: string) => {
    try {
      await procesarPagoAutomatico(prestamoId, montoPagado, metodoPago, observaciones)
      setShowPagoForm(false)
      setPrestamoParaPago(null)
      
      toast({
        title: "Pago registrado",
        description: "El pago se procesó correctamente",
      })
    } catch (error: any) {
      console.error('Error procesando pago:', error)
      toast({
        title: "Error al procesar pago",
        description: error.message || "No se pudo procesar el pago",
        variant: "destructive"
      })
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await recargarPrestamos()
      toast({
        title: "Datos actualizados",
        description: "La información se actualizó correctamente",
      })
    } catch (error) {
      toast({
        title: "Error al actualizar",
        description: "No se pudieron actualizar los datos",
        variant: "destructive"
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Función para manejar préstamos importados
  const handlePrestamosImportados = async (prestamosData: any[]) => {
    try {
      if (!empresaActual?.id || !usuario?.id) {
        throw new Error('Información de empresa o usuario no disponible')
      }

      let exitosos = 0
      let errores = 0

      for (const { prestamo, cliente } of prestamosData) {
        try {
          // Limpiar datos antes de guardar - remover valores undefined
          const prestamoLimpio = {
            numero: prestamo.numero || generarNumeroPrestamo(),
            empresaId: empresaActual.id,
            usuarioCreador: usuario.id,
            clienteId: prestamo.clienteId,
            monto: prestamo.monto,
            tasaInteres: prestamo.tasaInteres,
            tipoTasa: prestamo.tipoTasa,
            // Solo incluir plazo si no es indefinido
            ...(prestamo.esPlazoIndefinido ? {} : { plazo: prestamo.plazo }),
            esPlazoIndefinido: prestamo.esPlazoIndefinido || false,
            // Convertir fechas a Timestamp correctamente
            fechaInicio: Timestamp.fromDate(prestamo.fechaInicio),
            fechaCreacion: Timestamp.fromDate(prestamo.fechaCreacion || new Date()),
            // Solo incluir fechaVencimiento si no es indefinido
            ...(prestamo.fechaVencimiento ? { fechaVencimiento: Timestamp.fromDate(prestamo.fechaVencimiento) } : {}),
            metodoPago: prestamo.metodoPago || 'efectivo',
            proposito: prestamo.proposito || '',
            garantia: prestamo.garantia || '',
            estado: 'activo' as const,
            saldoCapital: prestamo.monto,
            interesesPendientes: 0,
            interesesPagados: 0,
            diasAtraso: 0,
            moraAcumulada: 0,
            // Solo incluir fechaProximoPago si no es indefinido
            ...(prestamo.fechaProximoPago ? { fechaProximoPago: Timestamp.fromDate(prestamo.fechaProximoPago) } : {}),
            // Solo incluir montoProximoPago si tiene valor
            ...(prestamo.montoProximoPago ? { montoProximoPago: prestamo.montoProximoPago } : {}),
            observaciones: prestamo.observaciones || ''
          }

          await addDoc(collection(db, 'prestamos'), prestamoLimpio)
          exitosos++
        } catch (error) {
          console.error('Error guardando préstamo individual:', error)
          errores++
        }
      }

      toast({
        title: "Importación completada",
        description: `${exitosos} préstamos importados${errores > 0 ? `, ${errores} errores` : ''}`,
        variant: errores > 0 ? "destructive" : "default"
      })

      // Recargar la lista
      await recargarPrestamos()
      
    } catch (error: any) {
      console.error('Error en importación masiva:', error)
      toast({
        title: "Error en importación",
        description: error.message || "No se pudieron importar los préstamos",
        variant: "destructive"
      })
    }
  }

  const getEstadoBadge = (prestamo: Prestamo) => {
    switch (prestamo.estado) {
      case 'activo':
        return <Badge className="bg-green-100 text-green-800">Activo</Badge>
      case 'atrasado':
        return <Badge className="bg-red-100 text-red-800">En Mora</Badge>
      case 'finalizado':
        return <Badge className="bg-blue-100 text-blue-800">Finalizado</Badge>
      case 'cancelado':
        return <Badge className="bg-gray-100 text-gray-800">Cancelado</Badge>
      case 'pendiente':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Cargando préstamos...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error al cargar préstamos</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Préstamos</h1>
          <p className="text-gray-600">Administra tu cartera de préstamos</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setShowImportExportDialog(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            <Download className="h-4 w-4" />
            Importar/Exportar
          </Button>
          
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          
          <Button onClick={() => setShowPrestamoForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Préstamo
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Préstamos</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estadisticas.total}</div>
            <p className="text-xs text-muted-foreground">
              {estadisticas.activos} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(estadisticas.montoTotal)}</div>
            <p className="text-xs text-muted-foreground">
              Capital prestado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Pendiente</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(estadisticas.saldoPendiente)}</div>
            <p className="text-xs text-muted-foreground">
              Por cobrar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Mora</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{estadisticas.enMora}</div>
            <p className="text-xs text-muted-foreground">
              Requieren atención
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por cliente o número de préstamo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="activo">Activo</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
            <SelectItem value="finalizado">Finalizado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Préstamos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Préstamos ({prestamosFiltrados.length})</span>
            {prestamosFiltrados.length !== prestamos.length && (
              <Badge variant="outline">
                {prestamosFiltrados.length} de {prestamos.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {prestamosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'todos' ? 'No se encontraron préstamos' : 'No hay préstamos registrados'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== 'todos' 
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Comienza creando tu primer préstamo'
                }
              </p>
              {(!searchTerm && statusFilter === 'todos') && (
                <Button onClick={() => setShowPrestamoForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primer Préstamo
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {prestamosFiltrados.map((prestamo) => {
                const cliente = clientes.find(c => c.id === prestamo.clienteId)
                const montoCuota = calcularMontoCuota ? calcularMontoCuota(prestamo) : 0
                
                return (
                  <div
                    key={prestamo.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{prestamo.numero}</h3>
                        {getEstadoBadge(prestamo)}
                        {prestamo.diasAtraso > 0 && (
                          <Badge className="bg-red-100 text-red-800">
                            {prestamo.diasAtraso} días atraso
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Cliente:</span><br />
                          {cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Cliente no encontrado'}
                        </div>
                        
                        <div>
                          <span className="font-medium">Monto:</span><br />
                          {formatCurrency(prestamo.monto)}
                        </div>
                        
                        <div>
                          <span className="font-medium">Saldo:</span><br />
                          {formatCurrency(prestamo.saldoCapital)}
                        </div>
                        
                        <div>
                          <span className="font-medium">Próximo pago:</span><br />
                          {prestamo.esPlazoIndefinido ? (
                            <span className="flex items-center gap-1">
                              <Infinity className="h-3 w-3" />
                              Indefinido
                            </span>
                          ) : (
                            prestamo.fechaProximoPago 
                              ? formatDate(prestamo.fechaProximoPago)
                              : 'No definido'
                          )}
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setPrestamoSeleccionado(prestamo)
                            setShowPrestamoForm(true)
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalles
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem
                          onClick={() => {
                            setPrestamoSeleccionado(prestamo)
                            setShowPrestamoForm(true)
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        
                        {prestamo.estado === 'activo' && (
                          <DropdownMenuItem
                            onClick={() => {
                              setPrestamoParaPago(prestamo)
                              setShowPagoForm(true)
                            }}
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            Registrar pago
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuItem
                          onClick={() => {
                            setPrestamoAEliminar(prestamo)
                            setShowDeleteDialog(true)
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulario de Préstamo */}
      <PrestamoForm
        isOpen={showPrestamoForm}
        onClose={() => {
          setShowPrestamoForm(false)
          setPrestamoSeleccionado(null)
        }}
        prestamo={prestamoSeleccionado}
        onSave={prestamoSeleccionado ? handleEditarPrestamo : handleCrearPrestamo}
      />

      {/* Formulario de Pago */}
      {prestamoParaPago && (
        <PagoForm
          open={showPagoForm}
          onOpenChange={(open) => {
            setShowPagoForm(open)
            if (!open) setPrestamoParaPago(null)
          }}
          prestamos={[{
            id: prestamoParaPago.id,
            numero: prestamoParaPago.numero,
            clienteNombre: (() => {
              const cliente = clientes.find(c => c.id === prestamoParaPago.clienteId)
              return cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Cliente no encontrado'
            })(),
            saldoCapital: prestamoParaPago.saldoCapital,
            interesesPendientes: prestamoParaPago.interesesPendientes,
            moraAcumulada: prestamoParaPago.moraAcumulada,
            montoProximoPago: prestamoParaPago.montoProximoPago || 0,
            fechaProximoPago: prestamoParaPago.fechaProximoPago ? prestamoParaPago.fechaProximoPago.toDate() : null,
            estado: prestamoParaPago.estado
          }]}
          onPagoRegistrado={handleProcesarPago}
        />
      )}

      {/* Diálogo de Importación/Exportación */}
      <PrestamoImportExportDialog
        isOpen={showImportExportDialog}
        onClose={() => setShowImportExportDialog(false)}
        prestamos={prestamos}
        clientes={clientes}
        onPrestamosImportados={handlePrestamosImportados}
      />

      {/* Diálogo de Confirmación de Eliminación */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar préstamo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el préstamo{' '}
              <strong>{prestamoAEliminar?.numero}</strong>.
              Esta acción no se puede deshacer.
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