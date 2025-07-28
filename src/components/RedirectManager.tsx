// src/components/RedirectManager.tsx - VERSIÓN SEGURA PARA HYDRATION
'use client'

import { useEffect, useRef, useState } from 'react'
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
  
  // Estado para controlar si estamos en el cliente (post-hydration)
  const [isMounted, setIsMounted] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [redirectReason, setRedirectReason] = useState('')
  const redirectTimeout = useRef<NodeJS.Timeout | undefined>(undefined)
  const lastEvaluationKey = useRef<string>('')

  // Efecto para marcar cuando el componente está montado en el cliente
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    // No hacer nada hasta que esté montado en el cliente
    if (!isMounted) return

    // Limpiar timeout anterior
    if (redirectTimeout.current) {
      clearTimeout(redirectTimeout.current)
      redirectTimeout.current = undefined
    }

    // No hacer nada si no está inicializado
    if (!initialized) return

    // Si está cargando datos críticos del usuario, esperar
    if (loading && user) return

    // Crear clave única para evitar evaluaciones duplicadas
    const evaluationKey = `${pathname}-${!!user}-${!!empresaActual}-${user ? necesitaOnboarding() : 'nouser'}`
    
    // Si ya evaluamos este estado exacto, no hacer nada
    if (lastEvaluationKey.current === evaluationKey) return
    lastEvaluationKey.current = evaluationKey

    // Función para realizar redirección optimizada
    const performRedirect = (targetPath: string, reason: string) => {
      // Si ya estamos en la ruta objetivo, no redirigir
      if (pathname === targetPath) return
      
      console.log(`🔄 RedirectManager: ${reason} -> ${targetPath}`)
      setRedirectReason(reason)
      setRedirecting(true)
      
      // Redirección con cleanup
      redirectTimeout.current = setTimeout(() => {
        router.replace(targetPath)
        
        // Limpiar estado después de un tiempo prudencial
        setTimeout(() => {
          setRedirecting(false)
          setRedirectReason('')
        }, 1500)
      }, 100)
    }

    // Definir rutas
    const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register')
    const isLandingPage = pathname === '/'
    const isDashboardRoute = pathname.startsWith('/dashboard')
    const isOnboardingRoute = pathname === '/onboarding'

    console.log('🔍 RedirectManager evaluando:', {
      pathname,
      hasUser: !!user,
      hasEmpresa: !!empresaActual,
      needsOnboarding: user ? necesitaOnboarding() : false,
      isAuthRoute,
      isDashboardRoute,
      isOnboardingRoute,
      initialized,
      loading,
      redirecting,
      isMounted
    })

    // LÓGICA DE REDIRECCIÓN
    
    // 1. Si no hay usuario autenticado
    if (!user) {
      if (isDashboardRoute || isOnboardingRoute) {
        performRedirect('/login', 'Usuario no autenticado necesita login')
      }
      return
    }

    // 2. Usuario autenticado - verificar onboarding
    const needsOnboarding = necesitaOnboarding()

    if (needsOnboarding) {
      // Usuario necesita onboarding
      if (!isOnboardingRoute) {
        performRedirect('/onboarding', 'Usuario necesita completar onboarding')
      }
      return
    }

    // 3. Usuario completó onboarding y tiene empresa
    if (!needsOnboarding && empresaActual) {
      // Redirigir desde rutas públicas/auth al dashboard
      if (isAuthRoute || isLandingPage || isOnboardingRoute) {
        performRedirect('/dashboard', 'Usuario con empresa completa va al dashboard')
      }
      return
    }

    // 4. Estado edge case
    if (!needsOnboarding && !empresaActual && user) {
      console.warn('⚠️ RedirectManager: Estado inconsistente - forzando onboarding')
      if (!isOnboardingRoute) {
        performRedirect('/onboarding', 'Estado inconsistente - requiere onboarding')
      }
    }

    // Cleanup function
    return () => {
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current)
        redirectTimeout.current = undefined
      }
    }
  }, [isMounted, user, empresaActual, necesitaOnboarding, pathname, loading, initialized, router])

  // Limpiar estados cuando cambia la ruta exitosamente
  useEffect(() => {
    if (isMounted && !loading && initialized) {
      setRedirecting(false)
      setRedirectReason('')
      lastEvaluationKey.current = ''
    }
  }, [pathname, loading, initialized, isMounted])

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current)
      }
    }
  }, [])

  // RENDERIZADO SEGURO PARA HYDRATION

  // 1. Durante la hydration, mostrar contenido mínimo
  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <Calculator className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Inicializando...</h3>
        </div>
      </div>
    )
  }

  // 2. Loading inicial de la aplicación
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
        </div>
      </div>
    )
  }

  // 3. Loading de datos del usuario
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
          <p className="text-gray-600">Preparando tu workspace</p>
        </div>
      </div>
    )
  }

  // 4. Loading de redirección
  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <Loader2 className="h-6 w-6 animate-spin absolute -bottom-1 -right-1 text-green-600 bg-white rounded-full" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">¡Redirigiendo!</h3>
          <p className="text-gray-600">{redirectReason}</p>
        </div>
      </div>
    )
  }

  // 5. Renderizar contenido normal
  return <>{children}</>
}