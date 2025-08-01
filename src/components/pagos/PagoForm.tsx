// src/components/pagos/PagoForm.tsx - CORREGIDO
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
  DollarSign, 
  Calendar, 
  CreditCard, 
  Calculator,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Receipt
} from 'lucide-react'
import { Prestamo, Cliente } from '@/types/database'
import { formatCurrency, convertirFecha } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

// Tipos locales para evitar importaciones problemáticas
interface PagoFormData {
  prestamoId: string
  montoPagado: number
  metodoPago: string
  referenciaPago?: string
  fechaPago: Date
  observaciones?: string
}

interface CalculoPago {
  montoCapitalPendiente: number
  montoInteresesPendientes: number
  montoMoraPendiente: number
  totalPendiente: number
  diasAtraso: number
  tasaMora: number
  fechaProximoPago: Date
  montoProximoPago: number
}

const pagoSchema = z.object({
  prestamoId: z.string().min(1, 'Debe seleccionar un préstamo'),
  montoPagado: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  metodoPago: z.string().min(1, 'Selecciona un método de pago'),
  referenciaPago: z.string().optional().or(z.literal('')),
  fechaPago: z.date(),
  observaciones: z.string().optional().or(z.literal('')),
})

type PagoFormSchemaData = z.infer<typeof pagoSchema>

interface PagoFormProps {
  isOpen: boolean
  onClose: () => void
  prestamo?: Prestamo | null
  cliente?: Cliente | null
  onSave: (pago: PagoFormData) => Promise<void>
}

// Función para calcular días de atraso
const calcularDiasAtraso = (fechaVencimiento: Date): number => {
  const hoy = new Date()
  const diferencia = hoy.getTime() - fechaVencimiento.getTime()
  const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24))
  return Math.max(0, dias)
}

// Función para calcular mora
const calcularMora = (saldoPendiente: number, diasAtraso: number, tasaMora: number = 2): number => {
  if (diasAtraso <= 0) return 0
  return saldoPendiente * (tasaMora / 100) * (diasAtraso / 30) // Mora mensual prorrateada
}

