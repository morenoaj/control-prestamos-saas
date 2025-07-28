// src/app/(auth)/layout.tsx - SIN REDIRECCIONES
'use client'

import { useAuth } from '@/context/AuthContext'
import { Loader2 } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { loading, initialized } = useAuth()

  // Solo mostrar loading si no está inicializado
  if (!initialized && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  // RedirectManager se encarga de las redirecciones
  return <>{children}</>
}