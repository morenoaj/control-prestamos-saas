'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/context/AuthContext'
import { useCompany } from '@/context/CompanyContext'
import { toast } from '@/hooks/use-toast'
import { 
  Building2, 
  CheckCircle, 
  ArrowRight, 
  Loader2,
  Users,
  CreditCard,
  BarChart3,
  Shield,
  Smartphone,
  TrendingUp
} from 'lucide-react'

const empresaSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  telefono: z.string().min(10, 'Teléfono debe tener al menos 10 dígitos'),
  direccion: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
  plan: z.enum(['basico', 'premium', 'enterprise']),
  tasaInteresDefault: z.number().min(0.1).max(100),
  monedaDefault: z.string().min(1),
  diasGracia: z.number().min(0).max(30),
})

type EmpresaFormData = z.infer<typeof empresaSchema>

const planes = [
  {
    id: 'basico',
    nombre: 'Básico',
    precio: 29,
    descripcion: 'Para emprendedores',
    limites: {
      maxClientes: 100,
      maxPrestamos: 500,
      maxUsuarios: 1
    },
    caracteristicas: [
      'Hasta 100 clientes',
      'Hasta 500 préstamos',
      'Reportes básicos',
      'Soporte por email'
    ]
  },
  {
    id: 'premium',
    nombre: 'Premium',
    precio: 79,
    descripcion: 'Para pequeñas empresas',
    limites: {
      maxClientes: 1000,
      maxPrestamos: -1, // ilimitado
      maxUsuarios: 5
    },
    caracteristicas: [
      'Hasta 1,000 clientes',
      'Préstamos ilimitados',
      'Reportes avanzados',
      'Notificaciones automáticas',
      'Soporte prioritario'
    ],
    popular: true
  },
  {
    id: 'enterprise',
    nombre: 'Enterprise',
    precio: 199,
    descripcion: 'Para grandes empresas',
    limites: {
      maxClientes: -1, // ilimitado
      maxPrestamos: -1, // ilimitado
      maxUsuarios: -1 // ilimitado
    },
    caracteristicas: [
      'Clientes ilimitados',
      'Múltiples empresas',
      'API completa',
      'Integraciones personalizadas',
      'Soporte 24/7'
    ]
  }
]

const pasos = [
  { numero: 1, titulo: 'Información de Empresa', icono: Building2 },
  { numero: 2, titulo: 'Seleccionar Plan', icono: CreditCard },
  { numero: 3, titulo: 'Configuración Inicial', icono: BarChart3 },
]

