// src/app/(dashboard)/prestamos/page.tsx - VERSIÓN LIMPIA Y CORREGIDA
'use client'

import { useState, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePrestamos } from '@/hooks/usePrestamos'
import { useClientes } from '@/hooks/useClientes'
import { usePagos } from '@/hooks/usePagos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { PrestamoCard } from '@/components/prestamos/PrestamoCard'
import { PrestamoDetailsModal } from '@/components/prestamos/PrestamoDetailsModal'
import { PrestamoImportExportDialog } from '@/components/prestamos/PrestamoImportExportDialog'
import { PagoForm } from '@/components/pagos/PagoForm'
import { 
  CreditCard, 
  Plus, 
  Search, 
  DollarSign,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Loader2,
  Filter,
  Users,
  FileSpreadsheet,
  Upload
} from 'lucide-react'
import { Prestamo, Cliente } from '@/types/database'
import { formatCurrency } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { Timestamp, addDoc, collection } from 'firebase/firestore'
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
    recargarPrestamos
  } = usePrestamos()
  const { procesarPago } = usePagos(empresaActual, usuario ? { uid: usuario.id } : null)

  // Estados para modales y formularios
  const [showPrestamoForm, setShowPrestamoForm] = useState(false)
  const [showPagoForm, setShowPagoForm] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showImportExportDialog, setShowImportExportDialog] = useState(false)
  
  // Estados para préstamos seleccionados
  const [prestamoSeleccionado, setPrestamoSeleccionado] = useState<Prestamo | null>(null)
  const [prestamoParaPago, setPrestamoParaPago] = useState<Prestamo | null>(null)
  const [prestamoAEliminar, setPrestamoAEliminar] = useState<Prestamo | null>(null)
  
  // Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Obtener cliente por ID
  const obtenerCliente = (clienteId: string): Cliente | null => {
    return clientes.find(c => c.id === clienteId) || null
  }

  // Filtrar préstamos
  const prestamosFiltrados = useMemo(() => {
    return prestamos.filter(prestamo => {
      const cliente = obtenerCliente(prestamo.clienteId)
      if (!cliente) return false

      const nombreCompleto = `${cliente.nombre} ${cliente.apellido}`.toLowerCase()
      const cumpleBusqueda = searchTerm === '' || 
        prestamo.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nombreCompleto.includes(searchTerm.toLowerCase()) ||
        cliente.cedula.includes(searchTerm)

      const cumpleEstado = statusFilter === 'todos' || prestamo.estado === statusFilter

      return cumpleBusqueda && cumpleEstado
    })
  }, [prestamos, clientes, searchTerm, statusFilter])

  // Calcular estadísticas
  const estadisticas = useMemo(() => {
    const total = prestamos.length
    const activos = prestamos.filter(p => p.estado === 'activo').length
    const finalizados = prestamos.filter(p => p.estado === 'finalizado').length
    const atrasados = prestamos.filter(p => p.estado === 'atrasado').length
    const montoTotal = prestamos.reduce((sum, p) => sum + p.monto, 0)
    const saldoPendiente = prestamos
      .filter(p => p.estado === 'activo')
      .reduce((sum, p) => sum + (p.saldoCapital || p.monto), 0)

    return {
      total,
      activos,
      finalizados,
      atrasados,
      enMora: atrasados,
      montoTotal,
      saldoPendiente
    }
  }, [prestamos])

  // Manejadores de eventos para préstamos
  const handleVerDetalles = (prestamo: Prestamo) => {
    console.log('👁️ Ver detalles del préstamo:', prestamo.numero)
    setPrestamoSeleccionado(prestamo)
    setShowDetailsModal(true)
  }

  const handleEditarPrestamo = (prestamo: Prestamo) => {
    console.log('✏️ Editar préstamo:', prestamo.numero)
    setPrestamoSeleccionado(prestamo)
    setShowPrestamoForm(true)
  }

  const handleEliminarPrestamo = (prestamo: Prestamo) => {
    console.log('🗑️ Solicitar eliminación del préstamo:', prestamo.numero)
    setPrestamoAEliminar(prestamo)
    setShowDeleteDialog(true)
  }

  const handleRegistrarPago = (prestamo: Prestamo) => {
    console.log('💰 Registrar pago para préstamo:', prestamo.numero)
    setPrestamoParaPago(prestamo)
    setShowPagoForm(true)
  }

  // Confirmar eliminación
  const confirmarEliminacion = async () => {
    if (!prestamoAEliminar) return

    setIsDeleting(true)
    try {
      await eliminarPrestamo(prestamoAEliminar.id)
      toast({
        title: 'Préstamo eliminado',
        description: `El préstamo ${prestamoAEliminar.numero} ha sido eliminado exitosamente.`,
      })
      setPrestamoAEliminar(null)
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Error eliminando préstamo:', error)
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el préstamo. Inténtalo de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Recargar datos
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await recargarPrestamos()
      toast({
        title: 'Datos actualizados',
        description: 'Los préstamos han sido actualizados exitosamente.',
      })
    } catch (error) {
      console.error('Error recargando préstamos:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron actualizar los datos.',
        variant: 'destructive',
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Crear préstamo
  const handleCrearPrestamo = async (data: any) => {
    try {
      const prestamoData = {
        clienteId: data.clienteId,
        numero: `P-${Date.now()}`,
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
        observaciones: data.observaciones || '',
        usuarioCreador: usuario?.id || '',
        empresaId: empresaActual?.id || ''
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

  // Editar préstamo
  const handleEditarPrestamoGuardar = async (data: any) => {
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

  // Procesar pago con manejo correcto del tipo de retorno
  const handleProcesarPago = async (
    prestamoId: string, 
    montoPagado: number, 
    metodoPago: string, 
    referenciaPago?: string, 
    observaciones?: string
  ) => {
    try {
      await procesarPago(prestamoId, montoPagado, metodoPago, referenciaPago, observaciones)
      
      toast({
        title: "Pago registrado",
        description: "El pago se procesó exitosamente",
      })
      
      setShowPagoForm(false)
      setPrestamoParaPago(null)
      await recargarPrestamos()
    } catch (error: any) {
      console.error('Error procesando pago:', error)
      toast({
        title: "Error al procesar pago",
        description: error.message || "No se pudo procesar el pago",
        variant: "destructive"
      })
    }
  }

  // Manejar importación de préstamos
  const handlePrestamosImportados = async (prestamosData: any[]) => {
    try {
      let exitosos = 0
      let errores = 0

      for (const { prestamo, cliente } of prestamosData) {
        try {
          if (!cliente) {
            console.warn('Cliente no encontrado para préstamo:', prestamo.numero)
            errores++
            continue
          }

          const prestamoLimpio = {
            empresaId: empresaActual?.id || '',
            clienteId: cliente.id,
            usuarioCreador: usuario?.id || '',
            numero: prestamo.numero || `P-${Date.now()}-${exitosos}`,
            monto: prestamo.monto || 0,
            tasaInteres: prestamo.tasaInteres || 0,
            tipoTasa: prestamo.tipoTasa || 'mensual',
            plazo: prestamo.esPlazoIndefinido ? undefined : prestamo.plazo,
            esPlazoIndefinido: prestamo.esPlazoIndefinido || false,
            fechaInicio: prestamo.fechaInicio ? Timestamp.fromDate(prestamo.fechaInicio) : Timestamp.now(),
            fechaCreacion: prestamo.fechaCreacion ? Timestamp.fromDate(prestamo.fechaCreacion) : Timestamp.now(),
            ...(prestamo.fechaVencimiento && !prestamo.esPlazoIndefinido ? 
              { fechaVencimiento: Timestamp.fromDate(prestamo.fechaVencimiento) } : {}),
            metodoPago: prestamo.metodoPago || 'efectivo',
            proposito: prestamo.proposito || '',
            garantia: prestamo.garantia || '',
            estado: 'activo' as const,
            saldoCapital: prestamo.monto,
            interesesPendientes: 0,
            interesesPagados: 0,
            diasAtraso: 0,
            moraAcumulada: 0,
            ...(prestamo.fechaProximoPago ? { fechaProximoPago: Timestamp.fromDate(prestamo.fechaProximoPago) } : {}),
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
        variant: errores > 0 ? 'destructive' : 'default'
      })

      await recargarPrestamos()
    } catch (error: any) {
      console.error('Error en importación masiva:', error)
      toast({
        title: "Error en importación",
        description: error.message || "Error al importar préstamos",
        variant: "destructive"
      })
    }
  }

  // Éxito al procesar pago
  const handlePagoSuccess = () => {
    setShowPagoForm(false)
    setPrestamoParaPago(null)
    recargarPrestamos()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando préstamos...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error al cargar préstamos</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con título y acciones */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Préstamos</h1>
          <p className="text-gray-600">Gestiona todos los préstamos de tu empresa</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => setShowImportExportDialog(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar/Exportar
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleRefresh}
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

      {/* Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por número, cliente o cédula..."
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
            <SelectItem value="finalizado">Finalizados</SelectItem>
            <SelectItem value="atrasado">Atrasados</SelectItem>
            <SelectItem value="cancelado">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de préstamos con diseño elegante */}
      <div className="space-y-6">
        {/* Header del listado */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Préstamos Activos ({prestamosFiltrados.length})
              </h2>
              <p className="text-sm text-gray-600">
                Gestiona y monitorea todos tus préstamos
              </p>
            </div>
          </div>
          
          {prestamosFiltrados.length > 0 && (
            <div className="text-sm text-gray-500">
              Total en cartera: <span className="font-semibold text-green-600">
                {formatCurrency(prestamosFiltrados.reduce((sum, p) => sum + (p.saldoCapital || p.monto), 0))}
              </span>
            </div>
          )}
        </div>

        {/* Contenido del listado */}
        {prestamosFiltrados.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-200">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-4">
                <FileSpreadsheet className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {prestamos.length === 0 ? 'Aún no tienes préstamos' : 'No se encontraron préstamos'}
              </h3>
              <p className="text-gray-600 text-center max-w-md mb-6">
                {prestamos.length === 0 
                  ? 'Comienza creando tu primer préstamo para empezar a gestionar tu cartera de créditos.'
                  : 'Intenta cambiar los filtros de búsqueda para encontrar los préstamos que buscas.'
                }
              </p>
              {prestamos.length === 0 && (
                <Button 
                  onClick={() => setShowPrestamoForm(true)}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Tu Primer Préstamo
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-1">
            {prestamosFiltrados.map((prestamo) => {
              const cliente = obtenerCliente(prestamo.clienteId)
              if (!cliente) return null

              return (
                <PrestamoCard
                  key={prestamo.id}
                  prestamo={prestamo}
                  cliente={cliente}
                  onViewDetails={handleVerDetalles}
                  onEdit={handleEditarPrestamo}
                  onDelete={handleEliminarPrestamo}
                  onRegisterPayment={handleRegistrarPago}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de detalles del préstamo */}
      <PrestamoDetailsModal
        prestamo={prestamoSeleccionado}
        cliente={prestamoSeleccionado ? obtenerCliente(prestamoSeleccionado.clienteId) : null}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false)
          setPrestamoSeleccionado(null)
        }}
        onEdit={handleEditarPrestamo}
        onRegisterPayment={handleRegistrarPago}
      />

      {/* Formulario de préstamo */}
      <PrestamoForm
        isOpen={showPrestamoForm}
        onClose={() => {
          setShowPrestamoForm(false)
          setPrestamoSeleccionado(null)
        }}
        prestamo={prestamoSeleccionado}
        onSave={prestamoSeleccionado ? handleEditarPrestamoGuardar : handleCrearPrestamo}
      />

      {/* Formulario de pago */}
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
          onSuccess={handlePagoSuccess}
        />
      )}

      {/* Diálogo de importación/exportación */}
      <PrestamoImportExportDialog
        isOpen={showImportExportDialog}
        onClose={() => setShowImportExportDialog(false)}
        prestamos={prestamos}
        clientes={clientes}
        onPrestamosImportados={handlePrestamosImportados}
      />

      {/* Diálogo de confirmación de eliminación */}
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
              onClick={confirmarEliminacion}
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