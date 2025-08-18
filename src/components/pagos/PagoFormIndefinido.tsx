// src/components/pagos/PagoFormIndefinido.tsx

import React, { useState, useMemo } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency } from '@/types/prestamos';

interface PagoFormIndefinidoProps {
  prestamo: {
    id: string;
    numero: string;
    clienteNombre: string;
    saldoCapital: number;
    interesesPendientes: number;
    tasaInteres: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPagoRegistrado: (data: any) => Promise<void>;
}

export const PagoFormIndefinido: React.FC<PagoFormIndefinidoProps> = ({
  prestamo,
  open,
  onOpenChange,
  onPagoRegistrado
}) => {
  const [montoPagado, setMontoPagado] = useState('');
  const [metodoPago, setMetodoPago] = useState('');
  const [referenciaPago, setReferenciaPago] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [procesandoPago, setProcesandoPago] = useState(false);

  // Calcular distribución del pago en tiempo real
  const distribucion = useMemo(() => {
    const monto = parseFloat(montoPagado) || 0;
    if (monto <= 0) return null;

    let montoRestante = monto;
    
    // 1. Pagar intereses primero
    const montoIntereses = Math.min(montoRestante, prestamo.interesesPendientes);
    montoRestante -= montoIntereses;
    
    // 2. El resto va a capital SOLO si no quedan intereses pendientes
    const interesesRestantes = prestamo.interesesPendientes - montoIntereses;
    const puedeAbonarCapital = interesesRestantes <= 0;
    
    let montoCapital = 0;
    if (puedeAbonarCapital) {
      montoCapital = Math.min(montoRestante, prestamo.saldoCapital);
      montoRestante -= montoCapital;
    }

    return {
      montoIntereses,
      montoCapital,
      sobrante: montoRestante,
      puedeAbonarCapital,
      interesesRestantes,
      nuevoSaldoCapital: prestamo.saldoCapital - montoCapital,
      prestamoSeFinalizaria: (prestamo.saldoCapital - montoCapital) <= 0
    };
  }, [montoPagado, prestamo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!montoPagado || !metodoPago) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    const monto = parseFloat(montoPagado);
    if (monto <= 0) {
      alert('El monto debe ser mayor a cero');
      return;
    }

    setProcesandoPago(true);

    try {
      await onPagoRegistrado({
        prestamoId: prestamo.id,
        montoPagado: monto,
        metodoPago,
        referenciaPago: referenciaPago.trim() || undefined,
        observaciones: observaciones.trim() || undefined
      });

      // Limpiar formulario
      setMontoPagado('');
      setMetodoPago('');
      setReferenciaPago('');
      setObservaciones('');
      onOpenChange(false);
      
    } catch (error: any) {
      console.error('Error al registrar pago:', error);
      alert(error.message || 'Error al procesar el pago');
    } finally {
      setProcesandoPago(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Pago - Préstamo Indefinido {prestamo.numero}
          </DialogTitle>
          <DialogDescription>
            Cliente: {prestamo.clienteNombre} | 
            Capital pendiente: {formatCurrency(prestamo.saldoCapital)} | 
            Intereses pendientes: {formatCurrency(prestamo.interesesPendientes)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del préstamo */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="text-sm font-medium">Capital Pendiente</Label>
                  <div className="text-lg font-bold text-blue-600">
                    {formatCurrency(prestamo.saldoCapital)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Intereses Pendientes</Label>
                  <div className={`text-lg font-bold ${
                    prestamo.interesesPendientes > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatCurrency(prestamo.interesesPendientes)}
                  </div>
                </div>
              </div>
              
              {prestamo.interesesPendientes > 0 && (
                <Alert className="mb-4">
                  <AlertDescription>
                    ⚠️ <strong>Regla importante:</strong> Debe pagar todos los intereses pendientes 
                    antes de poder abonar al capital. Monto mínimo requerido: {formatCurrency(prestamo.interesesPendientes)}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Monto del pago */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monto">Monto del Pago *</Label>
              <Input
                id="monto"
                type="number"
                step="0.01"
                min="0.01"
                value={montoPagado}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMontoPagado(e.target.value)}
                placeholder="0.00"
                className="text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="metodo">Método de Pago *</Label>
              <Select value={metodoPago} onValueChange={setMetodoPago}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="deposito">Depósito</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Distribución del pago */}
          {distribucion && (
            <Card className="bg-gray-50">
              <CardContent className="pt-6">
                <h4 className="font-semibold mb-4">Distribución del Pago: {formatCurrency(parseFloat(montoPagado))}</h4>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>💰 Intereses:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(distribucion.montoIntereses)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>🏦 Capital:</span>
                    <span className={`font-bold ${
                      distribucion.puedeAbonarCapital ? 'text-blue-600' : 'text-gray-400'
                    }`}>
                      {formatCurrency(distribucion.montoCapital)}
                      {!distribucion.puedeAbonarCapital && ' (Bloqueado)'}
                    </span>
                  </div>

                  {distribucion.sobrante > 0 && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span>💸 Sobrante:</span>
                      <span className="font-bold text-orange-600">
                        {formatCurrency(distribucion.sobrante)}
                      </span>
                    </div>
                  )}

                  {!distribucion.puedeAbonarCapital && distribucion.interesesRestantes > 0 && (
                    <Alert>
                      <AlertDescription>
                        Quedarán {formatCurrency(distribucion.interesesRestantes)} en intereses pendientes.
                        No se puede abonar a capital hasta estar al día.
                      </AlertDescription>
                    </Alert>
                  )}

                  {distribucion.prestamoSeFinalizaria && (
                    <Alert className="bg-green-50 border-green-200">
                      <AlertDescription className="text-green-800">
                        🎉 <strong>¡Este pago finalizará el préstamo!</strong> 
                        El capital quedará en $0.00
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="pt-3 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Nuevo saldo capital:</span>
                      <span className={`text-lg font-bold ${
                        distribucion.prestamoSeFinalizaria ? 'text-green-600' : 'text-blue-600'
                      }`}>
                        {formatCurrency(distribucion.nuevoSaldoCapital)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Campos adicionales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="referencia">Referencia de Pago</Label>
              <Input
                id="referencia"
                value={referenciaPago}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReferenciaPago(e.target.value)}
                placeholder="Número de transferencia, cheque, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Input
                id="observaciones"
                value={observaciones}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setObservaciones(e.target.value)}
                placeholder="Notas adicionales (opcional)"
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4">
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
              disabled={procesandoPago || !montoPagado || !metodoPago}
            >
              {procesandoPago ? 'Procesando...' : 'Registrar Pago'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};