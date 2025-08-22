// src/components/prestamos/PrestamoForm.tsx - VERSIÓN FINAL SIN ERRORES
'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  CreditCard, 
  DollarSign, 
  Calendar, 
  Calculator,
  User,
  Save,
  X,
  AlertCircle,
  Infinity,
  Loader2,
  Check,
  Clock,
  TrendingUp,
  Info,
  Zap,
  Shield,
  Target,
  Settings,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  PiggyBank,
  Receipt,
  FileText
} from 'lucide-react'

import { Prestamo, Cliente } from '@/types/database'
import { 
  prestamoSchemaExtendido, 
  PrestamoFormDataExtendido, 
  TipoTasa,
  formatCurrency
} from '@/types/prestamos'
import { useClientes } from '@/hooks/useClientes'
import { calcularInteresesSimples, calcularMontoCuotaFija } from '@/hooks/usePrestamos'
import { toast } from '@/hooks/use-toast'

// Componente Switch simple (sin dependencia externa)
interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

const Switch: React.FC<SwitchProps> = ({ checked, onCheckedChange }) => (
  <button
    type="button"
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      checked ? 'bg-blue-600' : 'bg-gray-200'
    }`}
    onClick={() => onCheckedChange(!checked)}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
)

// Componente Progress simple
interface ProgressProps {
  value: number
}

const Progress: React.FC<ProgressProps> = ({ value }) => (
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div 
      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
      style={{ width: `${value}%` }}
    />
  </div>
)

// Componente Tabs simple
interface TabsProps {
  defaultValue: string
  className: string
  children: React.ReactNode
}

interface TabsContextType {
  activeTab: string
  setActiveTab: (tab: string) => void
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined)

const Tabs: React.FC<TabsProps> = ({ defaultValue, className, children }) => {
  const [activeTab, setActiveTab] = useState(defaultValue)
  
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  className: string
  children: React.ReactNode
}

const TabsList: React.FC<TabsListProps> = ({ className, children }) => (
  <div className={className}>
    {children}
  </div>
)

interface TabsTriggerProps {
  value: string
  children: React.ReactNode
}

const TabsTrigger: React.FC<TabsTriggerProps> = ({ value, children }) => {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error('TabsTrigger must be used within Tabs')
  
  const { activeTab, setActiveTab } = context
  
  return (
    <button
      type="button"
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        activeTab === value 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: React.ReactNode
}

const TabsContent: React.FC<TabsContentProps> = ({ value, children }) => {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error('TabsContent must be used within Tabs')
  
  const { activeTab } = context
  
  return activeTab === value ? <div>{children}</div> : null
}

// Función para calcular próxima fecha quincenal
const calcularFechaProximaQuincena = (fechaBase: Date): Date => {
  const fecha = new Date(fechaBase)
  const dia = fecha.getDate()
  
  if (dia <= 15) {
    fecha.setDate(15)
  } else {
    fecha.setMonth(fecha.getMonth(), 30)
    if (fecha.getDate() !== 30) {
      fecha.setDate(0)
    }
  }
  
  return fecha
}

interface PrestamoFormProps {
  isOpen: boolean
  onClose: () => void
  prestamo?: Prestamo | null
  onSave: (prestamo: Omit<Prestamo, 'id' | 'empresaId' | 'numero' | 'fechaCreacion'> & { fechaCreacion?: Date }) => void
}

export function PrestamoForm({ isOpen, onClose, prestamo, onSave }: PrestamoFormProps) {
  const { clientes } = useClientes()
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    { id: 'cliente', title: 'Cliente', icon: User },
    { id: 'terminos', title: 'Términos', icon: DollarSign },
    { id: 'detalles', title: 'Detalles', icon: FileText },
    { id: 'resumen', title: 'Resumen', icon: Check }
  ]

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    trigger,
    formState: { errors },
  } = useForm<PrestamoFormDataExtendido>({
    resolver: zodResolver(prestamoSchemaExtendido),
    mode: 'onChange',
    defaultValues: {
      clienteId: prestamo?.clienteId || '',
      monto: prestamo?.monto || 0,
      tasaInteres: prestamo?.tasaInteres || 15,
      tipoTasa: prestamo?.tipoTasa || 'mensual',
      plazo: prestamo?.plazo || 12,
      metodoPago: prestamo?.metodoPago || 'efectivo',
      proposito: prestamo?.proposito || '',
      garantia: prestamo?.garantia || '',
      observaciones: prestamo?.observaciones || '',
      esPlazoIndefinido: prestamo?.esPlazoIndefinido || false,
      usarFechaPersonalizada: false,
      fechaCreacion: new Date(),
    }
  })

  const watchedFields = watch()
  const clienteSeleccionado = clientes.find(c => c.id === watchedFields.clienteId)

  // Formatear fecha para input
  const formatearFechaParaInput = (fecha: Date): string => {
    return fecha.toISOString().split('T')[0]
  }

  // Calcular valores en tiempo real
  const calcularValores = () => {
    const { monto, tasaInteres, plazo, tipoTasa, esPlazoIndefinido, fechaCreacion, usarFechaPersonalizada } = watchedFields
    
    if (!monto || !tasaInteres) return null

    const fechaBase = usarFechaPersonalizada && fechaCreacion ? new Date(fechaCreacion) : new Date()
    
    if (esPlazoIndefinido || tipoTasa === 'indefinido') {
      const interesesQuincenales = monto * (tasaInteres / 100)
      const proximaQuincena = calcularFechaProximaQuincena(fechaBase)
      
      return {
        tipo: 'indefinido' as const,
        interesesQuincenales,
        interesesMensuales: interesesQuincenales * 2,
        interesesAnuales: interesesQuincenales * 24,
        proximaQuincena: proximaQuincena.toLocaleDateString('es-PA'),
        retornoAnual: (interesesQuincenales * 24 / monto) * 100,
        tiempoRecuperacion: 'Variable según abonos al capital'
      }
    } else if (plazo && plazo > 0) {
      const intereses = calcularInteresesSimples(monto, tasaInteres, plazo, tipoTasa)
      const cuota = calcularMontoCuotaFija(monto, tasaInteres, plazo, tipoTasa)
      const montoTotal = monto + intereses

      const fechaVencimiento = new Date(fechaBase)
      switch (tipoTasa) {
        case 'quincenal':
          fechaVencimiento.setDate(fechaBase.getDate() + (plazo * 15))
          break
        case 'mensual':
          fechaVencimiento.setMonth(fechaBase.getMonth() + plazo)
          break
        case 'anual':
          fechaVencimiento.setFullYear(fechaBase.getFullYear() + plazo)
          break
      }

      return {
        tipo: 'fijo' as const,
        intereses,
        cuota,
        montoTotal,
        fechaVencimiento: fechaVencimiento.toLocaleDateString('es-PA'),
        retornoTotal: (intereses / monto) * 100,
        retornoAnual: tipoTasa === 'anual' ? (intereses / monto) * 100 : 
                      tipoTasa === 'mensual' ? ((intereses / monto) * 100) * (12 / plazo) :
                      ((intereses / monto) * 100) * (24 / plazo)
      }
    }

    return null
  }

  const valoresCalculados = calcularValores()

  // Navegar entre pasos
  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep)
    const isStepValid = await trigger(fieldsToValidate as any)
    
    if (isStepValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Obtener campos para validar por paso
  const getFieldsForStep = (step: number): (keyof PrestamoFormDataExtendido)[] => {
    switch (step) {
      case 0: return ['clienteId']
      case 1: return ['monto', 'tasaInteres', 'tipoTasa', 'plazo']
      case 2: return ['metodoPago', 'proposito']
      default: return []
    }
  }

  // Calcular progreso
  const progress = ((currentStep + 1) / steps.length) * 100

  const onSubmit = async (data: PrestamoFormDataExtendido) => {
    setIsLoading(true)
    
    try {
      if (!clienteSeleccionado) {
        throw new Error('Cliente no encontrado')
      }

      const esPrestamoIndefinido = data.esPlazoIndefinido || data.tipoTasa === 'indefinido'
      const fechaCreacionFinal = data.usarFechaPersonalizada && data.fechaCreacion 
        ? new Date(data.fechaCreacion)
        : new Date()

      const prestamoData: Omit<Prestamo, 'id' | 'empresaId' | 'numero' | 'fechaCreacion'> & { fechaCreacion?: Date } = {
        clienteId: data.clienteId,
        usuarioCreador: '',
        monto: data.monto,
        tasaInteres: data.tasaInteres,
        tipoTasa: data.tipoTasa,
        plazo: esPrestamoIndefinido ? undefined : data.plazo,
        esPlazoIndefinido: esPrestamoIndefinido,
        fechaInicio: fechaCreacionFinal as any,
        fechaVencimiento: esPrestamoIndefinido ? undefined : new Date() as any,
        metodoPago: data.metodoPago,
        proposito: data.proposito.trim(),
        estado: prestamo?.estado || 'activo',
        saldoCapital: data.monto,
        interesesPendientes: esPrestamoIndefinido ? 0 : (valoresCalculados?.tipo === 'fijo' ? valoresCalculados.intereses : 0),
        interesesPagados: 0,
        diasAtraso: 0,
        moraAcumulada: 0,
        fechaProximoPago: esPrestamoIndefinido ? 
          calcularFechaProximaQuincena(fechaCreacionFinal) as any : 
          new Date() as any,
        montoProximoPago: esPrestamoIndefinido ? 
          (valoresCalculados?.tipo === 'indefinido' ? valoresCalculados.interesesQuincenales : data.monto * (data.tasaInteres / 100)) : 
          (valoresCalculados?.tipo === 'fijo' ? valoresCalculados.cuota : data.monto * (data.tasaInteres / 100)),
        ultimaActualizacionIntereses: esPrestamoIndefinido ? fechaCreacionFinal as any : undefined,
        fechaCreacion: fechaCreacionFinal,
        ...(data.garantia && data.garantia.trim() && { garantia: data.garantia.trim() }),
        ...(data.observaciones && data.observaciones.trim() && { observaciones: data.observaciones.trim() }),
      }
      
      await onSave(prestamoData)
      
      toast({
        title: prestamo ? "Préstamo actualizado" : "Préstamo creado",
        description: `${esPrestamoIndefinido ? 'Préstamo quincenal' : 'Préstamo con plazo'} para ${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}`,
      })
      
      reset()
      setCurrentStep(0)
      onClose()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Error al ${prestamo ? 'actualizar' : 'crear'} el préstamo`,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Obtener color de riesgo crediticio
  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  // Obtener recomendación de tasa
  const getTasaRecomendada = (cliente: Cliente) => {
    if (cliente.creditScore >= 80) return { min: 10, max: 15, recomendada: 12 }
    if (cliente.creditScore >= 60) return { min: 15, max: 20, recomendada: 17 }
    return { min: 20, max: 25, recomendada: 22 }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {prestamo ? 'Editar Préstamo' : 'Nuevo Préstamo'}
                <Sparkles className="h-4 w-4 text-yellow-500" />
              </div>
              <div className="text-sm text-gray-500 font-normal">
                Paso {currentStep + 1} de {steps.length} - {steps[currentStep].title}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Barra de Progreso */}
        <div className="space-y-2">
          <Progress value={progress} />
          <div className="flex justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <div 
                  key={step.id}
                  className={`flex items-center gap-2 text-xs ${
                    index <= currentStep ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  <div className={`p-1 rounded-full ${
                    index <= currentStep ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <span className="hidden sm:inline">{step.title}</span>
                </div>
              )
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Paso 1: Selección de Cliente */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <User className="h-12 w-12 mx-auto text-blue-600 mb-3" />
                <h3 className="text-lg font-semibold">Selecciona el Cliente</h3>
                <p className="text-sm text-gray-600">Elige el cliente para este préstamo</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Cliente *</Label>
                <Select 
                  onValueChange={(value: string) => setValue('clienteId', value)}
                  value={watchedFields.clienteId || ''}
                >
                  <SelectTrigger className={`h-12 ${errors.clienteId ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Busca y selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        <div className="flex items-center justify-between w-full">
                          <div>
                            <div className="font-medium">{cliente.nombre} {cliente.apellido}</div>
                            <div className="text-xs text-gray-500">{cliente.cedula} • {cliente.telefono}</div>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ml-4 ${getRiskColor(cliente.creditScore)}`}>
                            {cliente.creditScore}/100
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.clienteId && (
                  <p className="text-xs text-red-600">{errors.clienteId.message}</p>
                )}
              </div>

              {/* Información del Cliente Seleccionado */}
              {clienteSeleccionado && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-100 rounded-full">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900">
                          {clienteSeleccionado.nombre} {clienteSeleccionado.apellido}
                        </h4>
                        <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                          <div>
                            <span className="text-blue-600">Ingresos:</span>
                            <div className="font-medium">{formatCurrency(clienteSeleccionado.ingresosMensuales)}/mes</div>
                          </div>
                          <div>
                            <span className="text-blue-600">Score:</span>
                            <div className={`font-medium ${getRiskColor(clienteSeleccionado.creditScore).split(' ')[0]}`}>
                              {clienteSeleccionado.creditScore}/100
                            </div>
                          </div>
                          <div>
                            <span className="text-blue-600">Ocupación:</span>
                            <div className="font-medium">{clienteSeleccionado.ocupacion}</div>
                          </div>
                          <div>
                            <span className="text-blue-600">Referencias:</span>
                            <div className="font-medium">{clienteSeleccionado.referencias?.length || 0} contactos</div>
                          </div>
                        </div>
                        
                        {/* Recomendación de Tasa */}
                        <div className="mt-3 p-2 bg-white rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2 text-xs text-blue-600">
                            <Target className="h-3 w-3" />
                            <span className="font-medium">Tasa recomendada:</span>
                          </div>
                          <div className="text-sm font-semibold text-blue-900">
                            {getTasaRecomendada(clienteSeleccionado).recomendada}% 
                            <span className="text-xs text-blue-600 font-normal ml-1">
                              (rango: {getTasaRecomendada(clienteSeleccionado).min}%-{getTasaRecomendada(clienteSeleccionado).max}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Paso 2: Términos del Préstamo */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <DollarSign className="h-12 w-12 mx-auto text-green-600 mb-3" />
                <h3 className="text-lg font-semibold">Términos del Préstamo</h3>
                <p className="text-sm text-gray-600">Define los términos financieros</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <PiggyBank className="h-4 w-4" />
                    Monto del Préstamo *
                  </Label>
                  <Input
                    type="number"
                    min="5"
                    step="0.01"
                    {...register('monto', { valueAsNumber: true })}
                    placeholder="1,000.00"
                    className={`h-12 text-lg ${errors.monto ? 'border-red-500' : ''}`}
                  />
                  {errors.monto && (
                    <p className="text-xs text-red-600">{errors.monto.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <TrendingUp className="h-4 w-4" />
                    Tasa de Interés (%) *
                    {clienteSeleccionado && (
                      <div className="relative group">
                        <Info className="h-3 w-3 text-blue-500 cursor-help" />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          Recomendado: {getTasaRecomendada(clienteSeleccionado).recomendada}%
                        </div>
                      </div>
                    )}
                  </Label>
                  <Input
                    type="number"
                    min="0.1"
                    max="100"
                    step="0.1"
                    {...register('tasaInteres', { valueAsNumber: true })}
                    placeholder="15.0"
                    className={`h-12 text-lg ${errors.tasaInteres ? 'border-red-500' : ''}`}
                  />
                  {errors.tasaInteres && (
                    <p className="text-xs text-red-600">{errors.tasaInteres.message}</p>
                  )}
                </div>
              </div>

              {/* Tipo de Préstamo con Tarjetas */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Tipo de Préstamo</Label>
                <div className="grid grid-cols-2 gap-4">
                  {/* Préstamo con Plazo */}
                  <Card 
                    className={`cursor-pointer transition-all ${
                      !(watchedFields.esPlazoIndefinido ?? false)
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setValue('esPlazoIndefinido', false)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Plazo Fijo</h4>
                          <p className="text-xs text-gray-600">Cuotas fijas con fecha de vencimiento</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Préstamo Indefinido */}
                  <Card 
                    className={`cursor-pointer transition-all ${
                      (watchedFields.esPlazoIndefinido ?? false)
                        ? 'ring-2 ring-purple-500 bg-purple-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setValue('esPlazoIndefinido', true)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Infinity className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Quincenal Indefinido</h4>
                          <p className="text-xs text-gray-600">Solo intereses quincenales</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Configuración específica para plazo fijo */}
              {!(watchedFields.esPlazoIndefinido ?? false) && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Frecuencia de Pago *</Label>
                    <Select 
                      onValueChange={(value: TipoTasa) => setValue('tipoTasa', value)}
                      value={watchedFields.tipoTasa || ''}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quincenal">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
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
                            <Calendar className="h-4 w-4" />
                            <div>
                              <div>Anual</div>
                              <div className="text-xs text-gray-500">Cada año</div>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Duración *</Label>
                    <Input
                      type="number"
                      min="1"
                      {...register('plazo', { valueAsNumber: true })}
                      placeholder="12"
                      className={`h-12 ${errors.plazo ? 'border-red-500' : ''}`}
                    />
                    {errors.plazo && (
                      <p className="text-xs text-red-600">{errors.plazo.message}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {watchedFields.tipoTasa === 'quincenal' && 'Número de quincenas'}
                      {watchedFields.tipoTasa === 'mensual' && 'Número de meses'}
                      {watchedFields.tipoTasa === 'anual' && 'Número de años'}
                    </p>
                  </div>
                </div>
              )}

              {/* Preview de cálculos */}
              {valoresCalculados && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calculator className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-green-800">Vista Previa de Cálculos</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {valoresCalculados.tipo === 'fijo' ? (
                        <>
                          <div>
                            <span className="text-green-600">Cuota {watchedFields.tipoTasa}:</span>
                            <div className="font-semibold text-lg">{formatCurrency(valoresCalculados.cuota)}</div>
                          </div>
                          <div>
                            <span className="text-green-600">Total a recibir:</span>
                            <div className="font-semibold text-lg">{formatCurrency(valoresCalculados.montoTotal)}</div>
                          </div>
                          <div>
                            <span className="text-green-600">Retorno total:</span>
                            <div className="font-semibold">{valoresCalculados.retornoTotal.toFixed(1)}%</div>
                          </div>
                          <div>
                            <span className="text-green-600">Retorno anual:</span>
                            <div className="font-semibold">{valoresCalculados.retornoAnual.toFixed(1)}%</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="text-green-600">Intereses quincenales:</span>
                            <div className="font-semibold text-lg">{formatCurrency(valoresCalculados.interesesQuincenales)}</div>
                          </div>
                          <div>
                            <span className="text-green-600">Intereses mensuales:</span>
                            <div className="font-semibold text-lg">{formatCurrency(valoresCalculados.interesesMensuales)}</div>
                          </div>
                          <div>
                            <span className="text-green-600">Retorno anual:</span>
                            <div className="font-semibold">{valoresCalculados.retornoAnual.toFixed(1)}%</div>
                          </div>
                          <div>
                            <span className="text-green-600">Próxima quincena:</span>
                            <div className="font-semibold">{valoresCalculados.proximaQuincena}</div>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* Análisis de impacto en cliente */}
                    {clienteSeleccionado && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-green-600">Impacto en ingresos:</span>
                            <div className="font-semibold">
                              {valoresCalculados.tipo === 'fijo' 
                                ? `${((valoresCalculados.cuota / clienteSeleccionado.ingresosMensuales) * 100).toFixed(1)}%`
                                : `${((valoresCalculados.interesesMensuales / clienteSeleccionado.ingresosMensuales) * 100).toFixed(1)}%`
                              } de sus ingresos
                            </div>
                          </div>
                          <div>
                            <span className="text-green-600">Capacidad de pago:</span>
                            <div className={`font-semibold ${
                              (valoresCalculados.tipo === 'fijo' 
                                ? (valoresCalculados.cuota / clienteSeleccionado.ingresosMensuales) * 100
                                : (valoresCalculados.interesesMensuales / clienteSeleccionado.ingresosMensuales) * 100
                              ) <= 30 ? 'text-green-600' : 
                              (valoresCalculados.tipo === 'fijo' 
                                ? (valoresCalculados.cuota / clienteSeleccionado.ingresosMensuales) * 100
                                : (valoresCalculados.interesesMensuales / clienteSeleccionado.ingresosMensuales) * 100
                              ) <= 50 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {(valoresCalculados.tipo === 'fijo' 
                                ? (valoresCalculados.cuota / clienteSeleccionado.ingresosMensuales) * 100
                                : (valoresCalculados.interesesMensuales / clienteSeleccionado.ingresosMensuales) * 100
                              ) <= 30 ? 'Excelente' : 
                              (valoresCalculados.tipo === 'fijo' 
                                ? (valoresCalculados.cuota / clienteSeleccionado.ingresosMensuales) * 100
                                : (valoresCalculados.interesesMensuales / clienteSeleccionado.ingresosMensuales) * 100
                              ) <= 50 ? 'Aceptable' : 'Riesgoso'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Paso 3: Detalles Adicionales */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto text-purple-600 mb-3" />
                <h3 className="text-lg font-semibold">Detalles Adicionales</h3>
                <p className="text-sm text-gray-600">Información complementaria del préstamo</p>
              </div>

              <div className="space-y-4">
                {/* Método de Pago */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Receipt className="h-4 w-4" />
                    Método de Pago Preferido *
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { value: 'efectivo', label: 'Efectivo', icon: '💵' },
                      { value: 'transferencia', label: 'Transferencia', icon: '🏦' },
                      { value: 'cheque', label: 'Cheque', icon: '📝' },
                      { value: 'yappy', label: 'Yappy', icon: '📱' },
                      { value: 'nequi', label: 'Nequi', icon: '💳' },
                      { value: 'otro', label: 'Otro', icon: '🔄' }
                    ].map((metodo) => (
                      <Card 
                        key={metodo.value}
                        className={`cursor-pointer transition-all ${
                          watchedFields.metodoPago === metodo.value 
                            ? 'ring-2 ring-blue-500 bg-blue-50' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setValue('metodoPago', metodo.value)}
                      >
                        <CardContent className="p-3 text-center">
                          <div className="text-2xl mb-1">{metodo.icon}</div>
                          <div className="text-sm font-medium">{metodo.label}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {errors.metodoPago && (
                    <p className="text-xs text-red-600">{errors.metodoPago.message}</p>
                  )}
                </div>

                {/* Propósito */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Propósito del Préstamo *</Label>
                  <Textarea
                    {...register('proposito')}
                    placeholder="Describe para qué se utilizará el préstamo..."
                    className={`min-h-[100px] ${errors.proposito ? 'border-red-500' : ''}`}
                  />
                  {errors.proposito && (
                    <p className="text-xs text-red-600">{errors.proposito.message}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Ejemplos: Capital de trabajo, compra de mercancía, pago de deudas, emergencia médica, etc.
                  </p>
                </div>

                {/* Opciones Avanzadas */}
                <Tabs defaultValue="basico" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="basico">Información Básica</TabsTrigger>
                    <TabsTrigger value="avanzado">Opciones Avanzadas</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basico">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 text-green-600 mb-2">
                        <Check className="h-4 w-4" />
                        <span className="text-sm font-medium">Información básica completada</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Ya tienes toda la información esencial. Puedes continuar o agregar detalles adicionales en la pestaña "Opciones Avanzadas".
                      </p>
                    </div>
                  </TabsContent>
                  
<TabsContent value="avanzado">
                        <div className="space-y-4">
                          {/* Fecha Personalizada - SECCIÓN MEJORADA */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600 rounded-full">
                                  <Clock className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <Label className="text-base font-semibold text-blue-900">¿Este préstamo se realizó en el pasado?</Label>
                                  <p className="text-sm text-blue-700 mt-1">
                                    Configura la fecha real para cálculos precisos de intereses e historial
                                  </p>
                                </div>
                              </div>
                              <Switch
                                checked={watchedFields.usarFechaPersonalizada ?? false}
                                onCheckedChange={(checked: boolean) => setValue('usarFechaPersonalizada', checked)}
                              />
                            </div>
                            
                            {(watchedFields.usarFechaPersonalizada ?? false) && (
                              <div className="space-y-4 p-4 bg-white rounded-lg border-2 border-blue-200 shadow-sm">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-900">
                                      Fecha en que se realizó el préstamo
                                    </Label>
                                    <Input
                                      type="date"
                                      {...register('fechaCreacion', { 
                                        valueAsDate: true,
                                        setValueAs: (value) => value ? new Date(value) : new Date()
                                      })}
                                      defaultValue={formatearFechaParaInput(new Date())}
                                      max={formatearFechaParaInput(new Date())}
                                      className="h-12 text-base border-blue-200 focus:border-blue-400"
                                    />
                                    {errors.fechaCreacion && (
                                      <p className="text-sm text-red-600">{errors.fechaCreacion.message}</p>
                                    )}
                                  </div>
                                  
                                  <div className="space-y-3">
                                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                      <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
                                        <Info className="h-4 w-4" />
                                        Beneficios de configurar la fecha
                                      </div>
                                      <ul className="text-sm text-blue-700 space-y-1">
                                        <li className="flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                          Intereses calculados correctamente
                                        </li>
                                        <li className="flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                          Fechas de vencimiento precisas
                                        </li>
                                        <li className="flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                          Reportes históricos exactos
                                        </li>
                                        <li className="flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                          Control total de tu cartera
                                        </li>
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Previsualización de la fecha seleccionada */}
                                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                  <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-800">
                                      Préstamo se registrará con fecha: {
                                        watchedFields.fechaCreacion 
                                          ? new Date(watchedFields.fechaCreacion).toLocaleDateString('es-PA', {
                                              weekday: 'long',
                                              year: 'numeric',
                                              month: 'long',
                                              day: 'numeric'
                                            })
                                          : 'Fecha no seleccionada'
                                      }
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                      {/* Garantía */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                          <Shield className="h-4 w-4" />
                          Garantía (opcional)
                        </Label>
                        <Textarea
                          {...register('garantia')}
                          placeholder="Describe la garantía del préstamo (vehículo, propiedad, avalista, etc.)..."
                          rows={3}
                        />
                      </div>

                      {/* Observaciones */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                          <Settings className="h-4 w-4" />
                          Observaciones (opcional)
                        </Label>
                        <Textarea
                          {...register('observaciones')}
                          placeholder="Notas adicionales, condiciones especiales, etc..."
                          rows={3}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}

          {/* Paso 4: Resumen Final */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="p-3 bg-gradient-to-br from-green-100 to-blue-100 rounded-full w-16 h-16 mx-auto mb-3">
                  <Check className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold">Resumen del Préstamo</h3>
                <p className="text-sm text-gray-600">Revisa los detalles antes de crear el préstamo</p>
              </div>

              <div className="grid gap-4">
                {/* Resumen del Cliente */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <User className="h-4 w-4" />
                      Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {clienteSeleccionado && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold">{clienteSeleccionado.nombre} {clienteSeleccionado.apellido}</div>
                          <div className="text-sm text-gray-600">{clienteSeleccionado.cedula} • Score: {clienteSeleccionado.creditScore}/100</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Resumen Financiero */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Calculator className="h-4 w-4" />
                      Términos Financieros
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Monto Principal</div>
                        <div className="text-xl font-bold text-green-600">{formatCurrency(watchedFields.monto || 0)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Tasa de Interés</div>
                        <div className="text-xl font-bold">{watchedFields.tasaInteres}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Tipo</div>
                        <div className="font-semibold">
                          {(watchedFields.esPlazoIndefinido ?? false) ? 'Quincenal Indefinido' : 
                           `${watchedFields.tipoTasa} (${watchedFields.plazo} períodos)`}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Método de Pago</div>
                        <div className="font-semibold capitalize">{watchedFields.metodoPago}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Proyección Financiera */}
                {valoresCalculados && (
                  <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-green-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingUp className="h-4 w-4" />
                        Proyección Financiera
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {valoresCalculados.tipo === 'fijo' ? (
                          <>
                            <div className="text-center p-3 bg-white rounded-lg">
                              <div className="text-sm text-gray-600">Cuota {watchedFields.tipoTasa}</div>
                              <div className="text-2xl font-bold text-blue-600">{formatCurrency(valoresCalculados.cuota)}</div>
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg">
                              <div className="text-sm text-gray-600">Total a Recibir</div>
                              <div className="text-2xl font-bold text-green-600">{formatCurrency(valoresCalculados.montoTotal)}</div>
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg">
                              <div className="text-sm text-gray-600">Ganancia Total</div>
                              <div className="text-xl font-bold text-purple-600">{formatCurrency(valoresCalculados.intereses)}</div>
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg">
                              <div className="text-sm text-gray-600">Retorno Anual</div>
                              <div className="text-xl font-bold text-orange-600">{valoresCalculados.retornoAnual.toFixed(1)}%</div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-center p-3 bg-white rounded-lg">
                              <div className="text-sm text-gray-600">Intereses Quincenales</div>
                              <div className="text-2xl font-bold text-purple-600">{formatCurrency(valoresCalculados.interesesQuincenales)}</div>
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg">
                              <div className="text-sm text-gray-600">Intereses Mensuales</div>
                              <div className="text-2xl font-bold text-blue-600">{formatCurrency(valoresCalculados.interesesMensuales)}</div>
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg">
                              <div className="text-sm text-gray-600">Intereses Anuales</div>
                              <div className="text-xl font-bold text-green-600">{formatCurrency(valoresCalculados.interesesAnuales)}</div>
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg">
                              <div className="text-sm text-gray-600">Retorno Anual</div>
                              <div className="text-xl font-bold text-orange-600">{valoresCalculados.retornoAnual.toFixed(1)}%</div>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Detalles Adicionales */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4" />
                      Detalles
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="text-sm text-gray-600">Propósito</div>
                      <div className="font-medium">{watchedFields.proposito}</div>
                    </div>
                    {watchedFields.garantia && (
                      <div>
                        <div className="text-sm text-gray-600">Garantía</div>
                        <div className="font-medium">{watchedFields.garantia}</div>
                      </div>
                    )}
                    {watchedFields.observaciones && (
                      <div>
                        <div className="text-sm text-gray-600">Observaciones</div>
                        <div className="font-medium">{watchedFields.observaciones}</div>
                      </div>
                    )}
                    {(watchedFields.usarFechaPersonalizada ?? false) && (
                      <div>
                        <div className="text-sm text-gray-600">Fecha de Creación</div>
                        <div className="font-medium">
                          {watchedFields.fechaCreacion ? 
                            new Date(watchedFields.fechaCreacion).toLocaleDateString('es-PA') : 
                            'Fecha actual'
                          }
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Botones de Navegación */}
          <div className="flex gap-3 pt-6 border-t">
            {currentStep > 0 && (
              <Button type="button" variant="outline" onClick={prevStep}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
            )}
            
            <div className="flex-1" />
            
            {currentStep < steps.length - 1 ? (
              <Button type="button" onClick={nextStep}>
                Siguiente
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando Préstamo...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    {prestamo ? 'Actualizar' : 'Crear'} Préstamo
                  </>
                )}
              </Button>
            )}
            
            <Button type="button" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}