// src/app/(dashboard)/dashboard/page.tsx - DASHBOARD SIMPLE PARA TESTING
'use client'

import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Building2, 
  Users, 
  CreditCard, 
  DollarSign, 
  TrendingUp,
  Calendar,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

export default function DashboardPage() {
  const { user, usuario, empresaActual, empresas, loading, necesitaOnboarding } = useAuth()

  // Mostrar estado de loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  // Estado de debug para desarrollo
  const debugInfo = {
    user: user ? {
      email: user.email,
      uid: user.uid,
      emailVerified: user.emailVerified
    } : null,
    usuario: usuario ? {
      id: usuario.id,
      nombre: usuario.nombre,
      empresasCount: usuario.empresas?.length || 0
    } : null,
    empresaActual: empresaActual ? {
      id: empresaActual.id,
      nombre: empresaActual.nombre,
      plan: empresaActual.plan,
      estado: empresaActual.estado
    } : null,
    empresasTotal: empresas.length,
    necesitaOnboarding: necesitaOnboarding()
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Bienvenido de vuelta, {usuario?.nombre || user?.email}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {empresaActual?.nombre}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                Plan {empresaActual?.plan}
              </p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Estado de verificación */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-800 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Usuario Autenticado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-green-600">{user?.email}</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-800 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Perfil de Usuario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-blue-600">{usuario?.nombre}</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-800 flex items-center">
              <Building2 className="h-4 w-4 mr-2" />
              Empresa Activa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-purple-600">{empresaActual?.nombre}</p>
          </CardContent>
        </Card>

        <Card className={`border-gray-200 ${necesitaOnboarding() ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50'}`}>
          <CardHeader className="pb-3">
            <CardTitle className={`text-sm font-medium flex items-center ${
              necesitaOnboarding() ? 'text-yellow-800' : 'text-gray-800'
            }`}>
              {necesitaOnboarding() ? (
                <AlertCircle className="h-4 w-4 mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Estado Onboarding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-xs ${necesitaOnboarding() ? 'text-yellow-600' : 'text-gray-600'}`}>
              {necesitaOnboarding() ? 'Pendiente' : 'Completado'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Sin clientes registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Préstamos Activos</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Sin préstamos activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos del Mes</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0</div>
            <p className="text-xs text-muted-foreground">Sin pagos este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crecimiento</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+0%</div>
            <p className="text-xs text-muted-foreground">Empresa recién creada</p>
          </CardContent>
        </Card>
      </div>

      {/* Acciones Rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-600" />
              Acciones Rápidas
            </CardTitle>
            <CardDescription>
              Comienza a usar el sistema con estas acciones básicas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full justify-start" variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Registrar Primer Cliente
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <CreditCard className="h-4 w-4 mr-2" />
              Crear Primer Préstamo
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <DollarSign className="h-4 w-4 mr-2" />
              Registrar Pago
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-green-600" />
              Próximos Vencimientos
            </CardTitle>
            <CardDescription>
              Pagos que vencen en los próximos días
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">No hay vencimientos próximos</p>
              <p className="text-xs">Los vencimientos aparecerán aquí cuando tengas préstamos activos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estado del Sistema */}
      <Card>
        <CardHeader>
          <CardTitle>Estado del Sistema</CardTitle>
          <CardDescription>
            Información de depuración para desarrollo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="text-xs text-gray-700 overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Bienvenida para nuevos usuarios */}
      {empresaActual && (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardHeader>
            <CardTitle className="text-blue-900">
              🎉 ¡Bienvenido a {empresaActual.nombre}!
            </CardTitle>
            <CardDescription className="text-blue-700">
              Tu empresa ha sido configurada exitosamente con el plan {empresaActual.plan}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-blue-800">
                Ahora puedes comenzar a gestionar tus préstamos de forma profesional. 
                Te recomendamos comenzar registrando tus primeros clientes.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Users className="h-4 w-4 mr-2" />
                  Agregar Cliente
                </Button>
                <Button size="sm" variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                  <Building2 className="h-4 w-4 mr-2" />
                  Configurar Empresa
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}