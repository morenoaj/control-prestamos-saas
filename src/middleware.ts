// src/middleware.ts - SIMPLIFICADO
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Solo proteger rutas de API si es necesario
  if (pathname.startsWith('/api/')) {
    const authToken = request.cookies.get('auth-token')?.value;
    
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Solo aplicar a rutas de API
    '/api/:path*'
  ],
};