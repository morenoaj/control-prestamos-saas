// ✅ ARCHIVO 2: src/components/prestamos/PrestamoCard.tsx - CORREGIDO
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Calendar, 
  DollarSign, 
  User, 
  MoreHorizontal,
  AlertTriangle,
  CheckCircle,
  Clock,
  Infinity,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'
import { Prestamo, Cliente } from '@/types/database'

// ✅ FUNCIÓN MEJORADA PARA FORMATEAR MONEDA (maneja NaN, undefined, null)
const formatCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '$0.00'
  }
  
  const validAmount = Number(amount)
  if (isNaN(validAmount) || validAmount < 0) {
    return '$0.00'
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(validAmount)
}

// ✅ FUNCIÓN MEJORADA PARA CALCULAR PRÓXIMA FECHA QUINCENAL
const calcularProximaFechaQuincenal = (fechaActual: Date = new Date()): Date => {
  const fecha = new Date(fechaActual)
  const dia = fecha.getDate()
  
  if (dia < 15) {
    fecha.setDate(15)
  } else if (dia === 15) {
    fecha.setDate(30)
    if (fecha.getDate() !== 30) {
      fecha.setDate(0) // Último día del mes para febrero
    }
  } else if (dia < 30) {
    fecha.setDate(30)
    if (fecha.getDate() !== 30) {
      fecha.setDate(0) // Último día del mes
    }
  } else {
    fecha.setMonth(fecha.getMonth() + 1, 15)
  }
  
  return fecha
}

// ✅ FUNCIÓN PARA VALIDAR SI UNA FECHA ES VÁLIDA
const validarFecha = (fecha: any): Date | null => {
  if (!fecha) return null
  
  try {
    if (fecha instanceof Date) {
      return isNaN(fecha.getTime()) ? null : fecha
    }
    if (fecha.toDate && typeof fecha.toDate === 'function') {
      const convertida = fecha.toDate()
      return isNaN(convertida.getTime()) ? null : convertida
    }
    return null
  } catch {
    return null
  }
}

interface PrestamoCardProps {
  prestamo: Prestamo
  cliente: Cliente
  onEdit?: (prestamo: Prestamo) => void
  onDelete?: (prestamo: Prestamo) => void
  onViewDetails?: (prestamo: Prestamo) => void
  onRegisterPayment?: (prestamo: Prestamo) => void
}

