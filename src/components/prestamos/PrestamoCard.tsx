// ===== COMPONENTE SIMPLIFICADO QUE FUNCIONA =====
// src/components/prestamos/PrestamoCard.tsx

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

// ✅ FUNCIÓN SIMPLE PARA FORMATEAR MONEDA (sin importaciones externas)
const formatCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '$0.00';
  }
  
  const validAmount = Number(amount);
  if (isNaN(validAmount)) {
    return '$0.00';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(validAmount);
};

// ✅ FUNCIÓN SIMPLE PARA CALCULAR PRÓXIMA FECHA QUINCENAL
const calcularProximaFechaQuincenal = (fechaActual: Date = new Date()): Date => {
  const fecha = new Date(fechaActual);
  const dia = fecha.getDate();
  
  if (dia < 15) {
    fecha.setDate(15);
  } else if (dia === 15) {
    fecha.setDate(30);
    if (fecha.getDate() !== 30) {
      fecha.setDate(0); // Último día del mes
    }
  } else if (dia < 30) {
    fecha.setDate(30);
    if (fecha.getDate() !== 30) {
      fecha.setDate(0); // Último día del mes
    }
  } else {
    fecha.setMonth(fecha.getMonth() + 1, 15);
  }
  
  return fecha;
};

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

  // ✅ VERIFICAR SI ES PRÉSTAMO INDEFINIDO
  const esPrestamoIndefinido = prestamo.esPlazoIndefinido || prestamo.tipoTasa === 'indefinido';

  // ✅ CALCULAR INTERESES QUINCENALES SIMPLE
  const calcularInteresesQuincenales = (): number => {
    if (!esPrestamoIndefinido) return 0;
    
    const saldoCapital = prestamo.saldoCapital || 0;
    const tasaInteres = prestamo.tasaInteres || 0;
    
    return saldoCapital * (tasaInteres / 100);
  };

  // ✅ OBTENER COLOR DEL BADGE SEGÚN ESTADO
  const getBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'activo': return 'default'
      case 'atrasado': return 'destructive'
      case 'finalizado': return 'secondary'
      case 'pendiente': return 'outline'
      default: return 'default'
    }
  };

  // ✅ OBTENER ICONO SEGÚN ESTADO
  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'activo': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'atrasado': return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'finalizado': return <CheckCircle className="h-4 w-4 text-gray-600" />
      case 'pendiente': return <Clock className="h-4 w-4 text-yellow-600" />
      default: return <Clock className="h-4 w-4" />
    }
  };

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
            <p className="font-semibold text-blue-600">{formatCurrency(prestamo.saldoCapital)}</p>
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

        {/* ✅ FECHAS - VENCIMIENTO SIEMPRE "INDEFINIDO" PARA PRÉSTAMOS QUINCENALES */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Inicio:</span>
            <p className="font-semibold">
              {prestamo.fechaInicio instanceof Date ? 
                prestamo.fechaInicio.toLocaleDateString('es-PA') :
                prestamo.fechaInicio.toDate().toLocaleDateString('es-PA')
              }
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
              ) : prestamo.fechaVencimiento ? (
                prestamo.fechaVencimiento instanceof Date ?
                  prestamo.fechaVencimiento.toLocaleDateString('es-PA') :
                  prestamo.fechaVencimiento.toDate().toLocaleDateString('es-PA')
              ) : (
                <span className="text-purple-600 flex items-center gap-1">
                  <Infinity className="h-4 w-4" />
                  Indefinido
                </span>
              )}
            </p>
          </div>
        </div>

        {/* ✅ PRÓXIMO PAGO - VERSIÓN SIMPLIFICADA QUE FUNCIONA */}
        {esPrestamoIndefinido && prestamo.estado !== 'finalizado' && (
          <Alert className="border-blue-200 bg-blue-50">
            <Calendar className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-semibold text-blue-900">
                  Próximo pago:
                </div>
                
                <div className="text-blue-700">
                  <span className="font-medium">Fecha:</span> {calcularProximaFechaQuincenal().toLocaleDateString('es-PA')}
                </div>
                
                <div className="text-green-700">
                  <span className="font-medium">Monto a cancelar:</span> {formatCurrency(calcularInteresesQuincenales())}
                </div>
                
                <div className="text-gray-600 text-xs mt-2">
                  * Intereses de la quincena actual + abono libre al capital
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* ✅ PRÓXIMO PAGO PARA PRÉSTAMOS TRADICIONALES */}
        {!esPrestamoIndefinido && prestamo.estado !== 'finalizado' && prestamo.fechaProximoPago && (
          <Alert className="border-blue-200 bg-blue-50">
            <Calendar className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-semibold text-blue-900">
                  Próximo pago: {
                    prestamo.fechaProximoPago instanceof Date ?
                      prestamo.fechaProximoPago.toLocaleDateString('es-PA') :
                      prestamo.fechaProximoPago.toDate().toLocaleDateString('es-PA')
                  }
                </div>
                {prestamo.montoProximoPago && (
                  <div className="text-green-700">
                    <span className="font-medium">Monto:</span> {formatCurrency(prestamo.montoProximoPago)}
                  </div>
                )}
              </div>
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
        {prestamo.estado !== 'finalizado' && onRegisterPayment && (
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