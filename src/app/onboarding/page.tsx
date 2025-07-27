// src/app/onboarding/page.tsx - PÁGINA SIMPLE SIN LAYOUT DASHBOARD
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
import { useAuth } from '@/context/AuthContext'
import { useCompany } from '@/context/CompanyContext'
import { toast } from '@/hooks/use-toast'
import { Building2, Loader2 } from 'lucide-react'

const empresaSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  telefono: z.string().min(10, 'Teléfono debe tener al menos 10 dígitos'),
  direccion: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
})

type EmpresaFormData = z.infer<typeof empresaSchema>

export default function OnboardingPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { user, reloadUser } = useAuth()
  const { crearEmpresa } = useCompany()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmpresaFormData>({
    resolver: zodResolver(empresaSchema),
    defaultValues: {
      email: user?.email || '',
    }
  })

  const onSubmit = async (data: EmpresaFormData) => {
    setIsLoading(true)
    
    try {
      // Preparar datos según el tipo que espera crearEmpresa
      const empresaData = {
        nombre: data.nombre,
        email: data.email,
        telefono: data.telefono,
        direccion: data.direccion,
        plan: 'premium' as const,
        estado: 'activa' as const,
        fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        configuracion: {
          tasaInteresDefault: 15,
          monedaDefault: 'USD',
          diasGracia: 3,
          colorTema: '#2563eb'
        },
        limites: {
          maxClientes: 1000,
          maxPrestamos: -1,
          maxUsuarios: 5
        }
      }

      console.log('🏢 Creando empresa:', empresaData)
      
      // Usar any temporalmente para evitar errores de tipo
      const empresaId = await crearEmpresa(empresaData as any)
      console.log('✅ Empresa creada con ID:', empresaId)
      
      // Recargar datos del usuario
      await reloadUser()
      
      toast({
        title: "¡Empresa creada exitosamente! 🎉",
        description: `${data.nombre} ha sido configurada correctamente`,
      })
      
      // Redirigir al dashboard
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1500)
      
    } catch (error: any) {
      console.error('❌ Error creando empresa:', error)
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
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="p-3 bg-blue-600 rounded-xl">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            ¡Bienvenido a Control de Préstamos! 🎉
          </h1>
          <p className="text-xl text-gray-600">
            Configuremos tu empresa para comenzar
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Building2 className="mr-3 h-7 w-7 text-blue-600" />
              Información de tu Empresa
            </CardTitle>
            <CardDescription>
              Cuéntanos sobre tu empresa para personalizar la experiencia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

              {/* Plan seleccionado automáticamente */}
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-4">📋 Plan Seleccionado</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Plan:</span> Premium
                  </div>
                  <div>
                    <span className="font-medium">Precio:</span> $79/mes
                  </div>
                  <div>
                    <span className="font-medium">Clientes:</span> Hasta 1,000
                  </div>
                  <div>
                    <span className="font-medium">Préstamos:</span> Ilimitados
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full py-3">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Empresa y Comenzar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}