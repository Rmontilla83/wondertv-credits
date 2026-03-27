'use client'

import { Suspense } from 'react'
import { AssignmentForm } from '@/components/forms/AssignmentForm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function NewAssignmentPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/assignments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Asignar Créditos</h1>
      </div>
      <Suspense>
        <AssignmentForm />
      </Suspense>
    </div>
  )
}
