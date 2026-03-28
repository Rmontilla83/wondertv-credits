'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  Menu,
  LayoutDashboard,
  CreditCard,
  Users,
  BarChart3,
  Settings,
  LogOut,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Créditos', href: '/dashboard/credits', icon: CreditCard },
  { name: 'Clientes', href: '/dashboard/clients', icon: Users },
  { name: 'Vencimientos', href: '/dashboard/expiring', icon: AlertTriangle },
  { name: 'Finanzas', href: '/dashboard/financials', icon: BarChart3 },
  { name: 'Sync Flujo TV', href: '/dashboard/sync', icon: RefreshCw, adminOnly: true },
  { name: 'Configuración', href: '/dashboard/settings', icon: Settings, adminOnly: true },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { profile, signOut } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    supabase
      .from('credit_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('payment_status', 'pending')
      .then(({ count }) => {
        if (count != null) setPendingCount(count)
      })
  }, [supabase])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" />}>
        <Menu className="h-5 w-5" />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {pendingCount}
          </span>
        )}
        <span className="sr-only">Menú</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-gray-900 text-white p-0 border-gray-800">
        <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
        <div className="flex items-center justify-center px-6 py-5 border-b border-gray-800">
          <Image
            src="/logo-dark-bg.png"
            alt="Wonder TV"
            width={100}
            height={100}
            className="rounded-2xl"
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
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {item.name}
                {item.href === '/dashboard' && pendingCount > 0 && (
                  <span className="ml-auto bg-orange-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                    {pendingCount}
                  </span>
                )}
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
            onClick={() => { signOut(); setOpen(false) }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            Cerrar sesión
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
