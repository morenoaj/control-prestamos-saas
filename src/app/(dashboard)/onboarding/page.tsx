// src/app/(dashboard)/onboarding/page.tsx - VERSIÓN OPTIMIZADA
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'
import { useCompany } from '@/context/CompanyContext'
import { toast } from '@/hooks/use-toast'
import { 
  Building2, 
  Loader2, 
  CheckCircle, 
  Star, 
  Users, 
  Zap,
  Crown,
  Rocket
} from 'lucide-react'

const empresaSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  telefono: z.string().min(10, 'Teléfono debe tener al menos 10 dígitos'),
  direccion: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
  plan: z.enum(['basico', 'premium', 'enterprise'], {
    error: 'Debes seleccionar un plan'
  })
})

type EmpresaFormData = z.infer<typeof empresaSchema>

const planes = [
  {
    id: 'basico',
    nombre: 'Básico',
    precio: 29,
    descripcion: 'Perfecto para emprendedores',
    icon: Users,
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    caracteristicas: [
      'Hasta 100 clientes',
      'Hasta 500 préstamos',
      'Reportes básicos',
      'Soporte por email',
      '1 empresa'
    ],
    popular: false
  },
  {
    id: 'premium',
    nombre: 'Premium',
    precio: 79,
    descripcion: 'Para pequeñas empresas',
    icon: Star,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-700',
    caracteristicas: [
      'Hasta 1,000 clientes',
      'Préstamos ilimitados',
      'Reportes avanzados',
      'Notificaciones automáticas',
      'Soporte prioritario',
      'Hasta 3 empresas'
    ],
    popular: true
  },
  {
    id: 'enterprise',
    nombre: 'Enterprise',
    precio: 199,
    descripcion: 'Para grandes empresas',
    icon: Crown,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    caracteristicas: [
      'Clientes ilimitados',
      'Empresas ilimitadas',
      'API completa',
      'Integraciones personalizadas',
      'Soporte 24/7',
      'Manager dedicado'
    ],
    popular: false
  }
]

