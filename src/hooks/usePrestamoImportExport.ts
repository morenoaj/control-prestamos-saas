// src/hooks/usePrestamoImportExport.ts
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Prestamo, Cliente } from '@/types/database'
import { TipoTasa, EstadoPrestamo } from '@/types/prestamos'
import { Timestamp } from 'firebase/firestore'

interface PrestamoImportData {
  numero: string
  clienteReferencia: string // Código o cédula del cliente
  monto: number
  tasaInteres: number
  tipoTasa: TipoTasa
  plazo?: number
  esPlazoIndefinido?: boolean
  fechaInicio: string
  fechaCreacion?: string // Fecha personalizada de creación
  metodoPago: string
  proposito: string
  garantia?: string
  observaciones?: string
}

interface PrestamoImportResult {
  prestamo: {
    numero: string
    clienteId: string
    monto: number
    tasaInteres: number
    tipoTasa: TipoTasa
    plazo?: number
    esPlazoIndefinido?: boolean
    fechaInicio: Date
    fechaCreacion?: Date
    fechaVencimiento?: Date
    metodoPago: string
    proposito: string
    garantia?: string
    estado: 'activo'
    saldoCapital: number
    interesesPendientes: number
    interesesPagados: number
    diasAtraso: number
    moraAcumulada: number
    fechaProximoPago?: Date
    montoProximoPago?: number
    observaciones?: string
  }
  clienteEncontrado: Cliente
}

