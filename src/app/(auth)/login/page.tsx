// src/app/(auth)/login/page.tsx - CON DISEÑO HERMOSO
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/context/AuthContext'
import { Eye, EyeOff, Loader2, Calculator, Shield, Zap } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasRedirected, setHasRedirected] = useState(false)
  const router = useRouter()
  const { user, empresaActual, necesitaOnboarding, signIn, signInWithGoogle, loading } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  // Manejar redirecciones automáticas cuando el usuario ya está logueado
  useEffect(() => {
    // No hacer nada mientras está cargando o ya redirigió
    if (loading || hasRedirected) return

    if (user) {
      console.log('🔄 Usuario ya logueado en login page, verificando redirección...')
      
      setHasRedirected(true)
      
      if (necesitaOnboarding()) {
        console.log('➡️ Redirigiendo a onboarding desde login')
        router.replace('/dashboard/onboarding')
      } else if (empresaActual) {
        console.log('➡️ Redirigiendo a dashboard desde login')
        router.replace('/dashboard')
      } else {
        console.log('⏳ Esperando datos de empresa...')
        // Dar un poco de tiempo para que se carguen los datos
        setTimeout(() => {
          if (necesitaOnboarding()) {
            router.replace('/dashboard/onboarding')
          } else {
            router.replace('/dashboard')
          }
        }, 2000)
      }
    }
  }, [user, empresaActual, necesitaOnboarding, router, loading, hasRedirected])

  const onSubmit = async (data: LoginFormData) => {
    if (isLoading) return
    
    setIsLoading(true)
    setError('')
    
    try {
      await signIn(data.email, data.password)
      
      toast({
        title: "Bienvenido",
        description: "Has iniciado sesión correctamente",
      })

      console.log('✅ Login exitoso, esperando redirección automática')
      
    } catch (error: any) {
      setError(error.message || 'Error al iniciar sesión')
      setIsLoading(false)
      toast({
        title: "Error",
        description: error.message || 'Error al iniciar sesión',
        variant: "destructive"
      })
    }
  }

  const handleGoogleSignIn = async () => {
    if (isLoading) return
    
    setIsLoading(true)
    setError('')
    
    try {
      await signInWithGoogle()
      
      toast({
        title: "Bienvenido",
        description: "Has iniciado sesión con Google correctamente",
      })

      console.log('✅ Login con Google exitoso, esperando redirección automática')
      
    } catch (error: any) {
      setError(error.message || 'Error al iniciar sesión con Google')
      setIsLoading(false)
      toast({
        title: "Error",
        description: error.message || 'Error al iniciar sesión con Google',
        variant: "destructive"
      })
    }
  }

  // Mostrar loading si está autenticando o si ya está logueado y redirigiendo
  if (loading || (user && !hasRedirected)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Calculator className="h-8 w-8 text-white" />
            </div>
            <Loader2 className="h-6 w-6 animate-spin absolute -bottom-1 -right-1 text-blue-600 bg-white rounded-full" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            {loading ? 'Verificando sesión...' : 'Redirigiendo...'}
          </h3>
          <p className="text-gray-600">Un momento por favor</p>
        </div>
      </div>
    )
  }

  // Solo mostrar el formulario si no hay usuario logueado
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Shield className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Sesión Activa</h3>
          <p className="text-gray-600">Ya tienes sesión activa, redirigiendo...</p>
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-blue-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -right-4 w-72 h-72 bg-blue-100 rounded-full opacity-30 animate-float" />
        <div className="absolute top-1/2 -left-8 w-48 h-48 bg-cyan-100 rounded-full opacity-20 animate-float" style={{ animationDelay: '-2s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-purple-100 rounded-full opacity-25 animate-float" style={{ animationDelay: '-4s' }} />
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg animate-glow">
                <Calculator className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              ¡Bienvenido de vuelta! 👋
            </h2>
            <p className="text-gray-600">
              Inicia sesión para gestionar tus préstamos
            </p>
          </div>

          {/* Form Card */}
          <Card className="slide-up shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold text-gray-900">Iniciar Sesión</CardTitle>
              <CardDescription className="text-gray-600">
                Ingresa a tu cuenta para continuar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    {...register('email')}
                    disabled={isLoading}
                    className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...register('password')}
                      disabled={isLoading}
                      className="h-12 pr-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-gray-100"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>

                <Button 
                  onClick={handleSubmit(onSubmit)}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 font-semibold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]" 
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  <Zap className="mr-2 h-5 w-5" />
                  Iniciar Sesión
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-4 text-gray-500 font-medium">O continúa con</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full h-12 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continuar con Google
              </Button>

              <div className="space-y-4 text-center text-sm">
                <div>
                  ¿No tienes una cuenta?{' '}
                  <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                    Regístrate aquí
                  </Link>
                </div>

                <div>
                  <Link href="/forgot-password" className="text-gray-500 hover:text-gray-700 transition-colors">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 text-center text-xs">
            <div className="space-y-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Shield className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-gray-600">Seguro</p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Zap className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-gray-600">Rápido</p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                <Calculator className="h-4 w-4 text-purple-600" />
              </div>
              <p className="text-gray-600">Eficiente</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}