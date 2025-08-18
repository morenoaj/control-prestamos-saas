// src/components/prestamos/PrestamoImportExportDialog.tsx
import React, { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  AlertCircle,
  Info,
  Users,
  CreditCard
} from 'lucide-react'
import { usePrestamoImportExport } from '@/hooks/usePrestamoImportExport'
import { Prestamo, Cliente } from '@/types/database'

interface PrestamoImportExportDialogProps {
  isOpen: boolean
  onClose: () => void
  prestamos: Prestamo[]
  clientes: Cliente[]
  onPrestamosImportados: (prestamos: any[]) => void
}

export const PrestamoImportExportDialog: React.FC<PrestamoImportExportDialogProps> = ({
  isOpen,
  onClose,
  prestamos,
  clientes,
  onPrestamosImportados
}) => {
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const {
    isImporting,
    isExporting,
    importarPrestamos,
    exportarExcel,
    descargarPlantillaExcel
  } = usePrestamoImportExport()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0]
    setArchivoSeleccionado(archivo || null)
  }

  const handleImportClick = () => {
    if (!archivoSeleccionado) {
      fileInputRef.current?.click()
      return
    }

    importarPrestamos(archivoSeleccionado, clientes, (resultados) => {
      const prestamosParaCrear = resultados.map(resultado => ({
        prestamo: resultado.prestamo,
        cliente: resultado.clienteEncontrado
      }))
      onPrestamosImportados(prestamosParaCrear)
      setArchivoSeleccionado(null)
      onClose()
    })
  }

  const handleExportExcel = () => {
    exportarExcel(prestamos, clientes)
  }

  const getFileIcon = (fileName?: string) => {
    if (!fileName) return <Upload className="h-12 w-12 text-gray-400" />
    
    if (fileName.toLowerCase().endsWith('.csv')) {
      return <FileText className="h-12 w-12 text-blue-500" />
    }
    if (fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls')) {
      return <FileSpreadsheet className="h-12 w-12 text-green-500" />
    }
    return <FileText className="h-12 w-12 text-blue-500" />
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Importar y Exportar Préstamos
          </DialogTitle>
          <DialogDescription>
            Gestiona tus préstamos de forma masiva importando desde CSV/Excel o exportando tu cartera actual
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="import" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Importar
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </TabsTrigger>
          </TabsList>

          {/* PESTAÑA DE IMPORTACIÓN */}
          <TabsContent value="import" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Instrucciones */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Info className="h-5 w-5" />
                    Instrucciones de Importación
                  </CardTitle>
                  <CardDescription>
                    Sigue estos pasos para importar tus préstamos correctamente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="mt-0.5">1</Badge>
                      <div>
                        <p className="font-medium">Descarga la plantilla</p>
                        <p className="text-sm text-gray-600">
                          Usa la plantilla Excel con el formato correcto
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="mt-0.5">2</Badge>
                      <div>
                        <p className="font-medium">Completa los datos</p>
                        <p className="text-sm text-gray-600">
                          Llena cada fila con la información del préstamo
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="mt-0.5">3</Badge>
                      <div>
                        <p className="font-medium">Verifica los clientes</p>
                        <p className="text-sm text-gray-600">
                          Asegúrate que los códigos/cédulas de clientes existan
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="mt-0.5">4</Badge>
                      <div>
                        <p className="font-medium">Sube el archivo</p>
                        <p className="text-sm text-gray-600">
                          Selecciona tu archivo Excel/CSV e importa
                        </p>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Importante:</strong> Los clientes deben existir previamente. 
                      Usa el código del cliente o su cédula para la referencia.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Área de Carga */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Upload className="h-5 w-5" />
                    Cargar Archivo
                  </CardTitle>
                  <CardDescription>
                    Formatos soportados: Excel (.xlsx, .xls) y CSV
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {archivoSeleccionado ? (
                      <div className="space-y-2">
                        {getFileIcon(archivoSeleccionado.name)}
                        <p className="font-medium">{archivoSeleccionado.name}</p>
                        <p className="text-sm text-gray-500">
                          {(archivoSeleccionado.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <Badge variant="outline" className="mt-2">
                          Archivo seleccionado
                        </Badge>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                        <p className="font-medium">Haz clic para seleccionar archivo</p>
                        <p className="text-sm text-gray-500">
                          o arrastra y suelta aquí
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={descargarPlantillaExcel}
                      variant="outline"
                      className="flex-1"
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Descargar Plantilla
                    </Button>
                    
                    <Button
                      onClick={handleImportClick}
                      disabled={!archivoSeleccionado || isImporting}
                      className="flex-1"
                    >
                      {isImporting ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Importando...
                        </div>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Importar Préstamos
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Información sobre Campos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Campos Requeridos
                </CardTitle>
                <CardDescription>
                  Estos son los campos que debe contener tu archivo de importación
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-green-700">Campos Obligatorios</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>Número</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>Cliente (código o cédula)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>Monto</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>Tasa Interés</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>Fecha Inicio</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-700">Campos Opcionales</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Info className="h-3 w-3 text-blue-500" />
                        <span>Tipo Tasa (fija/variable)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Info className="h-3 w-3 text-blue-500" />
                        <span>Plazo (días o "indefinido")</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Info className="h-3 w-3 text-blue-500" />
                        <span>Fecha Creación</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Info className="h-3 w-3 text-blue-500" />
                        <span>Método Pago</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Info className="h-3 w-3 text-blue-500" />
                        <span>Propósito</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-purple-700">Otros Campos</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Info className="h-3 w-3 text-purple-500" />
                        <span>Garantía</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Info className="h-3 w-3 text-purple-500" />
                        <span>Observaciones</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Alert className="mt-4">
                  <Users className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Validación de Clientes:</strong> Tienes {clientes.length} clientes registrados. 
                    El sistema validará automáticamente que cada cliente existe antes de crear el préstamo.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PESTAÑA DE EXPORTACIÓN */}
          <TabsContent value="export" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Información de Exportación */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Download className="h-5 w-5" />
                    Exportar Cartera de Préstamos
                  </CardTitle>
                  <CardDescription>
                    Descarga todos tus préstamos en formato Excel
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="font-medium">Total de Préstamos</span>
                      <Badge variant="secondary">{prestamos.length}</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="font-medium">Préstamos Activos</span>
                      <Badge variant="secondary">
                        {prestamos.filter(p => p.estado === 'activo').length}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                      <span className="font-medium">En Mora</span>
                      <Badge variant="secondary">
                        {prestamos.filter(p => p.diasAtraso > 0).length}
                      </Badge>
                    </div>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      El archivo incluirá información detallada del cliente, 
                      estado del préstamo, saldos y fechas importantes.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Acciones de Exportación */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileSpreadsheet className="h-5 w-5" />
                    Opciones de Exportación
                  </CardTitle>
                  <CardDescription>
                    Elige el formato para descargar tus datos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Button
                      onClick={handleExportExcel}
                      disabled={prestamos.length === 0 || isExporting}
                      className="w-full"
                      size="lg"
                    >
                      {isExporting ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Exportando...
                        </div>
                      ) : (
                        <>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Exportar a Excel
                        </>
                      )}
                    </Button>

                    {prestamos.length === 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          No hay préstamos para exportar. Crea algunos préstamos primero.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 space-y-1">
                    <p><strong>Formato:</strong> Excel (.xlsx)</p>
                    <p><strong>Incluye:</strong> Datos del cliente, información del préstamo, saldos, fechas</p>
                    <p><strong>Encoding:</strong> UTF-8 compatible con Excel en español</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Vista Previa de Campos Exportados */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Campos que se Exportarán
                </CardTitle>
                <CardDescription>
                  Vista previa de las columnas que contendrá tu archivo Excel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-700">Información Básica</h4>
                    <div className="space-y-1">
                      <div>• Número</div>
                      <div>• Cliente</div>
                      <div>• Código Cliente</div>
                      <div>• Cédula Cliente</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-green-700">Términos Financieros</h4>
                    <div className="space-y-1">
                      <div>• Monto</div>
                      <div>• Tasa Interés</div>
                      <div>• Tipo Tasa</div>
                      <div>• Plazo</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-purple-700">Fechas</h4>
                    <div className="space-y-1">
                      <div>• Fecha Inicio</div>
                      <div>• Fecha Creación</div>
                      <div>• Fecha Vencimiento</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-orange-700">Estado Actual</h4>
                    <div className="space-y-1">
                      <div>• Estado</div>
                      <div>• Saldo Capital</div>
                      <div>• Intereses Pendientes</div>
                      <div>• Días Atraso</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}