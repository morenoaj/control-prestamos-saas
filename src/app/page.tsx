'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Calculator, 
  Shield, 
  BarChart3, 
  Users, 
  CreditCard, 
  Smartphone,
  ArrowRight,
  CheckCircle,
  Star,
  Zap,
  TrendingUp,
  Menu,
  X,
  Play,
  Calendar,
  Facebook,
  Twitter,
  Linkedin
} from 'lucide-react'

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMonthly, setIsMonthly] = useState(true)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'glass-effect shadow-lg' 
          : 'bg-white/90 backdrop-blur-sm'
      }`}>
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-3 animate-slide-down">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg">
                <Calculator className="h-7 w-7 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Control de Préstamos</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <button 
                onClick={() => scrollToSection('features')}
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                Características
              </button>
              <button 
                onClick={() => scrollToSection('pricing')}
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                Precios
              </button>
              <button 
                onClick={() => scrollToSection('testimonials')}
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                Testimonios
              </button>
            </div>

            <div className="flex items-center space-x-3 animate-slide-down">
              <Link href="/login">
                <Button variant="ghost" className="font-medium hidden sm:inline-flex">
                  Iniciar Sesión
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 font-medium transition-all transform hover:scale-105 shadow-lg hover:shadow-xl">
                  Comenzar Gratis
                </Button>
              </Link>
              
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </nav>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-gray-200 slide-down">
              <div className="flex flex-col space-y-3 pt-4">
                <button 
                  onClick={() => {
                    scrollToSection('features')
                    setMobileMenuOpen(false)
                  }}
                  className="text-left text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  Características
                </button>
                <button 
                  onClick={() => {
                    scrollToSection('pricing')
                    setMobileMenuOpen(false)
                  }}
                  className="text-left text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  Precios
                </button>
                <button 
                  onClick={() => {
                    scrollToSection('testimonials')
                    setMobileMenuOpen(false)
                  }}
                  className="text-left text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  Testimonios
                </button>
                <Link href="/login" className="sm:hidden">
                  <Button variant="ghost" className="w-full justify-start font-medium">
                    Iniciar Sesión
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-32 gradient-bg overflow-hidden relative">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-4 -right-4 w-72 h-72 bg-blue-100 rounded-full opacity-50 animate-float" />
          <div className="absolute top-1/2 -left-8 w-48 h-48 bg-cyan-100 rounded-full opacity-30 animate-float" style={{ animationDelay: '-2s' }} />
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-5xl mx-auto">
            {/* Hero content */}
            <div className="animate-slide-up">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 text-gray-900 leading-tight">
                Gestiona tus{' '}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Préstamos
                </span>
                <br />
                de forma profesional
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
                Sistema integral SaaS para la administración de préstamos personales y empresariales. 
                Controla clientes, pagos y reportes desde una sola plataforma moderna.
              </p>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Link href="/register">
                <Button size="lg" className="group bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-lg font-semibold px-10 py-4 transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl animate-glow">
                  <Zap className="mr-3 h-6 w-6 group-hover:animate-pulse" />
                  Comenzar Gratis
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="group text-lg font-semibold px-10 py-4 transition-all transform hover:scale-105 border-2 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50">
                <Play className="mr-3 h-6 w-6" />
                Ver Demo en Vivo
                <ArrowRight className="ml-3 h-6 w-6 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <Card className="text-center p-6 bg-white/60 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-xl transition-all card-hover">
                <CardContent className="pt-6">
                  <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent mb-3">99.9%</div>
                  <div className="text-gray-600 font-medium">Disponibilidad Garantizada</div>
                  <div className="text-sm text-gray-500 mt-1">Uptime SLA</div>
                </CardContent>
              </Card>
              <Card className="text-center p-6 bg-white/60 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-xl transition-all card-hover">
                <CardContent className="pt-6">
                  <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent mb-3">500+</div>
                  <div className="text-gray-600 font-medium">Empresas Confían</div>
                  <div className="text-sm text-gray-500 mt-1">Clientes activos</div>
                </CardContent>
              </Card>
              <Card className="text-center p-6 bg-white/60 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-xl transition-all card-hover">
                <CardContent className="pt-6">
                  <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent mb-3">$50M+</div>
                  <div className="text-gray-600 font-medium">Préstamos Gestionados</div>
                  <div className="text-sm text-gray-500 mt-1">Volumen total</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Todo lo que necesitas para{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">gestionar préstamos</span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Cada funcionalidad ha sido diseñada para maximizar tu eficiencia y rentabilidad
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature Cards */}
            {[
              {
                icon: Users,
                title: "Gestión de Clientes",
                description: "CRM completo con scoring crediticio automático, gestión de referencias y historial detallado",
                color: "from-blue-500 to-blue-600",
                bgColor: "bg-blue-100",
                textColor: "text-blue-800",
                tags: ["Scoring Credit", "Referencias", "Historial"]
              },
              {
                icon: CreditCard,
                title: "Control de Préstamos", 
                description: "Cálculo automático de intereses, seguimiento inteligente de pagos y gestión de estados",
                color: "from-green-500 to-green-600",
                bgColor: "bg-green-100",
                textColor: "text-green-800",
                tags: ["Auto-cálculo", "Seguimiento", "Estados"]
              },
              {
                icon: BarChart3,
                title: "Reportes Avanzados",
                description: "Estadísticas en tiempo real, gráficos interactivos y exportación automática de datos",
                color: "from-purple-500 to-purple-600",
                bgColor: "bg-purple-100", 
                textColor: "text-purple-800",
                tags: ["Tiempo Real", "Gráficos", "Exportar"]
              },
              {
                icon: Shield,
                title: "Seguridad Total",
                description: "Autenticación multi-factor, encriptación de extremo a extremo y cumplimiento GDPR",
                color: "from-red-500 to-red-600",
                bgColor: "bg-red-100",
                textColor: "text-red-800", 
                tags: ["MFA", "Encriptación", "GDPR"]
              },
              {
                icon: Smartphone,
                title: "Acceso Móvil",
                description: "Aplicación nativa para iOS y Android, diseño responsive y sincronización en tiempo real",
                color: "from-yellow-500 to-yellow-600",
                bgColor: "bg-yellow-100",
                textColor: "text-yellow-800",
                tags: ["iOS/Android", "Responsive", "Sync"]
              },
              {
                icon: TrendingUp,
                title: "Multi-Empresa",
                description: "Gestiona múltiples empresas desde una cuenta, roles personalizados y facturación separada",
                color: "from-indigo-500 to-indigo-600",
                bgColor: "bg-indigo-100",
                textColor: "text-indigo-800",
                tags: ["Multi-tenant", "Roles", "Facturación"]
              }
            ].map((feature, index) => (
              <Card key={index} className="group bg-white border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-500 card-hover">
                <CardHeader className="text-center pb-4">
                  <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold mb-4 text-gray-900">{feature.title}</CardTitle>
                  <CardDescription className="text-gray-600 leading-relaxed text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {feature.tags.map((tag, tagIndex) => (
                      <span key={tagIndex} className={`px-3 py-1 ${feature.bgColor} ${feature.textColor} rounded-full text-xs font-medium`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 gradient-bg">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Lo que dicen nuestros{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">clientes</span>
            </h2>
            <p className="text-xl text-gray-600">Testimonios reales de empresas que confían en nosotros</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "María González",
                role: "CEO, FinanceMax",
                avatar: "MG",
                rating: 5,
                testimonial: "Revolucionó completamente nuestra operación. Ahora procesamos 3x más préstamos con la mitad del tiempo. La automatización es increíble.",
                color: "from-blue-500 to-blue-600",
                textColor: "text-blue-600",
                year: "2022"
              },
              {
                name: "Carlos Ruiz",
                role: "Director, CreditPro", 
                avatar: "CR",
                rating: 5,
                testimonial: "La mejor inversión que hemos hecho. El ROI se vio desde el primer mes. El soporte técnico es excepcional, siempre disponibles.",
                color: "from-green-500 to-green-600",
                textColor: "text-green-600",
                year: "2021"
              },
              {
                name: "Ana López",
                role: "Fundadora, MicroCredit",
                avatar: "AL", 
                rating: 5,
                testimonial: "Interfaz intuitiva y potente. Nuestro equipo se adaptó en días, no semanas. Los reportes son perfectos para la toma de decisiones.",
                color: "from-purple-500 to-purple-600",
                textColor: "text-purple-600",
                year: "2023"
              }
            ].map((testimonial, index) => (
              <Card key={index} className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl hover:shadow-2xl transition-all card-hover">
                <CardContent className="pt-8">
                  <div className="flex items-center mb-6">
                    <div className="flex text-yellow-400 text-xl">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-current" />
                      ))}
                    </div>
                    <span className="ml-2 text-sm text-gray-500 font-medium">5.0</span>
                  </div>
                  <blockquote className="text-gray-700 mb-6 text-lg leading-relaxed">
                    "{testimonial.testimonial}"
                  </blockquote>
                  <div className="flex items-center">
                    <div className={`w-12 h-12 bg-gradient-to-r ${testimonial.color} rounded-full flex items-center justify-center text-white font-bold mr-4 shadow-lg`}>
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-500">{testimonial.role}</div>
                      <div className={`text-xs ${testimonial.textColor} font-medium`}>
                        Cliente desde {testimonial.year}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Planes que se adaptan a tu{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">negocio</span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 mb-8">
              Comienza gratis y escala según tus necesidades
            </p>
            
            {/* Pricing Toggle */}
            <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
              <button 
                onClick={() => setIsMonthly(true)}
                className={`px-6 py-2 rounded-full font-medium transition-all ${
                  isMonthly 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600'
                }`}
              >
                Mensual
              </button>
              <button 
                onClick={() => setIsMonthly(false)}
                className={`px-6 py-2 rounded-full font-medium transition-all ${
                  !isMonthly 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600'
                }`}
              >
                Anual <span className="text-green-600 text-sm">(20% desc)</span>
              </button>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Basic Plan */}
            <Card className="border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold mb-2 text-gray-900">Básico</CardTitle>
                <CardDescription className="text-gray-600 mb-6">Para emprendedores</CardDescription>
                <div className="text-5xl font-bold text-gray-900 mb-2">
                  ${isMonthly ? '29' : '23'}
                  <span className="text-xl font-normal text-gray-500">/mes</span>
                </div>
                <p className="text-sm text-gray-500">+ impuestos</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4 mb-8">
                  {[
                    "Hasta 100 clientes",
                    "Hasta 500 préstamos", 
                    "Reportes básicos",
                    "Soporte por email",
                    "1 empresa"
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register?plan=basic">
                  <Button variant="outline" className="w-full py-3 font-semibold">
                    Comenzar Gratis
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="relative border-2 border-blue-500 shadow-xl hover:shadow-2xl transition-all transform hover:scale-105">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                  🔥 MÁS POPULAR
                </span>
              </div>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold mb-2 text-gray-900">Premium</CardTitle>
                <CardDescription className="text-gray-600 mb-6">Para pequeñas empresas</CardDescription>
                <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent mb-2">
                  ${isMonthly ? '79' : '63'}
                  <span className="text-xl font-normal text-gray-500">/mes</span>
                </div>
                <p className="text-sm text-gray-500">+ impuestos</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4 mb-8">
                  {[
                    "Hasta 1,000 clientes",
                    "Préstamos ilimitados",
                    "Reportes avanzados", 
                    "Notificaciones automáticas",
                    "Soporte prioritario",
                    "Hasta 3 empresas"
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register?plan=premium">
                  <Button className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 font-semibold">
                    Comenzar Prueba
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Enterprise Plan */}
            <Card className="border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold mb-2 text-gray-900">Enterprise</CardTitle>
                <CardDescription className="text-gray-600 mb-6">Para grandes empresas</CardDescription>
                <div className="text-5xl font-bold text-gray-900 mb-2">
                  ${isMonthly ? '199' : '159'}
                  <span className="text-xl font-normal text-gray-500">/mes</span>
                </div>
                <p className="text-sm text-gray-500">+ impuestos</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4 mb-8">
                  {[
                    "Clientes ilimitados",
                    "Empresas ilimitadas", 
                    "API completa",
                    "Integraciones personalizadas",
                    "Soporte 24/7",
                    "Manager dedicado"
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full py-3 font-semibold hover:border-purple-500 hover:text-purple-600">
                  Contactar Ventas
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Money back guarantee */}
          <div className="text-center mt-12">
            <div className="inline-flex items-center bg-green-50 px-6 py-3 rounded-full border border-green-200">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-green-800 font-medium">30 días de garantía de devolución del dinero</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 text-white relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            ¿Listo para transformar tu negocio?
          </h2>
          <p className="text-xl md:text-2xl mb-12 opacity-90 max-w-3xl mx-auto leading-relaxed">
            Únete a más de 500 empresas que ya confían en nuestro sistema para gestionar sus préstamos de forma profesional
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link href="/register">
              <Button size="lg" className="group bg-white text-blue-600 hover:bg-gray-50 rounded-xl text-lg font-bold px-10 py-4 transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl">
                <Zap className="mr-3 h-6 w-6 group-hover:animate-pulse" />
                Comenzar Prueba Gratuita
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="px-10 py-4 border-2 border-white/30 text-white hover:border-white hover:bg-white/10 rounded-xl text-lg font-semibold transition-all">
              <Calendar className="mr-3 h-6 w-6" />
              Agendar Demo Personalizado
            </Button>
          </div>
          
          {/* Trust indicators */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 items-center opacity-80">
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">500+</div>
              <div className="text-sm opacity-80">Empresas activas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">$50M+</div>
              <div className="text-sm opacity-80">Volumen gestionado</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">99.9%</div>
              <div className="text-sm opacity-80">Uptime SLA</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">24/7</div>
              <div className="text-sm opacity-80">Soporte técnico</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl">
                  <Calculator className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold">Control de Préstamos</span>
              </div>
              <p className="text-gray-400 leading-relaxed max-w-md mb-6">
                Sistema integral para la gestión profesional de préstamos. Automatiza tus procesos, 
                reduce errores y aumenta tu rentabilidad.
              </p>
              <div className="flex space-x-4">
                <Link href="#" className="w-10 h-10 bg-gray-800 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-colors">
                  <span className="sr-only">Facebook</span>
                  <Facebook className="h-5 w-5" />
                </Link>
                <Link href="#" className="w-10 h-10 bg-gray-800 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-colors">
                  <span className="sr-only">Twitter</span>
                  <Twitter className="h-5 w-5" />
                </Link>
                <Link href="#" className="w-10 h-10 bg-gray-800 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-colors">
                  <span className="sr-only">LinkedIn</span>
                  <Linkedin className="h-5 w-5" />
                </Link>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-6 text-lg">Producto</h3>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <button 
                    onClick={() => scrollToSection('features')}
                    className="hover:text-white transition-colors text-left"
                  >
                    Características
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('pricing')}
                    className="hover:text-white transition-colors text-left"
                  >
                    Precios
                  </button>
                </li>
                <li><Link href="/demo" className="hover:text-white transition-colors">Demo</Link></li>
                <li><Link href="/api-docs" className="hover:text-white transition-colors">API</Link></li>
                <li><Link href="/integrations" className="hover:text-white transition-colors">Integraciones</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-6 text-lg">Soporte</h3>
              <ul className="space-y-3 text-gray-400">
                <li><Link href="/help" className="hover:text-white transition-colors">Centro de Ayuda</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contacto</Link></li>
                <li><Link href="/docs" className="hover:text-white transition-colors">Documentación</Link></li>
                <li><Link href="/status" className="hover:text-white transition-colors">Estado del Sistema</Link></li>
                <li><Link href="/webinars" className="hover:text-white transition-colors">Webinars</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-gray-400 text-sm mb-4 md:mb-0">
                <p>&copy; 2025 Control de Préstamos. Todos los derechos reservados.</p>
              </div>
              <div className="flex space-x-6 text-sm text-gray-400">
                <Link href="/privacy" className="hover:text-white transition-colors">Privacidad</Link>
                <Link href="/terms" className="hover:text-white transition-colors">Términos</Link>
                <Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link>
                <Link href="/security" className="hover:text-white transition-colors">Seguridad</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}