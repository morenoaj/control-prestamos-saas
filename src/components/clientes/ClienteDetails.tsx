// src/components/clientes/ClienteDetails.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  DollarSign,
  Calendar,
  Star,
  Users,
  FileText,
  Edit,
  CreditCard,
  TrendingUp,
  Shield,
  AlertCircle
} from 'lucide-react'
import { Cliente } from '@/types/database'
import { formatCurrency, formatDate } from '@/lib/utils'

interface ClienteDetailsProps {
  cliente: Cliente
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
}

export function ClienteDetails({ cliente, isOpen, onClose, onEdit }: ClienteDetailsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100 border-green-200'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100 border-yellow-200'
    return 'text-red-600 bg-red-100 border-red-200'
  }

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <Shield className="h-5 w-5 text-green-600" />
    if (score >= 60) return <TrendingUp className="h-5 w-5 text-yellow-600" />
    return <AlertCircle className="h-5 w-5 text-red-600" />
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excelente'
    if (score >= 60) return 'Bueno'
    if (score >= 40) return 'Regular'
    return 'Bajo'
  }

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'activo': return 'bg-green-100 text-green-800 border-green-200'
      case 'inactivo': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'bloqueado': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
              {cliente.nombre.charAt(0)}{cliente.apellido.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                {cliente.nombre} {cliente.apellido}
                <Badge variant="outline">{cliente.codigo}</Badge>
                <Badge className={getStatusColor(cliente.estado)}>
                  {cliente.estado}
                </Badge>
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Cliente registrado el {formatDate(cliente.fechaRegistro.toDate())}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Score Crediticio Destacado */}
          <Card className={`border-2 ${getScoreColor(cliente.creditScore)}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getScoreIcon(cliente.creditScore)}
                  <div>
                    <h3 className="text-lg font-semibold">Score Crediticio</h3>
                    <p className="text-sm opacity-80">Evaluación de riesgo crediticio</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold">{cliente.creditScore}</div>
                  <div className="text-sm font-medium">{getScoreLabel(cliente.creditScore)}</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${
                      cliente.creditScore >= 80 ? 'bg-green-500' :
                      cliente.creditScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${cliente.creditScore}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Información Personal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Información Personal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nombre Completo</label>
                    <p className="text-lg font-semibold">{cliente.nombre} {cliente.apellido}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Cédula</label>
                    <p className="font-medium">{cliente.cedula}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Estado Civil</label>
                    <p className="font-medium">{cliente.estadoCivil}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Fecha de Registro</label>
                    <p className="font-medium">{formatDate(cliente.fechaRegistro.toDate())}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Información de Contacto */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Información de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Teléfono Principal</label>
                    <p className="font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {cliente.telefono}
                    </p>
                  </div>
                  {cliente.telefonoSecundario && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Teléfono Secundario</label>
                      <p className="font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {cliente.telefonoSecundario}
                      </p>
                    </div>
                  )}
                  {cliente.email && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {cliente.email}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-500">Dirección</label>
                    <p className="font-medium flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                      {cliente.direccion}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Información Laboral */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Información Laboral
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Ocupación</label>
                    <p className="font-medium">{cliente.ocupacion}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Ingresos Mensuales</label>
                    <p className="text-xl font-bold text-green-600 flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      {formatCurrency(cliente.ingresosMensuales)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Referencias */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Referencias Personales
                  <Badge variant="outline">{cliente.referencias.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cliente.referencias.length > 0 ? (
                  <div className="space-y-3">
                    {cliente.referencias.map((referencia, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="font-semibold">{referencia.nombre}</div>
                        <div className="text-sm text-gray-600 flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {referencia.telefono}
                          </span>
                          <span>({referencia.relacion})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No hay referencias registradas
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Observaciones */}
          {cliente.observaciones && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Observaciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{cliente.observaciones}</p>
              </CardContent>
            </Card>
          )}

          {/* Resumen de Actividad */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Resumen de Actividad
              </CardTitle>
              <CardDescription>
                Historial crediticio y transaccional
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <div className="text-sm text-gray-600">Préstamos Activos</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">$0</div>
                  <div className="text-sm text-gray-600">Total Prestado</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">0</div>
                  <div className="text-sm text-gray-600">Pagos Realizados</div>
                </div>
              </div>
              <div className="mt-4 text-center text-sm text-gray-500">
                📝 Los datos de actividad se mostrarán cuando se implementen los módulos de préstamos y pagos
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer con acciones */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={onEdit} className="bg-blue-600 hover:bg-blue-700">
            <Edit className="h-4 w-4 mr-2" />
            Editar Cliente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}