export default function OnboardingPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string>('premium')
  const [step, setStep] = useState(1) // 1: seleccionar plan, 2: datos empresa
  const [empresaCreada, setEmpresaCreada] = useState(false)
  const { user, reloadUser } = useAuth()
  const { crearEmpresa } = useCompany()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<EmpresaFormData>({
    resolver: zodResolver(empresaSchema),
    defaultValues: {
      email: user?.email || '',
      plan: 'premium'
    }
  })

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId)
    setValue('plan', planId as any)
  }

  const onSubmit = async (data: EmpresaFormData) => {
    if (isLoading || empresaCreada) return
    
    setIsLoading(true)
    
    try {
      const planElegido = planes.find(p => p.id === data.plan)
      
      console.log('🏢 Creando empresa con datos:', data)
      
      // Preparar datos de la empresa
      const empresaData = {
        nombre: data.nombre,
        email: data.email,
        telefono: data.telefono,
        direccion: data.direccion,
        plan: data.plan,
        estado: 'activa' as const,
        fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        configuracion: {
          tasaInteresDefault: 15,
          monedaDefault: 'USD',
          diasGracia: 3,
          colorTema: '#2563eb'
        },
        limites: getLimitesPorPlan(data.plan)
      }

      const empresaId = await crearEmpresa(empresaData as any)
      console.log('✅ Empresa creada con ID:', empresaId)
      
      // Marcar que la empresa fue creada exitosamente
      setEmpresaCreada(true)
      
      // Mostrar toast de éxito
      toast({
        title: `¡Empresa creada con plan ${planElegido?.nombre}! 🎉`,
        description: `${data.nombre} ha sido configurada correctamente`,
      })
      
      console.log('🔄 Recargando datos del usuario...')
      
      // Esperar un poco antes de recargar para asegurar consistencia
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Recargar datos del usuario para actualizar el estado
      await reloadUser()
      
      console.log('✅ Onboarding completado - esperando redirección automática')
      
      // El RedirectManager detectará el cambio y redirigirá al dashboard
      
    } catch (error: any) {
      console.error('❌ Error creando empresa:', error)
      setEmpresaCreada(false)
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la empresa. Intenta nuevamente.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getLimitesPorPlan = (plan: string) => {
    switch (plan) {
      case 'basico':
        return { maxClientes: 100, maxPrestamos: 500, maxUsuarios: 1 }
      case 'premium':
        return { maxClientes: 1000, maxPrestamos: -1, maxUsuarios: 5 }
      case 'enterprise':
        return { maxClientes: -1, maxPrestamos: -1, maxUsuarios: -1 }
      default:
        return { maxClientes: 100, maxPrestamos: 500, maxUsuarios: 1 }
    }
  }

  // Estado de éxito después de crear la empresa
  if (empresaCreada) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-blue-50">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Building2 className="h-4 w-4 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            ¡Empresa creada exitosamente! 🎉
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Tu empresa ha sido configurada correctamente.
            <br />
            Redirigiendo al dashboard...
          </p>
          <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-3">
            <div className="bg-gradient-to-r from-green-500 to-blue-600 h-3 rounded-full animate-pulse transition-all duration-1000" style={{ width: '95%' }}></div>
          </div>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Configurando tu workspace...</span>
          </div>
        </div>
      </div>
    )
  }

  // Loading state mientras procesa
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <Loader2 className="h-6 w-6 animate-spin absolute -bottom-1 -right-1 text-blue-600 bg-white rounded-full" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Creando tu empresa...</h3>
          <p className="text-gray-600">Configurando tu cuenta empresarial</p>
          <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
          </div>
        </div>
      </div>
    )
  }

  const planActual = planes.find(p => p.id === selectedPlan)

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="p-3 bg-blue-600 rounded-xl">
                <Rocket className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              ¡Bienvenido a Control de Préstamos! 🎉
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Elige el plan que mejor se adapte a tu negocio
            </p>
          </div>

          {/* Selector de Planes */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {planes.map((plan) => {
              const Icon = plan.icon
              const isSelected = selectedPlan === plan.id
              
              return (
                <Card 
                  key={plan.id}
                  className={`relative cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                    isSelected 
                      ? `${plan.borderColor} border-2 shadow-xl ring-2 ring-offset-2 ring-blue-500` 
                      : 'border-gray-200 hover:border-gray-300 shadow-lg hover:shadow-xl'
                  }`}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                        🔥 MÁS POPULAR
                      </span>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-4">
                    <div className={`w-16 h-16 bg-gradient-to-r ${plan.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold mb-2">{plan.nombre}</CardTitle>
                    <CardDescription className="text-gray-600 mb-4">{plan.descripcion}</CardDescription>
                    <div className="text-4xl font-bold text-gray-900 mb-2">
                      ${plan.precio}
                      <span className="text-lg font-normal text-gray-500">/mes</span>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {plan.caracteristicas.map((caracteristica, index) => (
                        <li key={index} className="flex items-center">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                          <span className="text-gray-700">{caracteristica}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {isSelected && (
                      <div className={`${plan.bgColor} ${plan.textColor} p-3 rounded-lg border ${plan.borderColor} text-center font-medium`}>
                        ✓ Plan Seleccionado
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Botón para continuar */}
          <div className="text-center">
            <Button
              onClick={() => setStep(2)}
              disabled={!selectedPlan}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-lg font-semibold px-10 py-4 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <Zap className="mr-2 h-5 w-5" />
              Continuar con Plan {planActual?.nombre}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Step 2: Datos de la empresa
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="p-3 bg-blue-600 rounded-xl">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Configuremos tu empresa
          </h1>
          <p className="text-lg text-gray-600">
            Cuéntanos sobre tu empresa para personalizar la experiencia
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Formulario */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-2xl">
                  <Building2 className="mr-3 h-7 w-7 text-blue-600" />
                  Información de tu Empresa
                </CardTitle>
                <CardDescription>
                  Completa los datos para finalizar la configuración
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre de la Empresa *</Label>
                      <Input
                        id="nombre"
                        placeholder="Mi Empresa de Préstamos"
                        {...register('nombre')}
                        className={errors.nombre ? 'border-red-500' : ''}
                        disabled={isLoading}
                      />
                      {errors.nombre && (
                        <p className="text-sm text-red-600">{errors.nombre.message}</p>
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
                        disabled={isLoading}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-600">{errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="telefono">Teléfono *</Label>
                      <Input
                        id="telefono"
                        placeholder="+507 6000-0000"
                        {...register('telefono')}
                        className={errors.telefono ? 'border-red-500' : ''}
                        disabled={isLoading}
                      />
                      {errors.telefono && (
                        <p className="text-sm text-red-600">{errors.telefono.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="direccion">Dirección *</Label>
                      <Input
                        id="direccion"
                        placeholder="Calle Principal, Ciudad, País"
                        {...register('direccion')}
                        className={errors.direccion ? 'border-red-500' : ''}
                        disabled={isLoading}
                      />
                      {errors.direccion && (
                        <p className="text-sm text-red-600">{errors.direccion.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setStep(1)}
                      className="flex-1"
                      disabled={isLoading}
                    >
                      Volver a Planes
                    </Button>
                    <Button 
                      onClick={handleSubmit(onSubmit)}
                      disabled={isLoading} 
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isLoading ? 'Creando...' : 'Crear Empresa'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resumen del Plan */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  {planActual && <planActual.icon className="mr-2 h-5 w-5 text-blue-600" />}
                  Plan {planActual?.nombre}
                </CardTitle>
                <CardDescription>Resumen de tu selección</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">
                      ${planActual?.precio}
                      <span className="text-lg font-normal text-gray-500">/mes</span>
                    </div>
                    <p className="text-sm text-gray-600">+ impuestos</p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Incluye:</h4>
                    {planActual?.caracteristicas.map((caracteristica, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-gray-700">{caracteristica}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <Button 
                      variant="outline" 
                      onClick={() => setStep(1)}
                      className="w-full"
                      disabled={isLoading}
                    >
                      Cambiar Plan
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}