'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { USER_ROLES } from '@/lib/constants'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import type { ExchangeRate } from '@/lib/types'
import { Loader2, UserPlus, Save, Edit, UserX, UserCheck } from 'lucide-react'

interface UserWithAuth {
  id: string
  full_name: string
  role: string
  phone: string | null
  created_at: string
  email: string
  banned: boolean
  last_sign_in: string | null
}

export default function SettingsPage() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserWithAuth[]>([])
  const [rates, setRates] = useState<ExchangeRate[]>([])

  // New user form
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('operator')
  const [newPassword, setNewPassword] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [creatingUser, setCreatingUser] = useState(false)

  // Edit user
  const [editingUser, setEditingUser] = useState<UserWithAuth | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Exchange rate
  const [newRate, setNewRate] = useState('')
  const [savingRate, setSavingRate] = useState(false)

  // App settings
  const [downloaderCode, setDownloaderCode] = useState('')
  const [savingCode, setSavingCode] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  const fetchUsers = useCallback(async () => {
    const res = await fetch('/api/users')
    if (res.ok) {
      const data = await res.json()
      setUsers(data)
    }
  }, [])

  useEffect(() => {
    async function fetchData() {
      try {
        await fetchUsers()

        const { data: ratesData } = await supabase
          .from('exchange_rates')
          .select('*')
          .order('recorded_at', { ascending: false })
          .limit(10)

        if (ratesData) setRates(ratesData)

        const { data: settingsData } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'downloader_code')
          .single()
        if (settingsData) setDownloaderCode(settingsData.value)
      } catch (error) {
        console.error('Error fetching settings data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, fetchUsers])

  if (profile?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">Solo administradores pueden acceder a esta página</p>
      </div>
    )
  }

  const handleCreateUser = async () => {
    if (!newEmail || !newName || !newPassword) {
      toast.error('Completa todos los campos requeridos')
      return
    }

    setCreatingUser(true)

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newEmail,
        password: newPassword,
        full_name: newName,
        role: newRole,
        phone: newPhone,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      toast.error('Error al crear usuario', { description: data.error })
      setCreatingUser(false)
      return
    }

    toast.success('Usuario creado exitosamente')
    setNewEmail('')
    setNewName('')
    setNewPassword('')
    setNewPhone('')
    setNewRole('operator')
    setCreatingUser(false)
    await fetchUsers()
  }

  const openEditDialog = (user: UserWithAuth) => {
    setEditingUser(user)
    setEditName(user.full_name)
    setEditRole(user.role)
    setEditPhone(user.phone ?? '')
  }

  const handleSaveEdit = async () => {
    if (!editingUser) return
    setSavingEdit(true)

    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingUser.id,
        full_name: editName,
        role: editRole,
        phone: editPhone,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      toast.error('Error al actualizar usuario', { description: data.error })
      setSavingEdit(false)
      return
    }

    toast.success('Usuario actualizado')
    setSavingEdit(false)
    setEditingUser(null)
    await fetchUsers()
  }

  const handleToggleBan = async (user: UserWithAuth) => {
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: user.id,
        banned: !user.banned,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      toast.error('Error', { description: data.error })
      return
    }

    toast.success(user.banned ? 'Usuario activado' : 'Usuario desactivado')
    await fetchUsers()
  }

  const handleSaveRate = async () => {
    if (!newRate) {
      toast.error('Ingresa una tasa de cambio')
      return
    }

    setSavingRate(true)
    const { error } = await supabase.from('exchange_rates').insert({
      rate_bss_usd: Number(newRate),
      source: 'manual',
    })

    if (error) {
      toast.error('Error al guardar tasa', { description: error.message })
      setSavingRate(false)
      return
    }

    toast.success('Tasa de cambio guardada')
    setNewRate('')
    setSavingRate(false)

    const { data } = await supabase.from('exchange_rates').select('*').order('recorded_at', { ascending: false }).limit(10)
    if (data) setRates(data)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuración</h1>

      {/* User Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gestión de Usuarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Existing Users */}
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={
                        u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        u.role === 'operator' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {USER_ROLES.find((r) => r.value === u.role)?.label ?? u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{u.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={u.banned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                        {u.banned ? 'Inactivo' : 'Activo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDateTime(u.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(u)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {u.id !== profile?.id && (
                          <AlertDialog>
                            <AlertDialogTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-8 w-8 ${u.banned ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'}`}
                                  title={u.banned ? 'Activar' : 'Desactivar'}
                                />
                              }
                            >
                              {u.banned ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {u.banned ? 'Activar usuario' : 'Desactivar usuario'}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {u.banned
                                    ? `¿Activar a "${u.full_name}"? Podrá iniciar sesión nuevamente.`
                                    : `¿Desactivar a "${u.full_name}"? No podrá iniciar sesión hasta que lo reactives.`}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleToggleBan(u)}
                                  className={u.banned ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                                >
                                  {u.banned ? 'Activar' : 'Desactivar'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Edit User Dialog */}
          <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Usuario</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={editingUser?.email ?? ''} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editName">Nombre completo</Label>
                  <Input
                    id="editName"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select value={editRole} onValueChange={(v) => v && setEditRole(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPhone">Teléfono</Label>
                  <Input
                    id="editPhone"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+58 412 1234567"
                  />
                </div>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                >
                  {savingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar Cambios
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Separator />

          {/* Add New User */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Crear Nuevo Usuario
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="newName">Nombre completo *</Label>
                <Input
                  id="newName"
                  placeholder="Juan Pérez"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newEmail">Correo electrónico *</Label>
                <Input
                  id="newEmail"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Contraseña temporal *</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Rol *</Label>
                <Select value={newRole} onValueChange={(v) => v && setNewRole(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="newPhone">Teléfono</Label>
                <Input
                  id="newPhone"
                  placeholder="+58 412 1234567"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    className="mt-3 bg-blue-600 hover:bg-blue-700"
                    disabled={creatingUser || !newEmail || !newName || !newPassword}
                  />
                }
              >
                {creatingUser ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Crear Usuario
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar</AlertDialogTitle>
                  <AlertDialogDescription>
                    ¿Crear usuario &quot;{newName}&quot; ({newEmail}) con rol {USER_ROLES.find((r) => r.value === newRole)?.label}?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCreateUser} className="bg-blue-600 hover:bg-blue-700">
                    Confirmar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Exchange Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tasa de Cambio BSS/USD</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 items-end">
            <div className="space-y-2 flex-1 max-w-xs">
              <Label htmlFor="rate">Nueva tasa (BSS por 1 USD)</Label>
              <Input
                id="rate"
                type="number"
                step="0.0001"
                placeholder="Ej: 36.5000"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
              />
            </div>
            <Button onClick={handleSaveRate} disabled={savingRate || !newRate} className="bg-blue-600 hover:bg-blue-700">
              {savingRate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar
            </Button>
          </div>

          {rates.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-3">Historial de Tasas</h3>
                <div className="rounded-md border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Tasa BSS/USD</TableHead>
                        <TableHead>Fuente</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rates.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{formatDateTime(r.recorded_at)}</TableCell>
                          <TableCell className="text-right font-medium">{r.rate_bss_usd}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{r.source}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {/* App Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuracion de la App</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Codigo de Downloader</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Este codigo lo usa Valentina (chatbot) cuando da instrucciones de instalacion.
              Actualizado cuando el proveedor cambia el codigo.
            </p>
            <div className="flex gap-2">
              <Input
                value={downloaderCode}
                onChange={(e) => setDownloaderCode(e.target.value)}
                placeholder="5868166"
                className="font-mono max-w-[200px]"
              />
              <Button
                onClick={async () => {
                  if (!downloaderCode.trim()) { toast.error('Ingresa un codigo'); return }
                  setSavingCode(true)
                  const { error } = await supabase
                    .from('app_settings')
                    .upsert({ key: 'downloader_code', value: downloaderCode.trim(), updated_at: new Date().toISOString() })
                  if (error) {
                    toast.error('Error al guardar: ' + error.message)
                  } else {
                    toast.success('Codigo de Downloader actualizado. Valentina ya usa el nuevo codigo.')
                  }
                  setSavingCode(false)
                }}
                disabled={savingCode}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {savingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Guardar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
