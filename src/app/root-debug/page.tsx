// src/app/root-debug/page.tsx - DEBUGGER DE CAUSA RAÍZ
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertTriangle } from 'lucide-react'

export default function RootDebugPage() {
  const authState = useAuth()
  const [executionLog, setExecutionLog] = useState<string[]>([])
  const [renderCount, setRenderCount] = useState(0)

  // Contar renders
  useEffect(() => {
    setRenderCount(prev => prev + 1)
  })

  // Log detallado del estado
  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = `[${timestamp}] Render #${renderCount} - Loading: ${authState.loading} | User: ${!!authState.user} | Usuario: ${!!authState.usuario} | Empresa: ${!!authState.empresaActual} | NecesitaOnboarding: ${authState.user && authState.usuario ? authState.necesitaOnboarding() : 'N/A'}`
    
    setExecutionLog(prev => [logEntry, ...prev.slice(0, 19)])
    
    console.log('🔍 ROOT DEBUG:', {
      renderCount,
      timestamp,
      authState: {
        loading: authState.loading,
        user: authState.user ? {
          uid: authState.user.uid,
          email: authState.user.email
        } : null,
        usuario: authState.usuario ? {
          id: authState.usuario.id,
          nombre: authState.usuario.nombre,
          empresasRaw: authState.usuario.empresas,
          empresasLength: authState.usuario.empresas?.length
        } : null,
        empresaActual: authState.empresaActual ? {
          id: authState.empresaActual.id,
          nombre: authState.empresaActual.nombre
        } : null,
        empresasArray: authState.empresas.length,
        necesitaOnboarding: authState.user && authState.usuario ? authState.necesitaOnboarding() : 'N/A'
      }
    })
  }, [authState.loading, authState.user, authState.usuario, authState.empresaActual, authState.empresas, renderCount])

  // Análisis de la función necesitaOnboarding
  const analyzeOnboardingFunction = () => {
    console.log('🔬 ANÁLISIS DETALLADO DE necesitaOnboarding:')
    
    const { user, usuario } = authState
    
    console.log('Step 1 - Verificar usuario:', {
      hasUser: !!user,
      userDetail: user ? { uid: user.uid, email: user.email } : null
    })
    
    if (!user) {
      console.log('❌ No hay usuario - necesitaOnboarding debería ser false')
      return false
    }
    
    console.log('Step 2 - Verificar perfil:', {
      hasUsuario: !!usuario,
      usuarioDetail: usuario ? { 
        id: usuario.id, 
        nombre: usuario.nombre,
        empresas: usuario.empresas 
      } : null
    })
    
    if (!usuario) {
      console.log('❌ No hay perfil - necesitaOnboarding debería ser false (estado transitorio)')
      return false
    }
    
    console.log('Step 3 - Verificar empresas:', {
      empresasRaw: usuario.empresas,
      isArray: Array.isArray(usuario.empresas),
      length: usuario.empresas?.length,
      isEmpty: !usuario.empresas || usuario.empresas.length === 0
    })
    
    const hasEmpresas = usuario.empresas && Array.isArray(usuario.empresas) && usuario.empresas.length > 0
    const result = !hasEmpresas
    
    console.log('Step 4 - Resultado final:', {
      hasEmpresas,
      necesitaOnboarding: result
    })
    
    return result
  }

  // Test manual de la función
  const manualOnboardingCheck = analyzeOnboardingFunction()
  const authOnboardingCheck = authState.user && authState.usuario ? authState.necesitaOnboarding() : null

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔬 Root Cause Debugger
          </h1>
          <p className="text-gray-600">
            Diagnóstico profundo del problema de redirección
          </p>
          <p className="text-sm text-gray-500">
            Renders: {renderCount}
          </p>
        </div>

        {/* Estado Raw */}
        <Card>
          <CardHeader>
            <CardTitle>Estado Raw del AuthContext</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Estados Primitivos:</h4>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
{JSON.stringify({
  loading: authState.loading,
  hasUser: !!authState.user,
  hasUsuario: !!authState.usuario,
  hasEmpresaActual: !!authState.empresaActual,
  empresasCount: authState.empresas.length
}, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Usuario Empresas:</h4>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
{JSON.stringify(authState.usuario?.empresas || null, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Análisis de necesitaOnboarding */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">
              <AlertTriangle className="h-5 w-5 inline mr-2" />
              Análisis: necesitaOnboarding()
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Resultado del AuthContext:</h4>
                  <div className={`text-lg font-bold ${authOnboardingCheck ? 'text-red-600' : 'text-green-600'}`}>
                    {authOnboardingCheck === null ? 'N/A (no hay datos)' : 
                     authOnboardingCheck ? 'SÍ NECESITA ONBOARDING' : 'NO NECESITA ONBOARDING'}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold">Resultado Manual:</h4>
                  <div className={`text-lg font-bold ${manualOnboardingCheck ? 'text-red-600' : 'text-green-600'}`}>
                    {manualOnboardingCheck ? 'SÍ NECESITA ONBOARDING' : 'NO NECESITA ONBOARDING'}
                  </div>
                </div>
              </div>
              
              {authOnboardingCheck !== manualOnboardingCheck && (
                <div className="bg-red-100 border border-red-300 p-3 rounded">
                  <strong className="text-red-800">⚠️ INCONSISTENCIA DETECTADA:</strong>
                  <p className="text-red-700">
                    El resultado del AuthContext no coincide con el análisis manual. 
                    Esto indica un problema en la función necesitaOnboarding().
                  </p>
                </div>
              )}

              <Button 
                onClick={analyzeOnboardingFunction}
                className="w-full bg-yellow-600 hover:bg-yellow-700"
              >
                🔬 Ejecutar Análisis Detallado (Ver Console)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Log de Ejecución */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Log de Ejecución en Tiempo Real</span>
              <Button 
                onClick={() => setExecutionLog([])}
                variant="outline" 
                size="sm"
              >
                Limpiar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-4 rounded font-mono text-xs max-h-64 overflow-auto">
              {executionLog.length === 0 ? (
                <p className="text-gray-500">No hay logs...</p>
              ) : (
                executionLog.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Diagnóstico de Problema */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">🚨 Posibles Causas Raíz</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-red-800">
              <div>
                <h4 className="font-semibold">1. Loop de Re-renders:</h4>
                <p>Si renderCount &gt; 10, hay un loop infinito causado por cambios de estado.</p>
                <p>Renders actuales: <strong>{renderCount}</strong></p>
              </div>
              
              <div>
                <h4 className="font-semibold">2. Estado Inconsistente:</h4>
                <p>Si necesitaOnboarding() cambia constantemente, nunca se estabiliza la redirección.</p>
              </div>
              
              <div>
                <h4 className="font-semibold">3. Múltiples Componentes de Redirección:</h4>
                <p>Varios componentes intentando redirigir al mismo tiempo.</p>
              </div>

              <div>
                <h4 className="font-semibold">4. Problema con useCallback/useMemo:</h4>
                <p>Dependencies incorrectas causan recreación constante de la función.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acciones de Emergencia */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones de Emergencia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={() => window.location.href = '/dashboard/onboarding'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                🚀 Ir Directo a Onboarding
              </Button>
              <Button 
                onClick={() => {
                  localStorage.clear()
                  window.location.href = '/dashboard/onboarding'
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                🧹 Limpiar Todo e Ir a Onboarding
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}