export function PrestamoCard({ 
  prestamo, 
  cliente, 
  onEdit, 
  onDelete, 
  onViewDetails, 
  onRegisterPayment 
}: PrestamoCardProps) {

  // ✅ VERIFICAR SI ES PRÉSTAMO INDEFINIDO (con múltiples verificaciones)
  const esPrestamoIndefinido = prestamo.esPlazoIndefinido || 
                              prestamo.tipoTasa === 'indefinido' || 
                              !prestamo.plazo || 
                              prestamo.plazo <= 0

  // ✅ CALCULAR PRÓXIMO PAGO REAL CON VALIDACIONES
  const calcularProximoPagoReal = () => {
    // Validar datos básicos
    const saldoCapital = prestamo.saldoCapital || prestamo.monto || 0
    const tasaInteres = prestamo.tasaInteres || 0

    if (saldoCapital <= 0 || tasaInteres <= 0) {
      return {
        monto: 0,
        fecha: new Date(),
        esValido: false,
        mensaje: 'Datos insuficientes'
      }
    }

    if (esPrestamoIndefinido) {
      // ✅ PRÉSTAMOS QUINCENALES INDEFINIDOS
      const interesesQuincenales = saldoCapital * (tasaInteres / 100)
      const fechaProximoPago = calcularProximaFechaQuincenal()

      return {
        monto: interesesQuincenales,
        fecha: fechaProximoPago,
        esValido: true,
        tipo: 'quincenal',
        mensaje: 'Intereses quincenales + abono libre al capital'
      }
    } else {
      // ✅ PRÉSTAMOS CON PLAZO FIJO
      let montoProximoPago = prestamo.montoProximoPago || 0
      let fechaProximoPago = validarFecha(prestamo.fechaProximoPago) || new Date()

      // Si montoProximoPago es inválido, calcular cuota básica
      if (isNaN(montoProximoPago) || montoProximoPago <= 0) {
        const plazo = prestamo.plazo || 1
        montoProximoPago = (saldoCapital + (saldoCapital * tasaInteres / 100)) / plazo
      }

      return {
        monto: montoProximoPago,
        fecha: fechaProximoPago,
        esValido: !isNaN(montoProximoPago) && montoProximoPago > 0,
        tipo: 'fijo',
        mensaje: 'Cuota fija'
      }
    }
  }

  // ✅ OBTENER COLOR DEL BADGE SEGÚN ESTADO
  const getBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'activo': return 'default'
      case 'atrasado': return 'destructive'
      case 'finalizado': return 'secondary'
      case 'pendiente': return 'outline'
      default: return 'default'
    }
  }

  // ✅ OBTENER ICONO SEGÚN ESTADO
  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'activo': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'atrasado': return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'finalizado': return <CheckCircle className="h-4 w-4 text-gray-600" />
      case 'pendiente': return <Clock className="h-4 w-4 text-yellow-600" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  // ✅ CALCULAR DATOS DEL PRÓXIMO PAGO
  const proximoPago = calcularProximoPagoReal()

  return (
    <Card className={`transition-all hover:shadow-md ${
      prestamo.estado === 'atrasado' ? 'border-red-200 bg-red-50' : 
      prestamo.estado === 'finalizado' ? 'border-gray-200 bg-gray-50' : 
      'border-gray-200'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              {prestamo.numero}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <User className="h-4 w-4" />
              {cliente.nombre} {cliente.apellido}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getBadgeVariant(prestamo.estado)} className="flex items-center gap-1">
              {getStatusIcon(prestamo.estado)}
              {prestamo.estado.charAt(0).toUpperCase() + prestamo.estado.slice(1)}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {onViewDetails && (
                  <DropdownMenuItem onClick={() => onViewDetails(prestamo)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalles
                  </DropdownMenuItem>
                )}
                {onRegisterPayment && prestamo.estado !== 'finalizado' && (
                  <DropdownMenuItem onClick={() => onRegisterPayment(prestamo)}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Registrar Pago
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(prestamo)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onDelete && (
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={() => onDelete(prestamo)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ✅ INFORMACIÓN BÁSICA DEL PRÉSTAMO */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Monto:</span>
            <p className="font-semibold text-gray-900">{formatCurrency(prestamo.monto)}</p>
          </div>
          <div>
            <span className="text-gray-600">Saldo:</span>
            <p className="font-semibold text-blue-600">
              {formatCurrency(prestamo.saldoCapital || prestamo.monto)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Tasa:</span>
            <p className="font-semibold">
              {prestamo.tasaInteres}% {esPrestamoIndefinido ? 'quincenal' : prestamo.tipoTasa}
            </p>
          </div>
          <div>
            <span className="text-gray-600">Plazo:</span>
            <p className="font-semibold">
              {esPrestamoIndefinido ? (
                <span className="text-purple-600 flex items-center gap-1">
                  <Infinity className="h-4 w-4" />
                  Indefinido
                </span>
              ) : prestamo.plazo ? (
                `${prestamo.plazo} ${prestamo.tipoTasa}${prestamo.plazo > 1 ? 's' : ''}`
              ) : (
                <span className="text-purple-600 flex items-center gap-1">
                  <Infinity className="h-4 w-4" />
                  Indefinido
                </span>
              )}
            </p>
          </div>
        </div>

        {/* ✅ FECHAS - VENCIMIENTO "INDEFINIDO" PARA PRÉSTAMOS QUINCENALES */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Inicio:</span>
            <p className="font-semibold">
              {validarFecha(prestamo.fechaInicio)?.toLocaleDateString('es-PA') || 'No definida'}
            </p>
          </div>
          <div>
            <span className="text-gray-600">Vencimiento:</span>
            <p className="font-semibold">
              {esPrestamoIndefinido ? (
                <span className="text-purple-600 flex items-center gap-1">
                  <Infinity className="h-4 w-4" />
                  Indefinido
                </span>
              ) : validarFecha(prestamo.fechaVencimiento) ? (
                validarFecha(prestamo.fechaVencimiento)!.toLocaleDateString('es-PA')
              ) : (
                <span className="text-purple-600 flex items-center gap-1">
                  <Infinity className="h-4 w-4" />
                  Indefinido
                </span>
              )}
            </p>
          </div>
        </div>

        {/* ✅ PRÓXIMO PAGO - CON VALORES REALES Y SIN USDNaN */}
        {prestamo.estado !== 'finalizado' && proximoPago.esValido && (
          <Alert className={`border-blue-200 ${proximoPago.monto > 0 ? 'bg-blue-50' : 'bg-yellow-50'}`}>
            <Calendar className={`h-4 w-4 ${proximoPago.monto > 0 ? 'text-blue-600' : 'text-yellow-600'}`} />
            <AlertDescription>
              <div className="space-y-2">
                <div className={`font-semibold ${proximoPago.monto > 0 ? 'text-blue-900' : 'text-yellow-900'}`}>
                  Próximo pago: {formatCurrency(proximoPago.monto)}
                </div>
                
                <div className={proximoPago.monto > 0 ? 'text-blue-700' : 'text-yellow-700'}>
                  <span className="font-medium">Fecha:</span> {proximoPago.fecha.toLocaleDateString('es-PA')}
                </div>
                
                <div className="text-gray-600 text-xs">
                  {proximoPago.mensaje}
                </div>

                {/* ✅ INFORMACIÓN ADICIONAL PARA PRÉSTAMOS QUINCENALES */}
                {esPrestamoIndefinido && (
                  <div className="text-purple-700 text-xs mt-2 p-2 bg-purple-100 rounded">
                    <strong>Sistema Quincenal:</strong> Intereses cada 15 y 30 del mes + abono libre al capital
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* ✅ ALERTA PARA DATOS INVÁLIDOS */}
        {prestamo.estado !== 'finalizado' && !proximoPago.esValido && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <div className="font-semibold">Datos incompletos</div>
              <div className="text-sm">{proximoPago.mensaje}</div>
            </AlertDescription>
          </Alert>
        )}

        {/* ✅ MENSAJE PARA PRÉSTAMOS FINALIZADOS */}
        {prestamo.estado === 'finalizado' && (
          <Alert className="border-gray-200 bg-gray-50">
            <CheckCircle className="h-4 w-4 text-gray-600" />
            <AlertDescription className="text-gray-700">
              <span className="font-medium">✅ Préstamo finalizado</span>
              <div className="text-sm mt-1">Capital completamente liquidado</div>
            </AlertDescription>
          </Alert>
        )}

        {/* ✅ BOTÓN RÁPIDO DE PAGO */}
        {prestamo.estado !== 'finalizado' && onRegisterPayment && proximoPago.esValido && (
          <Button 
            onClick={() => onRegisterPayment(prestamo)}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Registrar Pago
          </Button>
        )}
      </CardContent>
    </Card>
  )
}