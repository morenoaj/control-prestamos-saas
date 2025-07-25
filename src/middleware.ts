// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rutas que requieren autenticación
const protectedRoutes = ['/dashboard', '/clientes', '/prestamos', '/pagos', '/configuracion'];

// Rutas que solo pueden acceder usuarios no autenticados
const publicRoutes = ['/login', '/register', '/'];

// Rutas de la API que requieren autenticación
const protectedApiRoutes = ['/api/clientes', '/api/prestamos', '/api/pagos', '/api/empresas'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Verificar si hay token de autenticación
  const authToken = request.cookies.get('auth-token')?.value;
  const isAuthenticated = !!authToken;

  // Verificar empresa seleccionada
  const empresaId = request.cookies.get('empresa-actual')?.value;
  const hasCompany = !!empresaId;

  // Manejar rutas protegidas
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Si está autenticado pero no tiene empresa, redirigir a selección/creación
    if (!hasCompany && !pathname.startsWith('/dashboard/onboarding')) {
      return NextResponse.redirect(new URL('/dashboard/onboarding', request.url));
    }
  }

  // Manejar rutas públicas (redirigir si ya está autenticado)
  if (publicRoutes.includes(pathname) && isAuthenticated && hasCompany) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Manejar rutas de API protegidas
  if (protectedApiRoutes.some(route => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Agregar headers con información de la empresa
    const response = NextResponse.next();
    if (empresaId) {
      response.headers.set('x-empresa-id', empresaId);
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};