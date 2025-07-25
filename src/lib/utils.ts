// src/lib/utils.ts
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

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-PA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  }).format(dateObj);
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