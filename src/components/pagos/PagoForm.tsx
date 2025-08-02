// src/components/forms/PagoForm.tsx - SIN USAR HOOK usePagos
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Calendar, CreditCard, DollarSign, User, Loader2, Calculator } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

interface PagoFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prestamos: Array<{
    id: string
    numero: string
    clienteNombre: string
    saldoCapital: number
    interesesPendientes: number
    moraAcumulada: number
    montoProximoPago: number
    fechaProximoPago?: Date | null
    estado: string
  }>
  onSuccess?: () => void
  onPagoRegistrado: (
    prestamoId: string,
    montoPagado: number,
    metodoPago: string,
    referenciaPago?: string,
    observaciones?: string
  ) => Promise<void>
}

export function PagoForm({ 
  open, 
  onOpenChange, 
  prestamos, 
  onSuccess,
  onPagoRegistrado 
}: PagoFormProps) {
  // Estados del formulario
  const [prestamoSeleccionado, setPrestamoSeleccionado] = useState('')
  const [montoPagado, setMontoPagado] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [referenciaPago, setReferenciaPago] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [procesandoPago, setProcesandoPago] = useState(false)

  // Datos del préstamo seleccionado
  const prestamo = prestamos.find(p => p.id === prestamoSeleccionado)

  // Calcular distribución del pago
  const calcularDistribucion = (monto: number) => {
    if (!prestamo || monto <= 0) {
      return { montoMora: 0, montoIntereses: 0, montoCapital: 0, sobrante: 0 }
    }

    let montoRestante = monto
    
    // 1. Pagar mora primero (con verificación)
    const montoMora = Math.min(montoRestante, prestamo.moraAcumulada || 0)
    montoRestante -= montoMora
    
    // 2. Pagar intereses (con verificación)
    const montoIntereses = Math.min(montoRestante, prestamo.interesesPendientes || 0)
    montoRestante -= montoIntereses
    
    // 3. Pagar capital (con verificación)
    const montoCapital = Math.min(montoRestante, prestamo.saldoCapital || 0)
    montoRestante -= montoCapital

    return {
      montoMora,
      montoIntereses,
      montoCapital,
      sobrante: montoRestante
    }
  }

  const distribucion = calcularDistribucion(parseFloat(montoPagado) || 0)

  // Limpiar formulario
  const limpiarFormulario = () => {
    setPrestamoSeleccionado('')
    setMontoPagado('')
    setMetodoPago('')
    setReferenciaPago('')
    setObservaciones('')
  }

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!prestamoSeleccionado || !montoPagado || !metodoPago) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive"
      })
      return
    }

    const monto = parseFloat(montoPagado)
    if (monto <= 0) {
      toast({
        title: "Monto inválido",
        description: "El monto del pago debe ser mayor a cero",
        variant: "destructive"
      })
      return
    }

    setProcesandoPago(true)

    try {
      await onPagoRegistrado(
        prestamoSeleccionado,
        monto,
        metodoPago,
        referenciaPago.trim() || undefined,
        observaciones.trim() || undefined
      )

      toast({
        title: "¡Pago registrado exitosamente!",
        description: `Se ha procesado el pago de ${formatCurrency(monto)}`,
      })

      limpiarFormulario()
      onOpenChange(false)
      onSuccess?.()

    } catch (error: any) {
      console.error('Error al registrar pago:', error)
      toast({
        title: "Error al registrar pago",
        description: error.message || "Hubo un problema al procesar el pago",
        variant: "destructive"
      })
    } finally {
      setProcesandoPago(false)
    }
  }

  // Filtrar préstamos activos
  const prestamosDisponibles = prestamos.filter(p => 
    p.estado === 'activo' || p.estado === 'atrasado'
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Registrar Nuevo Pago
          </DialogTitle>
          <DialogDescription>
            Registra un pago para un préstamo existente. El sistema calculará automáticamente 
            la distribución entre mora, intereses y capital.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selección de Préstamo */}
          <div className="space-y-2">
            <Label htmlFor="prestamo">Préstamo *</Label>
            <Select value={prestamoSeleccionado} onValueChange={setPrestamoSeleccionado}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un préstamo" />
              </SelectTrigger>
              <SelectContent>
                {prestamosDisponibles.length === 0 ? (
                  <SelectItem value="" disabled>
                    No hay préstamos disponibles
                  </SelectItem>
                ) : (
                  prestamosDisponibles.map((prestamo) => (
                    <SelectItem key={prestamo.id} value={prestamo.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{prestamo.numero} - {prestamo.clienteNombre}</span>
                        <Badge variant={prestamo.estado === 'atrasado' ? 'destructive' : 'default'}>
                          {formatCurrency(prestamo.saldoCapital)}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Información del Préstamo Seleccionado */}
          {prestamo && (
            <Card className="bg-gray-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {prestamo.clienteNombre} - Préstamo {prestamo.numero}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Saldo Capital:</span>
                    <span className="font-semibold ml-2">
                      {formatCurrency(prestamo.saldoCapital || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Intereses:</span>
                    <span className="font-semibold ml-2">
                      {formatCurrency(prestamo.interesesPendientes || 0)}
                    </span>
                  </div>
                  {(prestamo.moraAcumulada || 0) > 0 && (
                    <div>
                      <span className="text-red-600">Mora:</span>
                      <span className="font-semibold ml-2 text-red-600">
                        {formatCurrency(prestamo.moraAcumulada || 0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600">Próximo Pago:</span>
                    <span className="font-semibold ml-2">
                      {formatCurrency(prestamo.montoProximoPago || 0)}
                    </span>
                  </div>
                </div>
                <Badge 
                  variant={prestamo.estado === 'atrasado' ? 'destructive' : 'default'}
                  className="text-xs"
                >
                  {prestamo.estado.charAt(0).toUpperCase() + prestamo.estado.slice(1)}
                </Badge>
              </CardContent>
            </Card>
          )}

          {/* Monto del Pago */}
          <div className="space-y-2">
            <Label htmlFor="monto">Monto del Pago *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="monto"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={montoPagado}
                onChange={(e) => setMontoPagado(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Distribución del Pago */}
          {montoPagado && prestamo && parseFloat(montoPagado) > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Distribución del Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  {distribucion.montoMora > 0 && (
                    <div className="flex justify-between">
                      <span className="text-red-600">Mora:</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(distribucion.montoMora)}
                      </span>
                    </div>
                  )}
                  {distribucion.montoIntereses > 0 && (
                    <div className="flex justify-between">
                      <span className="text-yellow-600">Intereses:</span>
                      <span className="font-semibold text-yellow-600">
                        {formatCurrency(distribucion.montoIntereses)}
                      </span>
                    </div>
                  )}
                  {distribucion.montoCapital > 0 && (
                    <div className="flex justify-between">
                      <span className="text-green-600">Capital:</span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(distribucion.montoCapital)}
                      </span>
                    </div>
                  )}
                  {distribucion.sobrante > 0 && (
                    <div className="flex justify-between">
                      <span className="text-blue-600">Sobrante:</span>
                      <span className="font-semibold text-blue-600">
                        {formatCurrency(distribucion.sobrante)}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{formatCurrency(parseFloat(montoPagado))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Método de Pago */}
          <div className="space-y-2">
            <Label htmlFor="metodo">Método de Pago *</Label>
            <Select value={metodoPago} onValueChange={setMetodoPago}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona método de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Efectivo
                  </div>
                </SelectItem>
                <SelectItem value="transferencia">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Transferencia Bancaria
                  </div>
                </SelectItem>
                <SelectItem value="cheque">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Cheque
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Referencia de Pago */}
          {(metodoPago === 'transferencia' || metodoPago === 'cheque') && (
            <div className="space-y-2">
              <Label htmlFor="referencia">
                Referencia {metodoPago === 'cheque' ? '(Número de Cheque)' : '(Número de Transacción)'}
              </Label>
              <Input
                id="referencia"
                placeholder={
                  metodoPago === 'cheque' 
                    ? "Ej: CHK-001234" 
                    : "Ej: TRF-987654321"
                }
                value={referenciaPago}
                onChange={(e) => setReferenciaPago(e.target.value)}
              />
            </div>
          )}

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              placeholder="Notas adicionales del pago (opcional)"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={procesandoPago}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={procesandoPago || !prestamoSeleccionado || !montoPagado || !metodoPago}
            >
              {procesandoPago ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando Pago...
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Registrar Pago
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}