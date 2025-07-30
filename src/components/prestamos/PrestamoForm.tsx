// src/components/prestamos/PrestamoForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  CreditCard, 
  DollarSign, 
  Calendar, 
  Calculator,
  FileText,
  User,
  Percent,
  Clock,
  Save,
  X,
  AlertCircle,
  TrendingUp
} from 'lucide-react'
import { Prestamo, Cliente } from '@/types/database'
import { useClientes } from '@/hooks/useClientes'
import { calcularInteresesSimples, calcularMontoCuotaFija } from '@/hooks/usePrestamos'
import { formatCurrency } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

// Helper function para manejar fechas de Firebase de forma segura
const convertirFecha = (fecha: any): Date => {
  if (!fecha) return new Date()
  if (fecha instanceof Date) return fecha
  if (fecha.toDate && typeof fecha.toDate === 'function') return fecha.toDate()
  if (fecha.seconds) return new Date(fecha.seconds * 1000)
  return new Date(fecha)
}

// Schema de validación
const prestamoSchema = z.object({
  clienteId: z.string().min(1, 'Debe seleccionar un cliente'),
  monto: z.number().min(100, 'El monto mínimo es $100'),
  tasaInteres: z.number().min(0.1, 'La tasa debe ser mayor a 0.1%').max(100, 'La tasa no puede ser mayor a 100%'),
  tipoTasa: z.enum(['quincenal', 'mensual', 'anual'], {
    error: 'Selecciona un tipo de tasa válido'
  }),
  plazo: z.number().min(1, 'El plazo mínimo es 1 período'),
  metodoPago: z.string().min(1, 'Selecciona un método de pago'),
  proposito: z.string().min(5, 'Describe el propósito del préstamo'),
  garantia: z.string().optional().or(z.literal('')),
  observaciones: z.string().optional().or(z.literal('')),
})

type PrestamoFormData = z.infer<typeof prestamoSchema>

interface PrestamoFormProps {
  isOpen: boolean
  onClose: () => void
  prestamo?: Prestamo | null
  onSave: (prestamo: Omit<Prestamo, 'id' | 'empresaId' | 'numero' | 'fechaCreacion'>) => void
}

