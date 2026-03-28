import { PurchasePaymentMethod, AssignmentPaymentMethod, ClientStatus, UserRole, CampaignType, CampaignStatus, CampaignSegment } from './types'

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

export const CAMPAIGN_TYPES: { value: CampaignType; label: string; icon: string; description: string; color: string }[] = [
  { value: 'expiring', label: 'Recordatorio de Vencimiento', icon: 'AlertTriangle', description: 'Avisa a clientes que su servicio está por vencer', color: 'text-orange-600 bg-orange-100' },
  { value: 'reactivation', label: 'Reactivación', icon: 'RefreshCw', description: 'Invita a clientes inactivos a renovar su servicio', color: 'text-blue-600 bg-blue-100' },
  { value: 'promotion', label: 'Promoción / Ventas', icon: 'Megaphone', description: 'Envía ofertas especiales a tus clientes', color: 'text-green-600 bg-green-100' },
  { value: 'welcome', label: 'Bienvenida', icon: 'PartyPopper', description: 'Da la bienvenida a clientes nuevos', color: 'text-purple-600 bg-purple-100' },
]

export const CAMPAIGN_STATUSES: { value: CampaignStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Borrador', color: 'bg-gray-100 text-gray-700' },
  { value: 'sending', label: 'Enviando', color: 'bg-blue-100 text-blue-700' },
  { value: 'sent', label: 'Enviada', color: 'bg-green-100 text-green-700' },
  { value: 'failed', label: 'Fallida', color: 'bg-red-100 text-red-700' },
]

export const CAMPAIGN_SEGMENTS: { value: CampaignSegment; label: string; description: string }[] = [
  { value: 'empty', label: 'Vacio (solo manuales)', description: 'Sin destinatarios, agrega emails manualmente' },
  { value: 'expiring_7d', label: 'Vencen en 7 dias', description: 'Clientes activos con vencimiento proximo' },
  { value: 'expiring_14d', label: 'Vencen en 14 días', description: 'Clientes activos con vencimiento en 2 semanas' },
  { value: 'expiring_30d', label: 'Vencen en 30 días', description: 'Clientes activos con vencimiento en 1 mes' },
  { value: 'inactive', label: 'Inactivos', description: 'Clientes con servicio expirado' },
  { value: 'active', label: 'Todos los activos', description: 'Clientes con servicio vigente' },
  { value: 'all', label: 'Todos', description: 'Todos los clientes con email' },
]
