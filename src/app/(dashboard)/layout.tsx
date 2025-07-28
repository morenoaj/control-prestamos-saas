// src/app/(dashboard)/layout.tsx - SIN REDIRECCIONES
'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { DashboardSidebar } from '@/components/layout/DashboardSidebar'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, empresaActual, loading, initialized } = useAuth()
  const pathname = usePathname()

  // Mostrar loading si no está inicializado
  if (!initialized && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  // Si está en onboarding, mostrar sin sidebar/header
  if (pathname.includes('/dashboard/onboarding')) {
    return <>{children}</>
  }

  // RedirectManager se encarga de validar acceso
  // Aquí solo mostramos el layout si es apropiado
  if (!user || !empresaActual) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Cargando datos...</p>
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