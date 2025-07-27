// src/app/(dashboard)/dashboard/page.tsx
'use client'

import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  CreditCard, 
  DollarSign, 
  TrendingUp,
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Plus
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { usuario, empresaActual } = useAuth()

  // Datos simulados - en producción vendrían de Firebase
  const stats = {
    totalClientes: 156,
    prestamosActivos: 89,
    montoTotal: 487500,
    pagosHoy: 15,
    pagosPendientes: 23,
    montoRecaudado: 45800,
    tasaRecuperacion: 94.5
  }

  const prestamosRecientes = [
    {
      id: 'P-001',
      cliente: 'María González',
      monto: 5000,
      fechaVencimiento: '2025-01-30',
      estado: 'activo'
    },
    {
      id: 'P-002', 
      cliente: 'Carlos Ruiz',
      monto: 3500,
      fechaVencimiento: '2025-02-15',
      estado: 'atrasado'
    },
    {
      id: 'P-003',
      cliente: 'Ana López',
      monto: 8000,
      fechaVencimiento: '2025-02-01',
      estado: 'activo'
    }
  ]

  const pagosProximos = [
    {
      cliente: 'Roberto Silva',
      monto: 850,
      fecha: '2025-01-27',
      telefono: '+507 6000-0001'
    },
    {
      cliente: 'Carmen Díaz',
      monto: 1200,
      fecha: '2025-01-28',
      telefono: '+507 6000-0002'
    },
    {
      cliente: 'Luis Martín',
      monto: 750,
      fecha: '2025-01-29',
      telefono: '+507 6000-0003'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            ¡Bienvenido, {usuario?.nombre}! 👋
          </h1>
          <p className="text-gray-600 mt-2">
            Aquí tienes un resumen de {empresaActual?.nombre}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Link href="/dashboard/prestamos/nuevo">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Préstamo
            </Button>
          </Link>
          <Link href="/dashboard/clientes/nuevo">
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Cliente
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Clientes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Clientes
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalClientes}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +12% vs mes anterior
            </div>
          </CardContent>
        </Card>

        {/* Préstamos Activos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Préstamos Activos
            </CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.prestamosActivos}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +8% vs mes anterior
            </div>
          </CardContent>
        </Card>

        {/* Monto Total */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Cartera Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ${stats.montoTotal.toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +15% vs mes anterior
            </div>
          </CardContent>
        </Card>

        {/* Tasa de Recuperación */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Tasa Recuperación
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.tasaRecuperacion}%</div>
            <div className="flex items-center text-xs text-red-600 mt-1">
              <ArrowDownRight className="h-3 w-3 mr-1" />
              -2% vs mes anterior
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Préstamos Recientes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Préstamos Recientes</CardTitle>
                <CardDescription>Últimos préstamos registrados</CardDescription>
              </div>
              <Link href="/dashboard/prestamos">
                <Button variant="outline" size="sm">Ver todos</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {prestamosRecientes.map((prestamo) => (
                <div key={prestamo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      prestamo.estado === 'activo' ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-900">{prestamo.cliente}</p>
                      <p className="text-sm text-gray-500">{prestamo.id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">${prestamo.monto.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">{prestamo.fechaVencimiento}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pagos Próximos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pagos Próximos</CardTitle>
                <CardDescription>Próximos 3 días</CardDescription>
              </div>
              <Link href="/dashboard/pagos">
                <Button variant="outline" size="sm">Ver todos</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pagosProximos.map((pago, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-4 h-4 text-orange-600" />
                    <div>
                      <p className="font-medium text-gray-900">{pago.cliente}</p>
                      <p className="text-sm text-gray-500">{pago.telefono}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">${pago.monto}</p>
                    <p className="text-sm text-orange-600">{pago.fecha}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen del Día */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Hoy</CardTitle>
          <CardDescription>Actividad del día {new Date().toLocaleDateString('es-PA')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.pagosHoy}</p>
                <p className="text-sm text-gray-600">Pagos recibidos</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.pagosPendientes}</p>
                <p className="text-sm text-gray-600">Pagos pendientes</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">${stats.montoRecaudado.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Total recaudado</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            Alertas Importantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-red-800">5 préstamos vencidos requieren atención</span>
              </div>
              <Link href="/dashboard/prestamos?filtro=vencidos">
                <Button variant="outline" size="sm" className="text-red-600 border-red-300">
                  Ver detalles
                </Button>
              </Link>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span className="text-yellow-800">Plan Premium vence en 15 días</span>
              </div>
              <Link href="/dashboard/configuracion/plan">
                <Button variant="outline" size="sm" className="text-yellow-600 border-yellow-300">
                  Renovar
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}