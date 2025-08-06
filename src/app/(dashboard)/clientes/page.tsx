// src/app/(dashboard)/clientes/page.tsx - CON IMPORT/EXPORT
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
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
import { ClienteForm } from '@/components/clientes/ClienteForm'
import { ClienteDetails } from '@/components/clientes/ClienteDetails'
import { ImportExportDialog } from '@/components/clientes/ImportExportDialog'
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Edit,
  Eye,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Star,
  TrendingUp,
  UserPlus,
  Download,
  Upload,
  Loader2,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react'
import { Cliente } from '@/types/database'
import { formatCurrency } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

export default function ClientesPage() {
  const { empresaActual } = useAuth()
  const { 
    clientes, 
    loading, 
    error, 
    crearCliente, 
    actualizarCliente, 
    eliminarCliente,
    recargarClientes 
  } = useClientes()

  // Estados para UI
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [scoreFilter, setScoreFilter] = useState<string>('todos')
  const [showClienteForm, setShowClienteForm] = useState(false)
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null)
  const [clienteViewing, setClienteViewing] = useState<Cliente | null>(null)
  const [clienteAEliminar, setClienteAEliminar] = useState<Cliente | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showImportExport, setShowImportExport] = useState(false)

  // Clientes filtrados
  const clientesFiltrados = useMemo(() => {
    let filtered = clientes

    // Filtro por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(cliente =>
        cliente.nombre.toLowerCase().includes(term) ||
        cliente.apellido.toLowerCase().includes(term) ||
        cliente.cedula.toLowerCase().includes(term) ||
        cliente.telefono.toLowerCase().includes(term) ||
        cliente.codigo.toLowerCase().includes(term)
      )
    }

    // Filtro por estado
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(cliente => cliente.estado === statusFilter)
    }

    // Filtro por score crediticio
    if (scoreFilter !== 'todos') {
      switch (scoreFilter) {
        case 'excelente':
          filtered = filtered.filter(cliente => cliente.creditScore >= 80)
          break
        case 'bueno':
          filtered = filtered.filter(cliente => cliente.creditScore >= 60 && cliente.creditScore < 80)
          break
        case 'regular':
          filtered = filtered.filter(cliente => cliente.creditScore >= 40 && cliente.creditScore < 60)
          break
        case 'bajo':
          filtered = filtered.filter(cliente => cliente.creditScore < 40)
          break
      }
    }

    return filtered
  }, [clientes, searchTerm, statusFilter, scoreFilter])

  // Estadísticas
  const stats = useMemo(() => {
    const total = clientes.length
    const activos = clientes.filter(c => c.estado === 'activo').length
    const scorePromedio = total > 0 
      ? Math.round(clientes.reduce((sum, c) => sum + c.creditScore, 0) / total) 
      : 0
    const ingresosPromedio = total > 0
      ? clientes.reduce((sum, c) => sum + c.ingresosMensuales, 0) / total
      : 0

    return { total, activos, scorePromedio, ingresosPromedio }
  }, [clientes])

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'activo': return 'bg-green-100 text-green-800'
      case 'inactivo': return 'bg-gray-100 text-gray-800'
      case 'bloqueado': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleNuevoCliente = () => {
    setClienteEditando(null)
    setShowClienteForm(true)
  }

  const handleVerCliente = (cliente: Cliente) => {
    setClienteViewing(cliente)
  }

  const handleEditarCliente = (cliente: Cliente) => {
    setClienteEditando(cliente)
    setShowClienteForm(true)
  }

  const handleGuardarCliente = async (clienteData: Omit<Cliente, 'id' | 'empresaId' | 'fechaRegistro'>) => {
    try {
      if (clienteEditando) {
        await actualizarCliente(clienteEditando.id, clienteData)
        toast({
          title: "Cliente actualizado",
          description: `${clienteData.nombre} ${clienteData.apellido} ha sido actualizado correctamente`,
        })
      } else {
        await crearCliente(clienteData)
        toast({
          title: "Cliente creado",
          description: `${clienteData.nombre} ${clienteData.apellido} ha sido registrado correctamente`,
        })
      }
      setShowClienteForm(false)
      setClienteEditando(null)
    } catch (error: any) {
      console.error('Error guardando cliente:', error)
      toast({
        title: "Error",
        description: error.message || `Error al ${clienteEditando ? 'actualizar' : 'crear'} el cliente`,
        variant: "destructive"
      })
    }
  }

  const handleEliminarCliente = async () => {
    if (!clienteAEliminar) return

    setIsDeleting(true)
    try {
      await eliminarCliente(clienteAEliminar.id)
      toast({
        title: "Cliente eliminado",
        description: `${clienteAEliminar.nombre} ${clienteAEliminar.apellido} ha sido eliminado`,
      })
      setClienteAEliminar(null)
    } catch (error: any) {
      console.error('Error eliminando cliente:', error)
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el cliente",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // ✅ FUNCIÓN PARA MANEJAR CLIENTES IMPORTADOS
  const handleClientesImportados = async (clientesImportados: Omit<Cliente, 'id' | 'empresaId' | 'fechaRegistro'>[]) => {
    let exitosos = 0
    let errores = 0

    for (const clienteData of clientesImportados) {
      try {
        await crearCliente(clienteData)
        exitosos++
      } catch (error) {
        console.error('Error creando cliente importado:', error)
        errores++
      }
    }

    if (exitosos > 0) {
      toast({
        title: "Importación completada",
        description: `${exitosos} clientes importados correctamente${errores > 0 ? `, ${errores} con errores` : ''}`,
      })
    }

    setShowImportExport(false)
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-800">Error cargando clientes</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600">Gestiona tu cartera de clientes</p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => recargarClientes()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Recargar
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowImportExport(true)}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Importar/Exportar
          </Button>
          <Button onClick={handleNuevoCliente} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Clientes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">Creciendo</span>
              <span className="text-gray-500 ml-1">tu cartera</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Clientes Activos</p>
                <p className="text-3xl font-bold text-gray-900">{stats.activos}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <UserPlus className="h-6 w-6 text-green-600" />
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
                <p className="text-sm font-medium text-gray-600">Score Promedio</p>
                <p className="text-3xl font-bold text-gray-900">{stats.scorePromedio}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className={stats.scorePromedio >= 70 ? 'text-green-600' : 'text-yellow-600'}>
                {stats.scorePromedio >= 70 ? 'Excelente' : 'Bueno'}
              </span>
              <span className="text-gray-500 ml-1">riesgo crediticio</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ingresos Prom.</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(stats.ingresosPromedio)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-purple-600">Capacidad</span>
              <span className="text-gray-500 ml-1">de pago</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, cédula, teléfono o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="activo">Activo</SelectItem>
            <SelectItem value="inactivo">Inactivo</SelectItem>
            <SelectItem value="bloqueado">Bloqueado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={scoreFilter} onValueChange={setScoreFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Credit Score" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los scores</SelectItem>
            <SelectItem value="excelente">Excelente (80+)</SelectItem>
            <SelectItem value="bueno">Bueno (60-79)</SelectItem>
            <SelectItem value="regular">Regular (40-59)</SelectItem>
            <SelectItem value="bajo">Bajo (&lt;40)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Clientes */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Cargando clientes...</span>
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'todos' || scoreFilter !== 'todos' 
                  ? 'No se encontraron clientes' 
                  : 'No hay clientes registrados'
                }
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter !== 'todos' || scoreFilter !== 'todos'
                  ? 'Intenta cambiar los filtros de búsqueda'
                  : 'Comienza creando tu primer cliente o importa una lista existente'
                }
              </p>
              {!searchTerm && statusFilter === 'todos' && scoreFilter === 'todos' && (
                <div className="flex items-center justify-center gap-3">
                  <Button onClick={handleNuevoCliente}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Cliente
                  </Button>
                  <Button variant="outline" onClick={() => setShowImportExport(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar Clientes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          clientesFiltrados.map((cliente) => (
            <Card key={cliente.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {cliente.nombre.charAt(0)}{cliente.apellido.charAt(0)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {cliente.nombre} {cliente.apellido}
                          </h3>
                          <Badge variant="outline">{cliente.codigo}</Badge>
                          <Badge className={getStatusColor(cliente.estado)}>
                            {cliente.estado}
                          </Badge>
                          <Badge className={getScoreColor(cliente.creditScore)}>
                            <Star className="h-3 w-3 mr-1" />
                            {cliente.creditScore}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm flex-wrap">
                          <span className="text-gray-600">
                            <strong>Cédula:</strong> {cliente.cedula}
                          </span>
                          <span className="text-gray-600 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {cliente.telefono}
                          </span>
                          {cliente.email && (
                            <span className="text-gray-600 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {cliente.email}
                            </span>
                          )}
                          <span className="text-gray-600 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {cliente.direccion.substring(0, 50)}{cliente.direccion.length > 50 ? '...' : ''}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-sm flex-wrap mt-2">
                          <span className="text-gray-600">
                            <strong>Ocupación:</strong> {cliente.ocupacion}
                          </span>
                          <span className="text-gray-600">
                            <strong>Ingresos:</strong> {formatCurrency(cliente.ingresosMensuales)}
                          </span>
                          <span className="text-gray-600">
                            <strong>Referencias:</strong> {cliente.referencias.length}
                          </span>
                        </div>

                        {cliente.observaciones && (
                          <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
                            <strong>Observaciones:</strong> {cliente.observaciones}
                          </div>
                        )}
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
                      <DropdownMenuItem onClick={() => handleVerCliente(cliente)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalles
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditarCliente(cliente)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => setClienteAEliminar(cliente)}
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

      {/* Formulario de Cliente */}
      <ClienteForm 
        isOpen={showClienteForm}
        onClose={() => {
          setShowClienteForm(false)
          setClienteEditando(null)
        }}
        cliente={clienteEditando}
        onSave={handleGuardarCliente}
      />

      {/* Modal de Detalles del Cliente */}
      {clienteViewing && (
        <ClienteDetails
          cliente={clienteViewing}
          isOpen={true}
          onClose={() => setClienteViewing(null)}
          onEdit={() => {
            setClienteViewing(null)
            handleEditarCliente(clienteViewing)
          }}
        />
      )}

      {/* ✅ DIÁLOGO DE IMPORTAR/EXPORTAR */}
      <ImportExportDialog
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        clientes={clientes}
        onClientesImportados={handleClientesImportados}
      />

      {/* Dialog de Confirmación de Eliminación */}
      <AlertDialog 
        open={!!clienteAEliminar} 
        onOpenChange={() => setClienteAEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar a{' '}
              <strong>
                {clienteAEliminar?.nombre} {clienteAEliminar?.apellido}
              </strong>
              ? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleEliminarCliente}
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