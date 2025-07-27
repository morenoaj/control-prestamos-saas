// src/app/(auth)/layout.tsx - CON RUTA CORREGIDA
'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Loader2 } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, necesitaOnboarding } = useAuth()
  const router = useRouter()
  const redirected = useRef(false)

  useEffect(() => {
    // No hacer nada mientras está cargando o ya redirigió
    if (loading || redirected.current) return

    // Si hay usuario logueado, redirigir según su estado
    if (user) {
      console.log('🔄 Usuario logueado en AuthLayout, redirigiendo...')
      redirected.current = true
      
      if (necesitaOnboarding()) {
        console.log('➡️ Redirigiendo a onboarding desde AuthLayout')
        router.replace('/dashboard/onboarding')  // ← Aquí corregí la ruta
      } else {
        console.log('➡️ Redirigiendo a dashboard desde AuthLayout')
        router.replace('/dashboard')
      }
    }
  }, [user, loading, necesitaOnboarding, router])

  // Reset redirect flag when user changes
  useEffect(() => {
    redirected.current = false
  }, [user?.uid])

  // Mostrar loading mientras verifica
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  // Si hay usuario, mostrar loading específico mientras redirige
  if (user && redirected.current) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Redirigiendo...</p>
        </div>
      </div>
    )
  }

  // Si no hay usuario, mostrar las páginas de auth
  return <>{children}</>
}