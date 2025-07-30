// src/lib/utils.ts - ACTUALIZADO
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es-PA', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function formatDate(date: Date | string | any, options?: Intl.DateTimeFormatOptions): string {
  try {
    let dateObj: Date;
    
    // Si ya es una fecha válida
    if (date instanceof Date && !isNaN(date.getTime())) {
      dateObj = date;
    } 
    // Si es string, intentar convertir
    else if (typeof date === 'string') {
      dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        console.warn('Fecha string inválida:', date);
        return 'Fecha inválida';
      }
    }
    // Si es cualquier otra cosa, usar convertirFecha
    else {
      dateObj = convertirFecha(date);
      if (isNaN(dateObj.getTime())) {
        console.warn('Fecha convertida inválida:', date);
        return 'Fecha inválida';
      }
    }

    return new Intl.DateTimeFormat('es-PA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options,
    }).format(dateObj);
  } catch (error) {
    console.error('Error formateando fecha:', error, 'Fecha original:', date);
    return 'Fecha inválida';
  }
}

export function generateId(prefix?: string): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 7);
  return prefix ? `${prefix}-${timestamp}-${randomStr}` : `${timestamp}-${randomStr}`;
}

export function calculateInterest(
  principal: number,
  rate: number,
  periods: number
): number {
  return principal * rate * periods;
}

export function addPeriods(date: Date, periods: number, type: 'days' | 'weeks' | 'months'): Date {
  const newDate = new Date(date);
  
  switch (type) {
    case 'days':
      newDate.setDate(newDate.getDate() + periods);
      break;
    case 'weeks':
      newDate.setDate(newDate.getDate() + (periods * 7));
      break;
    case 'months':
      newDate.setMonth(newDate.getMonth() + periods);
      break;
  }
  
  return newDate;
}

