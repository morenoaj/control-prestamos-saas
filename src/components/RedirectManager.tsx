// src/components/RedirectManager.tsx - SOLUCIÓN CENTRALIZADA
'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Loader2, Calculator } from 'lucide-react'

interface RedirectManagerProps {
  children: React.ReactNode
}

export function RedirectManager({ children }: RedirectManagerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, empresaActual, necesitaOnboarding, loading, initialized } = useAuth()
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    // No hacer nada hasta que esté inicializado
    if (!initialized) return

    // Si está cargando datos críticos, esperar
    if (loading) return

    console.log('🔍 RedirectManager evaluando:', {
      pathname,
      hasUser: !!user,
      hasEmpresa: !!empresaActual,
      needsOnboarding: user ? necesitaOnboarding() : false
    })

    const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register')
    const isLandingPage = pathname === '/'
    const isDashboardRoute = pathname.startsWith('/dashboard')
    const isOnboardingRoute = pathname === '/onboarding'

    // LÓGICA DE REDIRECCIÓN SIMPLIFICADA

    // 1. Si no hay usuario autenticado
    if (!user) {
      if (isDashboardRoute || isOnboardingRoute) {
        console.log('➡️ Redirigiendo a login - usuario no autenticado')
        setRedirecting(true)
        router.replace('/login')
        return
      }
      return
    }

    // 2. Usuario autenticado - verificar onboarding
    const needsOnboarding = necesitaOnboarding()

    if (needsOnboarding) {
      // Usuario necesita onboarding
      if (!isOnboardingRoute) {
        console.log('➡️ Redirigiendo a onboarding - usuario sin empresa')
        setRedirecting(true)
        router.replace('/onboarding')
        return
      }
      return
    }

    // 3. Usuario completó onboarding y tiene empresa
    if (!needsOnboarding && empresaActual) {
      // Redirigir desde rutas públicas/auth al dashboard
      if (isAuthRoute || isLandingPage || isOnboardingRoute) {
        console.log('➡️ Redirigiendo a dashboard - usuario completo')
        setRedirecting(true)
        router.replace('/dashboard')
        return
      }
      return
    }

    // 4. Estado inconsistente - forzar onboarding
    if (user && !empresaActual && !needsOnboarding) {
      console.warn('⚠️ Estado inconsistente - forzando onboarding')
      if (!isOnboardingRoute) {
        setRedirecting(true)
        router.replace('/onboarding')
        return
      }
    }

  }, [user, empresaActual, necesitaOnboarding, pathname, loading, initialized, router])

  // Limpiar estado de redirección al cambiar ruta
  useEffect(() => {
    setRedirecting(false)
  }, [pathname])

  // ESTADOS DE CARGA

  // 1. Inicializando aplicación
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <Calculator className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Inicializando aplicación...</h3>
          <p className="text-gray-600">Configurando tu sesión</p>
        </div>
      </div>
    )
  }

  // 2. Cargando datos del usuario
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Calculator className="h-8 w-8 text-white" />
            </div>
            <Loader2 className="h-6 w-6 animate-spin absolute -bottom-1 -right-1 text-purple-600 bg-white rounded-full" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Cargando datos...</h3>
          <p className="text-gray-600">Preparando tu workspace</p>
        </div>
      </div>
    )
  }

  // 3. Redirigiendo
  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calculator className="h-8 w-8 text-white" />
            </div>
            <Loader2 className="h-6 w-6 animate-spin absolute -bottom-1 -right-1 text-green-600 bg-white rounded-full" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Redirigiendo...</h3>
          <p className="text-gray-600">Un momento por favor</p>
        </div>
      </div>
    )
  }

  // 4. Renderizar contenido normal
  return <>{children}</>
}