// src/components/clientes/ClienteForm.tsx - CORREGIDO
'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
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
  User, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Users, 
  DollarSign,
  Plus,
  Trash2,
  Save,
  X,
  Star,
  AlertCircle
} from 'lucide-react'
import { Cliente, Referencia } from '@/types/database'
import { useAuth } from '@/context/AuthContext'
import { toast } from '@/hooks/use-toast'

// ✅ SCHEMA CORREGIDO - campos opcionales manejados correctamente
const referenciaSchema = z.object({
  nombre: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  telefono: z.string().min(8, 'Teléfono debe tener al menos 8 dígitos'),
  relacion: z.string().min(2, 'Relación debe tener al menos 2 caracteres'),
})

const clienteSchema = z.object({
  nombre: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  apellido: z.string().min(2, 'Apellido debe tener al menos 2 caracteres'),
  cedula: z.string().min(5, 'Cédula debe tener al menos 5 caracteres'),
  telefono: z.string().min(8, 'Teléfono debe tener al menos 8 dígitos'),
  telefonoSecundario: z.string().optional().or(z.literal('')),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  direccion: z.string().min(10, 'Dirección debe tener al menos 10 caracteres'),
  estadoCivil: z.string().min(1, 'Selecciona un estado civil'),
  ocupacion: z.string().min(2, 'Ocupación debe tener al menos 2 caracteres'),
  ingresosMensuales: z.number().min(1, 'Ingresos deben ser mayor a 0'),
  observaciones: z.string().optional().or(z.literal('')),
  referencias: z.array(referenciaSchema).min(1, 'Debe agregar al menos una referencia'),
})

type ClienteFormData = z.infer<typeof clienteSchema>

interface ClienteFormProps {
  isOpen: boolean
  onClose: () => void
  cliente?: Cliente | null
  onSave: (cliente: Omit<Cliente, 'id' | 'empresaId' | 'fechaRegistro'>) => void
}

