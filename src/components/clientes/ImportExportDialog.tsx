// src/components/clientes/ImportExportDialog.tsx - COMPLETO CORREGIDO
'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { 
  Upload,
  Download,
  FileText,
  CheckCircle,
  AlertCircle,
  Users,
  ArrowRight,
  FileSpreadsheet,
  File
} from 'lucide-react'
import { Cliente } from '@/types/database'
import { useClienteImportExport } from '@/hooks/useClienteImportExport'
import { toast } from '@/hooks/use-toast'

interface ImportExportDialogProps {
  isOpen: boolean
  onClose: () => void
  clientes: Cliente[]
  onClientesImportados: (clientes: Omit<Cliente, 'id' | 'empresaId' | 'fechaRegistro'>[]) => void
}

export function ImportExportDialog({ 
  isOpen, 
  onClose, 
  clientes, 
  onClientesImportados 
}: ImportExportDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const {
    isExporting,
    isImporting,
    exportarClientes,
    importarClientes,
    descargarPlantilla
  } = useClienteImportExport()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const fileName = file.name.toLowerCase()
      if (fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        setSelectedFile(file)
      } else {
        toast({
          title: "Archivo no válido",
          description: "Solo se permiten archivos CSV o Excel (.xlsx)",
          variant: "destructive"
        })
      }
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(false)
    
    const file = event.dataTransfer.files[0]
    const fileName = file?.name.toLowerCase()
    if (file && (fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls'))) {
      setSelectedFile(file)
    } else {
      toast({
        title: "Archivo no válido",
        description: "Solo se permiten archivos CSV o Excel (.xlsx)",
        variant: "destructive"
      })
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleImport = async () => {
    if (!selectedFile) return

    await importarClientes(selectedFile, onClientesImportados)
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleExportCSV = () => {
    exportarClientes(clientes, 'csv')
  }

  const handleExportExcel = () => {
    exportarClientes(clientes, 'excel')
  }

  const getFileIcon = (fileName: string) => {
    if (fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls')) {
      return <FileSpreadsheet className="h-12 w-12 text-green-500" />
    }
    return <FileText className="h-12 w-12 text-blue-500" />
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar y Exportar Clientes
          </DialogTitle>
          <DialogDescription>
            Gestiona tus clientes de forma masiva importando desde CSV/Excel o exportando tu base actual
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
                    <FileText className="h-5 w-5" />
                    Instrucciones
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">1</span>
                      <div>
                        <p className="font-medium">Descarga la plantilla</p>
                        <p className="text-sm text-gray-600">Usa nuestras plantillas CSV o Excel como base</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">2</span>
                      <div>
                        <p className="font-medium">Completa los datos</p>
                        <p className="text-sm text-gray-600">Rellena la información de tus clientes</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">3</span>
                      <div>
                        <p className="font-medium">Sube el archivo</p>
                        <p className="text-sm text-gray-600">Arrastra o selecciona tu archivo completado</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button 
                      onClick={() => descargarPlantilla('csv')}
                      variant="outline" 
                      size="sm"
                      className="w-full"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Descargar Plantilla CSV
                    </Button>
                    <Button 
                      onClick={() => descargarPlantilla('excel')}
                      variant="outline" 
                      size="sm"
                      className="w-full"
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Descargar Plantilla Excel
                    </Button>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Los campos obligatorios son: Nombre, Apellido, Cédula y Teléfono
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Área de subida */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Subir Archivo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      dragOver 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    {selectedFile ? (
                      <div className="space-y-2">
                        {getFileIcon(selectedFile.name)}
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-gray-600">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                        <div className="flex items-center justify-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm">Archivo listo para importar</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                        <p className="text-lg font-medium">Arrastra tu archivo aquí</p>
                        <p className="text-gray-600">CSV o Excel (.xlsx)</p>
                        <p className="text-sm text-gray-500">o haz clic para seleccionar</p>
                      </div>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline" 
                    className="w-full"
                  >
                    <File className="h-4 w-4 mr-2" />
                    Seleccionar Archivo CSV/Excel
                  </Button>

                  {selectedFile && (
                    <Button 
                      onClick={handleImport}
                      disabled={isImporting}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {isImporting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Importando...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Importar Clientes
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Información sobre formatos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Diferencias entre Formatos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      Formato CSV
                    </h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Más liviano y rápido</li>
                      <li>• Referencias en formato: "Nombre|Teléfono|Relación"</li>
                      <li>• Múltiples referencias separadas por ";"</li>
                      <li>• Compatible con cualquier editor de texto</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-green-500" />
                      Formato Excel
                    </h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Más fácil de editar y visualizar</li>
                      <li>• Referencias en columnas separadas (hasta 3)</li>
                      <li>• Formatos de celda automáticos</li>
                      <li>• Validación visual de datos</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PESTAÑA DE EXPORTACIÓN */}
          <TabsContent value="export" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Información actual */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5" />
                    Base de Datos Actual
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{clientes.length}</div>
                    <p className="text-gray-600">Clientes registrados</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Activos:</span>
                      <span className="font-medium text-green-600">
                        {clientes.filter(c => c.estado === 'activo').length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Inactivos:</span>
                      <span className="font-medium text-gray-600">
                        {clientes.filter(c => c.estado === 'inactivo').length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Bloqueados:</span>
                      <span className="font-medium text-red-600">
                        {clientes.filter(c => c.estado === 'suspendido').length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Opciones de exportación */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Exportar</CardTitle>
                  <CardDescription>
                    Descarga tu base de clientes en diferentes formatos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Button 
                      onClick={handleExportCSV}
                      disabled={isExporting || clientes.length === 0}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      {isExporting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                          Exportando...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          Exportar como CSV
                        </>
                      )}
                    </Button>

                    <Button 
                      onClick={handleExportExcel}
                      disabled={isExporting || clientes.length === 0}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      {isExporting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                          Exportando...
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Exportar como Excel
                        </>
                      )}
                    </Button>
                  </div>

                  {clientes.length === 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No hay clientes para exportar. Crea algunos clientes primero.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Información adicional */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información de los Archivos Exportados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      Archivo CSV
                    </h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Formato:</strong> CSV (Comma Separated Values)</p>
                      <p><strong>Codificación:</strong> UTF-8</p>
                      <p><strong>Separador:</strong> Coma (,)</p>
                      <p><strong>Referencias:</strong> Formato compacto con separadores</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-green-500" />
                      Archivo Excel
                    </h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Formato:</strong> XLSX (Excel 2007+)</p>
                      <p><strong>Hojas:</strong> Una hoja con todos los clientes</p>
                      <p><strong>Columnas:</strong> Anchos optimizados</p>
                      <p><strong>Referencias:</strong> Columnas separadas (más fácil de editar)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}