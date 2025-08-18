// src/components/prestamos/CronogramaIndefinido.tsx

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, calcularProximaFechaQuincenal } from '@/types/prestamos';
import { Calendar, Clock, TrendingUp, AlertTriangle } from 'lucide-react';

interface CronogramaIndefinidoProps {
  prestamo: {
    fechaInicio: Date;
    saldoCapital: number;
    tasaInteres: number;
    interesesPendientes: number;
    monto: number;
  };
  pagos?: Array<{
    fechaPago: Date;
    montoCapital: number;
    montoIntereses: number;
    montoPagado: number;
  }>;
}

interface PeriodoQuincenal {
  numero: number;
  fecha: Date;
  interesesGenerados: number;
  capitalInicial: number;
  pagoRealizado?: {
    fecha: Date;
    intereses: number;
    capital: number;
    total: number;
  };
  capitalFinal: number;
  estado: 'completado' | 'pendiente' | 'vencido';
  diasVencido?: number;
}

export const CronogramaIndefinido: React.FC<CronogramaIndefinidoProps> = ({ 
  prestamo, 
  pagos = [] 
}) => {
  
  // Generar cronograma basado en pagos reales
  const cronograma = useMemo((): PeriodoQuincenal[] => {
    const periodos: PeriodoQuincenal[] = [];
    let capitalActual = prestamo.monto;
    let fechaActual = new Date(prestamo.fechaInicio);
    const hoy = new Date();
    
    // Mapear pagos por fecha aproximada de quincena
    const pagosMap = new Map();
    pagos.forEach(pago => {
      const fechaPago = pago.fechaPago;
      const fechaQuincenal = calcularProximaFechaQuincenal(new Date(fechaPago.getTime() - 15 * 24 * 60 * 60 * 1000));
      const key = `${fechaQuincenal.getFullYear()}-${fechaQuincenal.getMonth()}-${fechaQuincenal.getDate()}`;
      pagosMap.set(key, pago);
    });

    let numeroQuincena = 1;
    
    // Generar períodos hasta que el capital llegue a 0 o hasta 2 años en el futuro
    const fechaLimite = new Date();
    fechaLimite.setFullYear(fechaLimite.getFullYear() + 2);
    
    while (capitalActual > 0 && fechaActual < fechaLimite && numeroQuincena <= 48) {
      const fechaQuincenal = calcularProximaFechaQuincenal(fechaActual);
      const interesesGenerados = capitalActual * (prestamo.tasaInteres / 100);
      
      // Buscar si hay un pago real para esta quincena
      const key = `${fechaQuincenal.getFullYear()}-${fechaQuincenal.getMonth()}-${fechaQuincenal.getDate()}`;
      const pagoReal = pagosMap.get(key);
      
      let capitalFinal = capitalActual;
      let estado: PeriodoQuincenal['estado'] = 'pendiente';
      let diasVencido = 0;
      
      if (pagoReal) {
        // Hay un pago real
        capitalFinal = Math.max(0, capitalActual - pagoReal.montoCapital);
        estado = 'completado';
      } else if (fechaQuincenal < hoy) {
        // Período vencido sin pago
        estado = 'vencido';
        diasVencido = Math.floor((hoy.getTime() - fechaQuincenal.getTime()) / (1000 * 60 * 60 * 24));
      }
      
      periodos.push({
        numero: numeroQuincena,
        fecha: fechaQuincenal,
        interesesGenerados,
        capitalInicial: capitalActual,
        pagoRealizado: pagoReal ? {
          fecha: pagoReal.fechaPago,
          intereses: pagoReal.montoIntereses,
          capital: pagoReal.montoCapital,
          total: pagoReal.montoPagado
        } : undefined,
        capitalFinal,
        estado,
        diasVencido: estado === 'vencido' ? diasVencido : undefined
      });
      
      capitalActual = capitalFinal;
      fechaActual = new Date(fechaQuincenal);
      fechaActual.setDate(fechaActual.getDate() + 1); // Avanzar al siguiente período
      numeroQuincena++;
    }
    
    return periodos;
  }, [prestamo, pagos]);

  // Estadísticas del cronograma
  const estadisticas = useMemo(() => {
    const completados = cronograma.filter(p => p.estado === 'completado').length;
    const pendientes = cronograma.filter(p => p.estado === 'pendiente').length;
    const vencidos = cronograma.filter(p => p.estado === 'vencido').length;
    
    const totalInteresesGenerados = cronograma.reduce((sum, p) => sum + p.interesesGenerados, 0);
    const totalInteresesPagados = cronograma
      .filter(p => p.pagoRealizado)
      .reduce((sum, p) => sum + (p.pagoRealizado?.intereses || 0), 0);
    const totalCapitalPagado = cronograma
      .filter(p => p.pagoRealizado)
      .reduce((sum, p) => sum + (p.pagoRealizado?.capital || 0), 0);
    
    return {
      completados,
      pendientes,
      vencidos,
      totalInteresesGenerados,
      totalInteresesPagados,
      totalCapitalPagado,
      progreso: cronograma.length > 0 ? (completados / cronograma.length) * 100 : 0
    };
  }, [cronograma]);

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{estadisticas.completados}</p>
                <p className="text-sm text-gray-600">Quincenas Pagadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{estadisticas.pendientes}</p>
                <p className="text-sm text-gray-600">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{estadisticas.vencidos}</p>
                <p className="text-sm text-gray-600">Vencidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{estadisticas.progreso.toFixed(1)}%</p>
                <p className="text-sm text-gray-600">Progreso</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen financiero */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen Financiero</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Capital Original</p>
              <p className="text-lg font-bold">{formatCurrency(prestamo.monto)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Capital Pagado</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(estadisticas.totalCapitalPagado)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Capital Pendiente</p>
              <p className="text-lg font-bold text-orange-600">{formatCurrency(prestamo.saldoCapital)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Intereses Generados</p>
              <p className="text-lg font-bold">{formatCurrency(estadisticas.totalInteresesGenerados)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Intereses Pagados</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(estadisticas.totalInteresesPagados)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Intereses Pendientes</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(prestamo.interesesPendientes)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cronograma detallado */}
      <Card>
        <CardHeader>
          <CardTitle>Cronograma de Pagos Quincenales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Capital Inicial</TableHead>
                  <TableHead>Intereses Generados</TableHead>
                  <TableHead>Pago Realizado</TableHead>
                  <TableHead>Capital Final</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cronograma.map((periodo) => (
                  <TableRow key={periodo.numero} className={
                    periodo.estado === 'vencido' ? 'bg-red-50' :
                    periodo.estado === 'completado' ? 'bg-green-50' : ''
                  }>
                    <TableCell className="font-medium">{periodo.numero}</TableCell>
                    <TableCell>{periodo.fecha.toLocaleDateString()}</TableCell>
                    <TableCell>{formatCurrency(periodo.capitalInicial)}</TableCell>
                    <TableCell>{formatCurrency(periodo.interesesGenerados)}</TableCell>
                    <TableCell>
                      {periodo.pagoRealizado ? (
                        <div className="text-sm">
                          <div>Total: {formatCurrency(periodo.pagoRealizado.total)}</div>
                          <div className="text-xs text-gray-600">
                            I: {formatCurrency(periodo.pagoRealizado.intereses)} | 
                            C: {formatCurrency(periodo.pagoRealizado.capital)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {periodo.pagoRealizado.fecha.toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">No pagado</span>
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(periodo.capitalFinal)}</TableCell>
                    <TableCell>
                      <Badge variant={
                        periodo.estado === 'completado' ? 'default' :
                        periodo.estado === 'vencido' ? 'destructive' : 'secondary'
                      }>
                        {periodo.estado === 'completado' ? 'Pagado' :
                         periodo.estado === 'vencido' ? `Vencido (${periodo.diasVencido}d)` :
                         'Pendiente'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};