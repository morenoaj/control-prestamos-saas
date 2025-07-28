// src/app/layout.tsx - VERSIÓN SEGURA PARA HYDRATION
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { CompanyProvider } from '@/context/CompanyContext'
import { RedirectManager } from '@/components/RedirectManager'
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
    <html lang="es" suppressHydrationWarning={true}>
      <body className={inter.className} suppressHydrationWarning={true}>
        <AuthProvider>
          <CompanyProvider>
            <RedirectManager>
              {children}
            </RedirectManager>
            <Toaster />
          </CompanyProvider>
        </AuthProvider>
      </body>
    </html>
  )
}