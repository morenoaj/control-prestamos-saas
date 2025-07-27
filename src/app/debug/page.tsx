// src/app/debug/page.tsx - PÁGINA TEMPORAL PARA DEBUG
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'

export default function DebugPage() {
  const router = useRouter()
  const { user, usuario, empresaActual, empresas, loading, necesitaOnboarding } = useAuth()

  const debugInfo = {
    loading,
    user: user ? { 
      uid: user.uid, 
      email: user.email 
    } : null,
    usuario: usuario ? {
      id: usuario.id,
      nombre: usuario.nombre,
      empresas: usuario.empresas,
      empresasLength: usuario.empresas?.length || 0
    } : null,
    empresaActual: empresaActual ? {
      id: empresaActual.id,
      nombre: empresaActual.nombre
    } : null,
    empresasArray: empresas,
    empresasCount: empresas.length,
    necesitaOnboarding: necesitaOnboarding(),
  }

  const forceRedirectToOnboarding = () => {
    console.log('🚀 Forzando redirección a onboarding...')
    router.push('/dashboard/onboarding')
  }

  const forceRedirectToDashboard = () => {
    console.log('🚀 Forzando redirección a dashboard...')
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Auth State</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Estado Actual</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Acciones de Debug</h2>
          <div className="space-y-4">
            <Button 
              onClick={forceRedirectToOnboarding}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              🚀 Forzar Redirección a Onboarding
            </Button>
            
            <Button 
              onClick={forceRedirectToDashboard}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              🏠 Forzar Redirección a Dashboard
            </Button>
            
            <Button 
              onClick={() => window.location.href = '/dashboard/onboarding'}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              🔄 Redirección con window.location
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">URLs de Test</h2>
          <div className="space-y-2">
            <a 
              href="/dashboard/onboarding" 
              className="block text-blue-600 hover:text-blue-800"
            >
              📋 /dashboard/onboarding
            </a>
            <a 
              href="/dashboard" 
              className="block text-blue-600 hover:text-blue-800"
            >
              🏠 /dashboard
            </a>
            <a 
              href="/login" 
              className="block text-blue-600 hover:text-blue-800"
            >
              🔑 /login
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}