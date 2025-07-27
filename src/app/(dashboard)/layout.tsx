// src/app/(dashboard)/layout.tsx - VERSIÓN SIMPLIFICADA
'use client'

import { useEffect } from 'react'
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

  useEffect(() => {
    // No hacer nada mientras está cargando
    if (loading) return

    // Si no hay usuario, redirigir a login
    if (!user) {
      console.log('❌ No hay usuario en DashboardLayout - redirigiendo a login')
      router.replace('/login')
      return
    }

    console.log('🔍 DashboardLayout - Estado:', {
      pathname,
      user: user.email,
      necesitaOnboarding: necesitaOnboarding(),
      empresaActual: empresaActual?.nombre
    })

    // Si está en onboarding, no hacer nada (permitir que se muestre)
    if (pathname.includes('/dashboard/onboarding')) {
      console.log('✅ Usuario en página de onboarding - permitiendo acceso')
      return
    }

    // Si necesita onboarding y NO está en onboarding, redirigir
    if (necesitaOnboarding()) {
      console.log('⚠️ Usuario necesita onboarding - redirigiendo desde DashboardLayout')
      router.replace('/dashboard/onboarding')
      return
    }

  }, [user, loading, necesitaOnboarding, router, pathname])

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

  // Si está en onboarding, mostrar sin sidebar/header
  if (pathname.includes('/dashboard/onboarding')) {
    console.log('📋 Mostrando página de onboarding sin layout completo')
    return <>{children}</>
  }

  // Si necesita onboarding pero no está en onboarding, mostrar loading
  if (necesitaOnboarding()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Configurando tu empresa...</p>
          <p className="text-sm text-gray-500">Redirigiendo a configuración...</p>
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
  console.log('✅ Mostrando dashboard completo con sidebar y header')
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