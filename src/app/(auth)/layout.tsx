// src/app/(dashboard)/layout.tsx - CON REDIRECCIÓN FORZADA
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
    console.log('🔍 [DASHBOARD LAYOUT] Estado:', {
      loading,
      user: user?.email,
      empresaActual: empresaActual?.nombre,
      necesitaOnboarding: necesitaOnboarding()
    })

    if (!loading) {
      if (!user) {
        console.log('❌ [DASHBOARD] Sin usuario - redirigiendo a login')
        window.location.href = '/login'
      } else if (necesitaOnboarding()) {
        console.log('🚀 [DASHBOARD] Necesita onboarding - redirigiendo')
        window.location.href = '/dashboard/onboarding'
      } else if (!empresaActual) {
        console.log('⏳ [DASHBOARD] Sin empresa - redirigiendo a onboarding')
        window.location.href = '/dashboard/onboarding'
      } else {
        console.log('✅ [DASHBOARD] Todo listo - mostrando dashboard')
      }
    }
  }, [user, loading, empresaActual, necesitaOnboarding, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Cargando tu dashboard...</p>
        </div>
      </div>
    )
  }

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

  if (necesitaOnboarding() || !empresaActual) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Redirigiendo al onboarding...</p>
          <button 
            onClick={() => window.location.href = '/dashboard/onboarding'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Ir a Onboarding
          </button>
        </div>
      </div>
    )
  }

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