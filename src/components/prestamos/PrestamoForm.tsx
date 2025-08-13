// ✅ ARCHIVO 3: src/components/prestamos/PrestamoForm.tsx - CORREGIDO
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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
  Clock,
  Save,
  X,
  AlertCircle,
  TrendingUp,
  Infinity
} from 'lucide-react'

// ✅ IMPORTACIONES CORRECTAS
import { Prestamo, Cliente } from '@/types/database'
import { 
  prestamoSchema, 
  PrestamoFormData, 
  TipoTasa,
  formatCurrency
} from '@/types/prestamos'
import { useClientes } from '@/hooks/useClientes'
import { calcularInteresesSimples, calcularMontoCuotaFija } from '@/hooks/usePrestamos'
import { toast } from '@/hooks/use-toast'

// ✅ FUNCIÓN MEJORADA: Calcular próxima fecha quincenal (15 y 30)
const calcularFechaProximaQuincena = (fechaBase: Date): Date => {
  const fecha = new Date(fechaBase)
  const dia = fecha.getDate()
  
  if (dia <= 15) {
    // Si estamos antes del 15, el próximo vencimiento es el 15
    fecha.setDate(15)
  } else {
    // Si estamos después del 15, el próximo vencimiento es el 30 (o último día del mes)
    fecha.setMonth(fecha.getMonth(), 30)
    
    // Ajustar para meses con menos de 30 días (febrero)
    if (fecha.getDate() !== 30) {
      fecha.setDate(0) // Último día del mes anterior = último día de este mes
    }
  }
  
  return fecha
}

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
    // ✅ NUEVOS CAMPOS para sistema quincenal
    interesesPorQuincena: 0,
    proximaQuincena: '',
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
      plazo: prestamo?.plazo || undefined,
      metodoPago: prestamo?.metodoPago || '',
      proposito: prestamo?.proposito || '',
      garantia: prestamo?.garantia || '',
      observaciones: prestamo?.observaciones || '',
      esPlazoIndefinido: prestamo?.esPlazoIndefinido || false,
    }
  })

  const watchedFields = watch()

  // ✅ CALCULAR VALORES CON VALIDACIONES MEJORADAS
  useEffect(() => {
    if (watchedFields.monto && watchedFields.tasaInteres && watchedFields.tipoTasa) {
      const monto = Number(watchedFields.monto)
      const tasa = Number(watchedFields.tasaInteres)
      const tipoTasa = watchedFields.tipoTasa
      const esPlazoIndefinido = watchedFields.esPlazoIndefinido
      const plazo = watchedFields.plazo

      // ✅ VALIDACIONES DE ENTRADA
      if (monto <= 0 || tasa <= 0) {
        setCalculatedValues({
          interesesTotales: 0,
          montoCuota: 0,
          montoTotal: 0,
          fechaVencimiento: '',
          interesesPorQuincena: 0,
          proximaQuincena: '',
        })
        return
      }

      if (esPlazoIndefinido || tipoTasa === 'indefinido') {
        // ✅ NUEVA LÓGICA: Sistema quincenal (15 y 30 de cada mes)
        const fechaInicio = new Date()
        const fechaProximaQuincena = calcularFechaProximaQuincena(fechaInicio)
        const interesesPorQuincena = monto * (tasa / 100)
        
        setCalculatedValues({
          interesesTotales: 0, // No se puede calcular (es indefinido)
          montoCuota: interesesPorQuincena, // Mostrar intereses por quincena
          montoTotal: monto,
          fechaVencimiento: 'Indefinido - hasta liquidar capital',
          interesesPorQuincena,
          proximaQuincena: fechaProximaQuincena.toLocaleDateString('es-PA'),
        })
      } else if (plazo && typeof plazo === 'number' && plazo > 0) {
        // ✅ PRÉSTAMOS CON PLAZO FIJO - CON VALIDACIONES
        const intereses = calcularInteresesSimples(monto, tasa, plazo, tipoTasa)
        const cuota = calcularMontoCuotaFija(monto, tasa, plazo, tipoTasa)
        const montoTotal = monto + intereses

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
          interesesTotales: isNaN(intereses) ? 0 : intereses,
          montoCuota: isNaN(cuota) ? 0 : cuota,
          montoTotal: isNaN(montoTotal) ? monto : montoTotal,
          fechaVencimiento: fechaVencimiento.toLocaleDateString('es-PA'),
          interesesPorQuincena: 0,
          proximaQuincena: '',
        })
      } else {
        // ✅ DATOS INSUFICIENTES
        setCalculatedValues({
          interesesTotales: 0,
          montoCuota: 0,
          montoTotal: monto,
          fechaVencimiento: '',
          interesesPorQuincena: 0,
          proximaQuincena: '',
        })
      }
    }
  }, [watchedFields.monto, watchedFields.tasaInteres, watchedFields.plazo, watchedFields.tipoTasa, watchedFields.esPlazoIndefinido])

  // ✅ SUBMIT MEJORADO CON VALIDACIONES
  const onSubmit = async (data: PrestamoFormData) => {
    setIsLoading(true)
    
    try {
      const clienteSeleccionado = clientes.find(c => c.id === data.clienteId)
      if (!clienteSeleccionado) {
        throw new Error('Cliente no encontrado')
      }

      // ✅ DETECTAR TIPO DE PRÉSTAMO CON MÚLTIPLES VERIFICACIONES
      const esPrestamoIndefinido = data.esPlazoIndefinido || 
                                  data.tipoTasa === 'indefinido' || 
                                  !data.plazo || 
                                  data.plazo <= 0

      console.log('📋 Creando préstamo:', {
        tipo: esPrestamoIndefinido ? 'Indefinido' : 'Plazo fijo',
        monto: data.monto,
        tasa: data.tasaInteres,
        plazo: data.plazo
      })

      const prestamoData: Omit<Prestamo, 'id' | 'empresaId' | 'numero' | 'fechaCreacion'> = {
        clienteId: data.clienteId,
        usuarioCreador: '',
        monto: data.monto,
        tasaInteres: data.tasaInteres,
        tipoTasa: data.tipoTasa,
        plazo: esPrestamoIndefinido ? undefined : data.plazo,
        esPlazoIndefinido: esPrestamoIndefinido,
        fechaInicio: new Date() as any,
        fechaVencimiento: esPrestamoIndefinido ? undefined : new Date() as any,
        metodoPago: data.metodoPago,
        proposito: data.proposito.trim(),
        estado: prestamo?.estado || 'activo',
        saldoCapital: data.monto,
        interesesPendientes: esPrestamoIndefinido ? 0 : calculatedValues.interesesTotales,
        interesesPagados: 0,
        diasAtraso: 0,
        moraAcumulada: 0,
        // ✅ CÁLCULO CORRECTO PARA PRÓXIMO PAGO
        fechaProximoPago: esPrestamoIndefinido ? 
          calcularFechaProximaQuincena(new Date()) as any : 
          new Date() as any,
        // ✅ VALIDAR QUE montoProximoPago NO SEA NaN
        montoProximoPago: esPrestamoIndefinido ? 
          calculatedValues.interesesPorQuincena : 
          (calculatedValues.montoCuota > 0 ? calculatedValues.montoCuota : data.monto * (data.tasaInteres / 100)),
        ultimaActualizacionIntereses: esPrestamoIndefinido ? new Date() as any : undefined,
        ...(data.garantia && data.garantia.trim() && {
          garantia: data.garantia.trim()
        }),
        ...(data.observaciones && data.observaciones.trim() && {
          observaciones: data.observaciones.trim()
        }),
      }

      // ✅ VALIDACIÓN FINAL ANTES DE GUARDAR
      if (isNaN(prestamoData.montoProximoPago ?? 0) || (prestamoData.montoProximoPago ?? 0) <= 0) {
        console.warn('⚠️ montoProximoPago inválido, usando fallback')
        prestamoData.montoProximoPago = data.monto * (data.tasaInteres / 100)
      }

      console.log('💰 Préstamo final a guardar:', {
        numero: 'Pendiente',
        montoProximoPago: prestamoData.montoProximoPago,
        esIndefinido: esPrestamoIndefinido
      })
      
      await onSave(prestamoData)
      
      toast({
        title: prestamo ? "Préstamo actualizado" : "Préstamo creado",
        description: `Préstamo ${esPrestamoIndefinido ? 'quincenal indefinido' : 'con plazo fijo'} para ${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido} por ${formatCurrency(data.monto)}`,
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
                      value={watchedFields.clienteId || ''}
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

                    {/* Información del cliente */}
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
                        min="5"
                        step="0.01"
                        {...register('monto', { valueAsNumber: true })}
                        placeholder="Ej: 5.00"
                        className={errors.monto ? 'border-red-500' : ''}
                      />
                      {errors.monto && (
                        <p className="text-sm text-red-600">{errors.monto.message}</p>
                      )}
                      <p className="text-xs text-gray-500">Monto mínimo: $5.00</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tasaInteres">
                        {watchedFields.esPlazoIndefinido || watchedFields.tipoTasa === 'indefinido' 
                          ? 'Tasa Quincenal (%) *' 
                          : 'Tasa de Interés (%) *'
                        }
                      </Label>
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
                      {/* ✅ NUEVA INFORMACIÓN para préstamos indefinidos */}
                      {(watchedFields.esPlazoIndefinido || watchedFields.tipoTasa === 'indefinido') && (
                        <p className="text-xs text-purple-600 font-medium">
                          Esta tasa se cobra cada quincena (15 y 30 de cada mes)
                        </p>
                      )}
                    </div>

                    {/* Checkbox para plazo indefinido */}
                    <div className="md:col-span-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="esPlazoIndefinido"
                          checked={watchedFields.esPlazoIndefinido || watchedFields.tipoTasa === 'indefinido'}
                          onCheckedChange={(checked) => {
                            setValue('esPlazoIndefinido', checked as boolean);
                            if (checked) {
                              setValue('tipoTasa', 'indefinido');
                              setValue('plazo', undefined);
                            } else {
                              setValue('tipoTasa', 'mensual');
                              setValue('plazo', 12);
                            }
                          }}
                        />
                        <Label htmlFor="esPlazoIndefinido" className="text-sm font-medium">
                          Préstamo quincenal indefinido
                        </Label>
                        <Calendar className="h-4 w-4 text-purple-600" />
                      </div>
                      <p className="text-xs text-gray-500 ml-6 mt-1">
                        Intereses se cobran los días 15 y 30 de cada mes hasta liquidar el capital
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tipoTasa">Tipo de Tasa *</Label>
                      <Select 
                        onValueChange={(value: TipoTasa) => {
                          setValue('tipoTasa', value);
                          if (value === 'indefinido') {
                            setValue('esPlazoIndefinido', true);
                            setValue('plazo', undefined);
                          } else {
                            setValue('esPlazoIndefinido', false);
                            if (!watchedFields.plazo) setValue('plazo', 12);
                          }
                        }}
                        value={watchedFields.tipoTasa}
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
                          <SelectItem value="indefinido">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-purple-600" />
                              <div>
                                <div className="text-purple-700 font-medium">Quincenal Indefinido</div>
                                <div className="text-xs text-purple-500">15 y 30 de cada mes</div>
                              </div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.tipoTasa && (
                        <p className="text-sm text-red-600">{errors.tipoTasa.message}</p>
                      )}
                    </div>

                    {/* Plazo condicional */}
                    {!watchedFields.esPlazoIndefinido && watchedFields.tipoTasa !== 'indefinido' && (
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
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="metodoPago">Método de Pago *</Label>
                    <Select 
                      onValueChange={(value: string) => setValue('metodoPago', value)}
                      value={watchedFields.metodoPago || ''}
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
              <Card className={`border-2 ${
                watchedFields.esPlazoIndefinido || watchedFields.tipoTasa === 'indefinido' 
                ? 'border-purple-200 bg-purple-50' 
                : 'border-blue-200 bg-blue-50'
              }`}>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${
                    watchedFields.esPlazoIndefinido || watchedFields.tipoTasa === 'indefinido'
                    ? 'text-purple-800'
                    : 'text-blue-800'
                  }`}>
                    <Calculator className="h-5 w-5" />
                    {watchedFields.esPlazoIndefinido || watchedFields.tipoTasa === 'indefinido'
                      ? 'Sistema Quincenal'
                      : 'Cálculos del Préstamo'
                    }
                  </CardTitle>
                  <CardDescription className={
                    watchedFields.esPlazoIndefinido || watchedFields.tipoTasa === 'indefinido'
                    ? 'text-purple-600'
                    : 'text-blue-600'
                  }>
                    {watchedFields.esPlazoIndefinido || watchedFields.tipoTasa === 'indefinido'
                      ? 'Intereses cada 15 y 30 del mes'
                      : 'Valores calculados automáticamente'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Capital Prestado:</span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(watchedFields.monto || 0)}
                      </span>
                    </div>
                    
                    {/* ✅ NUEVA INFORMACIÓN para préstamos quincenales */}
                    {(watchedFields.esPlazoIndefinido || watchedFields.tipoTasa === 'indefinido') && (
                      <>
                        <div className="flex justify-between items-center py-2 border-t border-purple-200">
                          <span className="text-sm font-medium text-gray-700">Tasa Quincenal:</span>
                          <span className="text-lg font-bold text-purple-600">
                            {watchedFields.tasaInteres || 0}%
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Intereses por Quincena:</span>
                          <span className="text-xl font-bold text-green-600">
                            {formatCurrency(calculatedValues.interesesPorQuincena)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Fechas de Cobro:</span>
                          <span className="text-sm font-semibold text-purple-700">
                            15 y 30 de cada mes
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Próximo Vencimiento:</span>
                          <span className="text-sm font-semibold text-purple-700">
                            {calculatedValues.proximaQuincena}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Duración:</span>
                          <span className="text-sm font-semibold text-purple-700 flex items-center gap-1">
                            <Infinity className="h-4 w-4" />
                            Hasta liquidar capital
                          </span>
                        </div>
                      </>
                    )}

                    {/* Para préstamos con plazo fijo */}
                    {!(watchedFields.esPlazoIndefinido || watchedFields.tipoTasa === 'indefinido') && (
                      <>
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
                      </>
                    )}
                  </div>

                  {/* ✅ ALERTAS CON VALIDACIONES */}
                  {!(watchedFields.esPlazoIndefinido || watchedFields.tipoTasa === 'indefinido') && 
                   calculatedValues.interesesTotales > 0 && 
                   watchedFields.monto > 0 && (
                    <Alert className="bg-green-50 border-green-200">
                      <AlertCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        <strong>Rentabilidad:</strong> 
                        <span className="ml-1">
                          {((calculatedValues.interesesTotales / watchedFields.monto) * 100).toFixed(1)}% ganancia
                        </span>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* ✅ NUEVA ALERTA para préstamos quincenales */}
                  {(watchedFields.esPlazoIndefinido || watchedFields.tipoTasa === 'indefinido') && 
                   calculatedValues.interesesPorQuincena > 0 && (
                    <Alert className="bg-purple-50 border-purple-200">
                      <Calendar className="h-4 w-4 text-purple-600" />
                      <AlertDescription className="text-purple-800">
                        <strong>Sistema Quincenal:</strong> Intereses fijos de {formatCurrency(calculatedValues.interesesPorQuincena)} cada 15 y 30 del mes.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* ✅ INFORMACIÓN específica para sistema quincenal */}
              {(watchedFields.esPlazoIndefinido || watchedFields.tipoTasa === 'indefinido') && (
                <Card className="border-purple-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-800">
                      <Calendar className="h-5 w-5" />
                      Sistema Quincenal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="bg-purple-100 p-3 rounded-lg">
                        <h4 className="font-semibold text-purple-800 mb-2">¿Cómo funciona?</h4>
                        <ul className="space-y-1 text-purple-700">
                          <li>• Intereses se cobran los días <strong>15 y 30</strong> de cada mes</li>
                          <li>• Monto fijo de <strong>{formatCurrency(calculatedValues.interesesPorQuincena)}</strong> por quincena</li>
                          <li>• Cliente paga intereses + abono libre al capital</li>
                          <li>• Se acumulan si no paga en las fechas establecidas</li>
                        </ul>
                      </div>
                      
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <h4 className="font-semibold text-green-800 mb-2">📅 Calendario de Pagos:</h4>
                        <div className="grid grid-cols-2 gap-2 text-green-700 text-xs">
                          <div>• Enero: 15, 30</div>
                          <div>• Febrero: 15, 28/29</div>
                          <div>• Marzo: 15, 30</div>
                          <div>• Abril: 15, 30</div>
                          <div className="col-span-2 text-center mt-1 font-medium">
                            Y así sucesivamente...
                          </div>
                        </div>
                      </div>

                      <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        <h4 className="font-semibold text-yellow-800 mb-2">💰 Ejemplo de Acumulación:</h4>
                        <div className="text-yellow-700 text-xs space-y-1">
                          <div>• 15 Enero: Debe {formatCurrency(calculatedValues.interesesPorQuincena)}</div>
                          <div>• 30 Enero: Debe {formatCurrency(calculatedValues.interesesPorQuincena)}</div>
                          <div>• Si no paga nada en enero:</div>
                          <div className="ml-3 font-semibold">15 Febrero: Debe {formatCurrency(calculatedValues.interesesPorQuincena * 3)}</div>
                        </div>
                      </div>

                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-800 mb-2">💡 Recomendación:</h4>
                        <p className="text-blue-700 text-xs">
                          Pague al menos los intereses quincenales para evitar acumulación. 
                          Los abonos al capital reducen los intereses futuros.
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
                      
                      {/* ✅ ANÁLISIS específico para préstamos quincenales */}
                      {(watchedFields.esPlazoIndefinido || watchedFields.tipoTasa === 'indefinido') && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Intereses Mensuales:</span>
                            <span className="text-sm font-semibold">
                              {formatCurrency(calculatedValues.interesesPorQuincena * 2)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-sm">% de Ingresos:</span>
                            <span className="text-sm font-semibold">
                              {(((calculatedValues.interesesPorQuincena * 2) / clienteSeleccionado.ingresosMensuales) * 100).toFixed(1)}%
                            </span>
                          </div>

                          <Alert className="border-purple-200 bg-purple-50">
                            <Calendar className="h-4 w-4 text-purple-600" />
                            <AlertDescription className="text-purple-800">
                              <strong>Sistema Flexible:</strong> Ideal para clientes con ingresos variables. 
                              Pueden abonar al capital cuando tengan disponibilidad.
                            </AlertDescription>
                          </Alert>
                        </>
                      )}

                      {/* Análisis para préstamos con plazo fijo */}
                      {!(watchedFields.esPlazoIndefinido || watchedFields.tipoTasa === 'indefinido') && 
                       calculatedValues.montoCuota > 0 && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Capacidad de Pago:</span>
                            <span className="text-sm font-semibold">
                              {((calculatedValues.montoCuota / clienteSeleccionado.ingresosMensuales) * 100).toFixed(1)}%
                            </span>
                          </div>

                          <Alert className={
                            (calculatedValues.montoCuota / clienteSeleccionado.ingresosMensuales) > 0.3
                              ? 'border-yellow-200 bg-yellow-50'
                              : 'border-green-200 bg-green-50'
                          }>
                            <AlertCircle className={`h-4 w-4 ${
                              (calculatedValues.montoCuota / clienteSeleccionado.ingresosMensuales) > 0.3
                                ? 'text-yellow-600'
                                : 'text-green-600'
                            }`} />
                            <AlertDescription className={
                              (calculatedValues.montoCuota / clienteSeleccionado.ingresosMensuales) > 0.3
                                ? 'text-yellow-800'
                                : 'text-green-800'
                            }>
                              {(calculatedValues.montoCuota / clienteSeleccionado.ingresosMensuales) > 0.3
                                ? '⚠️ Alta carga de pago (>30% ingresos)'
                                : '✅ Carga de pago aceptable'
                              }
                            </AlertDescription>
                          </Alert>
                        </>
                      )}
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
            className={
              watchedFields.esPlazoIndefinido || watchedFields.tipoTasa === 'indefinido'
                ? "bg-purple-600 hover:bg-purple-700"
                : "bg-blue-600 hover:bg-blue-700"
            }
          >
            {isLoading ? (
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {prestamo ? 'Actualizar' : 'Crear'} Préstamo
            {(watchedFields.esPlazoIndefinido || watchedFields.tipoTasa === 'indefinido') && (
              <Calendar className="h-4 w-4 ml-2" />
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}