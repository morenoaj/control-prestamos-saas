// src/app/(dashboard)/layout.tsx - VERSIÓN SIN LOOPS INFINITOS
'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { DashboardSidebar } from '@/components/layout/DashboardSidebar'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, empresaActual, necesitaOnboarding } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const hasRedirected = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Limpiar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Reset redirect flag cuando cambia la ruta
    if (pathname) {
      hasRedirected.current = false
    }
  }, [pathname])

  useEffect(() => {
    // No hacer nada mientras está cargando o ya redirigió
    if (loading || hasRedirected.current) {
      console.log('⏸️ Saltando redirección:', { loading, hasRedirected: hasRedirected.current })
      return
    }

    // Si no hay usuario, redirigir a login
    if (!user) {
      console.log('❌ No hay usuario - redirigiendo a login')
      hasRedirected.current = true
      router.replace('/login')
      return
    }

    const isOnboardingPage = pathname.includes('/dashboard/onboarding')
    const needsOnboarding = necesitaOnboarding()

    console.log('🔍 DashboardLayout - Análisis de redirección:', {
      pathname,
      isOnboardingPage,
      needsOnboarding,
      empresaActual: empresaActual?.nombre || 'null',
      user: user.email,
      hasRedirected: hasRedirected.current
    })

    // CASO 1: Usuario ya completó onboarding pero está en página de onboarding
    if (isOnboardingPage && !needsOnboarding && empresaActual) {
      console.log('✅ Onboarding completado - redirigiendo a dashboard')
      hasRedirected.current = true
      router.replace('/dashboard')
      return
    }

    // CASO 2: Usuario necesita onboarding pero NO está en página de onboarding
    if (!isOnboardingPage && needsOnboarding) {
      console.log('⚠️ Usuario necesita onboarding - redirigiendo')
      hasRedirected.current = true
      router.replace('/dashboard/onboarding')
      return
    }

    // CASO 3: Usuario está en onboarding y necesita onboarding - OK
    if (isOnboardingPage && needsOnboarding) {
      console.log('✅ Usuario correctamente en página de onboarding')
      return
    }

    // CASO 4: Usuario en dashboard pero sin empresa (estado transitorio)
    if (!isOnboardingPage && !needsOnboarding && !empresaActual) {
      console.log('⏳ Estado transitorio - esperando empresa...')
      
      // Dar tiempo limitado para que se cargue la empresa
      timeoutRef.current = setTimeout(() => {
        console.log('⏰ Timeout alcanzado - verificando estado final')
        if (necesitaOnboarding()) {
          console.log('🔄 Timeout: Redirigiendo a onboarding')
          hasRedirected.current = true
          router.replace('/dashboard/onboarding')
        } else {
          console.log('🔄 Timeout: Forzando recarga')
          window.location.reload()
        }
      }, 3000) // 3 segundos máximo de espera

      return
    }

    console.log('✅ Estado válido - no se requiere redirección')

  }, [user, loading, necesitaOnboarding, empresaActual, router, pathname])

  // Cleanup del timeout
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Mostrar loading mientras carga auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  // Si no hay usuario, mostrar loading mientras redirige
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Redirigiendo al login...</p>
        </div>
      </div>
    )
  }

  // Si está en onboarding, mostrar sin sidebar/header
  if (pathname.includes('/dashboard/onboarding')) {
    console.log('📋 Renderizando página de onboarding')
    return <>{children}</>
  }

  // Si necesita onboarding pero no está en la página correcta, mostrar loading
  if (necesitaOnboarding()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Configurando empresa...</p>
          <p className="text-sm text-gray-500">Te llevaremos al formulario de onboarding</p>
          
          {/* Botón de emergencia para forzar redirección manual */}
          <div className="mt-6">
            <button
              onClick={() => {
                console.log('🚨 Redirección manual activada')
                window.location.href = '/dashboard/onboarding'
              }}
              className="text-blue-600 hover:text-blue-800 text-sm underline"
            >
              Si no se redirige automáticamente, haz clic aquí
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Si no hay empresa actual pero no necesita onboarding (loading state)
  if (!empresaActual) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Cargando datos de empresa...</p>
          
          {/* Debug info visible */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-left">
            <p><strong>Debug:</strong></p>
            <p>Usuario: {user.email}</p>
            <p>Necesita onboarding: {necesitaOnboarding() ? 'Sí' : 'No'}</p>
            <p>Empresa actual: {empresaActual ? 'Sí' : 'No'}</p>
          </div>
        </div>
      </div>
    )
  }

  // Todo listo - mostrar dashboard completo
  console.log('✅ Renderizando dashboard completo')
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar />
      <div className="lg:pl-64">
        <DashboardHeader />
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}