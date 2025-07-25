// src/app/(dashboard)/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { 
  Users, 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Plus
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'

// Datos de ejemplo - luego se conectarán a Firebase
const statsData = {
  totalClientes: 125,
  clientesActivos: 98,
  totalPrestamos: 45,
  prestamosActivos: 32,
  prestamosVencidos: 8,
  capitalPrestado: 125000,
  capitalRecuperado: 87500,
  interesesGenerados: 15750,
  pagosHoy: 5,
  pagosPendientes: 12
}

const recentActivity = [
  {
    id: 1,
    type: 'pago',
    description: 'Pago recibido de María González',
    amount: 350,
    time: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
    status: 'completed'
  },
  {
    id: 2,
    type: 'prestamo',
    description: 'Nuevo préstamo aprobado para Carlos Ruiz',
    amount: 2500,
    time: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    status: 'active'
  },
  {
    id: 3,
    type: 'cliente',
    description: 'Nuevo cliente registrado: Ana López',
    amount: 0,
    time: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    status: 'new'
  },
  {
    id: 4,
    type: 'pago',
    description: 'Pago vencido - Luis Mendoza',
    amount: 450,
    time: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    status: 'overdue'
  }
]

const upcomingPayments = [
  {
    id: 1,
    cliente: 'María González',
    monto: 350,
    fecha: new Date(Date.now() + 1000 * 60 * 60 * 24), // tomorrow
    prestamo: 'PRES-2025-001'
  },
  {
    id: 2,
    cliente: 'Carlos Ruiz',
    monto: 625,
    fecha: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2), // 2 days
    prestamo: 'PRES-2025-002'
  },
  {
    id: 3,
    cliente: 'Ana López',
    monto: 275,
    fecha: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // 3 days
    prestamo: 'PRES-2025-003'
  }
]

export default function DashboardPage() {
  const { empresaActual, rolActual } = useAuth()
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const getTimeOfDay = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col space-y-2 md:flex-row md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {getTimeOfDay()}! 👋
          </h1>
          <p className="text-muted-foreground">
            Aquí tienes un resumen de tu negocio en {empresaActual?.nombre}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button asChild>
            <Link href="/dashboard/prestamos/nuevo">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Préstamo
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/clientes/nuevo">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.totalClientes}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{statsData.clientesActivos} activos</span>
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Préstamos Activos</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.prestamosActivos}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-600">{statsData.prestamosVencidos} vencidos</span>
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capital Prestado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(statsData.capitalPrestado)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">
                <ArrowUpRight className="inline h-3 w-3" />
                {formatCurrency(statsData.capitalRecuperado)} recuperado
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Intereses Generados</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(statsData.interesesGenerados)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">
                <ArrowUpRight className="inline h-3 w-3" />
                +12% vs mes anterior
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Clock className="mr-2 h-5 w-5 text-orange-500" />
              Pagos de Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{statsData.pagosHoy}</div>
            <p className="text-sm text-muted-foreground">
              {statsData.pagosPendientes} pagos pendientes
            </p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link href="/dashboard/pagos">Ver Todos</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />
              Pagos Vencidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{statsData.prestamosVencidos}</div>
            <p className="text-sm text-muted-foreground">
              Requieren atención inmediata
            </p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link href="/dashboard/prestamos?status=vencido">Ver Vencidos</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
              Tasa de Recuperación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {Math.round((statsData.capitalRecuperado / statsData.capitalPrestado) * 100)}%
            </div>
            <p className="text-sm text-muted-foreground">
              Excelente gestión de cobranza
            </p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link href="/dashboard/reportes">Ver Reportes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Upcoming Payments */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>
              Últimas transacciones y eventos en tu sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full ${
                    activity.status === 'completed' ? 'bg-green-100 text-green-600' :
                    activity.status === 'active' ? 'bg-blue-100 text-blue-600' :
                    activity.status === 'new' ? 'bg-purple-100 text-purple-600' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {activity.type === 'pago' ? <DollarSign className="h-4 w-4" /> :
                     activity.type === 'prestamo' ? <CreditCard className="h-4 w-4" /> :
                     <Users className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(activity.time, { 
                        hour: 'numeric', 
                        minute: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  {activity.amount > 0 && (
                    <div className="text-sm font-medium">
                      {formatCurrency(activity.amount)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/dashboard/actividad">Ver Toda la Actividad</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Upcoming Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Próximos Pagos</CardTitle>
            <CardDescription>
              Pagos esperados en los próximos días
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between space-x-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {payment.cliente}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment.prestamo} • {formatDate(payment.fecha, { 
                        weekday: 'short',
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                  <div className="text-sm font-medium">
                    {formatCurrency(payment.monto)}
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/dashboard/pagos?filter=upcoming">Ver Todos los Próximos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Footer */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {Math.round(((statsData.totalPrestamos - statsData.prestamosVencidos) / statsData.totalPrestamos) * 100)}%
              </div>
              <p className="text-xs text-muted-foreground">Préstamos al día</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(statsData.capitalPrestado - statsData.capitalRecuperado)}
              </div>
              <p className="text-xs text-muted-foreground">Capital pendiente</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(statsData.interesesGenerados / statsData.capitalPrestado * 100)}%
              </div>
              <p className="text-xs text-muted-foreground">ROI promedio</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(statsData.capitalRecuperado / 30)}
              </div>
              <p className="text-xs text-muted-foreground">Promedio diario</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}