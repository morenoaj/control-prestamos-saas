// src/hooks/useClienteImportExport.ts - CON SOPORTE EXCEL
'use client'

import { useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { Cliente } from '@/types/database'
import { convertirFecha } from '@/lib/utils'

interface UseClienteImportExportReturn {
  isExporting: boolean
  isImporting: boolean
  exportarClientes: (clientes: Cliente[], formato: 'csv' | 'excel') => void
  importarClientes: (archivo: File, onClientesImportados: (clientes: Omit<Cliente, 'id' | 'empresaId' | 'fechaRegistro'>[]) => void) => Promise<void>
  descargarPlantilla: (formato: 'csv' | 'excel') => void
}

export function useClienteImportExport(): UseClienteImportExportReturn {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  // 📥 EXPORTAR CLIENTES
  const exportarClientes = (clientes: Cliente[], formato: 'csv' | 'excel') => {
    setIsExporting(true)
    
    try {
      if (formato === 'csv') {
        exportarCSV(clientes)
      } else if (formato === 'excel') {
        exportarExcel(clientes)
      }
    } catch (error) {
      console.error('Error exportando clientes:', error)
      toast({
        title: "Error al exportar",
        description: "No se pudieron exportar los clientes",
        variant: "destructive"
      })
    } finally {
      setIsExporting(false)
    }
  }

  // 📤 EXPORTAR A CSV
  const exportarCSV = (clientes: Cliente[]) => {
    const headers = [
      'Código',
      'Nombre',
      'Apellido',
      'Cédula',
      'Teléfono',
      'Teléfono Secundario',
      'Email',
      'Dirección',
      'Estado Civil',
      'Ocupación',
      'Ingresos Mensuales',
      'Credit Score',
      'Estado',
      'Fecha Registro',
      'Referencias (Nombre|Teléfono|Relación)',
      'Observaciones'
    ]

    const csvContent = [
      headers.join(','),
      ...clientes.map(cliente => {
        const referencias = cliente.referencias
          .map(ref => `${ref.nombre}|${ref.telefono}|${ref.relacion}`)
          .join(';')

        return [
          cliente.codigo,
          `"${cliente.nombre}"`,
          `"${cliente.apellido}"`,
          cliente.cedula,
          cliente.telefono,
          cliente.telefonoSecundario || '',
          cliente.email || '',
          `"${cliente.direccion}"`,
          cliente.estadoCivil,
          `"${cliente.ocupacion}"`,
          cliente.ingresosMensuales,
          cliente.creditScore,
          cliente.estado,
          convertirFecha(cliente.fechaRegistro).toLocaleDateString('es-PA'),
          `"${referencias}"`,
          `"${cliente.observaciones || ''}"`
        ].join(',')
      })
    ].join('\n')

    // Descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    toast({
      title: "Exportación exitosa",
      description: `Se exportaron ${clientes.length} clientes a CSV`,
    })
  }

  // 📊 EXPORTAR A EXCEL
  const exportarExcel = async (clientes: Cliente[]) => {
    try {
      // Importar XLSX dinámicamente
      const XLSX = await import('xlsx')
      
      // Preparar datos para Excel
      const datosExcel = clientes.map(cliente => ({
        'Código': cliente.codigo,
        'Nombre': cliente.nombre,
        'Apellido': cliente.apellido,
        'Cédula': cliente.cedula,
        'Teléfono': cliente.telefono,
        'Teléfono Secundario': cliente.telefonoSecundario || '',
        'Email': cliente.email || '',
        'Dirección': cliente.direccion,
        'Estado Civil': cliente.estadoCivil,
        'Ocupación': cliente.ocupacion,
        'Ingresos Mensuales': cliente.ingresosMensuales,
        'Credit Score': cliente.creditScore,
        'Estado': cliente.estado,
        'Fecha Registro': convertirFecha(cliente.fechaRegistro).toLocaleDateString('es-PA'),
        'Ref 1 - Nombre': cliente.referencias[0]?.nombre || '',
        'Ref 1 - Teléfono': cliente.referencias[0]?.telefono || '',
        'Ref 1 - Relación': cliente.referencias[0]?.relacion || '',
        'Ref 2 - Nombre': cliente.referencias[1]?.nombre || '',
        'Ref 2 - Teléfono': cliente.referencias[1]?.telefono || '',
        'Ref 2 - Relación': cliente.referencias[1]?.relacion || '',
        'Ref 3 - Nombre': cliente.referencias[2]?.nombre || '',
        'Ref 3 - Teléfono': cliente.referencias[2]?.telefono || '',
        'Ref 3 - Relación': cliente.referencias[2]?.relacion || '',
        'Observaciones': cliente.observaciones || ''
      }))

      // Crear libro de trabajo
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(datosExcel)

      // Configurar ancho de columnas
      const colWidths = [
        { wch: 10 }, // Código
        { wch: 15 }, // Nombre
        { wch: 15 }, // Apellido
        { wch: 12 }, // Cédula
        { wch: 15 }, // Teléfono
        { wch: 15 }, // Teléfono Secundario
        { wch: 25 }, // Email
        { wch: 30 }, // Dirección
        { wch: 12 }, // Estado Civil
        { wch: 20 }, // Ocupación
        { wch: 15 }, // Ingresos
        { wch: 10 }, // Credit Score
        { wch: 10 }, // Estado
        { wch: 12 }, // Fecha Registro
        { wch: 15 }, // Ref 1 - Nombre
        { wch: 15 }, // Ref 1 - Teléfono
        { wch: 12 }, // Ref 1 - Relación
        { wch: 15 }, // Ref 2 - Nombre
        { wch: 15 }, // Ref 2 - Teléfono
        { wch: 12 }, // Ref 2 - Relación
        { wch: 15 }, // Ref 3 - Nombre
        { wch: 15 }, // Ref 3 - Teléfono
        { wch: 12 }, // Ref 3 - Relación
        { wch: 30 }  // Observaciones
      ]
      ws['!cols'] = colWidths

      // Agregar hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, 'Clientes')

      // Descargar archivo
      XLSX.writeFile(wb, `clientes_${new Date().toISOString().split('T')[0]}.xlsx`)

      toast({
        title: "Exportación exitosa",
        description: `Se exportaron ${clientes.length} clientes a Excel`,
      })
    } catch (error) {
      console.error('Error exportando a Excel:', error)
      toast({
        title: "Error al exportar",
        description: "No se pudo crear el archivo Excel",
        variant: "destructive"
      })
    }
  }

  // 📥 IMPORTAR CLIENTES (CSV Y EXCEL)
  const importarClientes = async (
    archivo: File, 
    onClientesImportados: (clientes: Omit<Cliente, 'id' | 'empresaId' | 'fechaRegistro'>[]) => void
  ) => {
    setIsImporting(true)

    try {
      const extension = archivo.name.toLowerCase()
      let clientesImportados: Omit<Cliente, 'id' | 'empresaId' | 'fechaRegistro'>[] = []

      if (extension.endsWith('.csv')) {
        clientesImportados = await importarDesdeCSV(archivo)
      } else if (extension.endsWith('.xlsx') || extension.endsWith('.xls')) {
        clientesImportados = await importarDesdeExcel(archivo)
      } else {
        throw new Error('Formato de archivo no soportado. Use CSV o Excel (.xlsx)')
      }

      if (clientesImportados.length === 0) {
        throw new Error('No se pudieron importar clientes válidos')
      }

      onClientesImportados(clientesImportados)

      toast({
        title: "Importación exitosa",
        description: `Se importaron ${clientesImportados.length} clientes correctamente`,
      })

    } catch (error: any) {
      console.error('Error importando clientes:', error)
      toast({
        title: "Error al importar",
        description: error.message || "No se pudieron importar los clientes",
        variant: "destructive"
      })
    } finally {
      setIsImporting(false)
    }
  }

  // 📊 IMPORTAR DESDE EXCEL
  const importarDesdeExcel = async (archivo: File): Promise<Omit<Cliente, 'id' | 'empresaId' | 'fechaRegistro'>[]> => {
    const XLSX = await import('xlsx')
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          
          // Convertir a JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
          
          if (jsonData.length < 2) {
            throw new Error('El archivo debe tener al menos una fila de datos')
          }

          const headers = jsonData[0] as string[]
          const clientesImportados: Omit<Cliente, 'id' | 'empresaId' | 'fechaRegistro'>[] = []
          const errores: string[] = []

          // Procesar cada fila
          for (let i = 1; i < jsonData.length; i++) {
            try {
              const fila = jsonData[i] as any[]
              
              if (!fila || fila.length < 10) {
                errores.push(`Fila ${i + 1}: Faltan datos obligatorios`)
                continue
              }

              // Extraer datos básicos
              const nombre = fila[1]?.toString().trim()
              const apellido = fila[2]?.toString().trim()
              const cedula = fila[3]?.toString().trim()
              const telefono = fila[4]?.toString().trim()

              if (!nombre || !apellido || !cedula || !telefono) {
                errores.push(`Fila ${i + 1}: Faltan datos obligatorios (nombre, apellido, cédula, teléfono)`)
                continue
              }

              // Construir referencias
              const referencias = []
              
              // Ref 1
              if (fila[14] && fila[15] && fila[16]) {
                referencias.push({
                  nombre: fila[14].toString().trim(),
                  telefono: fila[15].toString().trim(),
                  relacion: fila[16].toString().trim()
                })
              }
              
              // Ref 2
              if (fila[17] && fila[18] && fila[19]) {
                referencias.push({
                  nombre: fila[17].toString().trim(),
                  telefono: fila[18].toString().trim(),
                  relacion: fila[19].toString().trim()
                })
              }
              
              // Ref 3
              if (fila[20] && fila[21] && fila[22]) {
                referencias.push({
                  nombre: fila[20].toString().trim(),
                  telefono: fila[21].toString().trim(),
                  relacion: fila[22].toString().trim()
                })
              }

              // Si no hay referencias, agregar una por defecto
              if (referencias.length === 0) {
                referencias.push({
                  nombre: 'Referencia pendiente',
                  telefono: '000-0000',
                  relacion: 'Familiar'
                })
              }

              const cliente: Omit<Cliente, 'id' | 'empresaId' | 'fechaRegistro'> = {
                codigo: fila[0]?.toString() || `CLI${Date.now()}${Math.random().toString(36).substr(2, 4)}`,
                nombre: nombre,
                apellido: apellido,
                cedula: cedula,
                telefono: telefono,
                telefonoSecundario: fila[5]?.toString().trim() || undefined,
                email: fila[6]?.toString().trim() || undefined,
                direccion: fila[7]?.toString().trim() || 'Dirección por completar',
                estadoCivil: fila[8]?.toString() || 'Soltero',
                ocupacion: fila[9]?.toString().trim() || 'Por definir',
                ingresosMensuales: parseFloat(fila[10]?.toString()) || 0,
                creditScore: parseInt(fila[11]?.toString()) || 50,
                estado: (fila[12]?.toString() as 'activo' | 'inactivo' | 'bloqueado') || 'activo',
                referencias: referencias,
                observaciones: fila[23]?.toString().trim() || undefined,
                foto: undefined,
                documentos: []
              }

              clientesImportados.push(cliente)
            } catch (error) {
              errores.push(`Fila ${i + 1}: Error procesando datos - ${error}`)
            }
          }

          if (errores.length > 0) {
            console.warn('Errores de importación:', errores)
          }

          resolve(clientesImportados)
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => reject(new Error('Error leyendo el archivo'))
      reader.readAsBinaryString(archivo)
    })
  }

  // 📄 IMPORTAR DESDE CSV
  const importarDesdeCSV = async (archivo: File): Promise<Omit<Cliente, 'id' | 'empresaId' | 'fechaRegistro'>[]> => {
    const texto = await archivo.text()
    const lineas = texto.split('\n').filter(linea => linea.trim())
    
    if (lineas.length < 2) {
      throw new Error('El archivo debe tener al menos una fila de datos')
    }

    const clientesImportados: Omit<Cliente, 'id' | 'empresaId' | 'fechaRegistro'>[] = []
    const errores: string[] = []

    // Procesar cada fila
    for (let i = 1; i < lineas.length; i++) {
      try {
        const valores = parsearCSVRow(lineas[i])
        
        if (valores.length < 10) {
          errores.push(`Fila ${i + 1}: Faltan datos obligatorios`)
          continue
        }

        // Parsear referencias
        let referencias: { nombre: string; telefono: string; relacion: string }[] = []
        const referenciaStr = valores[14]?.replace(/"/g, '') || ''
        
        if (referenciaStr.trim()) {
          referencias = referenciaStr.split(';').map(ref => {
            const [nombre, telefono, relacion] = ref.split('|')
            return { nombre: nombre || '', telefono: telefono || '', relacion: relacion || '' }
          }).filter(ref => ref.nombre && ref.telefono && ref.relacion)
        }

        // Validar campos obligatorios
        if (!valores[1] || !valores[2] || !valores[3] || !valores[4]) {
          errores.push(`Fila ${i + 1}: Faltan datos obligatorios (nombre, apellido, cédula, teléfono)`)
          continue
        }

        const cliente: Omit<Cliente, 'id' | 'empresaId' | 'fechaRegistro'> = {
          codigo: valores[0] || `CLI${Date.now()}${Math.random().toString(36).substr(2, 4)}`,
          nombre: valores[1].replace(/"/g, '').trim(),
          apellido: valores[2].replace(/"/g, '').trim(),
          cedula: valores[3].trim(),
          telefono: valores[4].trim(),
          telefonoSecundario: valores[5]?.trim() || undefined,
          email: valores[6]?.trim() || undefined,
          direccion: valores[7].replace(/"/g, '').trim(),
          estadoCivil: valores[8] || 'Soltero',
          ocupacion: valores[9].replace(/"/g, '').trim(),
          ingresosMensuales: parseFloat(valores[10]) || 0,
          creditScore: parseInt(valores[11]) || 50,
          estado: (valores[12] as 'activo' | 'inactivo' | 'bloqueado') || 'activo',
          referencias: referencias.length > 0 ? referencias : [
            { nombre: 'Referencia pendiente', telefono: '000-0000', relacion: 'Familiar' }
          ],
          observaciones: valores[15]?.replace(/"/g, '').trim() || undefined,
          foto: undefined,
          documentos: []
        }

        clientesImportados.push(cliente)
      } catch (error) {
        errores.push(`Fila ${i + 1}: Error procesando datos - ${error}`)
      }
    }

    return clientesImportados
  }

  // 📋 DESCARGAR PLANTILLA
  const descargarPlantilla = async (formato: 'csv' | 'excel') => {
    try {
      if (formato === 'csv') {
        descargarPlantillaCSV()
      } else {
        await descargarPlantillaExcel()
      }
    } catch (error) {
      console.error('Error descargando plantilla:', error)
      toast({
        title: "Error",
        description: "No se pudo descargar la plantilla",
        variant: "destructive"
      })
    }
  }

  const descargarPlantillaCSV = () => {
    const headers = [
      'Código',
      'Nombre',
      'Apellido',
      'Cédula',
      'Teléfono',
      'Teléfono Secundario',
      'Email',
      'Dirección',
      'Estado Civil',
      'Ocupación',
      'Ingresos Mensuales',
      'Credit Score',
      'Estado',
      'Fecha Registro',
      'Referencias (Nombre|Teléfono|Relación)',
      'Observaciones'
    ]

    const ejemplos = [
      'CLI001,María,González,8-123-456,6000-1234,6000-5678,maria@email.com,"Calle 50, Casa 123",Casado,Comerciante,1500,75,activo,2024-01-15,"Juan Pérez|6000-9999|Hermano;Ana López|6000-8888|Amiga","Cliente confiable"',
      'CLI002,Carlos,Rodríguez,8-789-012,6500-4321,,"carlos@email.com","Vía España, Edificio Torre",Soltero,Empleado,2000,80,activo,2024-01-16,"Pedro Martín|6200-7777|Jefe","Excelente historial crediticio"'
    ]

    const csvContent = [
      headers.join(','),
      ...ejemplos
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'plantilla_clientes.csv'
    link.click()

    toast({
      title: "Plantilla CSV descargada",
      description: "Usa esta plantilla como ejemplo para importar tus clientes",
    })
  }

  const descargarPlantillaExcel = async () => {
    const XLSX = await import('xlsx')
    
    // Datos de ejemplo para la plantilla
    const datosEjemplo = [
      {
        'Código': 'CLI001',
        'Nombre': 'María',
        'Apellido': 'González',
        'Cédula': '8-123-456',
        'Teléfono': '6000-1234',
        'Teléfono Secundario': '6000-5678',
        'Email': 'maria@email.com',
        'Dirección': 'Calle 50, Casa 123',
        'Estado Civil': 'Casado',
        'Ocupación': 'Comerciante',
        'Ingresos Mensuales': 1500,
        'Credit Score': 75,
        'Estado': 'activo',
        'Fecha Registro': '2024-01-15',
        'Ref 1 - Nombre': 'Juan Pérez',
        'Ref 1 - Teléfono': '6000-9999',
        'Ref 1 - Relación': 'Hermano',
        'Ref 2 - Nombre': 'Ana López',
        'Ref 2 - Teléfono': '6000-8888',
        'Ref 2 - Relación': 'Amiga',
        'Ref 3 - Nombre': '',
        'Ref 3 - Teléfono': '',
        'Ref 3 - Relación': '',
        'Observaciones': 'Cliente confiable'
      },
      {
        'Código': 'CLI002',
        'Nombre': 'Carlos',
        'Apellido': 'Rodríguez',
        'Cédula': '8-789-012',
        'Teléfono': '6500-4321',
        'Teléfono Secundario': '',
        'Email': 'carlos@email.com',
        'Dirección': 'Vía España, Edificio Torre',
        'Estado Civil': 'Soltero',
        'Ocupación': 'Empleado',
        'Ingresos Mensuales': 2000,
        'Credit Score': 80,
        'Estado': 'activo',
        'Fecha Registro': '2024-01-16',
        'Ref 1 - Nombre': 'Pedro Martín',
        'Ref 1 - Teléfono': '6200-7777',
        'Ref 1 - Relación': 'Jefe',
        'Ref 2 - Nombre': '',
        'Ref 2 - Teléfono': '',
        'Ref 2 - Relación': '',
        'Ref 3 - Nombre': '',
        'Ref 3 - Teléfono': '',
        'Ref 3 - Relación': '',
        'Observaciones': 'Excelente historial crediticio'
      }
    ]

    // Crear libro de trabajo
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(datosEjemplo)

    // Configurar ancho de columnas
    const colWidths = [
      { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 },
      { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 12 }, { wch: 20 },
      { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 15 },
      { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
      { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 30 }
    ]
    ws['!cols'] = colWidths

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Clientes')

    // Descargar archivo
    XLSX.writeFile(wb, 'plantilla_clientes.xlsx')

    toast({
      title: "Plantilla Excel descargada",
      description: "Abre el archivo en Excel, completa los datos y vuelve a importarlo",
    })
  }

  return {
    isExporting,
    isImporting,
    exportarClientes,
    importarClientes,
    descargarPlantilla
  }
}

// Función auxiliar para parsear filas CSV correctamente
function parsearCSVRow(row: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0

  while (i < row.length) {
    const char = row[i]
    
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"'
        i += 2
        continue
      }
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
    i++
  }
  
  result.push(current)
  return result
}