// ✅ FUNCIÓN HELPER MEJORADA PARA FECHAS DE FIREBASE
export function convertirFecha(fecha: any): Date {
  // Si es null o undefined, retornar fecha actual
  if (!fecha) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Fecha nula o undefined, usando fecha actual');
    }
    return new Date();
  }
  
  // Si ya es una fecha y es válida
  if (fecha instanceof Date) {
    if (isNaN(fecha.getTime())) {
      console.warn('Fecha Date inválida:', fecha);
      return new Date();
    }
    return fecha;
  }
  
  // PRIORIDAD: Si tiene propiedad seconds (Timestamp object de Firebase)
  if (fecha.seconds && typeof fecha.seconds === 'number') {
    try {
      // Firebase Timestamps tienen seconds y nanoseconds
      const milliseconds = fecha.seconds * 1000 + (fecha.nanoseconds || 0) / 1000000;
      const converted = new Date(milliseconds);
      if (isNaN(converted.getTime())) {
        console.warn('Fecha desde seconds inválida:', fecha.seconds);
        return new Date();
      }
      // Solo log en desarrollo si es necesario para debugging adicional
      // if (process.env.NODE_ENV === 'development') {
      //   console.log('✅ Timestamp Firebase convertido:', converted);
      // }
      return converted;
    } catch (error) {
      console.error('Error convirtiendo seconds:', error);
      return new Date();
    }
  }
  
  // Si tiene método toDate (Timestamp de Firebase con método disponible)
  if (fecha.toDate && typeof fecha.toDate === 'function') {
    try {
      const converted = fecha.toDate();
      if (isNaN(converted.getTime())) {
        console.warn('Fecha desde toDate() inválida:', fecha);
        return new Date();
      }
      return converted;
    } catch (error) {
      console.error('Error ejecutando toDate():', error);
      return new Date();
    }
  }
  
  // Si tiene propiedad _seconds (otra variación de Timestamp)
  if (fecha._seconds && typeof fecha._seconds === 'number') {
    try {
      const converted = new Date(fecha._seconds * 1000);
      if (isNaN(converted.getTime())) {
        console.warn('Fecha desde _seconds inválida:', fecha._seconds);
        return new Date();
      }
      return converted;
    } catch (error) {
      console.error('Error convirtiendo _seconds:', error);
      return new Date();
    }
  }
  
  // Si es string
  if (typeof fecha === 'string') {
    try {
      const converted = new Date(fecha);
      if (isNaN(converted.getTime())) {
        console.warn('String de fecha inválido:', fecha);
        return new Date();
      }
      return converted;
    } catch (error) {
      console.error('Error convirtiendo string de fecha:', error);
      return new Date();
    }
  }
  
  // Si es número (timestamp en milliseconds)
  if (typeof fecha === 'number') {
    try {
      const converted = new Date(fecha);
      if (isNaN(converted.getTime())) {
        console.warn('Timestamp numérico inválido:', fecha);
        return new Date();
      }
      return converted;
    } catch (error) {
      console.error('Error convirtiendo timestamp:', error);
      return new Date();
    }
  }
  
  // MANEJO ESPECÍFICO para serverTimestamp placeholders de Firebase
  if (fecha._methodName === 'serverTimestamp') {
    // No hacer log para evitar saturar la consola
    // if (process.env.NODE_ENV === 'development') {
    //   console.log('🕐 Detectado serverTimestamp placeholder, usando fecha actual');
    // }
    return new Date();
  }
  
  // Si es un objeto, intentar extraer información útil
  if (typeof fecha === 'object') {
    // Solo log detallado si no es un caso conocido
    const esServerTimestamp = fecha._methodName === 'serverTimestamp';
    
    if (process.env.NODE_ENV === 'development' && !esServerTimestamp) {
      console.log('🔍 Analizando objeto de fecha:', {
        tipo: typeof fecha,
        constructor: fecha.constructor?.name,
        propiedades: Object.keys(fecha),
        tieneSeconds: !!fecha.seconds,
        tieneNanoseconds: !!fecha.nanoseconds,
        valorSeconds: fecha.seconds,
        valorNanoseconds: fecha.nanoseconds
      });
    }
    
    // Manejo específico para Timestamps de Firebase sin .toDate()
    if (fecha.seconds && typeof fecha.seconds === 'number') {
      try {
        const milliseconds = fecha.seconds * 1000 + (fecha.nanoseconds || 0) / 1000000;
        const converted = new Date(milliseconds);
        if (!isNaN(converted.getTime())) {
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Timestamp Firebase convertido exitosamente:', converted);
          }
          return converted;
        }
      } catch (error) {
        console.error('Error convirtiendo Timestamp de Firebase:', error);
      }
    }
    
    // Intentar diferentes propiedades comunes
    const propiedadesFecha = ['_seconds', 'timestamp', 'time', 'date', 'value'];
    for (const prop of propiedadesFecha) {
      if (fecha[prop] && typeof fecha[prop] === 'number') {
        try {
          const converted = new Date(fecha[prop] * 1000);
          if (!isNaN(converted.getTime())) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`✅ Fecha extraída de propiedad ${prop}:`, converted);
            }
            return converted;
          }
        } catch (error) {
          continue;
        }
      }
    }
    
    // Si el objeto tiene una representación string útil
    if (fecha.toString && typeof fecha.toString === 'function') {
      const fechaString = fecha.toString();
      if (fechaString !== '[object Object]') {
        try {
          const converted = new Date(fechaString);
          if (!isNaN(converted.getTime())) {
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Fecha extraída de toString():', converted);
            }
            return converted;
          }
        } catch (error) {
          // Continuar con el fallback
        }
      }
    }
  }
  
  // Caso por defecto: usar fecha actual
  if (process.env.NODE_ENV === 'development' && fecha._methodName !== 'serverTimestamp') {
    console.warn('Fecha no reconocida, usando fecha actual:', fecha);
  }
  return new Date();
}