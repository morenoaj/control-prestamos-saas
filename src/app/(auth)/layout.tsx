// src/app/(auth)/layout.tsx - LAYOUT CON REDIRECCIÓN A ONBOARDING
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Loader2 } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, empresaActual, necesitaOnboarding, loading } = useAuth()
  const router = useRouter()
  const [hasRedirected, setHasRedirected] = useState(false)

  useEffect(() => {
    // Solo redirigir si ya terminó de cargar, hay usuario y no ha redirigido aún
    if (!loading && user && !hasRedirected) {
      console.log('🔄 Usuario logueado en auth layout, verificando redirección...', {
        necesitaOnboarding: necesitaOnboarding(),
        empresaActual: !!empresaActual
      })
      
      setHasRedirected(true)
      
      if (necesitaOnboarding()) {
        console.log('➡️ Redirigiendo a onboarding desde auth layout')
        router.replace('/dashboard/onboarding')
      } else if (empresaActual) {
        console.log('➡️ Redirigiendo a dashboard desde auth layout')
        router.replace('/dashboard')
      } else {
        // Dar un poco más de tiempo para que se carguen los datos
        console.log('⏳ Esperando datos de empresa...')
        setTimeout(() => {
          if (necesitaOnboarding()) {
            console.log('➡️ Timeout: Redirigiendo a onboarding')
            router.replace('/dashboard/onboarding')
          } else {
            console.log('➡️ Timeout: Redirigiendo a dashboard')
            router.replace('/dashboard')
          }
        }, 1000) // Reducido de 1500 a 1000ms
      }
    }
  }, [user, empresaActual, necesitaOnboarding, router, loading, hasRedirected])

  // Mostrar loading mientras verifica autenticación
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

  // Si hay usuario y está redirigiendo, mostrar loading específico
  if (user && hasRedirected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">
            {necesitaOnboarding() 
              ? 'Configurando tu empresa...' 
              : 'Accediendo al dashboard...'
            }
          </p>
          <div className="text-sm text-gray-500">
            {necesitaOnboarding() 
              ? 'Te llevaremos al formulario de onboarding' 
              : 'Ya tienes sesión activa'
            }
          </div>
        </div>
      </div>
    )
  }

  // Si no hay usuario o no ha redirigido aún, mostrar las páginas de auth normalmente
  return <>{children}</>
}