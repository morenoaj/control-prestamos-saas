// src/components/RedirectManager.tsx - VERSIÓN FINAL OPTIMIZADA
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
  
  // Referencias para control de estado
  const redirectTimeout = useRef<NodeJS.Timeout | undefined>(undefined)
  const lastEvaluationKey = useRef<string>('')
  const isEvaluating = useRef(false)
  const pendingRedirect = useRef<string | null>(null)
  const hasRedirected = useRef(false)

  // Efecto para marcar cuando el componente está montado en el cliente
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Función para realizar redirección de forma segura
  const performRedirect = (targetPath: string, reason: string) => {
    // Si ya estamos en la ruta objetivo, no redirigir
    if (pathname === targetPath) {
      console.log(`📍 Ya estamos en ${targetPath}, cancelando redirección`)
      return
    }

    // Si ya hay una redirección pendiente a la misma ruta, no duplicar
    if (pendingRedirect.current === targetPath) {
      console.log(`⏳ Redirección a ${targetPath} ya pendiente, esperando...`)
      return
    }

    // Si ya redirigimos en esta sesión, no hacer más redirecciones
    if (hasRedirected.current) {
      console.log(`🚫 Ya se realizó una redirección en esta sesión, evitando duplicados`)
      return
    }
    
    console.log(`🔄 RedirectManager: ${reason} -> ${targetPath}`)
    pendingRedirect.current = targetPath
    hasRedirected.current = true
    setRedirectReason(reason)
    setRedirecting(true)
    
    // Limpiar timeout anterior
    if (redirectTimeout.current) {
      clearTimeout(redirectTimeout.current)
    }
    
    // Redirección inmediata para mejor UX
    redirectTimeout.current = setTimeout(() => {
      router.replace(targetPath)
      
      // Limpiar estado después de la redirección
      setTimeout(() => {
        setRedirecting(false)
        setRedirectReason('')
        pendingRedirect.current = null
        // No resetear hasRedirected aquí para evitar bucles
      }, 1000)
    }, 50) // Reducido a 50ms para redirección más rápida
  }

  // Efecto principal de evaluación de redirecciones
  useEffect(() => {
    // No hacer nada hasta que esté montado en el cliente
    if (!isMounted) return

    // No hacer nada si no está inicializado
    if (!initialized) return

    // Si está cargando datos críticos del usuario, esperar
    if (loading && user) {
      console.log('⏳ Esperando carga de datos del usuario...')
      return
    }

    // Si ya estamos evaluando, esperar
    if (isEvaluating.current) {
      console.log('⏳ Evaluación en progreso, esperando...')
      return
    }

    // Si hay una redirección pendiente, no evaluar
    if (pendingRedirect.current || hasRedirected.current) {
      console.log('⏳ Redirección pendiente o ya realizada, esperando...')
      return
    }

    // Crear clave única para evitar evaluaciones duplicadas
    const evaluationKey = `${pathname}-${!!user}-${!!empresaActual}-${user ? necesitaOnboarding() : 'nouser'}-${loading}-${initialized}`
    
    // Si ya evaluamos este estado exacto, no hacer nada
    if (lastEvaluationKey.current === evaluationKey) {
      return
    }

    // Marcar que estamos evaluando
    isEvaluating.current = true
    lastEvaluationKey.current = evaluationKey

    console.log('🔍 RedirectManager evaluando:', {
      pathname,
      hasUser: !!user,
      hasEmpresa: !!empresaActual,
      needsOnboarding: user ? necesitaOnboarding() : false,
      initialized,
      loading,
      redirecting,
      isMounted,
      evaluationKey: evaluationKey.substring(0, 50) + '...' // Truncar para legibilidad
    })

    // Definir rutas con timeout para dar tiempo a procesar
    setTimeout(() => {
      try {
        const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register')
        const isLandingPage = pathname === '/'
        const isDashboardRoute = pathname.startsWith('/dashboard')
        const isOnboardingRoute = pathname === '/onboarding'

        // LÓGICA DE REDIRECCIÓN SIMPLIFICADA
        
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

        // 4. Estado edge case - usuario sin onboarding pero sin empresa
        if (!needsOnboarding && !empresaActual && user) {
          console.warn('⚠️ RedirectManager: Estado inconsistente - usuario sin empresa')
          // Dar tiempo adicional para que se carguen los datos
          setTimeout(() => {
            if (!empresaActual && !necesitaOnboarding() && !hasRedirected.current) {
              console.warn('⚠️ Forzando onboarding por estado inconsistente')
              if (!isOnboardingRoute) {
                performRedirect('/onboarding', 'Estado inconsistente - requiere onboarding')
              }
            }
          }, 2000) // Más tiempo para estados inconsistentes
        }

      } finally {
        // Liberar el flag de evaluación
        setTimeout(() => {
          isEvaluating.current = false
        }, 300)
      }
    }, 100) // Pequeño delay para asegurar que todos los estados estén actualizados

  }, [isMounted, user, empresaActual, necesitaOnboarding, pathname, loading, initialized, router])

  // Resetear estados cuando cambia la ruta exitosamente
  useEffect(() => {
    if (isMounted && !loading && initialized) {
      // Resetear estados cuando la navegación es exitosa
      const timeoutId = setTimeout(() => {
        setRedirecting(false)
        setRedirectReason('')
        lastEvaluationKey.current = ''
        isEvaluating.current = false
        pendingRedirect.current = null
        hasRedirected.current = false // Permitir nuevas evaluaciones en la nueva ruta
      }, 1500)

      return () => clearTimeout(timeoutId)
    }
  }, [pathname, loading, initialized, isMounted])

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current)
      }
      isEvaluating.current = false
      pendingRedirect.current = null
      hasRedirected.current = false
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
          <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-2">
            <div className="bg-green-600 h-2 rounded-full animate-pulse transition-all duration-500" style={{ width: '95%' }}></div>
          </div>
        </div>
      </div>
    )
  }

  // 5. Renderizar contenido normal
  return <>{children}</>
}