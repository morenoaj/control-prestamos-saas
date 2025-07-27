// src/app/(dashboard)/layout.tsx - VERSIÓN SIN LOOPS DE REDIRECCIÓN
'use client'

import { useEffect, useState } from 'react'
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
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    // No hacer nada mientras está cargando o ya está redirigiendo
    if (loading || redirecting) return

    console.log('🔍 Dashboard Layout - Estado:', {
      loading,
      user: user?.email,
      empresaActual: empresaActual?.nombre,
      necesitaOnboarding: necesitaOnboarding(),
      pathname
    });

    // Si no hay usuario, redirigir a login (solo una vez)
    if (!user) {
      console.log('❌ No hay usuario - redirigiendo a login');
      setRedirecting(true);
      router.replace('/login');
      return;
    }

    // Si necesita onboarding y no está ya en la página de onboarding
    if (necesitaOnboarding() && !pathname.includes('/dashboard/onboarding')) {
      console.log('⚠️ Usuario necesita onboarding - redirigiendo');
      setRedirecting(true);
      router.replace('/dashboard/onboarding');
      return;
    }

    // Si está en onboarding pero ya no lo necesita, redirigir al dashboard
    if (!necesitaOnboarding() && pathname.includes('/dashboard/onboarding')) {
      console.log('✅ Onboarding completado - redirigiendo al dashboard');
      setRedirecting(true);
      router.replace('/dashboard');
      return;
    }

    // Todo está bien
    console.log('✅ Usuario y empresa listos - mostrando dashboard');
    setRedirecting(false);

  }, [user, loading, empresaActual, router, pathname, necesitaOnboarding, redirecting])

  // Mostrar loading mientras se cargan los datos iniciales
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Cargando tu dashboard...</p>
          <div className="text-sm text-gray-500">
            {!user ? 'Verificando autenticación...' : 
             !empresaActual ? 'Cargando datos de empresa...' : 
             'Preparando dashboard...'}
          </div>
        </div>
      </div>
    )
  }

  // Mostrar loading mientras se está redirigiendo
  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Redirigiendo...</p>
        </div>
      </div>
    )
  }

  // Si no hay usuario después de cargar, mostrar mensaje (edge case)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Sesión no válida</h2>
          <p className="text-gray-600">
            Por favor, inicia sesión nuevamente.
          </p>
          <button 
            onClick={() => router.push('/login')} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ir al Login
          </button>
        </div>
      </div>
    )
  }

  // Si necesita onboarding, mostrar mensaje mientras redirige
  if (necesitaOnboarding()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Configurando tu empresa...</p>
          <button 
            onClick={() => router.push('/dashboard/onboarding')} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ir a Configuración
          </button>
        </div>
      </div>
    )
  }

  // Si no hay empresa actual, mostrar mensaje de espera
  if (!empresaActual) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
            <Loader2 className="h-8 w-8 text-yellow-600 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Cargando empresa</h2>
          <p className="text-gray-600">
            Estamos preparando los datos de tu empresa. Esto puede tomar unos momentos.
          </p>
          <div className="flex gap-2 justify-center">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </button>
            <button 
              onClick={() => router.push('/dashboard/onboarding')} 
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Configurar Empresa
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Todo listo - mostrar dashboard completo
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