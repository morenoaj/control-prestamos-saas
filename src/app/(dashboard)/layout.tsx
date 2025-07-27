// src/app/(dashboard)/layout.tsx - VERSIÓN CORREGIDA
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

  useEffect(() => {
    console.log('🔍 Dashboard Layout - Estado:', {
      loading,
      user: user?.email,
      empresaActual: empresaActual?.nombre,
      necesitaOnboarding: necesitaOnboarding()
    });

    // Solo redirigir si ya terminó de cargar
    if (!loading) {
      if (!user) {
        console.log('❌ No hay usuario - redirigiendo a login');
        router.replace('/login');
      } else if (necesitaOnboarding()) {
        console.log('⚠️ Usuario necesita onboarding');
        router.replace('/dashboard/onboarding');
      } else if (user && empresaActual) {
        console.log('✅ Usuario y empresa listos - mostrando dashboard');
      }
    }
  }, [user, loading, empresaActual, router, necesitaOnboarding])

  // Mostrar loading mientras se cargan los datos
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

  // Si no hay usuario después de cargar, no mostrar nada (se redirigirá)
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

  // Si necesita onboarding, no mostrar nada (se redirigirá)
  if (necesitaOnboarding()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Redirigiendo al onboarding...</p>
        </div>
      </div>
    )
  }

  // Si no hay empresa actual, mostrar mensaje
  if (!empresaActual) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
            <Loader2 className="h-8 w-8 text-yellow-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Configurando empresa</h2>
          <p className="text-gray-600">
            Estamos preparando los datos de tu empresa. Esto puede tomar unos momentos.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // Mostrar dashboard completo
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