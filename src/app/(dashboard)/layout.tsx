// src/app/(dashboard)/layout.tsx - VERSIÓN MÍNIMA SIN LOOPS
'use client'

import { useEffect, useRef } from 'react'
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
  const redirected = useRef(false)

  useEffect(() => {
    if (loading || redirected.current) return

    // Si no hay usuario, redirigir a login
    if (!user) {
      console.log('❌ No hay usuario - redirigiendo a login')
      redirected.current = true
      router.replace('/login')
      return
    }

    // Si necesita onboarding
    if (necesitaOnboarding()) {
      console.log('⚠️ Usuario necesita onboarding - redirigiendo')
      redirected.current = true
      router.replace('/dashboard/onboarding')
      return
    }
  }, [user, loading, necesitaOnboarding, router])

  // Reset redirect flag when user changes
  useEffect(() => {
    redirected.current = false
  }, [user?.uid])

  // Mostrar loading mientras carga
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  // Si no hay usuario
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

  // Si necesita onboarding
  if (necesitaOnboarding()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Configurando tu empresa...</p>
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