export default function OnboardingPage() {
  const [pasoActual, setPasoActual] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [planSeleccionado, setPlanSeleccionado] = useState<string>('')
  const router = useRouter()
  const { user, reloadUser } = useAuth()
  const { crearEmpresa } = useCompany()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger
  } = useForm<EmpresaFormData>({
    resolver: zodResolver(empresaSchema),
    defaultValues: {
      email: user?.email || '',
      monedaDefault: 'USD',
      tasaInteresDefault: 15,
      diasGracia: 3,
      plan: 'premium'
    }
  })

  const formData = watch()

  const siguiente = async () => {
    let camposAValidar: (keyof EmpresaFormData)[] = []
    
    if (pasoActual === 1) {
      camposAValidar = ['nombre', 'email', 'telefono', 'direccion']
    }
    
    const isValid = await trigger(camposAValidar)
    
    if (isValid) {
      setPasoActual(pasoActual + 1)
    }
  }

  const anterior = () => {
    setPasoActual(pasoActual - 1)
  }

  const onSubmit = async (data: EmpresaFormData) => {
    setIsLoading(true)
    
    try {
      const planData = planes.find(p => p.id === data.plan)!
      
      // Calcular fecha de vencimiento (30 días desde hoy)
      const fechaVencimiento = new Date()
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 30)
      
      const empresaData = {
        nombre: data.nombre,
        email: data.email,
        telefono: data.telefono,
        direccion: data.direccion,
        plan: data.plan as 'basico' | 'premium' | 'enterprise',
        estado: 'activa' as const,
        fechaVencimiento,
        configuracion: {
          tasaInteresDefault: data.tasaInteresDefault,
          monedaDefault: data.monedaDefault,
          diasGracia: data.diasGracia,
          colorTema: '#2563eb'
        },
        limites: planData.limites
      }

      const empresaId = await crearEmpresa(empresaData)
      
      // Recargar datos del usuario para obtener la nueva empresa
      await reloadUser()
      
      toast({
        title: "¡Empresa creada exitosamente! 🎉",
        description: `${data.nombre} ha sido configurada correctamente`,
      })
      
      // Pequeña pausa para que el usuario vea el mensaje
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
      
    } catch (error: any) {
      console.error('Error creando empresa:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la empresa. Intenta nuevamente.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            ¡Bienvenido a Control de Préstamos! 🎉
          </h1>
          <p className="text-xl text-gray-600">
            Configuremos tu empresa en solo 3 pasos
          </p>
        </div>

        {/* Indicador de pasos */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center space-x-8">
            {pasos.map((paso) => (
              <div key={paso.numero} className="flex items-center">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                  pasoActual >= paso.numero
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 text-gray-500'
                }`}>
                  {pasoActual > paso.numero ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <paso.icono className="w-6 h-6" />
                  )}
                </div>
                <div className="ml-3 text-left">
                  <div className="text-sm font-medium text-gray-900">{paso.titulo}</div>
                  <div className="text-xs text-gray-500">Paso {paso.numero}</div>
                </div>
                {paso.numero < pasos.length && (
                  <ArrowRight className="w-5 h-5 text-gray-400 ml-8" />
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Paso 1: Información de Empresa */}
          {pasoActual === 1 && (
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center text-2xl">
                  <Building2 className="mr-3 h-7 w-7 text-blue-600" />
                  Información de tu Empresa
                </CardTitle>
                <CardDescription>
                  Cuéntanos sobre tu empresa para personalizar la experiencia
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre de la Empresa *</Label>
                    <Input
                      id="nombre"
                      placeholder="Mi Empresa de Préstamos"
                      {...register('nombre')}
                      className={errors.nombre ? 'border-red-500' : ''}
                    />
                    {errors.nombre && (
                      <p className="text-sm text-red-500">{errors.nombre.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Empresarial *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="contacto@miempresa.com"
                      {...register('email')}
                      className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono *</Label>
                    <Input
                      id="telefono"
                      placeholder="+507 6000-0000"
                      {...register('telefono')}
                      className={errors.telefono ? 'border-red-500' : ''}
                    />
                    {errors.telefono && (
                      <p className="text-sm text-red-500">{errors.telefono.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="direccion">Dirección *</Label>
                    <Input
                      id="direccion"
                      placeholder="Calle Principal, Ciudad, País"
                      {...register('direccion')}
                      className={errors.direccion ? 'border-red-500' : ''}
                    />
                    {errors.direccion && (
                      <p className="text-sm text-red-500">{errors.direccion.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={siguiente} className="px-8">
                    Siguiente
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Paso 2: Selección de Plan */}
          {pasoActual === 2 && (
            <div className="animate-slide-up">
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center text-2xl">
                    <CreditCard className="mr-3 h-7 w-7 text-blue-600" />
                    Selecciona tu Plan
                  </CardTitle>
                  <CardDescription>
                    Elige el plan que mejor se adapte a las necesidades de tu empresa
                  </CardDescription>
                </CardHeader>
              </Card>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                {planes.map((plan) => (
                  <Card 
                    key={plan.id}
                    className={`relative cursor-pointer transition-all duration-300 hover:shadow-lg ${
                      formData.plan === plan.id 
                        ? 'ring-2 ring-blue-500 shadow-lg' 
                        : ''
                    } ${plan.popular ? 'border-blue-500' : ''}`}
                    onClick={() => setValue('plan', plan.id as any)}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                          🔥 Más Popular
                        </span>
                      </div>
                    )}
                    <CardHeader className="text-center">
                      <CardTitle className="text-xl">{plan.nombre}</CardTitle>
                      <CardDescription>{plan.descripcion}</CardDescription>
                      <div className="text-3xl font-bold text-blue-600">
                        ${plan.precio}<span className="text-sm font-normal text-gray-500">/mes</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {plan.caracteristicas.map((caracteristica, index) => (
                          <li key={index} className="flex items-center text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                            {caracteristica}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={anterior}>
                  Anterior
                </Button>
                <Button onClick={siguiente} disabled={!formData.plan}>
                  Siguiente
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Paso 3: Configuración Inicial */}
          {pasoActual === 3 && (
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center text-2xl">
                  <BarChart3 className="mr-3 h-7 w-7 text-blue-600" />
                  Configuración Inicial
                </CardTitle>
                <CardDescription>
                  Define las configuraciones por defecto para tu empresa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="monedaDefault">Moneda Principal</Label>
                    <Select onValueChange={(value) => setValue('monedaDefault', value)} defaultValue="USD">
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar moneda" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - Dólar</SelectItem>
                        <SelectItem value="PAB">PAB - Balboa</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="MXN">MXN - Peso Mexicano</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tasaInteresDefault">Tasa de Interés por Defecto (%)</Label>
                    <Input
                      id="tasaInteresDefault"
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="100"
                      {...register('tasaInteresDefault', { valueAsNumber: true })}
                      className={errors.tasaInteresDefault ? 'border-red-500' : ''}
                    />
                    {errors.tasaInteresDefault && (
                      <p className="text-sm text-red-500">{errors.tasaInteresDefault.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="diasGracia">Días de Gracia</Label>
                    <Input
                      id="diasGracia"
                      type="number"
                      min="0"
                      max="30"
                      {...register('diasGracia', { valueAsNumber: true })}
                      className={errors.diasGracia ? 'border-red-500' : ''}
                    />
                    {errors.diasGracia && (
                      <p className="text-sm text-red-500">{errors.diasGracia.message}</p>
                    )}
                  </div>
                </div>

                {/* Resumen de configuración */}
                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="font-semibold text-blue-900 mb-4">📋 Resumen de Configuración</h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Empresa:</span> {formData.nombre}
                    </div>
                    <div>
                      <span className="font-medium">Plan:</span> {planes.find(p => p.id === formData.plan)?.nombre}
                    </div>
                    <div>
                      <span className="font-medium">Moneda:</span> {formData.monedaDefault}
                    </div>
                    <div>
                      <span className="font-medium">Tasa de Interés:</span> {formData.tasaInteresDefault}%
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={anterior}>
                    Anterior
                  </Button>
                  <Button type="submit" disabled={isLoading} className="px-8">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Crear Empresa
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </div>
    </div>
  )
}