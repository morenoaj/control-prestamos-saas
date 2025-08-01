// src/components/layout/DashboardSidebar.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Calculator,
  Home,
  Users,
  CreditCard,
  DollarSign,
  BarChart3,
  Settings,
  Building2,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Bell
} from 'lucide-react'

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: Home
  },
  { 
    name: 'Clientes', 
    href: '/clientes', 
    icon: Users
  },
  { 
    name: 'Préstamos', 
    href: '/prestamos', 
    icon: CreditCard
  },
  { 
    name: 'Pagos', 
    href: '/pagos', 
    icon: DollarSign
  },
  { 
    name: 'Reportes', 
    href: '/dashboard/reportes', 
    icon: BarChart3
  },
  { 
    name: 'Configuración', 
    href: '/dashboard/configuracion', 
    icon: Settings
  },
]

export function DashboardSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false)
  const pathname = usePathname()
  const { empresaActual, empresas, cambiarEmpresa, logout } = useAuth()

  const handleEmpresaChange = async (empresaId: string) => {
    if (empresaId !== empresaActual?.id) {
      await cambiarEmpresa(empresaId)
      setCompanyMenuOpen(false)
    }
  }

  return (
    <>
      {/* Mobile menu overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-gray-600/75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white shadow-xl">
            <div className="absolute right-0 top-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <SidebarContent 
              companyMenuOpen={companyMenuOpen}
              setCompanyMenuOpen={setCompanyMenuOpen}
              pathname={pathname}
              empresaActual={empresaActual}
              empresas={empresas}
              handleEmpresaChange={handleEmpresaChange}
              logout={logout}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200 shadow-sm">
          <SidebarContent 
            companyMenuOpen={companyMenuOpen}
            setCompanyMenuOpen={setCompanyMenuOpen}
            pathname={pathname}
            empresaActual={empresaActual}
            empresas={empresas}
            handleEmpresaChange={handleEmpresaChange}
            logout={logout}
          />
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white px-4 py-4 shadow-sm sm:px-6 lg:hidden border-b border-gray-200">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex-1 text-sm font-semibold leading-6 text-gray-900">
          {empresaActual?.nombre}
        </div>
        <Bell className="h-5 w-5 text-gray-400" />
      </div>
    </>
  )
}

interface SidebarContentProps {
  companyMenuOpen: boolean
  setCompanyMenuOpen: (open: boolean) => void
  pathname: string
  empresaActual: any
  empresas: any[]
  handleEmpresaChange: (empresaId: string) => void
  logout: () => void
}

function SidebarContent({ 
  companyMenuOpen, 
  setCompanyMenuOpen, 
  pathname, 
  empresaActual, 
  empresas, 
  handleEmpresaChange, 
  logout 
}: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Calculator className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">Control Préstamos</span>
        </div>
      </div>

      {/* Company selector */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <button
            onClick={() => setCompanyMenuOpen(!companyMenuOpen)}
            className="flex w-full items-center justify-between rounded-lg bg-gray-50 p-3 text-left text-sm hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center min-w-0">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {empresaActual?.nombre || 'Sin empresa'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  Plan {empresaActual?.plan || 'N/A'}
                </p>
              </div>
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 text-gray-400 transition-transform",
              companyMenuOpen && "rotate-180"
            )} />
          </button>

          {companyMenuOpen && empresas && empresas.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
              <div className="py-1">
                {empresas.map((empresa) => (
                  <button
                    key={empresa.id}
                    onClick={() => handleEmpresaChange(empresa.id)}
                    className={cn(
                      "flex w-full items-center px-4 py-2 text-sm hover:bg-gray-50",
                      empresa.id === empresaActual?.id 
                        ? "bg-blue-50 text-blue-900" 
                        : "text-gray-700"
                    )}
                  >
                    <Building2 className="h-4 w-4 mr-3 text-gray-400" />
                    <div className="flex-1 text-left">
                      <p className="font-medium">{empresa.nombre}</p>
                      <p className="text-xs text-gray-500">Plan {empresa.plan}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4">
        <ul role="list" className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center rounded-lg p-3 text-sm font-medium transition-all duration-200",
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                      isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'
                    )}
                  />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer with logout */}
      <div className="p-4 border-t border-gray-200">
        <Button
          variant="ghost"
          onClick={logout}
          className="w-full justify-start text-gray-700 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  )
}