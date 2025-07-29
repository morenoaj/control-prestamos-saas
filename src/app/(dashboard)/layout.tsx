// src/app/(dashboard)/layout.tsx - SIMPLIFICADO
'use client'

import { usePathname } from 'next/navigation'
import { DashboardSidebar } from '@/components/layout/DashboardSidebar'
import { DashboardHeader } from '@/components/layout/DashboardHeader'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Si está en onboarding, mostrar sin sidebar/header
  if (pathname === '/onboarding') {
    return <>{children}</>
  }

  // Para rutas normales del dashboard, mostrar layout completo
  // RedirectManager se encarga de verificar acceso
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