export function ClienteForm({ isOpen, onClose, cliente, onSave }: ClienteFormProps) {
  const { empresaActual } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [creditScore, setCreditScore] = useState(cliente?.creditScore || 0)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nombre: cliente?.nombre || '',
      apellido: cliente?.apellido || '',
      cedula: cliente?.cedula || '',
      telefono: cliente?.telefono || '',
      telefonoSecundario: cliente?.telefonoSecundario || '',
      email: cliente?.email || '',
      direccion: cliente?.direccion || '',
      estadoCivil: cliente?.estadoCivil || '',
      ocupacion: cliente?.ocupacion || '',
      ingresosMensuales: cliente?.ingresosMensuales || 0,
      observaciones: cliente?.observaciones || '',
      referencias: cliente?.referencias && cliente.referencias.length > 0 ? cliente.referencias : [
        { nombre: '', telefono: '', relacion: '' }
      ],
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'referencias',
  })

  // Calcular credit score automáticamente
  const watchedFields = watch()
  
  const calculateCreditScore = () => {
    let score = 50 // Base score
    
    // Ingresos (30 puntos máximo)
    if (watchedFields.ingresosMensuales >= 2000) score += 30
    else if (watchedFields.ingresosMensuales >= 1000) score += 20
    else if (watchedFields.ingresosMensuales >= 500) score += 10
    
    // Referencias (20 puntos máximo)
    const validRefs = watchedFields.referencias?.filter(ref => 
      ref.nombre && ref.telefono && ref.relacion
    ).length || 0
    score += Math.min(validRefs * 10, 20)
    
    // Email (5 puntos) - solo si no es string vacío
    if (watchedFields.email && watchedFields.email.trim() !== '') score += 5
    
    // Teléfono secundario (5 puntos) - solo si no es string vacío
    if (watchedFields.telefonoSecundario && watchedFields.telefonoSecundario.trim() !== '') score += 5
    
    // Estado civil estable (10 puntos)
    if (watchedFields.estadoCivil === 'Casado' || watchedFields.estadoCivil === 'Unión libre') {
      score += 10
    }
    
    return Math.min(score, 100)
  }

  // Actualizar score cuando cambien los campos
  useState(() => {
    const newScore = calculateCreditScore()
    setCreditScore(newScore)
  })

  const onSubmit = async (data: ClienteFormData) => {
    setIsLoading(true)
    
    try {
      console.log('📝 Datos del formulario:', data)
      
      // Generar código único si es nuevo cliente
      const codigo = cliente?.codigo || `CLI${String(Date.now()).slice(-6)}`
      
      // ✅ PREPARAR DATOS LIMPIANDO CAMPOS OPCIONALES
      const clienteData: Omit<Cliente, 'id' | 'empresaId' | 'fechaRegistro'> = {
        codigo,
        nombre: data.nombre.trim(),
        apellido: data.apellido.trim(),
        cedula: data.cedula.trim(),
        telefono: data.telefono.trim(),
        // ✅ Solo incluir si no está vacío
        ...(data.telefonoSecundario && data.telefonoSecundario.trim() && {
          telefonoSecundario: data.telefonoSecundario.trim()
        }),
        // ✅ Solo incluir email si no está vacío y es válido
        ...(data.email && data.email.trim() && data.email.includes('@') && {
          email: data.email.trim()
        }),
        direccion: data.direccion.trim(),
        referencias: data.referencias.filter(ref => 
          ref.nombre.trim() && ref.telefono.trim() && ref.relacion.trim()
        ),
        estadoCivil: data.estadoCivil,
        ocupacion: data.ocupacion.trim(),
        ingresosMensuales: data.ingresosMensuales,
        foto: cliente?.foto,
        documentos: cliente?.documentos || [],
        creditScore: calculateCreditScore(),
        // ✅ Solo incluir observaciones si no está vacío
        ...(data.observaciones && data.observaciones.trim() && {
          observaciones: data.observaciones.trim()
        }),
        estado: cliente?.estado || 'activo'
      }
      
      console.log('✨ Datos preparados para enviar:', clienteData)
      
      await onSave(clienteData)
      
      toast({
        title: cliente ? "Cliente actualizado" : "Cliente creado",
        description: `${data.nombre} ${data.apellido} ha sido ${cliente ? 'actualizado' : 'registrado'} correctamente`,
      })
      
      reset()
      onClose()
    } catch (error: any) {
      console.error('❌ Error en onSubmit:', error)
      toast({
        title: "Error",
        description: error.message || `Error al ${cliente ? 'actualizar' : 'crear'} el cliente`,
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excelente'
    if (score >= 60) return 'Bueno'
    if (score >= 40) return 'Regular'
    return 'Bajo'
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {cliente ? 'Editar Cliente' : 'Nuevo Cliente'}
          </DialogTitle>
          <DialogDescription>
            {cliente 
              ? 'Modifica la información del cliente'
              : 'Completa los datos para registrar un nuevo cliente'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Información Personal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    {...register('nombre')}
                    placeholder="Ej: María"
                    className={errors.nombre ? 'border-red-500' : ''}
                  />
                  {errors.nombre && (
                    <p className="text-sm text-red-600">{errors.nombre.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apellido">Apellido *</Label>
                  <Input
                    id="apellido"
                    {...register('apellido')}
                    placeholder="Ej: González"
                    className={errors.apellido ? 'border-red-500' : ''}
                  />
                  {errors.apellido && (
                    <p className="text-sm text-red-600">{errors.apellido.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cedula">Cédula *</Label>
                  <Input
                    id="cedula"
                    {...register('cedula')}
                    placeholder="Ej: 8-123-456"
                    className={errors.cedula ? 'border-red-500' : ''}
                  />
                  {errors.cedula && (
                    <p className="text-sm text-red-600">{errors.cedula.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estadoCivil">Estado Civil *</Label>
                  <Select 
                    onValueChange={(value: string) => setValue('estadoCivil', value)}
                    defaultValue={cliente?.estadoCivil || ''}
                  >
                    <SelectTrigger className={errors.estadoCivil ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Selecciona estado civil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Soltero">Soltero(a)</SelectItem>
                      <SelectItem value="Casado">Casado(a)</SelectItem>
                      <SelectItem value="Divorciado">Divorciado(a)</SelectItem>
                      <SelectItem value="Viudo">Viudo(a)</SelectItem>
                      <SelectItem value="Unión libre">Unión libre</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.estadoCivil && (
                    <p className="text-sm text-red-600">{errors.estadoCivil.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información de Contacto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Información de Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono Principal *</Label>
                  <Input
                    id="telefono"
                    {...register('telefono')}
                    placeholder="Ej: +507 6000-1234"
                    className={errors.telefono ? 'border-red-500' : ''}
                  />
                  {errors.telefono && (
                    <p className="text-sm text-red-600">{errors.telefono.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefonoSecundario">Teléfono Secundario</Label>
                  <Input
                    id="telefonoSecundario"
                    {...register('telefonoSecundario')}
                    placeholder="Ej: +507 6000-5678 (opcional)"
                  />
                  <p className="text-xs text-gray-500">Opcional - deja vacío si no aplica</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="Ej: maria@email.com (opcional)"
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  <p className="text-xs text-gray-500">Opcional - deja vacío si no aplica</p>
                  {errors.email && (
                    <p className="text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección Completa *</Label>
                <Textarea
                  id="direccion"
                  {...register('direccion')}
                  placeholder="Ej: Calle 50, Edificio Torres del Mar, Piso 5, Apt 5A, Ciudad de Panamá"
                  className={errors.direccion ? 'border-red-500' : ''}
                  rows={3}
                />
                {errors.direccion && (
                  <p className="text-sm text-red-600">{errors.direccion.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Información Laboral y Financiera */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Información Laboral y Financiera
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ocupacion">Ocupación *</Label>
                  <Input
                    id="ocupacion"
                    {...register('ocupacion')}
                    placeholder="Ej: Contadora, Ingeniero, Comerciante"
                    className={errors.ocupacion ? 'border-red-500' : ''}
                  />
                  {errors.ocupacion && (
                    <p className="text-sm text-red-600">{errors.ocupacion.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ingresosMensuales">Ingresos Mensuales (USD) *</Label>
                  <Input
                    id="ingresosMensuales"
                    type="number"
                    min="0"
                    step="0.01"
                    {...register('ingresosMensuales', { valueAsNumber: true })}
                    placeholder="Ej: 1500.00"
                    className={errors.ingresosMensuales ? 'border-red-500' : ''}
                  />
                  {errors.ingresosMensuales && (
                    <p className="text-sm text-red-600">{errors.ingresosMensuales.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Credit Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Score Crediticio
              </CardTitle>
              <CardDescription>
                Se calcula automáticamente basado en la información proporcionada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold">
                  <span className={getScoreColor(creditScore)}>{creditScore}</span>
                </div>
                <div>
                  <div className={`text-lg font-semibold ${getScoreColor(creditScore)}`}>
                    {getScoreLabel(creditScore)}
                  </div>
                  <div className="text-sm text-gray-600">
                    Score de 0 a 100 puntos
                  </div>
                </div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        creditScore >= 80 ? 'bg-green-500' :
                        creditScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${creditScore}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Factores que mejoran el score:</strong> Ingresos altos, múltiples referencias, 
                  email de contacto, teléfono secundario, estado civil estable.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Referencias */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Referencias Personales
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ nombre: '', telefono: '', relacion: '' })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              </CardTitle>
              <CardDescription>
                Mínimo 1 referencia requerida. Máximo recomendado: 3 referencias.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Referencia {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`referencias.${index}.nombre`}>Nombre Completo *</Label>
                      <Input
                        {...register(`referencias.${index}.nombre`)}
                        placeholder="Ej: Juan Pérez"
                        className={errors.referencias?.[index]?.nombre ? 'border-red-500' : ''}
                      />
                      {errors.referencias?.[index]?.nombre && (
                        <p className="text-sm text-red-600">
                          {errors.referencias[index]?.nombre?.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`referencias.${index}.telefono`}>Teléfono *</Label>
                      <Input
                        {...register(`referencias.${index}.telefono`)}
                        placeholder="Ej: +507 6000-9999"
                        className={errors.referencias?.[index]?.telefono ? 'border-red-500' : ''}
                      />
                      {errors.referencias?.[index]?.telefono && (
                        <p className="text-sm text-red-600">
                          {errors.referencias[index]?.telefono?.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`referencias.${index}.relacion`}>Relación *</Label>
                      <Select 
                        onValueChange={(value: string) => setValue(`referencias.${index}.relacion`, value)}
                        defaultValue={cliente?.referencias?.[index]?.relacion || ''}
                      >
                        <SelectTrigger className={errors.referencias?.[index]?.relacion ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Selecciona relación" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Familiar">Familiar</SelectItem>
                          <SelectItem value="Hermano">Hermano/a</SelectItem>
                          <SelectItem value="Padre">Padre/Madre</SelectItem>
                          <SelectItem value="Hijo">Hijo/a</SelectItem>
                          <SelectItem value="Amigo">Amigo/a</SelectItem>
                          <SelectItem value="Jefe">Jefe/Supervisor</SelectItem>
                          <SelectItem value="Compañero">Compañero de trabajo</SelectItem>
                          <SelectItem value="Vecino">Vecino/a</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.referencias?.[index]?.relacion && (
                        <p className="text-sm text-red-600">
                          {errors.referencias[index]?.relacion?.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {errors.referencias && typeof errors.referencias.message === 'string' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.referencias.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Observaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Observaciones Adicionales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="observaciones">Notas sobre el cliente</Label>
                <Textarea
                  id="observaciones"
                  {...register('observaciones')}
                  placeholder="Ej: Cliente confiable, puntual en pagos anteriores, tiene negocio propio... (opcional)"
                  rows={4}
                />
                <p className="text-xs text-gray-500">Opcional - deja vacío si no aplica</p>
              </div>
            </CardContent>
          </Card>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit(onSubmit)} 
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {cliente ? 'Actualizar' : 'Guardar'} Cliente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}