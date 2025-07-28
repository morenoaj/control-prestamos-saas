// src/components/ForceRedirect.tsx - REDIRECCIÓN FORZADA
'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePathname } from 'next/navigation'

export function ForceRedirect() {
  const { user, usuario, empresaActual, necesitaOnboarding, loading } = useAuth()
  const pathname = usePathname()
  const hasRedirected = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Limpiar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Reset cuando cambia la ruta
    if (pathname) {
      hasRedirected.current = false
    }
  }, [pathname])

  useEffect(() => {
    // Si ya redirigió, no hacer nada más
    if (hasRedirected.current) {
      console.log('🛑 ForceRedirect: Ya se hizo una redirección')
      return
    }

    // Si está cargando, esperar
    if (loading) {
      console.log('⏳ ForceRedirect: Esperando que termine de cargar...')
      return
    }

    // Si no hay usuario, ir a login
    if (!user) {
      console.log('🚨 ForceRedirect: Sin usuario - redirigiendo a login')
      hasRedirected.current = true
      window.location.href = '/login'
      return
    }

    // Si no hay perfil de usuario, esperar un poco más
    if (!usuario) {
      console.log('⏳ ForceRedirect: Sin perfil de usuario - esperando...')
      timeoutRef.current = setTimeout(() => {
        if (!usuario) {
          console.log('🔄 ForceRedirect: Timeout sin perfil - recargando página')
          window.location.reload()
        }
      }, 5000)
      return
    }

    // CASO CRÍTICO: Usuario necesita onboarding
    const needsOnboarding = necesitaOnboarding()
    const isOnOnboardingPage = pathname.includes('/dashboard/onboarding')

    console.log('🔍 ForceRedirect - Estado crítico:', {
      needsOnboarding,
      isOnOnboardingPage,
      pathname,
      empresasCount: usuario.empresas?.length || 0,
      empresaActual: empresaActual?.nombre || 'null'
    })

    if (needsOnboarding && !isOnOnboardingPage) {
      console.log('🚨 FORZANDO REDIRECCIÓN A ONBOARDING INMEDIATAMENTE')
      hasRedirected.current = true
      
      // Múltiples métodos para asegurar la redirección
      try {
        // Método 1: window.location.href (más confiable)
        window.location.href = '/dashboard/onboarding'
      } catch (error) {
        console.error('Error con window.location.href:', error)
        try {
          // Método 2: window.location.replace
          window.location.replace('/dashboard/onboarding')
        } catch (error2) {
          console.error('Error con window.location.replace:', error2)
          // Método 3: forzar recarga en la URL correcta
          window.location.assign('/dashboard/onboarding')
        }
      }
      return
    }

    // Si ya completó onboarding pero está en onboarding, ir a dashboard
    if (!needsOnboarding && isOnOnboardingPage && empresaActual) {
      console.log('🚨 FORZANDO REDIRECCIÓN A DASHBOARD INMEDIATAMENTE')
      hasRedirected.current = true
      window.location.href = '/dashboard'
      return
    }

    // Si no necesita onboarding pero no hay empresa, esperar un poco
    if (!needsOnboarding && !empresaActual && !isOnOnboardingPage) {
      console.log('⏳ ForceRedirect: Esperando empresa actual...')
      timeoutRef.current = setTimeout(() => {
        if (necesitaOnboarding()) {
          console.log('🔄 ForceRedirect: Timeout - redirigiendo a onboarding')
          hasRedirected.current = true
          window.location.href = '/dashboard/onboarding'
        } else if (!empresaActual) {
          console.log('🔄 ForceRedirect: Timeout sin empresa - recargando')
          window.location.reload()
        }
      }, 3000)
      return
    }

    console.log('✅ ForceRedirect: Estado válido, no se requiere redirección')

  }, [user, usuario, empresaActual, necesitaOnboarding, loading, pathname])

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return null // Este componente no renderiza nada
}