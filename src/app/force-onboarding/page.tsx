// src/app/force-onboarding/page.tsx - PÁGINA TEMPORAL PARA SALTARSE EL PROBLEMA
'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, Building2 } from 'lucide-react'

export default function ForceOnboardingPage() {
  // Redirección automática después de 3 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('🚀 Auto-redirigiendo a onboarding...')
      window.location.href = '/dashboard/onboarding'
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  const goToOnboarding = () => {
    console.log('🚀 Redirección manual a onboarding...')
    window.location.href = '/dashboard/onboarding'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">¡Vamos a configurar tu empresa! 🏢</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-gray-600">
            Te vamos a llevar al formulario de configuración para crear tu primera empresa.
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={goToOnboarding}
              className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-3"
            >
              <ArrowRight className="h-5 w-5 mr-2" />
              Configurar Mi Empresa Ahora
            </Button>
            
            <p className="text-sm text-gray-500">
              O espera 3 segundos para redirección automática...
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">¿Qué vamos a hacer?</h4>
            <ul className="text-sm text-blue-800 space-y-1 text-left">
              <li>• Elegir un plan (Básico, Premium, Enterprise)</li>
              <li>• Configurar datos de tu empresa</li>
              <li>• Activar tu cuenta</li>
              <li>• ¡Empezar a gestionar préstamos!</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}