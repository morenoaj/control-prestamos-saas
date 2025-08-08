// src/components/prestamos/CronogramaPagos.tsx
'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Download,
  Calculator
} from 'lucide-react'
import { Prestamo } from '@/types/database'
import { formatCurrency, formatDate } from '@/lib/utils'
import { calcularMontoCuotaFija } from '@/hooks/usePrestamos'

interface CuotaPago {
  numero: number
  fecha: Date
  montoCapital: number
  montoIntereses: number
  montoTotal: number
  saldoRestante: number
  estado: 'pendiente' | 'pagado' | 'atrasado'
  diasAtraso?: number
}

interface CronogramaPagosProps {
  prestamo: Prestamo
  className?: string
}

export function CronogramaPagos({ prestamo, className }: CronogramaPagosProps) {
  // Generar cronograma de pagos
  const cronograma = useMemo(() => {
    const cuotas: CuotaPago[] = []
    const montoCuota = calcularMontoCuotaFija(
      prestamo.monto, 
      prestamo.tasaInteres, 
      prestamo.plazo ?? 0, 
      prestamo.tipoTasa === 'indefinido' ? undefined : prestamo.tipoTasa
    )
    
    // Calcular interés por período
    let tasaPorPeriodo: number
    switch (prestamo.tipoTasa) {
      case 'quincenal':
        tasaPorPeriodo = prestamo.tasaInteres / 24 / 100 // 24 quincenas al año
        break
      case 'mensual':
        tasaPorPeriodo = prestamo.tasaInteres / 12 / 100 // 12 meses al año
        break
      case 'anual':
        tasaPorPeriodo = prestamo.tasaInteres / 100
        break
      default:
        tasaPorPeriodo = prestamo.tasaInteres / 12 / 100
    }

    let saldoRestante = prestamo.monto
    const fechaInicio = prestamo.fechaInicio instanceof Date 
      ? prestamo.fechaInicio 
      : prestamo.fechaInicio.toDate()

    for (let i = 1; i <= (prestamo.plazo ?? 0); i++) {
      // Calcular fecha de la cuota
      const fechaCuota = new Date(fechaInicio)
      
      switch (prestamo.tipoTasa) {
        case 'quincenal':
          fechaCuota.setDate(fechaInicio.getDate() + (i * 15))
          break
        case 'mensual':
          fechaCuota.setMonth(fechaInicio.getMonth() + i)
          break
        case 'anual':
          fechaCuota.setFullYear(fechaInicio.getFullYear() + i)
          break
      }

      // Calcular intereses sobre saldo restante
      const interesesCuota = saldoRestante * tasaPorPeriodo
      const capitalCuota = montoCuota - interesesCuota
      
      // Ajustar última cuota si es necesario
      const capitalFinal = i === prestamo.plazo ? saldoRestante : capitalCuota
      const montoFinal = capitalFinal + interesesCuota
      
      saldoRestante = Math.max(0, saldoRestante - capitalFinal)

      // Determinar estado de la cuota
      const hoy = new Date()
      let estado: CuotaPago['estado'] = 'pendiente'
      let diasAtraso = 0
      
      if (fechaCuota < hoy) {
        estado = 'atrasado'
        diasAtraso = Math.ceil((hoy.getTime() - fechaCuota.getTime()) / (1000 * 60 * 60 * 24))
      }
      
      // TODO: Marcar como pagado si hay registro de pago
      // Esto se implementará cuando tengamos el sistema de pagos

      cuotas.push({
        numero: i,
        fecha: fechaCuota,
        montoCapital: capitalFinal,
        montoIntereses: interesesCuota,
        montoTotal: montoFinal,
        saldoRestante,
        estado,
        diasAtraso: estado === 'atrasado' ? diasAtraso : undefined
      })
    }

    return cuotas
  }, [prestamo])

  // Estadísticas del cronograma
  const estadisticas = useMemo(() => {
    const totalCuotas = cronograma.length
    const cuotasPagadas = cronograma.filter(c => c.estado === 'pagado').length
    const cuotasAtrasadas = cronograma.filter(c => c.estado === 'atrasado').length
    const cuotasPendientes = cronograma.filter(c => c.estado === 'pendiente').length
    
    const totalIntereses = cronograma.reduce((sum, c) => sum + c.montoIntereses, 0)
    const totalPagar = cronograma.reduce((sum, c) => sum + c.montoTotal, 0)
    const progreso = totalCuotas > 0 ? (cuotasPagadas / totalCuotas) * 100 : 0

    return {
      totalCuotas,
      cuotasPagadas,
      cuotasAtrasadas,
      cuotasPendientes,
      totalIntereses,
      totalPagar,
      progreso
    }
  }, [cronograma])

  const getEstadoColor = (estado: CuotaPago['estado']) => {
    switch (estado) {
      case 'pagado': return 'bg-green-100 text-green-800'
      case 'atrasado': return 'bg-red-100 text-red-800'
      case 'pendiente': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getEstadoIcon = (estado: CuotaPago['estado']) => {
    switch (estado) {
      case 'pagado': return <CheckCircle className="h-4 w-4" />
      case 'atrasado': return <AlertCircle className="h-4 w-4" />
      case 'pendiente': return <Clock className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const exportarCronograma = () => {
    // TODO: Implementar exportación a PDF/Excel
    console.log('Exportar cronograma:', cronograma)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header del Cronograma */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Cronograma de Pagos - {prestamo.numero}
              </CardTitle>
              <CardDescription>
                Detalle de cuotas y calendario de pagos del préstamo
              </CardDescription>
            </div>
            <Button variant="outline" onClick={exportarCronograma}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Estadísticas del Cronograma */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Cuotas</p>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.totalCuotas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Cuotas Pagadas</p>
                <p className="text-2xl font-bold text-green-600">{estadisticas.cuotasPagadas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Cuotas Atrasadas</p>
                <p className="text-2xl font-bold text-red-600">{estadisticas.cuotasAtrasadas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Intereses</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(estadisticas.totalIntereses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Progreso */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Progreso del Préstamo</h3>
            <span className="text-sm font-medium text-gray-600">
              {estadisticas.progreso.toFixed(1)}% completado
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${estadisticas.progreso}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>{estadisticas.cuotasPagadas} de {estadisticas.totalCuotas} cuotas pagadas</span>
            <span>{formatCurrency(prestamo.monto)} capital inicial</span>
          </div>
        </CardContent>
      </Card>

      {/* Resumen Financiero */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Resumen Financiero
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Capital Inicial</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(prestamo.monto)}</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Total Intereses</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(estadisticas.totalIntereses)}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Total a Pagar</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(estadisticas.totalPagar)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla del Cronograma */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Cuotas</CardTitle>
          <CardDescription>
            Cronograma detallado con fechas, montos y estados de cada cuota
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Fecha Vencimiento</TableHead>
                  <TableHead className="text-right">Capital</TableHead>
                  <TableHead className="text-right">Intereses</TableHead>
                  <TableHead className="text-right">Cuota Total</TableHead>
                  <TableHead className="text-right">Saldo Restante</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cronograma.map((cuota) => (
                  <TableRow 
                    key={cuota.numero}
                    className={`${
                      cuota.estado === 'atrasado' ? 'bg-red-50' :
                      cuota.estado === 'pagado' ? 'bg-green-50' : ''
                    }`}
                  >
                    <TableCell className="font-medium">{cuota.numero}</TableCell>
                    <TableCell>
                      <div>
                        {formatDate(cuota.fecha)}
                        {cuota.diasAtraso && cuota.diasAtraso > 0 && (
                          <div className="text-xs text-red-600 mt-1">
                            {cuota.diasAtraso} días de atraso
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(cuota.montoCapital)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {formatCurrency(cuota.montoIntereses)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(cuota.montoTotal)}
                    </TableCell>
                    <TableCell className="text-right text-gray-600">
                      {formatCurrency(cuota.saldoRestante)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={getEstadoColor(cuota.estado)}>
                        <div className="flex items-center gap-1">
                          {getEstadoIcon(cuota.estado)}
                          <span className="capitalize">{cuota.estado}</span>
                        </div>
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Próximas Cuotas (Solo las próximas 3) */}
      {estadisticas.cuotasPendientes > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Clock className="h-5 w-5" />
              Próximas Cuotas a Vencer
            </CardTitle>
            <CardDescription className="text-blue-600">
              Las siguientes cuotas requieren atención
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cronograma
                .filter(c => c.estado === 'pendiente' || c.estado === 'atrasado')
                .slice(0, 3)
                .map((cuota) => (
                  <div 
                    key={cuota.numero}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      cuota.estado === 'atrasado' 
                        ? 'bg-red-100 border-red-200' 
                        : 'bg-white border-blue-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        cuota.estado === 'atrasado' ? 'bg-red-200' : 'bg-blue-200'
                      }`}>
                        {getEstadoIcon(cuota.estado)}
                      </div>
                      <div>
                        <p className="font-semibold">
                          Cuota #{cuota.numero}
                        </p>
                        <p className="text-sm text-gray-600">
                          Vence: {formatDate(cuota.fecha)}
                        </p>
                        {cuota.diasAtraso && cuota.diasAtraso > 0 && (
                          <p className="text-sm text-red-600 font-medium">
                            ⚠️ {cuota.diasAtraso} días de atraso
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {formatCurrency(cuota.montoTotal)}
                      </p>
                      <Button 
                        size="sm" 
                        className={`mt-2 ${
                          cuota.estado === 'atrasado' 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        {cuota.estado === 'atrasado' ? 'Pagar Ahora' : 'Registrar Pago'}
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notas sobre el Cronograma */}
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Notas importantes:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Las cuotas se calculan con interés simple sobre el saldo restante</li>
              <li>Los pagos atrasados pueden generar intereses moratorios adicionales</li>
              <li>El cronograma se actualiza automáticamente al registrar pagos</li>
              <li>Las fechas pueden variar si coinciden con días festivos o fines de semana</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}