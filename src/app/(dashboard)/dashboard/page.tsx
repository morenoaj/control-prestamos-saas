
'use client'
import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut, User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user)
      } else {
        // Sin usuario, redirigir a login
        window.location.href = '/login'
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    await signOut(auth)
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </div>
        
        <Card className="mb-8 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">🎉 ¡ÉXITO!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-700">
              El sistema está funcionando correctamente.
            </p>
            <p className="text-sm text-green-600 mt-2">
              Usuario: {user?.email}
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">0</div>
              <p className="text-sm text-gray-600">Sin clientes aún</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Préstamos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">0</div>
              <p className="text-sm text-gray-600">Sin préstamos activos</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Ingresos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">$0</div>
              <p className="text-sm text-gray-600">Este mes</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Navegación de Prueba</CardTitle>
          </CardHeader>
          <CardContent className="space-x-4">
            <a href="/login"><Button variant="outline">Login</Button></a>
            <a href="/register"><Button variant="outline">Register</Button></a>
            <a href="/onboarding"><Button variant="outline">Onboarding</Button></a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}