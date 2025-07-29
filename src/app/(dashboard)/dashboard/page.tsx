// src/app/(dashboard)/dashboard/page.tsx - ULTRA SIMPLE
'use client'

import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  Building2, 
  Users, 
  CreditCard, 
  DollarSign, 
  TrendingUp,
  CheckCircle,
  Loader2,
  Calculator,
  AlertTriangle
} from 'lucide-react'

export default function DashboardPage() {
  const { user, usuario, empresaActual, empresas, loading, initialized } = useAuth()

  // Loading simple
  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Calculator className="h-8 w-8 text-white" />
            </div>
            <Loader2 className="h-6 w-6 animate-spin absolute -bottom-1 -right-1 text-blue-600 bg-white rounded-full" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Cargando dashboard...</h3>
        </div>
      </div>
    )
  }

  // Sin usuario - mostrar mensaje y enlace
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-red-900">Acceso Restringido</CardTitle>
            <CardDescription className="text-red-700">
              Necesitas iniciar sesión para acceder al dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full bg-red-600 hover:bg-red-700">
                Ir a Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Sin empresa - mostrar mensaje y enlace
  if (!empresaActual || !empresas.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-yellow-600" />
            </div>
            <CardTitle className="text-yellow-900">Configuración Pendiente</CardTitle>
            <CardDescription className="text-yellow-700">
              Necesitas configurar una empresa para acceder al dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/onboarding">
              <Button className="w-full bg-yellow-600 hover:bg-yellow-700">
                Configurar Empresa
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Volver al Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ¡DASHBOARD EXITOSO!
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header sin sidebar complexity */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Calculator className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Control de Préstamos</h1>
                <p className="text-sm text-gray-500">{empresaActual.nombre}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {usuario?.nombre || user.email}
              </span>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Logout
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Success Message */}
          <Card className="border-green-200 bg-gradient-to-r from-green-50 to-blue-50">
            <CardHeader>
              <CardTitle className="text-green-900 flex items-center">
                <CheckCircle className="h-6 w-6 mr-2" />
                🎉 ¡Éxito! Llegaste al Dashboard
              </CardTitle>
              <CardDescription className="text-green-700">
                Todo está funcionando correctamente. El sistema de autenticación y manejo de empresas funciona perfecto.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-green-100 rounded-lg">
                  <strong className="text-green-800">✅ Usuario:</strong>
                  <br />
                  <span className="text-green-700">{user.email}</span>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <strong className="text-green-800">✅ Empresa:</strong>
                  <br />
                  <span className="text-green-700">{empresaActual.nombre}</span>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <strong className="text-green-800">✅ Plan:</strong>
                  <br />
                  <span className="text-green-700 capitalize">{empresaActual.plan}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
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

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
              <CardDescription>Comienza a usar el sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button className="h-20 flex-col space-y-2">
                  <Users className="h-6 w-6" />
                  <span>Agregar Cliente</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col space-y-2">
                  <CreditCard className="h-6 w-6" />
                  <span>Crear Préstamo</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col space-y-2">
                  <DollarSign className="h-6 w-6" />
                  <span>Registrar Pago</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Navigation Links */}
          <Card>
            <CardHeader>
              <CardTitle>Navegación</CardTitle>
              <CardDescription>Enlaces para probar diferentes secciones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Link href="/"><Button variant="outline" size="sm">Inicio</Button></Link>
                <Link href="/login"><Button variant="outline" size="sm">Login</Button></Link>
                <Link href="/register"><Button variant="outline" size="sm">Register</Button></Link>
                <Link href="/onboarding"><Button variant="outline" size="sm">Onboarding</Button></Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}