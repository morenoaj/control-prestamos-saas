// src/components/prestamos/PrestamoIndefinidoInfo.tsx - CORREGIDO
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, CreditCard, AlertTriangle, CheckCircle } from 'lucide-react';
import { 
  formatCurrency, 
  calcularInteresesPrestamoIndefinido,
  calcularProximaFechaQuincenal 
} from '@/types/prestamos';
import { usePagosIndefinidos } from '@/hooks/usePagos';
// ✅ IMPORTACIONES CORREGIDAS
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';

interface PrestamoIndefinidoInfoProps {
  prestamo: {
    id: string;
    clienteId: string;
    clienteNombre: string;
    monto: number;
    saldoCapital?: number;
    tasaInteres: number;
    fechaInicio: Date;
    fechaProximoPago?: Date;
    montoProximoPago?: number;
    interesesPendientes?: number;
    moraAcumulada?: number;
    interesesPagados?: number;
    estado: string;
  };
  onPagoRegistrado?: () => void;
  onActualizar?: () => void;
}

const PrestamoIndefinidoInfo: React.FC<PrestamoIndefinidoInfoProps> = ({
  prestamo,
  onPagoRegistrado = () => {},
  onActualizar = () => {}
}) => {
  // ✅ HOOKS CORREGIDOS
  const { user, empresaActual } = useAuth();
  const companyContext = useCompany(); // Este contexto está disponible pero puede no tener empresaActual
  
  // Hook con parámetros corregidos
  const { procesarPagoPrestamoIndefinido, distribuirPagoPrestamoIndefinido } = usePagosIndefinidos(
    empresaActual, 
    user
  );

  const [montoPago, setMontoPago] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<string>('efectivo');
  const [referenciaPago, setReferenciaPago] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [procesando, setProcesando] = useState(false);
  const [simulacionPago, setSimulacionPago] = useState<any>(null);

  // Calcular información actualizada del préstamo
  const informacionActualizada = React.useMemo(() => {
    const saldoActual = prestamo.saldoCapital || prestamo.monto;
    const interesesCalculados = calcularInteresesPrestamoIndefinido(
      saldoActual,
      prestamo.tasaInteres,
      prestamo.fechaInicio,
      new Date(),
      prestamo.interesesPendientes || 0
    );

    return {
      saldoCapital: saldoActual,
      interesesPendientes: interesesCalculados.totalInteresesPendientes,
      moraAcumulada: prestamo.moraAcumulada || 0,
      totalAdeudado: saldoActual + interesesCalculados.totalInteresesPendientes + (prestamo.moraAcumulada || 0)
    };
  }, [prestamo]);

  // Simular distribución de pago cuando cambia el monto
  useEffect(() => {
    const monto = parseFloat(montoPago);
    if (monto > 0) {
      const distribucion = distribuirPagoPrestamoIndefinido(
        monto,
        informacionActualizada.saldoCapital,
        informacionActualizada.interesesPendientes,
        informacionActualizada.moraAcumulada
      );
      setSimulacionPago(distribucion);
    } else {
      setSimulacionPago(null);
    }
  }, [montoPago, informacionActualizada, distribuirPagoPrestamoIndefinido]);

  const handleProcesarPago = async () => {
    if (!montoPago || parseFloat(montoPago) <= 0) {
      alert('Por favor ingrese un monto válido');
      return;
    }

    setProcesando(true);
    try {
      await procesarPagoPrestamoIndefinido(
        prestamo.id,
        parseFloat(montoPago),
        metodoPago,
        referenciaPago || undefined,
        observaciones || undefined
      );

      // Limpiar formulario
      setMontoPago('');
      setReferenciaPago('');
      setObservaciones('');
      setSimulacionPago(null);

      // Ejecutar callbacks
      onPagoRegistrado();
      onActualizar();

      alert('Pago procesado exitosamente');
    } catch (error) {
      console.error('Error procesando pago:', error);
      alert(error instanceof Error ? error.message : 'Error al procesar el pago');
    } finally {
      setProcesando(false);
    }
  };

  if (!empresaActual || !user) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No hay empresa o usuario seleccionado. Por favor, inicia sesión y selecciona una empresa.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Información del préstamo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Información del Préstamo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Cliente</Label>
              <p className="text-lg font-semibold">{prestamo.clienteNombre}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Estado</Label>
              <Badge variant={prestamo.estado === 'activo' ? 'default' : 'secondary'}>
                {prestamo.estado}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Monto Original</Label>
              <p className="text-lg font-semibold">{formatCurrency(prestamo.monto)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Tasa de Interés</Label>
              <p className="text-lg font-semibold">{prestamo.tasaInteres}% quincenal</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Saldo Capital</Label>
              <p className="text-lg font-semibold text-blue-600">
                {formatCurrency(informacionActualizada.saldoCapital)}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Intereses Pendientes</Label>
              <p className="text-lg font-semibold text-orange-600">
                {formatCurrency(informacionActualizada.interesesPendientes)}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Total Adeudado</Label>
              <p className="text-lg font-semibold text-red-600">
                {formatCurrency(informacionActualizada.totalAdeudado)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulario de pago */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Registrar Pago
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="montoPago">Monto a Pagar</Label>
              <Input
                id="montoPago"
                type="number"
                step="0.01"
                value={montoPago}
                onChange={(e) => setMontoPago(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="metodoPago">Método de Pago</Label>
              <Select value={metodoPago} onValueChange={setMetodoPago}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="referenciaPago">Referencia de Pago (Opcional)</Label>
            <Input
              id="referenciaPago"
              value={referenciaPago}
              onChange={(e) => setReferenciaPago(e.target.value)}
              placeholder="Número de transacción, cheque, etc."
            />
          </div>

          <div>
            <Label htmlFor="observaciones">Observaciones (Opcional)</Label>
            <Textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas adicionales sobre el pago"
              rows={3}
            />
          </div>

          {/* Simulación de distribución del pago */}
          {simulacionPago && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Distribución del pago:</p>
                  {simulacionPago.montoMora > 0 && (
                    <p>• Mora: {formatCurrency(simulacionPago.montoMora)}</p>
                  )}
                  {simulacionPago.montoIntereses > 0 && (
                    <p>• Intereses: {formatCurrency(simulacionPago.montoIntereses)}</p>
                  )}
                  {simulacionPago.montoCapital > 0 && (
                    <p>• Capital: {formatCurrency(simulacionPago.montoCapital)}</p>
                  )}
                  {simulacionPago.sobrante > 0 && (
                    <p className="text-orange-600">• Sobrante: {formatCurrency(simulacionPago.sobrante)}</p>
                  )}
                  {!simulacionPago.puedeAbonarCapital && (
                    <p className="text-red-600 text-sm">
                      ⚠️ Debe pagar todos los intereses antes de abonar a capital
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleProcesarPago}
            disabled={procesando || !montoPago || parseFloat(montoPago) <= 0}
            className="w-full"
          >
            {procesando ? 'Procesando...' : 'Procesar Pago'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrestamoIndefinidoInfo;