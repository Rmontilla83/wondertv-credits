'use client'

import { useAuth } from '@/components/AuthProvider'
import { CreditPurchaseForm } from '@/components/forms/CreditPurchaseForm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function NewCreditPurchasePage() {
  const { profile } = useAuth()

  if (profile?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">No tienes permisos para registrar compras</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/credits">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Nueva Compra de Créditos</h1>
      </div>
      <CreditPurchaseForm />
    </div>
  )
}