export const usePrestamoImportExport = () => {
  const [isImporting, setIsImporting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  // Función para validar y buscar cliente
  const buscarCliente = (referencia: string, clientes: Cliente[]): Cliente | null => {
    // Buscar por código o cédula
    return clientes.find(cliente => 
      cliente.codigo === referencia || cliente.cedula === referencia
    ) || null
  }

  // Función para convertir fecha string a Date válida
  const convertirFechaImportacion = (fechaStr: string): Date => {
    try {
      // Limpiar la cadena de fecha
      const fechaLimpia = fechaStr.trim()
      
      if (!fechaLimpia) {
        return new Date()
      }

      let fecha: Date

      // Soportar formatos: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
      if (fechaLimpia.includes('/')) {
        const partes = fechaLimpia.split('/')
        if (partes.length === 3) {
          const [dia, mes, año] = partes
          fecha = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia))
        } else {
          fecha = new Date(fechaLimpia)
        }
      } else if (fechaLimpia.includes('-')) {
        if (fechaLimpia.indexOf('-') === 4) { // YYYY-MM-DD
          fecha = new Date(fechaLimpia)
        } else { // DD-MM-YYYY
          const partes = fechaLimpia.split('-')
          if (partes.length === 3) {
            const [dia, mes, año] = partes
            fecha = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia))
          } else {
            fecha = new Date(fechaLimpia)
          }
        }
      } else {
        // Intentar parsear directamente
        fecha = new Date(fechaLimpia)
      }

      // Validar que la fecha es válida
      if (isNaN(fecha.getTime())) {
        console.warn(`Fecha inválida: ${fechaStr}, usando fecha actual`)
        return new Date()
      }

      // Validar que la fecha no esté muy en el pasado o futuro
      const año = fecha.getFullYear()
      if (año < 1900 || año > 2100) {
        console.warn(`Año fuera de rango: ${año}, usando fecha actual`)
        return new Date()
      }

      return fecha
    } catch (error) {
      console.warn(`Error parseando fecha: ${fechaStr}, usando fecha actual`)
      return new Date()
    }
  }

  // 📥 IMPORTAR DESDE CSV
  const importarDesdeCSV = async (
    archivo: File, 
    clientes: Cliente[]
  ): Promise<PrestamoImportResult[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const lineas = text.split('\n').map(linea => linea.trim()).filter(linea => linea)
          
          if (lineas.length < 2) {
            throw new Error('El archivo debe tener al menos una fila de datos')
          }

          const headers = lineas[0].split(',').map(h => h.replace(/"/g, '').trim())
          const prestamosImportados: PrestamoImportResult[] = []
          const errores: string[] = []

          // Procesar cada fila
          for (let i = 1; i < lineas.length; i++) {
            try {
              const valores = lineas[i].split(',').map(v => v.replace(/"/g, '').trim())
              
              const clienteReferencia = valores[headers.indexOf('Cliente')] || valores[headers.indexOf('Código Cliente')] || valores[headers.indexOf('Cédula Cliente')]
              
              if (!clienteReferencia) {
                errores.push(`Fila ${i + 1}: Falta referencia del cliente`)
                continue
              }

              const clienteEncontrado = buscarCliente(clienteReferencia, clientes)
              if (!clienteEncontrado) {
                errores.push(`Fila ${i + 1}: Cliente "${clienteReferencia}" no encontrado`)
                continue
              }

              const monto = parseFloat(valores[headers.indexOf('Monto')] || '0')
              if (monto <= 0) {
                errores.push(`Fila ${i + 1}: Monto inválido`)
                continue
              }

              const tasaInteres = parseFloat(valores[headers.indexOf('Tasa Interés')] || '0')
              const tipoTasaStr = valores[headers.indexOf('Tipo Tasa')] || 'quincenal'
              const tipoTasa: TipoTasa = (['quincenal', 'mensual', 'anual', 'indefinido'].includes(tipoTasaStr.toLowerCase()) 
                ? tipoTasaStr.toLowerCase() : 'quincenal') as TipoTasa

              const plazoStr = valores[headers.indexOf('Plazo')] || ''
              const esPlazoIndefinido = plazoStr.toLowerCase() === 'indefinido' || plazoStr === ''
              const plazo = esPlazoIndefinido ? undefined : parseInt(plazoStr)

              const fechaInicioStr = valores[headers.indexOf('Fecha Inicio')] || new Date().toLocaleDateString()
              const fechaCreacionStr = valores[headers.indexOf('Fecha Creación')] || fechaInicioStr

              const prestamo = {
                numero: valores[headers.indexOf('Número')] || '',
                clienteId: clienteEncontrado.id,
                monto,
                tasaInteres,
                tipoTasa,
                // Solo incluir plazo si no es indefinido
                ...(esPlazoIndefinido ? {} : { plazo }),
                esPlazoIndefinido,
                fechaInicio: convertirFechaImportacion(fechaInicioStr),
                fechaCreacion: convertirFechaImportacion(fechaCreacionStr),
                // Solo incluir fechaVencimiento si no es indefinido
                ...(esPlazoIndefinido ? {} : { 
                  fechaVencimiento: (() => {
                    const fechaInicio = convertirFechaImportacion(fechaInicioStr)
                    const nuevaFecha = new Date(fechaInicio)
                    nuevaFecha.setDate(nuevaFecha.getDate() + (plazo || 0))
                    return nuevaFecha
                  })()
                }),
                metodoPago: valores[headers.indexOf('Método Pago')] || 'efectivo',
                proposito: valores[headers.indexOf('Propósito')] || '',
                garantia: valores[headers.indexOf('Garantía')] || '',
                estado: 'activo' as const,
                saldoCapital: monto,
                interesesPendientes: 0,
                interesesPagados: 0,
                diasAtraso: 0,
                moraAcumulada: 0,
                // Solo incluir fechaProximoPago si no es indefinido
                ...(esPlazoIndefinido ? {} : { fechaProximoPago: convertirFechaImportacion(fechaInicioStr) }),
                // Solo incluir montoProximoPago si no es indefinido
                ...(esPlazoIndefinido ? {} : { montoProximoPago: 0 }),
                observaciones: valores[headers.indexOf('Observaciones')] || ''
              }

              prestamosImportados.push({
                prestamo,
                clienteEncontrado
              })

            } catch (error) {
              errores.push(`Fila ${i + 1}: Error procesando datos - ${error}`)
            }
          }

          if (errores.length > 0) {
            console.warn('Errores durante importación:', errores)
            toast({
              title: "Importación parcial",
              description: `${prestamosImportados.length} préstamos importados, ${errores.length} errores`,
              variant: "destructive"
            })
          }

          resolve(prestamosImportados)
        } catch (error: any) {
          reject(new Error(`Error procesando CSV: ${error.message}`))
        }
      }

      reader.onerror = () => reject(new Error('Error leyendo el archivo'))
      reader.readAsText(archivo, 'utf-8')
    })
  }

  // 📊 IMPORTAR DESDE EXCEL
  const importarDesdeExcel = async (
    archivo: File, 
    clientes: Cliente[]
  ): Promise<PrestamoImportResult[]> => {
    return new Promise(async (resolve, reject) => {
      try {
        const XLSX = await import('xlsx')
        const reader = new FileReader()
        
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer)
            const workbook = XLSX.read(data, { type: 'array' })
            
            const firstSheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[firstSheetName]
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
            
            if (jsonData.length < 2) {
              throw new Error('El archivo debe tener al menos una fila de datos')
            }

            const headers = (jsonData[0] as string[]).map(h => h?.toString().trim())
            const prestamosImportados: PrestamoImportResult[] = []
            const errores: string[] = []

            for (let i = 1; i < jsonData.length; i++) {
              try {
                const fila = jsonData[i] as any[]
                
                const clienteReferencia = fila[headers.indexOf('Cliente')] || 
                                        fila[headers.indexOf('Código Cliente')] || 
                                        fila[headers.indexOf('Cédula Cliente')]
                
                if (!clienteReferencia) {
                  errores.push(`Fila ${i + 1}: Falta referencia del cliente`)
                  continue
                }

                const clienteEncontrado = buscarCliente(clienteReferencia.toString(), clientes)
                if (!clienteEncontrado) {
                  errores.push(`Fila ${i + 1}: Cliente "${clienteReferencia}" no encontrado`)
                  continue
                }

                const monto = parseFloat(fila[headers.indexOf('Monto')] || 0)
                if (monto <= 0) {
                  errores.push(`Fila ${i + 1}: Monto inválido`)
                  continue
                }

                const tasaInteres = parseFloat(fila[headers.indexOf('Tasa Interés')] || 0)
                const tipoTasaStr = fila[headers.indexOf('Tipo Tasa')]?.toString() || 'quincenal'
                const tipoTasa: TipoTasa = (['quincenal', 'mensual', 'anual', 'indefinido'].includes(tipoTasaStr.toLowerCase()) 
                  ? tipoTasaStr.toLowerCase() : 'quincenal') as TipoTasa

                const plazoStr = fila[headers.indexOf('Plazo')]?.toString() || ''
                const esPlazoIndefinido = plazoStr.toLowerCase() === 'indefinido' || plazoStr === ''
                const plazo = esPlazoIndefinido ? undefined : parseInt(plazoStr)

                const fechaInicioStr = fila[headers.indexOf('Fecha Inicio')]?.toString() || new Date().toLocaleDateString()
                const fechaCreacionStr = fila[headers.indexOf('Fecha Creación')]?.toString() || fechaInicioStr

                const prestamo = {
                  numero: fila[headers.indexOf('Número')]?.toString() || '',
                  clienteId: clienteEncontrado.id,
                  monto,
                  tasaInteres,
                  tipoTasa,
                  // Solo incluir plazo si no es indefinido
                  ...(esPlazoIndefinido ? {} : { plazo }),
                  esPlazoIndefinido,
                  fechaInicio: convertirFechaImportacion(fechaInicioStr),
                  fechaCreacion: convertirFechaImportacion(fechaCreacionStr),
                  // Solo incluir fechaVencimiento si no es indefinido
                  ...(esPlazoIndefinido ? {} : { 
                    fechaVencimiento: (() => {
                      const fechaInicio = convertirFechaImportacion(fechaInicioStr)
                      const nuevaFecha = new Date(fechaInicio)
                      nuevaFecha.setDate(nuevaFecha.getDate() + (plazo || 0))
                      return nuevaFecha
                    })()
                  }),
                  metodoPago: fila[headers.indexOf('Método Pago')]?.toString() || 'efectivo',
                  proposito: fila[headers.indexOf('Propósito')]?.toString() || '',
                  garantia: fila[headers.indexOf('Garantía')]?.toString() || '',
                  estado: 'activo' as const,
                  saldoCapital: monto,
                  interesesPendientes: 0,
                  interesesPagados: 0,
                  diasAtraso: 0,
                  moraAcumulada: 0,
                  // Solo incluir fechaProximoPago si no es indefinido
                  ...(esPlazoIndefinido ? {} : { fechaProximoPago: convertirFechaImportacion(fechaInicioStr) }),
                  // Solo incluir montoProximoPago si no es indefinido
                  ...(esPlazoIndefinido ? {} : { montoProximoPago: 0 }),
                  observaciones: fila[headers.indexOf('Observaciones')]?.toString() || ''
                }

                prestamosImportados.push({
                  prestamo,
                  clienteEncontrado
                })

              } catch (error) {
                errores.push(`Fila ${i + 1}: Error procesando datos - ${error}`)
              }
            }

            if (errores.length > 0) {
              console.warn('Errores durante importación:', errores)
              toast({
                title: "Importación parcial",
                description: `${prestamosImportados.length} préstamos importados, ${errores.length} errores`,
                variant: "destructive"
              })
            }

            resolve(prestamosImportados)
          } catch (error: any) {
            reject(new Error(`Error procesando Excel: ${error.message}`))
          }
        }

        reader.onerror = () => reject(new Error('Error leyendo el archivo'))
        reader.readAsArrayBuffer(archivo)
      } catch (error: any) {
        reject(new Error(`Error importando Excel: ${error.message}`))
      }
    })
  }

  // 📤 EXPORTAR PRÉSTAMOS A EXCEL
  const exportarExcel = async (prestamos: Prestamo[], clientes: Cliente[]) => {
    try {
      const XLSX = await import('xlsx')
      
      const datosExcel = prestamos.map(prestamo => {
        const cliente = clientes.find(c => c.id === prestamo.clienteId)
        
        return {
          'Número': prestamo.numero,
          'Cliente': cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Cliente no encontrado',
          'Código Cliente': cliente?.codigo || '',
          'Cédula Cliente': cliente?.cedula || '',
          'Monto': prestamo.monto,
          'Tasa Interés': prestamo.tasaInteres,
          'Tipo Tasa': prestamo.tipoTasa,
          'Plazo': prestamo.esPlazoIndefinido ? 'Indefinido' : prestamo.plazo,
          'Fecha Inicio': prestamo.fechaInicio.toDate().toLocaleDateString('es-PA'),
          'Fecha Creación': prestamo.fechaCreacion?.toDate().toLocaleDateString('es-PA') || '',
          'Fecha Vencimiento': prestamo.fechaVencimiento?.toDate().toLocaleDateString('es-PA') || 'N/A',
          'Método Pago': prestamo.metodoPago,
          'Propósito': prestamo.proposito,
          'Garantía': prestamo.garantia || '',
          'Estado': prestamo.estado,
          'Saldo Capital': prestamo.saldoCapital,
          'Intereses Pendientes': prestamo.interesesPendientes,
          'Días Atraso': prestamo.diasAtraso,
          'Observaciones': prestamo.observaciones || ''
        }
      })

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(datosExcel)

      // Configurar ancho de columnas
      ws['!cols'] = [
        { wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 15 },
        { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
        { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 15 },
        { wch: 15 }, { wch: 12 }, { wch: 30 }
      ]

      XLSX.utils.book_append_sheet(wb, ws, 'Préstamos')
      XLSX.writeFile(wb, `prestamos_${new Date().toISOString().split('T')[0]}.xlsx`)

      toast({
        title: "Exportación exitosa",
        description: `Se exportaron ${prestamos.length} préstamos a Excel`,
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

  // 📋 DESCARGAR PLANTILLA EXCEL
  const descargarPlantillaExcel = async () => {
    const XLSX = await import('xlsx')
    
    const datosEjemplo = [
      {
        'Número': 'PRES001',
        'Cliente': 'CLI001',
        'Monto': 5000,
        'Tasa Interés': 12.5,
        'Tipo Tasa': 'quincenal',
        'Plazo': 365,
        'Fecha Inicio': '15/01/2024',
        'Fecha Creación': '15/01/2024',
        'Método Pago': 'efectivo',
        'Propósito': 'Capital de trabajo',
        'Garantía': 'Hipotecaria',
        'Observaciones': 'Cliente confiable'
      },
      {
        'Número': 'PRES002',
        'Cliente': '8-123-456',
        'Monto': 3000,
        'Tasa Interés': 15,
        'Tipo Tasa': 'mensual',
        'Plazo': 'indefinido',
        'Fecha Inicio': '20/01/2024',
        'Fecha Creación': '18/01/2024',
        'Método Pago': 'transferencia',
        'Propósito': 'Compra de inventario',
        'Garantía': 'Prendaria',
        'Observaciones': 'Revisar en 6 meses'
      }
    ]

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(datosEjemplo)

    ws['!cols'] = [
      { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 10 },
      { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 30 }
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Préstamos')
    XLSX.writeFile(wb, 'plantilla_prestamos.xlsx')

    toast({
      title: "Plantilla Excel descargada",
      description: "Usa esta plantilla como ejemplo para importar tus préstamos",
    })
  }

  // 📥 FUNCIÓN PRINCIPAL DE IMPORTACIÓN
  const importarPrestamos = async (
    archivo: File,
    clientes: Cliente[],
    onPrestamosImportados: (resultados: PrestamoImportResult[]) => void
  ) => {
    setIsImporting(true)
    
    try {
      let prestamosImportados: PrestamoImportResult[] = []
      
      if (archivo.name.toLowerCase().endsWith('.csv')) {
        prestamosImportados = await importarDesdeCSV(archivo, clientes)
      } else if (archivo.name.toLowerCase().endsWith('.xlsx') || archivo.name.toLowerCase().endsWith('.xls')) {
        prestamosImportados = await importarDesdeExcel(archivo, clientes)
      } else {
        throw new Error('Formato de archivo no compatible')
      }

      if (prestamosImportados.length === 0) {
        throw new Error('No se encontraron préstamos válidos en el archivo')
      }

      console.log('✅ Préstamos importados:', prestamosImportados.length)
      onPrestamosImportados(prestamosImportados)

      toast({
        title: "Importación exitosa",
        description: `Se importaron ${prestamosImportados.length} préstamos`,
      })
    } catch (error: any) {
      console.error('Error importando préstamos:', error)
      toast({
        title: "Error al importar",
        description: error.message || "No se pudieron importar los préstamos",
        variant: "destructive"
      })
    } finally {
      setIsImporting(false)
    }
  }

  return {
    isImporting,
    isExporting,
    importarPrestamos,
    exportarExcel,
    descargarPlantillaExcel
  }
}