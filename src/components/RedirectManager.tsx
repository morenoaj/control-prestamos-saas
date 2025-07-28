// src/components/RedirectManager.tsx - VERSIÓN OPTIMIZADA FINAL
'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Loader2, Calculator, CheckCircle } from 'lucide-react'

interface RedirectManagerProps {
  children: React.ReactNode
}

export function RedirectManager({ children }: RedirectManagerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, empresaActual, necesitaOnboarding, loading, initialized } = useAuth()
  
  // Refs para controlar redirecciones y evitar loops
  const lastRedirect = useRef<string>('')
  const redirectTimeout = useRef<NodeJS.Timeout | undefined>(undefined)
  const isRedirecting = useRef<boolean>(false)
  const lastEvaluatedPath = useRef<string>('')

  useEffect(() => {
    // Limpiar timeout anterior
    if (redirectTimeout.current) {
      clearTimeout(redirectTimeout.current)
    }

    // No hacer nada si no está inicializado
    if (!initialized) return

    // Si está cargando datos críticos del usuario, esperar
    if (loading && user) return

    // Evitar evaluaciones duplicadas en la misma ruta
    const currentState = `${pathname}-${!!user}-${!!empresaActual}-${user ? necesitaOnboarding() : 'nouser'}`
    if (lastEvaluatedPath.current === currentState || isRedirecting.current) {
      return
    }
    lastEvaluatedPath.current = currentState

    // Función para realizar redirección con debounce mejorado
    const performRedirect = (targetPath: string, reason: string) => {
      // Evitar redirecciones duplicadas o si ya estamos en la ruta objetivo
      if (lastRedirect.current === targetPath || pathname === targetPath || isRedirecting.current) {
        return
      }
      
      console.log(`🔄 RedirectManager: ${reason} -> ${targetPath}`)
      lastRedirect.current = targetPath
      isRedirecting.current = true
      
      // Usar timeout para evitar redirecciones durante render
      redirectTimeout.current = setTimeout(() => {
        router.replace(targetPath)
        // Reset flag después de la redirección con un delay mayor
        setTimeout(() => {
          isRedirecting.current = false
          lastEvaluatedPath.current = '' // Reset para permitir nueva evaluación
        }, 1500)
      }, 150) // Delay ligeramente mayor para mejor estabilidad
    }

    // Definir rutas
    const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register')
    const isLandingPage = pathname === '/'
    const isDashboardRoute = pathname.startsWith('/dashboard')
    const isOnboardingRoute = pathname.includes('/dashboard/onboarding')

    console.log('🔍 RedirectManager evaluando:', {
      pathname,
      hasUser: !!user,
      hasEmpresa: !!empresaActual,
      needsOnboarding: user ? necesitaOnboarding() : 'N/A',
      isAuthRoute,
      isDashboardRoute,
      isOnboardingRoute,
      isRedirecting: isRedirecting.current
    })

    // LÓGICA DE REDIRECCIÓN OPTIMIZADA
    
    // 1. Si no hay usuario autenticado
    if (!user) {
      if (isDashboardRoute && !isOnboardingRoute) {
        performRedirect('/login', 'Usuario no autenticado accediendo a dashboard')
      }
      return
    }

    // 2. Usuario autenticado - verificar onboarding
    const needsOnboarding = necesitaOnboarding()

    if (needsOnboarding) {
      // Usuario necesita onboarding - solo redirigir si NO está ya en onboarding
      if (!isOnboardingRoute) {
        performRedirect('/dashboard/onboarding', 'Usuario necesita completar onboarding')
      }
      return
    }

    // 3. Usuario completó onboarding y tiene empresa
    if (!needsOnboarding && empresaActual) {
      // Redirigir desde rutas públicas al dashboard
      if (isAuthRoute || isLandingPage) {
        performRedirect('/dashboard', 'Usuario autenticado redirigido desde página pública')
        return
      }

      // Redirigir desde onboarding al dashboard (ya completado)
      if (isOnboardingRoute) {
        performRedirect('/dashboard', 'Onboarding ya completado')
        return
      }
    }

    // 4. Estado edge case - usuario sin empresa pero onboarding "completado"
    if (!needsOnboarding && !empresaActual && user) {
      console.warn('⚠️ RedirectManager: Estado inconsistente detectado')
      // Dar tiempo para que se carguen los datos de empresa
      redirectTimeout.current = setTimeout(() => {
        if (!empresaActual && !isRedirecting.current) {
          performRedirect('/dashboard/onboarding', 'Estado inconsistente - requerir onboarding')
        }
      }, 2000) // Reducido a 2 segundos
    }

    // Cleanup
    return () => {
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current)
      }
    }
  }, [user, empresaActual, necesitaOnboarding, pathname, loading, initialized, router])

  // Reset redirect flags cuando cambia la ruta exitosamente
  useEffect(() => {
    // Solo resetear si no estamos en proceso de redirección
    if (!isRedirecting.current) {
      lastRedirect.current = ''
      lastEvaluatedPath.current = ''
    }
  }, [pathname])

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current)
      }
      isRedirecting.current = false
    }
  }, [])

  // Estados de Loading Mejorados

  // Mostrar loading mientras no está inicializado
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Calculator className="h-8 w-8 text-white" />
            </div>
            <Loader2 className="h-6 w-6 animate-spin absolute -bottom-1 -right-1 text-blue-600 bg-white rounded-full" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Inicializando aplicación...</h3>
          <p className="text-gray-600">Configurando tu sesión</p>
          <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '40%' }}></div>
          </div>
        </div>
      </div>
    )
  }

  // Mostrar loading si está cargando datos críticos del usuario autenticado
  if (loading && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Calculator className="h-8 w-8 text-white" />
            </div>
            <Loader2 className="h-6 w-6 animate-spin absolute -bottom-1 -right-1 text-purple-600 bg-white rounded-full" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Cargando datos del usuario...</h3>
          <p className="text-gray-600">Preparando tu dashboard</p>
          <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-2">
            <div className="bg-purple-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
          </div>
        </div>
      </div>
    )
  }

  // Mostrar loading de redirección si está en proceso
  if (isRedirecting.current) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <Loader2 className="h-6 w-6 animate-spin absolute -bottom-1 -right-1 text-green-600 bg-white rounded-full" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Redirigiendo...</h3>
          <p className="text-gray-600">Te llevamos a la página correcta</p>
          <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-2">
            <div className="bg-green-600 h-2 rounded-full animate-pulse" style={{ width: '90%' }}></div>
          </div>
        </div>
      </div>
    )
  }

  // Renderizar contenido normal
  return <>{children}</>
}