// src/app/(auth)/layout.tsx - SIMPLIFICADO
'use client'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Ya no maneja redirecciones - RedirectManager se encarga
  return <>{children}</>
}