'use client'

import Image from 'next/image'
import { useAuth } from '@/components/AuthProvider'
import { MobileNav } from './MobileNav'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function Header() {
  const { profile } = useAuth()

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '??'

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-white px-4 lg:px-6">
      <MobileNav />
      <Image
        src="/logo-small.png"
        alt="Wonder TV"
        width={32}
        height={32}
        className="hidden lg:block"
      />
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium">{profile?.full_name}</p>
          <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
        </div>
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-blue-600 text-white text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
