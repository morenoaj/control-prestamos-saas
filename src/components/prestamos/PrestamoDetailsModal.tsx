// src/components/prestamos/PrestamoDetailsModal.tsx
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  DollarSign,
  User,
  Calendar,
  FileText,
  TrendingUp,
  Calculator,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Infinity,
  Edit,
  CreditCard,
  Phone,
  MapPin,
  Building
} from 'lucide-react'
import { formatCurrency, formatDate, convertirFecha } from '@/lib/utils'
import { Prestamo, Cliente } from '@/types/database'

// Función para convertir fechas de Firestore
const convertFirebaseDate = (fecha: any): Date | null => {
  try {
    if (!fecha) return null
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

interface PrestamoDetailsModalProps {
  prestamo: Prestamo | null
  cliente: Cliente | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (prestamo: Prestamo) => void
  onRegisterPayment?: (prestamo: Prestamo) => void
}

export function PrestamoDetailsModal({
  prestamo,
  cliente,
  isOpen,
  onClose,
  onEdit,
  onRegisterPayment
}: PrestamoDetailsModalProps) {
  if (!prestamo || !cliente) return null

  // ✅ DETECCIÓN DE PRÉSTAMOS INDEFINIDOS
  const esPrestamoIndefinido = prestamo.tipoTasa === 'indefinido' || 
                              prestamo.esPlazoIndefinido || 
                              !prestamo.plazo || 
                              prestamo.plazo <= 0

  // ✅ CALCULAR INFORMACIÓN FINANCIERA
  const saldoCapital = prestamo.saldoCapital || prestamo.monto
  const progresoPago = ((prestamo.monto - saldoCapital) / prestamo.monto) * 100
  const totalPagado = prestamo.monto - saldoCapital

  // ✅ CALCULAR PRÓXIMO PAGO
  const calcularProximoPago = () => {
    if (esPrestamoIndefinido) {
      const interesesQuincenales = saldoCapital * (prestamo.tasaInteres / 100)
      return {
        monto: interesesQuincenales,
        tipo: 'Intereses Quincenales',
        fecha: 'Cada 15 días'
      }
    } else {
      return {
        monto: prestamo.montoProximoPago || 0,
        tipo: `Cuota ${prestamo.tipoTasa}`,
        fecha: prestamo.fechaProximoPago ? 
          formatDate(convertFirebaseDate(prestamo.fechaProximoPago)) : 
          'No definida'
      }
    }
  }

  const proximoPago = calcularProximoPago()

  // ✅ DETERMINAR EL BADGE DEL ESTADO
  const getBadgeVariant = () => {
    switch (prestamo.estado) {
      case 'activo': return 'default'
      case 'finalizado': return 'secondary'
      case 'atrasado': return 'destructive'
      case 'cancelado': return 'outline'
      default: return 'outline'
    }
  }

  const getBadgeIcon = () => {
    switch (prestamo.estado) {
      case 'activo': return <Clock className="h-4 w-4" />
      case 'finalizado': return <CheckCircle className="h-4 w-4" />
      case 'atrasado': return <AlertCircle className="h-4 w-4" />
      case 'cancelado': return <XCircle className="h-4 w-4" />
      default: return <XCircle className="h-4 w-4" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-xl font-bold">Préstamo {prestamo.numero}</div>
              <div className="text-sm text-gray-600 font-normal">
                Detalles completos del préstamo
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ✅ INFORMACIÓN DEL CLIENTE */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="font-semibold text-lg">
                  {cliente.nombre} {cliente.apellido}
                </div>
                <div className="text-sm text-gray-600">{cliente.cedula}</div>
              </div>
              
              <div className="space-y-2">
                {cliente.telefono && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{cliente.telefono}</span>
                  </div>
                )}
                
                {cliente.direccion && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>{cliente.direccion}</span>
                  </div>
                )}
                
                {cliente.ocupacion && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="h-4 w-4 text-gray-500" />
                    <span>{cliente.ocupacion}</span>
                  </div>
                )}
              </div>

              <div className="text-sm">
                <span className="text-gray-600">Ingresos mensuales:</span>
                <div className="font-semibold text-green-600">
                  {formatCurrency(cliente.ingresosMensuales)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ✅ ESTADO Y PROGRESO */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                Estado y Progreso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Estado:</span>
                <Badge variant={getBadgeVariant()} className="flex items-center gap-1">
                  {getBadgeIcon()}
                  {prestamo.estado}
                </Badge>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Progreso de pago</span>
                  <span className="font-semibold">{progresoPago.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(progresoPago, 100)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total pagado:</span>
                  <div className="font-semibold text-green-600">
                    {formatCurrency(totalPagado)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Saldo pendiente:</span>
                  <div className="font-semibold text-orange-600">
                    {formatCurrency(saldoCapital)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ✅ DETALLES FINANCIEROS */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="h-5 w-5" />
                Términos Financieros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600 text-sm">Monto principal:</span>
                  <div className="font-semibold text-xl text-green-600">
                    {formatCurrency(prestamo.monto)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600 text-sm">Tasa de interés:</span>
                  <div className="font-semibold text-xl text-blue-600">
                    {prestamo.tasaInteres}%
                  </div>
                </div>
              </div>

              <div>
                <span className="text-gray-600 text-sm">Tipo de tasa:</span>
                <div className="font-semibold">
                  {prestamo.tipoTasa === 'indefinido' ? 'Quincenal Indefinido' : prestamo.tipoTasa}
                </div>
              </div>

              <div>
                <span className="text-gray-600 text-sm">Plazo:</span>
                <div className="font-semibold">
                  {esPrestamoIndefinido ? (
                    <span className="text-purple-600 flex items-center gap-1">
                      <Infinity className="h-4 w-4" />
                      Indefinido
                    </span>
                  ) : prestamo.plazo ? (
                    `${prestamo.plazo} ${prestamo.tipoTasa}${prestamo.plazo > 1 ? 's' : ''}`
                  ) : 'No definido'}
                </div>
              </div>

              <div>
                <span className="text-gray-600 text-sm">Método de pago:</span>
                <div className="font-semibold capitalize">{prestamo.metodoPago}</div>
              </div>
            </CardContent>
          </Card>

          {/* ✅ PRÓXIMO PAGO */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                Próximo Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-gray-600 text-sm">Monto:</span>
                <div className="font-semibold text-2xl text-green-600">
                  {formatCurrency(proximoPago.monto)}
                </div>
              </div>

              <div>
                <span className="text-gray-600 text-sm">Tipo:</span>
                <div className="font-semibold">{proximoPago.tipo}</div>
              </div>

              <div>
                <span className="text-gray-600 text-sm">Fecha:</span>
                <div className="font-semibold">{proximoPago.fecha}</div>
              </div>

              {prestamo.estado === 'activo' && onRegisterPayment && (
                <Button 
                  onClick={() => onRegisterPayment(prestamo)}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Registrar Pago
                </Button>
              )}
            </CardContent>
          </Card>

          {/* ✅ FECHAS IMPORTANTES */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                Fechas Importantes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-gray-600 text-sm">Fecha de creación:</span>
                <div className="font-semibold">
                  {formatDate(convertFirebaseDate(prestamo.fechaCreacion) || new Date())}
                </div>
              </div>

              {prestamo.fechaVencimiento && !esPrestamoIndefinido && (
                <div>
                  <span className="text-gray-600 text-sm">Fecha de vencimiento:</span>
                  <div className="font-semibold">
                    {formatDate(convertFirebaseDate(prestamo.fechaVencimiento))}
                  </div>
                </div>
              )}

              {prestamo.fechaProximoPago && !esPrestamoIndefinido && (
                <div>
                  <span className="text-gray-600 text-sm">Próximo pago programado:</span>
                  <div className="font-semibold">
                    {formatDate(convertFirebaseDate(prestamo.fechaProximoPago))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ✅ DETALLES ADICIONALES */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Detalles Adicionales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {prestamo.proposito && (
                <div>
                  <span className="text-gray-600 text-sm">Propósito:</span>
                  <div className="font-semibold">{prestamo.proposito}</div>
                </div>
              )}

              {prestamo.garantia && (
                <div>
                  <span className="text-gray-600 text-sm">Garantía:</span>
                  <div className="font-semibold">{prestamo.garantia}</div>
                </div>
              )}

              {prestamo.observaciones && (
                <div>
                  <span className="text-gray-600 text-sm">Observaciones:</span>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm">
                    {prestamo.observaciones}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ✅ BOTONES DE ACCIÓN */}
        <Separator />
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          
          {onEdit && (
            <Button 
              onClick={() => {
                onEdit(prestamo)
                onClose()
              }}
              variant="outline"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar Préstamo
            </Button>
          )}
          
          {prestamo.estado === 'activo' && onRegisterPayment && (
            <Button 
              onClick={() => {
                onRegisterPayment(prestamo)
                onClose()
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Registrar Pago
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}