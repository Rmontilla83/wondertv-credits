import { PurchasePaymentMethod, AssignmentPaymentMethod, ClientStatus, UserRole } from './types'

export const PURCHASE_PAYMENT_METHODS: { value: PurchasePaymentMethod; label: string }[] = [
  { value: 'banesco_bss', label: 'Banesco BSS' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'zelle', label: 'Zelle (Bank of America)' },
]

export const ASSIGNMENT_PAYMENT_METHODS: { value: AssignmentPaymentMethod; label: string; description?: string }[] = [
  { value: 'banesco_bss', label: 'Banesco BSS', description: 'Pago en bolívares a tasa paralelo' },
  { value: 'zelle', label: 'Zelle (Bank of America)', description: 'Pago en USD vía Zelle' },
  { value: 'paypal', label: 'PayPal', description: 'Pago en USD vía PayPal' },
]

export const CLIENT_STATUSES: { value: ClientStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Activo', color: 'bg-green-100 text-green-800' },
  { value: 'inactive', label: 'Inactivo', color: 'bg-gray-100 text-gray-800' },
  { value: 'suspended', label: 'Suspendido', color: 'bg-red-100 text-red-800' },
]

export const USER_ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'operator', label: 'Operador' },
  { value: 'viewer', label: 'Visor' },
]

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  banesco_bss: 'Banesco BSS',
  paypal: 'PayPal',
  zelle: 'Zelle',
}