export function PagoForm({ isOpen, onClose, prestamo, cliente, onSave }: PagoFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [calculoPago, setCalculoPago] = useState<CalculoPago | null>(null)
  const [loadingCalculo, setLoadingCalculo] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PagoFormSchemaData>({
    resolver: zodResolver(pagoSchema),
    defaultValues: {
      prestamoId: prestamo?.id || '',
      montoPagado: 0,
      metodoPago: '',
      referenciaPago: '',
      fechaPago: new Date(),
      observaciones: '',
    }
  })

  // Observar cambios en el monto para calcular distribución
  const watchedMonto = watch('montoPagado')

  // Cargar cálculo de pagos pendientes cuando se selecciona un préstamo
  useEffect(() => {
    if (prestamo?.id) {
      setLoadingCalculo(true)
      
      // Calcular valores directamente del préstamo
      const fechaVencimiento = convertirFecha(prestamo.fechaVencimiento)
      const diasAtraso = calcularDiasAtraso(fechaVencimiento)
      const moraPendiente = calcularMora(prestamo.saldoCapital, diasAtraso)
      
      const calculo: CalculoPago = {
        montoCapitalPendiente: prestamo.saldoCapital,
        montoInteresesPendientes: prestamo.interesesPendientes,
        montoMoraPendiente: moraPendiente,
        totalPendiente: prestamo.saldoCapital + prestamo.interesesPendientes + moraPendiente,
        diasAtraso,
        tasaMora: 2, // 2% mensual
        fechaProximoPago: convertirFecha(prestamo.fechaProximoPago),
        montoProximoPago: prestamo.montoProximoPago
      }
      
      setCalculoPago(calculo)
      setLoadingCalculo(false)
    }
  }, [prestamo])

  // Calcular distribución del pago
  const calcularDistribucion = (monto: number) => {
    if (!calculoPago || monto <= 0) return null

    let montoRestante = monto
    let montoMora = 0
    let montoIntereses = 0
    let montoCapital = 0
    let montoExcedente = 0

    // 1. Mora (prioridad más alta)
    if (calculoPago.montoMoraPendiente > 0 && montoRestante > 0) {
      montoMora = Math.min(montoRestante, calculoPago.montoMoraPendiente)
      montoRestante -= montoMora
    }

    // 2. Intereses
    if (calculoPago.montoInteresesPendientes > 0 && montoRestante > 0) {
      montoIntereses = Math.min(montoRestante, calculoPago.montoInteresesPendientes)
      montoRestante -= montoIntereses
    }

    // 3. Capital
    if (calculoPago.montoCapitalPendiente > 0 && montoRestante > 0) {
      montoCapital = Math.min(montoRestante, calculoPago.montoCapitalPendiente)
      montoRestante -= montoCapital
    }

    // 4. Excedente
    if (montoRestante > 0) {
      montoExcedente = montoRestante
    }

    return {
      montoMora,
      montoIntereses,
      montoCapital,
      montoExcedente,
      nuevoSaldoCapital: calculoPago.montoCapitalPendiente - montoCapital,
      nuevosInteresesPendientes: calculoPago.montoInteresesPendientes - montoIntereses,
      nuevaMoraPendiente: calculoPago.montoMoraPendiente - montoMora
    }
  }

  const distribucion = calcularDistribucion(watchedMonto || 0)

  const onSubmit = async (data: PagoFormSchemaData) => {
    if (!prestamo || !calculoPago) {
      toast({
        title: "Error",
        description: "No se puede procesar el pago sin información del préstamo",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    
    try {
      const pagoData: PagoFormData = {
        prestamoId: data.prestamoId,
        montoPagado: data.montoPagado,
        metodoPago: data.metodoPago,
        referenciaPago: data.referenciaPago || undefined,
        fechaPago: data.fechaPago,
        observaciones: data.observaciones || undefined,
      }
      
      await onSave(pagoData)
      
      toast({
        title: "Pago registrado",
        description: `Pago de ${formatCurrency(data.montoPagado)} registrado correctamente`,
      })
      
      reset()
      onClose()
    } catch (error: any) {
      console.error('❌ Error en onSubmit de pago:', error)
      toast({
        title: "Error",
        description: error.message || "Error al registrar el pago",
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

  const setPagoCompleto = () => {
    if (calculoPago) {
      setValue('montoPagado', calculoPago.totalPendiente)
    }
  }

  const setPagoMinimo = () => {
    if (calculoPago) {
      // Pago mínimo: mora + intereses vencidos
      const pagoMinimo = calculoPago.montoMoraPendiente + calculoPago.montoInteresesPendientes
      setValue('montoPagado', Math.max(pagoMinimo, calculoPago.montoProximoPago))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Registrar Pago
          </DialogTitle>
          <DialogDescription>
            Registra un nuevo pago para el préstamo seleccionado
          </DialogDescription>
        </DialogHeader>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Formulario Principal */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Información del Préstamo */}
              {prestamo && cliente && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Información del Préstamo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Préstamo:</span>
                        <div className="font-semibold text-gray-900">{prestamo.numero}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Cliente:</span>
                        <div className="font-semibold text-gray-900">
                          {cliente.nombre} {cliente.apellido}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Monto Original:</span>
                        <div className="font-semibold text-green-600">
                          {formatCurrency(prestamo.monto)}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Saldo Actual:</span>
                        <div className="font-semibold text-orange-600">
                          {formatCurrency(prestamo.saldoCapital)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Detalles del Pago */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Detalles del Pago
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="montoPagado">Monto Pagado (USD) *</Label>
                      <Input
                        id="montoPagado"
                        type="number"
                        min="0.01"
                        step="0.01"
                        {...register('montoPagado', { valueAsNumber: true })}
                        placeholder="0.00"
                        className={errors.montoPagado ? 'border-red-500' : ''}
                      />
                      {errors.montoPagado && (
                        <p className="text-sm text-red-600">{errors.montoPagado.message}</p>
                      )}
                      
                      {/* Botones de pago rápido */}
                      {calculoPago && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={setPagoMinimo}
                          >
                            Pago Mínimo
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={setPagoCompleto}
                          >
                            Pago Total
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fechaPago">Fecha del Pago *</Label>
                      <Input
                        id="fechaPago"
                        type="date"
                        {...register('fechaPago', { 
                          valueAsDate: true,
                          setValueAs: (value) => value ? new Date(value) : new Date()
                        })}
                        className={errors.fechaPago ? 'border-red-500' : ''}
                        defaultValue={new Date().toISOString().split('T')[0]}
                      />
                      {errors.fechaPago && (
                        <p className="text-sm text-red-600">{errors.fechaPago.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="metodoPago">Método de Pago *</Label>
                      <Select 
                        onValueChange={(value: string) => setValue('metodoPago', value)}
                        defaultValue=""
                      >
                        <SelectTrigger className={errors.metodoPago ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Selecciona método de pago" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="efectivo">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              Efectivo
                            </div>
                          </SelectItem>
                          <SelectItem value="transferencia">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4" />
                              Transferencia Bancaria
                            </div>
                          </SelectItem>
                          <SelectItem value="cheque">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Cheque
                            </div>
                          </SelectItem>
                          <SelectItem value="yappy">Yappy</SelectItem>
                          <SelectItem value="nequi">Nequi</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.metodoPago && (
                        <p className="text-sm text-red-600">{errors.metodoPago.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="referenciaPago">Referencia de Pago</Label>
                      <Input
                        id="referenciaPago"
                        {...register('referenciaPago')}
                        placeholder="Ej: Número de cheque, referencia de transferencia..."
                      />
                      <p className="text-xs text-gray-500">Opcional - deja vacío si no aplica</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observaciones">Observaciones</Label>
                    <Textarea
                      id="observaciones"
                      {...register('observaciones')}
                      placeholder="Notas adicionales sobre este pago... (opcional)"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </form>
          </div>

          {/* Panel de Cálculos */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">
              {/* Estado del Préstamo */}
              {loadingCalculo ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <Clock className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="text-gray-600">Calculando...</span>
                    </div>
                  </CardContent>
                </Card>
              ) : calculoPago ? (
                <Card className="border-2 border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-800">
                      <Calculator className="h-5 w-5" />
                      Estado del Préstamo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Capital Pendiente:</span>
                        <span className="font-bold text-gray-900">
                          {formatCurrency(calculoPago.montoCapitalPendiente)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Intereses Pendientes:</span>
                        <span className="font-bold text-orange-600">
                          {formatCurrency(calculoPago.montoInteresesPendientes)}
                        </span>
                      </div>
                      
                      {calculoPago.montoMoraPendiente > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Mora Pendiente:</span>
                          <span className="font-bold text-red-600">
                            {formatCurrency(calculoPago.montoMoraPendiente)}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center py-2 border-t border-blue-200">
                        <span className="text-sm font-medium text-gray-700">Total Pendiente:</span>
                        <span className="text-xl font-bold text-blue-800">
                          {formatCurrency(calculoPago.totalPendiente)}
                        </span>
                      </div>

                      {calculoPago.diasAtraso > 0 && (
                        <Alert className="border-red-200 bg-red-50">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-800">
                            <strong>Préstamo atrasado:</strong> {calculoPago.diasAtraso} días
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {/* Distribución del Pago */}
              {distribucion && watchedMonto > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="h-5 w-5" />
                      Distribución del Pago
                    </CardTitle>
                    <CardDescription>
                      Cómo se aplicará el pago de {formatCurrency(watchedMonto)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {distribucion.montoMora > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">A Mora:</span>
                        <span className="font-semibold text-red-600">
                          {formatCurrency(distribucion.montoMora)}
                        </span>
                      </div>
                    )}
                    
                    {distribucion.montoIntereses > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">A Intereses:</span>
                        <span className="font-semibold text-orange-600">
                          {formatCurrency(distribucion.montoIntereses)}
                        </span>
                      </div>
                    )}
                    
                    {distribucion.montoCapital > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">A Capital:</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(distribucion.montoCapital)}
                        </span>
                      </div>
                    )}
                    
                    {distribucion.montoExcedente > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">Excedente:</span>
                        <span className="font-semibold text-blue-600">
                          {formatCurrency(distribucion.montoExcedente)}
                        </span>
                      </div>
                    )}

                    <div className="pt-3 border-t">
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Nuevo saldo capital: <strong>{formatCurrency(distribucion.nuevoSaldoCapital)}</strong></div>
                        {distribucion.nuevoSaldoCapital <= 0 && (
                          <Alert className="mt-2 border-green-200 bg-green-50">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                              ¡Este pago liquidará completamente el préstamo!
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Próximo Pago */}
              {calculoPago && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Información de Pagos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Próximo pago:</span>
                        <span className="font-semibold">
                          {formatCurrency(calculoPago.montoProximoPago)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fecha:</span>
                        <span className="font-semibold">
                          {calculoPago.fechaProximoPago.toLocaleDateString('es-PA')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tasa mora:</span>
                        <span className="font-semibold">{calculoPago.tasaMora}% mensual</span>
                      </div>
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
            disabled={isLoading || !prestamo || !calculoPago || !watchedMonto || watchedMonto <= 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Registrar Pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}