'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/AuthProvider'
import {
  LayoutDashboard,
  CreditCard,
  Users,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  RefreshCw,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Créditos', href: '/dashboard/credits', icon: CreditCard },
  { name: 'Clientes', href: '/dashboard/clients', icon: Users },
  { name: 'Asignaciones', href: '/dashboard/assignments', icon: FileText },
  { name: 'Finanzas', href: '/dashboard/financials', icon: BarChart3 },
  { name: 'Sync Flujo TV', href: '/dashboard/sync', icon: RefreshCw, adminOnly: true },
  { name: 'Configuración', href: '/dashboard/settings', icon: Settings, adminOnly: true },
]

export function Sidebar() {
  const pathname = usePathname()
  const { profile, signOut } = useAuth()

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-gray-900 text-white min-h-screen">
      <div className="flex items-center justify-center px-6 py-4 border-b border-gray-800">
        <Image
          src="/logo-light-bg.png"
          alt="Wonder TV"
          width={140}
          height={78}
          priority
        />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          if (item.adminOnly && profile?.role !== 'admin') return null
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-800">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium truncate">{profile?.full_name}</p>
          <p className="text-xs text-gray-400 capitalize">{profile?.role}</p>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
