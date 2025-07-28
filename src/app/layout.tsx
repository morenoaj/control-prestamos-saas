// src/app/layout.tsx - CON REDIRECCIÓN FORZADA
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { CompanyProvider } from '@/context/CompanyContext'
import { ForceRedirect } from '@/components/ForceRedirect'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Control de Préstamos - Sistema SaaS',
  description: 'Sistema integral para la gestión de préstamos personales y empresariales',
  keywords: ['préstamos', 'finanzas', 'gestión', 'SaaS'],
  authors: [{ name: 'Tu Nombre' }],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <CompanyProvider>
            <ForceRedirect />
            {children}
            <Toaster />
          </CompanyProvider>
        </AuthProvider>
      </body>
    </html>
  )
}