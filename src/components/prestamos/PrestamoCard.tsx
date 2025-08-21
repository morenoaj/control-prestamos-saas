// src/components/prestamos/PrestamoCard.tsx - DISEÑO CLEAN Y MODERNO
'use client'

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
import { 
  DollarSign, 
  User, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Clock,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Infinity,
  CreditCard,
  Calendar,
  Percent
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
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

  // Detección de préstamos indefinidos - CORREGIDA
  const esPrestamoIndefinido = prestamo.esPlazoIndefinido === true || 
                              prestamo.tipoTasa === 'indefinido'
  // NO incluir: !prestamo.plazo || prestamo.plazo <= 0
  // Porque un préstamo quincenal CON plazo debe mostrar fechas

  // Calcular próximo pago
  const calcularProximoPagoReal = () => {
    const saldoCapital = prestamo.saldoCapital || prestamo.monto || 0
    const tasaInteres = prestamo.tasaInteres || 0

    // Si no hay saldo o tasa, no hay pago
    if (saldoCapital <= 0 || tasaInteres <= 0) {
      return { monto: 0, fecha: new Date(), esValido: false }
    }

    if (esPrestamoIndefinido) {
      // Para préstamos indefinidos - calcular próxima fecha de pago (15 o 30)
      const interesesQuincenales = saldoCapital * (tasaInteres / 100)
      const proximaFechaPago = calcularProximaFechaPagoQuincenal()
      
      return { 
        monto: interesesQuincenales, 
        fecha: proximaFechaPago, 
        esValido: true,
        esIndefinido: true
      }
    } else {
      // Para préstamos con plazo fijo
      const montoCuota = prestamo.montoProximoPago || 0
      let fechaProximoPago = null
      
      // Intentar obtener la fecha del próximo pago
      if (prestamo.fechaProximoPago) {
        fechaProximoPago = convertFirebaseDate(prestamo.fechaProximoPago)
      }
      
      // Si no hay fecha programada, calcular basada en la fecha de inicio
      if (!fechaProximoPago && prestamo.fechaInicio) {
        const fechaInicio = convertFirebaseDate(prestamo.fechaInicio)
        if (fechaInicio) {
          fechaProximoPago = new Date(fechaInicio)
          // Agregar el período según el tipo de tasa
          switch (prestamo.tipoTasa) {
            case 'mensual':
              fechaProximoPago.setMonth(fechaProximoPago.getMonth() + 1)
              break
            case 'quincenal':
              fechaProximoPago.setDate(fechaProximoPago.getDate() + 15)
              break
            case 'anual':
              fechaProximoPago.setFullYear(fechaProximoPago.getFullYear() + 1)
              break
            default:
              fechaProximoPago.setMonth(fechaProximoPago.getMonth() + 1)
          }
        }
      }
      
      // Si aún no hay fecha, usar fecha actual + período
      if (!fechaProximoPago) {
        fechaProximoPago = new Date()
        switch (prestamo.tipoTasa) {
          case 'mensual':
            fechaProximoPago.setMonth(fechaProximoPago.getMonth() + 1)
            break
          case 'quincenal':
            fechaProximoPago.setDate(fechaProximoPago.getDate() + 15)
            break
          case 'anual':
            fechaProximoPago.setFullYear(fechaProximoPago.getFullYear() + 1)
            break
          default:
            fechaProximoPago.setMonth(fechaProximoPago.getMonth() + 1)
        }
      }

      return { 
        monto: montoCuota || (saldoCapital * (tasaInteres / 100)), 
        fecha: fechaProximoPago, 
        esValido: true,
        esIndefinido: false
      }
    }
  }

  // Función para calcular la próxima fecha de pago (15 o 30 del mes)
  const calcularProximaFechaPagoQuincenal = (): Date => {
    const hoy = new Date()
    const dia = hoy.getDate()
    const mes = hoy.getMonth()
    const año = hoy.getFullYear()
    
    // Si estamos antes del 15, el próximo pago es el 15
    if (dia < 15) {
      return new Date(año, mes, 15)
    }
    // Si estamos entre el 15 y 30, el próximo pago es el 30 (o último día del mes)
    else if (dia < 30) {
      const ultimoDiaDelMes = new Date(año, mes + 1, 0).getDate()
      const diaPago = Math.min(30, ultimoDiaDelMes)
      return new Date(año, mes, diaPago)
    }
    // Si ya pasó el 30, el próximo pago es el 15 del siguiente mes
    else {
      return new Date(año, mes + 1, 15)
    }
  }

  const proximoPago = calcularProximoPagoReal()

  // Calcular progreso
  const saldoCapital = prestamo.saldoCapital || prestamo.monto
  const progreso = ((prestamo.monto - saldoCapital) / prestamo.monto) * 100

  // Estados minimalistas
  const getEstadoIcon = () => {
    switch (prestamo.estado) {
      case 'activo': return <Clock className="h-3 w-3" />
      case 'finalizado': return <CheckCircle className="h-3 w-3" />
      case 'atrasado': return <AlertCircle className="h-3 w-3" />
      default: return <XCircle className="h-3 w-3" />
    }
  }

  const getBadgeVariant = () => {
    switch (prestamo.estado) {
      case 'activo': return 'default'
      case 'finalizado': return 'secondary'
      case 'atrasado': return 'destructive'
      default: return 'outline'
    }
  }

  // Manejadores de eventos
  const handleViewDetails = () => onViewDetails?.(prestamo)
  const handleEdit = () => onEdit?.(prestamo)
  const handleDelete = () => onDelete?.(prestamo)
  const handleRegisterPayment = () => onRegisterPayment?.(prestamo)

  return (
    <div className="group bg-white border border-gray-200 rounded-xl p-5 sm:p-6 hover:border-gray-300 hover:shadow-sm transition-all duration-200">
      
      {/* Header limpio y espacioso */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-bold text-gray-900 truncate">{prestamo.numero}</h2>
            <Badge variant={getBadgeVariant()} className="flex items-center gap-1 text-xs">
              {getEstadoIcon()}
              {prestamo.estado}
            </Badge>
          </div>
          
          <div className="flex items-center text-gray-600 text-sm">
            <User className="h-4 w-4 mr-1.5 text-gray-400" />
            <span className="font-medium truncate">{cliente.nombre} {cliente.apellido}</span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={handleViewDetails}>
              <Eye className="mr-2 h-4 w-4" />
              Ver detalles
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            
            {prestamo.estado === 'activo' && (
              <DropdownMenuItem onClick={handleRegisterPayment}>
                <CreditCard className="mr-2 h-4 w-4" />
                Registrar pago
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={handleDelete} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Sección financiera principal */}
      <div className="space-y-4 mb-5">
        
        {/* Montos principales */}
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-gray-500 mb-0.5">Monto prestado</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(prestamo.monto)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-0.5">Saldo actual</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(saldoCapital)}
            </div>
          </div>
        </div>

        {/* Próximo pago destacado */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-600 mb-0.5">Próximo pago</div>
              <div className="text-lg font-bold text-gray-900">
                {proximoPago.esValido ? formatCurrency(proximoPago.monto) : 'No calculado'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-0.5">
                {esPrestamoIndefinido ? 'Próxima fecha' : 'Vence el'}
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {esPrestamoIndefinido ? (
                  proximoPago.fecha ? (
                    <span className="text-blue-600 font-bold">
                      {formatDate(proximoPago.fecha)}
                    </span>
                  ) : (
                    <span className="text-gray-500">Sin calcular</span>
                  )
                ) : proximoPago.esValido && proximoPago.fecha ? (
                  <span className="text-blue-600 font-bold">
                    {formatDate(proximoPago.fecha)}
                  </span>
                ) : (
                  <span className="text-gray-500">Sin programar</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Barra de progreso elegante */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Progreso del préstamo</span>
            <span className="font-medium">{progreso.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gray-900 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.min(progreso, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Detalles del préstamo */}
      <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm mb-5">
        <div className="flex items-center text-gray-600">
          <Percent className="h-4 w-4 mr-1.5 text-gray-400" />
          <span>{prestamo.tasaInteres}% {prestamo.tipoTasa === 'indefinido' ? 'quincenal' : prestamo.tipoTasa}</span>
        </div>
        
        <div className="flex items-center text-gray-600">
          <Calendar className="h-4 w-4 mr-1.5 text-gray-400" />
          {esPrestamoIndefinido ? (
            <span className="flex items-center gap-1">
              <Infinity className="h-3 w-3" />
              Plazo indefinido
            </span>
          ) : (
            <span>{prestamo.plazo} {prestamo.tipoTasa}</span>
          )}
        </div>

        <div className="flex items-center text-gray-600">
          <User className="h-4 w-4 mr-1.5 text-gray-400" />
          <span>Cédula: {cliente.cedula}</span>
        </div>
      </div>

      {/* Footer con acción */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="text-xs text-gray-400">
          Creado {formatDate(convertFirebaseDate(prestamo.fechaCreacion) || new Date())}
        </div>

        {prestamo.estado === 'activo' && (
          <Button 
            onClick={handleRegisterPayment}
            size="sm"
            className="bg-gray-900 hover:bg-gray-800 text-white px-4"
          >
            <CreditCard className="h-3 w-3 mr-1.5" />
            Pagar
          </Button>
        )}
      </div>
    </div>
  )
}