'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { CreditGauge } from '@/components/dashboard/CreditGauge'
import { PurchasesTable } from '@/components/tables/PurchasesTable'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { CreditBalance, CreditPurchase } from '@/lib/types'
import { Plus } from 'lucide-react'

export default function CreditsPage() {
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState<CreditBalance | null>(null)
  const [purchases, setPurchases] = useState<CreditPurchase[]>([])
  const { profile } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      const [balanceRes, purchasesRes] = await Promise.all([
        supabase.from('credit_balance').select('*').single(),
        supabase
          .from('credit_purchases')
          .select('*, profiles(full_name)')
          .order('purchased_at', { ascending: false }),
      ])

      if (balanceRes.data) setBalance(balanceRes.data)
      if (purchasesRes.data) setPurchases(purchasesRes.data)
      setLoading(false)
    }

    fetchData()
  }, [supabase])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-80" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Créditos</h1>
        {profile?.role === 'admin' && (
          <Link href="/dashboard/credits/new">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Registrar Compra
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CreditGauge
          available={balance?.available_credits ?? 0}
          total={balance?.total_purchased ?? 0}
          assigned={balance?.total_assigned ?? 0}
        />
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Historial de Compras</h2>
          <PurchasesTable purchases={purchases} />
        </div>
      </div>
    </div>
  )
}
