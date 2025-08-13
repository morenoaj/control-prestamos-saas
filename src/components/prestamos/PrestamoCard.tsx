// ✅ ARCHIVO: src/components/prestamos/PrestamoCard.tsx - CORREGIDO
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

  // ✅ REFORZAR LÓGICA DE DETECCIÓN DE PRÉSTAMOS INDEFINIDOS
  const esPrestamoIndefinido = prestamo.tipoTasa === 'indefinido' || 
                              prestamo.esPlazoIndefinido || 
                              !prestamo.plazo || 
                              prestamo.plazo <= 0

  // ✅ AGREGAR DEBUG TEMPORAL (remover en producción)
  console.log('🔍 Verificación préstamo:', prestamo.numero, {
    esPlazoIndefinido: prestamo.esPlazoIndefinido,
    tipoTasa: prestamo.tipoTasa,
    plazo: prestamo.plazo,
    resultadoFinal: esPrestamoIndefinido
  })

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

  const proximoPago = calcularProximoPagoReal()

  const getBadgeVariant = () => {
    switch (prestamo.estado) {
      case 'activo': return 'default'
      case 'atrasado': return 'destructive'
      case 'finalizado': return 'secondary'
      case 'cancelado': return 'outline'
      default: return 'default'
    }
  }

  const getBadgeIcon = () => {
    switch (prestamo.estado) {
      case 'activo': return <CheckCircle className="h-3 w-3" />
      case 'atrasado': return <AlertTriangle className="h-3 w-3" />
      case 'finalizado': return <CheckCircle className="h-3 w-3" />
      case 'cancelado': return <Clock className="h-3 w-3" />
      default: return null
    }
  }

  return (
    <Card className="p-4 space-y-4 border hover:shadow-md transition-all duration-200">
      {/* ✅ HEADER CON NÚMERO Y ESTADO */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <DollarSign className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{prestamo.numero}</h3>
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <User className="h-3 w-3" />
              {cliente.nombre} {cliente.apellido}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getBadgeVariant()} className="flex items-center gap-1">
            {getBadgeIcon()}
            {prestamo.estado}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {onViewDetails && (
                <DropdownMenuItem onClick={() => onViewDetails(prestamo)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver detalles
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(prestamo)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(prestamo)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ✅ INFORMACIÓN PRINCIPAL - MONTO Y SALDO */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Monto:</span>
          <p className="font-semibold text-green-600">{formatCurrency(prestamo.monto)}</p>
        </div>
        <div>
          <span className="text-gray-600">Saldo:</span>
          <p className="font-semibold text-orange-600">
            {formatCurrency(prestamo.saldoCapital || prestamo.monto)}
          </p>
        </div>
      </div>

      {/* ✅ INFORMACIÓN PRINCIPAL - TASA Y PLAZO CORREGIDOS */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Tasa:</span>
          <p className="font-semibold text-blue-600">
            {prestamo.tasaInteres}% {prestamo.tipoTasa === 'indefinido' ? 'quincenal' : prestamo.tipoTasa}
          </p>
        </div>
        <div>
          <span className="text-gray-600">Plazo:</span>
          <p className="font-semibold">
            {/* ✅ CORREGIR: Mostrar "Indefinido" cuando tipoTasa es 'indefinido' */}
            {prestamo.tipoTasa === 'indefinido' || prestamo.esPlazoIndefinido || !prestamo.plazo || prestamo.plazo <= 0 ? (
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

      {/* ✅ FECHAS - VENCIMIENTO "INDEFINIDO" CORREGIDO */}
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
            {/* ✅ CORREGIR: Mostrar "Indefinido" cuando tipoTasa es 'indefinido' */}
            {prestamo.tipoTasa === 'indefinido' || prestamo.esPlazoIndefinido || !prestamo.plazo || prestamo.plazo <= 0 ? (
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
                Fecha: {proximoPago.fecha.toLocaleDateString('es-PA')}
              </div>
              
              {proximoPago.mensaje && (
                <div className="text-xs text-gray-600">
                  {proximoPago.mensaje}
                </div>
              )}

              {onRegisterPayment && proximoPago.monto > 0 && (
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => onRegisterPayment(prestamo)}
                >
                  Registrar Pago
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* ✅ PROPÓSITO */}
      {prestamo.proposito && (
        <div className="text-sm">
          <span className="text-gray-600">Propósito:</span>
          <p className="text-gray-800 mt-1">{prestamo.proposito}</p>
        </div>
      )}

      {/* ✅ OBSERVACIONES */}
      {prestamo.observaciones && (
        <div className="text-sm">
          <span className="text-gray-600">Observaciones:</span>
          <p className="text-gray-600 mt-1 italic">{prestamo.observaciones}</p>
        </div>
      )}
    </Card>
  )
}