export function PrestamoForm({ isOpen, onClose, prestamo, onSave }: PrestamoFormProps) {
  const { clientes } = useClientes()
  const [isLoading, setIsLoading] = useState(false)
  const [calculatedValues, setCalculatedValues] = useState({
    interesesTotales: 0,
    montoCuota: 0,
    montoTotal: 0,
    fechaVencimiento: '',
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PrestamoFormData>({
    resolver: zodResolver(prestamoSchema),
    defaultValues: {
      clienteId: prestamo?.clienteId || '',
      monto: prestamo?.monto || 0,
      tasaInteres: prestamo?.tasaInteres || 15,
      tipoTasa: prestamo?.tipoTasa || 'mensual',
      plazo: prestamo?.plazo || 12,
      metodoPago: prestamo?.metodoPago || '',
      proposito: prestamo?.proposito || '',
      garantia: prestamo?.garantia || '',
      observaciones: prestamo?.observaciones || '',
    }
  })

  // Observar cambios en los campos para recalcular
  const watchedFields = watch()

  // Calcular valores automáticamente
  useEffect(() => {
    if (watchedFields.monto && watchedFields.tasaInteres && watchedFields.plazo && watchedFields.tipoTasa) {
      const monto = Number(watchedFields.monto)
      const tasa = Number(watchedFields.tasaInteres)
      const plazo = Number(watchedFields.plazo)
      const tipoTasa = watchedFields.tipoTasa

      // Calcular intereses totales
      const intereses = calcularInteresesSimples(monto, tasa, plazo, tipoTasa)
      
      // Calcular cuota fija
      const cuota = calcularMontoCuotaFija(monto, tasa, plazo, tipoTasa)
      
      // Calcular monto total
      const montoTotal = monto + intereses

      // Calcular fecha de vencimiento
      const fechaInicio = new Date()
      const fechaVencimiento = new Date()
      
      switch (tipoTasa) {
        case 'quincenal':
          fechaVencimiento.setDate(fechaInicio.getDate() + (plazo * 15))
          break
        case 'mensual':
          fechaVencimiento.setMonth(fechaInicio.getMonth() + plazo)
          break
        case 'anual':
          fechaVencimiento.setFullYear(fechaInicio.getFullYear() + plazo)
          break
      }

      setCalculatedValues({
        interesesTotales: intereses,
        montoCuota: cuota,
        montoTotal: montoTotal,
        fechaVencimiento: fechaVencimiento.toLocaleDateString('es-PA'),
      })
    }
  }, [watchedFields.monto, watchedFields.tasaInteres, watchedFields.plazo, watchedFields.tipoTasa])

  const onSubmit = async (data: PrestamoFormData) => {
    setIsLoading(true)
    
    try {
      console.log('💰 Datos del formulario de préstamo:', data)
      
      // Encontrar el cliente seleccionado
      const clienteSeleccionado = clientes.find(c => c.id === data.clienteId)
      if (!clienteSeleccionado) {
        throw new Error('Cliente no encontrado')
      }

      const prestamoData: Omit<Prestamo, 'id' | 'empresaId' | 'numero' | 'fechaCreacion'> = {
        clienteId: data.clienteId,
        usuarioCreador: '', // Se establecerá en el hook
        monto: data.monto,
        tasaInteres: data.tasaInteres,
        tipoTasa: data.tipoTasa,
        plazo: data.plazo,
        fechaInicio: new Date() as any, // Se convertirá a serverTimestamp en el hook
        fechaVencimiento: new Date() as any, // Se calculará en el hook
        metodoPago: data.metodoPago,
        proposito: data.proposito.trim(),
        estado: prestamo?.estado || 'activo',
        saldoCapital: data.monto,
        interesesPendientes: calculatedValues.interesesTotales,
        interesesPagados: 0,
        diasAtraso: 0,
        moraAcumulada: 0,
        fechaProximoPago: new Date() as any, // Se calculará en el hook
        montoProximoPago: calculatedValues.montoCuota,
        // Campos opcionales
        ...(data.garantia && data.garantia.trim() && {
          garantia: data.garantia.trim()
        }),
        ...(data.observaciones && data.observaciones.trim() && {
          observaciones: data.observaciones.trim()
        }),
      }
      
      console.log('✨ Datos de préstamo preparados:', prestamoData)
      
      await onSave(prestamoData)
      
      toast({
        title: prestamo ? "Préstamo actualizado" : "Préstamo creado",
        description: `Préstamo para ${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido} por ${formatCurrency(data.monto)}`,
      })
      
      reset()
      onClose()
    } catch (error: any) {
      console.error('❌ Error en onSubmit de préstamo:', error)
      toast({
        title: "Error",
        description: error.message || `Error al ${prestamo ? 'actualizar' : 'crear'} el préstamo`,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const clienteSeleccionado = clientes.find(c => c.id === watchedFields.clienteId)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {prestamo ? 'Editar Préstamo' : 'Nuevo Préstamo'}
          </DialogTitle>
          <DialogDescription>
            {prestamo 
              ? 'Modifica los términos del préstamo'
              : 'Completa los datos para crear un nuevo préstamo'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Formulario Principal */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Selección de Cliente */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="clienteId">Seleccionar Cliente *</Label>
                    <Select 
                      onValueChange={(value: string) => setValue('clienteId', value)}
                      defaultValue={prestamo?.clienteId || ''}
                    >
                      <SelectTrigger className={errors.clienteId ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Buscar y seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xs">
                                {cliente.nombre.charAt(0)}{cliente.apellido.charAt(0)}
                              </div>
                              <div>
                                <div className="font-medium">
                                  {cliente.nombre} {cliente.apellido}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {cliente.codigo} - Score: {cliente.creditScore}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.clienteId && (
                      <p className="text-sm text-red-600">{errors.clienteId.message}</p>
                    )}
                    
                    {/* Información del cliente seleccionado */}
                    {clienteSeleccionado && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {clienteSeleccionado.nombre.charAt(0)}{clienteSeleccionado.apellido.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {clienteSeleccionado.nombre} {clienteSeleccionado.apellido}
                            </h4>
                            <p className="text-sm text-gray-600">{clienteSeleccionado.codigo}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Score Crediticio:</span>
                            <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                              clienteSeleccionado.creditScore >= 80 ? 'bg-green-100 text-green-800' :
                              clienteSeleccionado.creditScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {clienteSeleccionado.creditScore}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Ingresos:</span>
                            <span className="ml-2 text-green-600 font-semibold">
                              {formatCurrency(clienteSeleccionado.ingresosMensuales)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Términos del Préstamo */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Términos del Préstamo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="monto">Monto del Préstamo (USD) *</Label>
                      <Input
                        id="monto"
                        type="number"
                        min="100"
                        step="0.01"
                        {...register('monto', { valueAsNumber: true })}
                        placeholder="Ej: 5000.00"
                        className={errors.monto ? 'border-red-500' : ''}
                      />
                      {errors.monto && (
                        <p className="text-sm text-red-600">{errors.monto.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tasaInteres">Tasa de Interés (%) *</Label>
                      <Input
                        id="tasaInteres"
                        type="number"
                        min="0.1"
                        max="100"
                        step="0.1"
                        {...register('tasaInteres', { valueAsNumber: true })}
                        placeholder="Ej: 15.0"
                        className={errors.tasaInteres ? 'border-red-500' : ''}
                      />
                      {errors.tasaInteres && (
                        <p className="text-sm text-red-600">{errors.tasaInteres.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tipoTasa">Tipo de Tasa *</Label>
                      <Select 
                        onValueChange={(value: 'quincenal' | 'mensual' | 'anual') => setValue('tipoTasa', value)}
                        defaultValue={prestamo?.tipoTasa || 'mensual'}
                      >
                        <SelectTrigger className={errors.tipoTasa ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Selecciona el tipo de tasa" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="quincenal">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <div>
                                <div>Quincenal</div>
                                <div className="text-xs text-gray-500">Cada 15 días</div>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="mensual">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <div>
                                <div>Mensual</div>
                                <div className="text-xs text-gray-500">Cada mes</div>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="anual">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              <div>
                                <div>Anual</div>
                                <div className="text-xs text-gray-500">Cada año</div>
                              </div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.tipoTasa && (
                        <p className="text-sm text-red-600">{errors.tipoTasa.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="plazo">Plazo (períodos) *</Label>
                      <Input
                        id="plazo"
                        type="number"
                        min="1"
                        {...register('plazo', { valueAsNumber: true })}
                        placeholder="Ej: 12"
                        className={errors.plazo ? 'border-red-500' : ''}
                      />
                      {errors.plazo && (
                        <p className="text-sm text-red-600">{errors.plazo.message}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {watchedFields.tipoTasa === 'quincenal' && 'Número de quincenas'}
                        {watchedFields.tipoTasa === 'mensual' && 'Número de meses'}
                        {watchedFields.tipoTasa === 'anual' && 'Número de años'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="metodoPago">Método de Pago *</Label>
                    <Select 
                      onValueChange={(value: string) => setValue('metodoPago', value)}
                      defaultValue={prestamo?.metodoPago || ''}
                    >
                      <SelectTrigger className={errors.metodoPago ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Selecciona el método de pago" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                        <SelectItem value="transferencia">Transferencia Bancaria</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="yappy">Yappy</SelectItem>
                        <SelectItem value="nequi">Nequi</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.metodoPago && (
                      <p className="text-sm text-red-600">{errors.metodoPago.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Detalles Adicionales */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Detalles Adicionales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="proposito">Propósito del Préstamo *</Label>
                    <Textarea
                      id="proposito"
                      {...register('proposito')}
                      placeholder="Ej: Capital de trabajo para negocio, mejoras al hogar, gastos médicos..."
                      className={errors.proposito ? 'border-red-500' : ''}
                      rows={3}
                    />
                    {errors.proposito && (
                      <p className="text-sm text-red-600">{errors.proposito.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="garantia">Garantía (opcional)</Label>
                    <Textarea
                      id="garantia"
                      {...register('garantia')}
                      placeholder="Ej: Vehículo Toyota Corolla 2018, Casa en Pedregal, Aval solidario..."
                      rows={2}
                    />
                    <p className="text-xs text-gray-500">Describe las garantías o avales del préstamo</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observaciones">Observaciones (opcional)</Label>
                    <Textarea
                      id="observaciones"
                      {...register('observaciones')}
                      placeholder="Notas adicionales sobre el préstamo..."
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            </form>
          </div>

          {/* Panel de Cálculos */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">
              {/* Resumen de Cálculos */}
              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <Calculator className="h-5 w-5" />
                    Cálculos del Préstamo
                  </CardTitle>
                  <CardDescription className="text-blue-600">
                    Valores calculados automáticamente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Monto Principal:</span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(watchedFields.monto || 0)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Intereses Totales:</span>
                      <span className="text-lg font-bold text-orange-600">
                        {formatCurrency(calculatedValues.interesesTotales)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-t border-blue-200">
                      <span className="text-sm font-medium text-gray-700">Monto Total:</span>
                      <span className="text-xl font-bold text-blue-800">
                        {formatCurrency(calculatedValues.montoTotal)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Cuota {watchedFields.tipoTasa}:</span>
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(calculatedValues.montoCuota)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Fecha Vencimiento:</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {calculatedValues.fechaVencimiento}
                      </span>
                    </div>
                  </div>

                  <Alert className="bg-green-50 border-green-200">
                    <AlertCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>Rentabilidad:</strong> 
                      {calculatedValues.interesesTotales > 0 && watchedFields.monto > 0 && (
                        <span className="ml-1">
                          {((calculatedValues.interesesTotales / watchedFields.monto) * 100).toFixed(1)}% ganancia
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Cronograma Simplificado */}
              {watchedFields.plazo > 0 && calculatedValues.montoCuota > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Cronograma Simplificado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Número de cuotas:</span>
                        <span className="font-semibold">{watchedFields.plazo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Frecuencia:</span>
                        <span className="font-semibold capitalize">{watchedFields.tipoTasa}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cuota fija:</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(calculatedValues.montoCuota)}
                        </span>
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-xs text-gray-600">
                          Este es un cronograma de cuotas fijas con interés simple
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Análisis de Riesgo */}
              {clienteSeleccionado && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Análisis de Riesgo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Score Crediticio:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          clienteSeleccionado.creditScore >= 80 ? 'bg-green-100 text-green-800' :
                          clienteSeleccionado.creditScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {clienteSeleccionado.creditScore}/100
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Capacidad de Pago:</span>
                        <span className="text-sm font-semibold">
                          {calculatedValues.montoCuota > 0 && clienteSeleccionado.ingresosMensuales > 0
                            ? `${((calculatedValues.montoCuota / clienteSeleccionado.ingresosMensuales) * 100).toFixed(1)}%`
                            : 'N/A'
                          }
                        </span>
                      </div>

                      <Alert className={
                        calculatedValues.montoCuota > 0 && clienteSeleccionado.ingresosMensuales > 0 && 
                        (calculatedValues.montoCuota / clienteSeleccionado.ingresosMensuales) > 0.3
                          ? 'border-yellow-200 bg-yellow-50'
                          : 'border-green-200 bg-green-50'
                      }>
                        <AlertCircle className={`h-4 w-4 ${
                          calculatedValues.montoCuota > 0 && clienteSeleccionado.ingresosMensuales > 0 && 
                          (calculatedValues.montoCuota / clienteSeleccionado.ingresosMensuales) > 0.3
                            ? 'text-yellow-600'
                            : 'text-green-600'
                        }`} />
                        <AlertDescription className={
                          calculatedValues.montoCuota > 0 && clienteSeleccionado.ingresosMensuales > 0 && 
                          (calculatedValues.montoCuota / clienteSeleccionado.ingresosMensuales) > 0.3
                            ? 'text-yellow-800'
                            : 'text-green-800'
                        }>
                          {calculatedValues.montoCuota > 0 && clienteSeleccionado.ingresosMensuales > 0 && 
                          (calculatedValues.montoCuota / clienteSeleccionado.ingresosMensuales) > 0.3
                            ? '⚠️ Alta carga de pago (>30% ingresos)'
                            : '✅ Carga de pago aceptable'
                          }
                        </AlertDescription>
                      </Alert>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-6">
          <Button type="button" variant="outline" onClick={handleClose}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit(onSubmit)} 
            disabled={isLoading || !clienteSeleccionado}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {prestamo ? 'Actualizar' : 'Crear'} Préstamo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}