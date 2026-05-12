<script setup lang="ts">
import { useConfirm } from '../composables/useConfirm'
import { ref, computed, onMounted } from 'vue'
import api from '../services/api.ts'
import { useToast } from '../composables/useToast.ts'
import { useValidation } from '../composables/useValidation.ts'
import PsPagination from '../components/PsPagination.vue'
import PasswordStrengthMeter from '../components/PasswordStrengthMeter.vue'

defineOptions({ name: 'UsersView' })

const { confirmDialog } = useConfirm()
const { toast } = useToast()
const v = useValidation()

const users   = ref<any[]>([])
const loading = ref(true)
const search  = ref('')
const openMenuId = ref<number | null>(null)

// Static role list — matches TenantRoles.Valid in the backend
const ROLES = [
  { value: 'ProcurementOfficer', label: 'Procurement Officer' },
  { value: 'WarehouseStaff',     label: 'Warehouse Staff' },
  { value: 'LogisticsStaff',     label: 'Logistics Staff' },
  { value: 'Cashier',            label: 'Cashier' },
]

async function load() {
  loading.value = true
  try {
    users.value = await api.get('/tenant/users').then(r => r.data)
  } catch {
    toast('Failed to load users.', 'error')
  } finally {
    loading.value = false
  }
}
onMounted(load)

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return users.value
  return users.value.filter(u =>
    u.firstName?.toLowerCase().includes(q) ||
    u.lastName?.toLowerCase().includes(q)  ||
    u.email?.toLowerCase().includes(q)
  )
})

// Pagination
const page     = ref(1)
const pageSize = ref(10)
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

const showModal = ref(false)
const isEdit    = ref(false)
const saving    = ref(false)
const editId    = ref<number | null>(null)
const form      = ref({ firstName: '', lastName: '', email: '', password: '', roleTypeName: '' as string, status: 'Active' })
const fe        = ref({ firstName: '', email: '', password: '', roleTypeName: '' })

function clearErrors() { fe.value = { firstName: '', email: '', password: '', roleTypeName: '' } }

function openAdd() {
  isEdit.value = false; editId.value = null
  form.value   = { firstName: '', lastName: '', email: '', password: '', roleTypeName: '', status: 'Active' }
  clearErrors(); showModal.value = true
}

function openEdit(u: any) {
  isEdit.value = true; editId.value = u.userId
  form.value   = { firstName: u.firstName, lastName: u.lastName, email: u.email, password: '', roleTypeName: u.roleName ?? '', status: u.status }
  clearErrors(); showModal.value = true
  openMenuId.value = null
}

async function save() {
  clearErrors()
  fe.value.firstName    = v.required(form.value.firstName, 'First name')
  fe.value.email        = v.validate(form.value.email, [
    (val) => v.required(val, 'Email'), v.email
  ])
  fe.value.roleTypeName = v.required(form.value.roleTypeName, 'Role')
  if (!isEdit.value) {
    fe.value.password   = v.validate(form.value.password, [
      (val) => v.required(val, 'Password'),
      v.minLength(8),
    ])
  } else if (form.value.password) {
    fe.value.password   = v.minLength(8)(form.value.password)
  }

  if (Object.values(fe.value).some(Boolean)) return

  saving.value = true
  try {
    if (isEdit.value) {
      await api.put(`/tenant/users/${editId.value}`, {
        firstName: form.value.firstName, lastName: form.value.lastName,
        status: form.value.status, roleTypeName: form.value.roleTypeName,
        password: form.value.password || undefined,
      })
      toast('User updated.')
    } else {
      await api.post('/tenant/users', {
        firstName: form.value.firstName, lastName: form.value.lastName,
        email: form.value.email, password: form.value.password,
        roleTypeName: form.value.roleTypeName,
      })
      toast('User created.')
    }
    showModal.value = false; await load()
  } catch (e) {
    toast(v.parseApiError(e), 'error')
  } finally { saving.value = false }
}

async function deactivate(u: any) {
  openMenuId.value = null
  if (!await confirmDialog(`Deactivate ${u.firstName} ${u.lastName}?`)) return
  try { await api.delete(`/tenant/users/${u.userId}`); toast('User deactivated.'); await load() }
  catch { toast('Failed to deactivate user.', 'error') }
}

// Admin password reset
const showResetPwd   = ref(false)
const resetPwdTarget = ref<any>(null)
const resetPwdVal    = ref('')
const resetPwdConfirm = ref('')
const resetPwdSaving = ref(false)
const resetPwdErr    = ref('')

function openResetPwd(u: any) {
  openMenuId.value  = null
  resetPwdTarget.value  = u
  resetPwdVal.value     = ''
  resetPwdConfirm.value = ''
  resetPwdErr.value     = ''
  showResetPwd.value    = true
}

const resetPwdMeterRef = ref<any>(null)
const resetPwdStrong   = computed(() => resetPwdMeterRef.value?.isStrong ?? false)

async function submitResetPwd() {
  resetPwdErr.value = ''
  if (!resetPwdStrong.value) { resetPwdErr.value = 'Password does not meet all requirements.'; return }
  if (resetPwdVal.value !== resetPwdConfirm.value) { resetPwdErr.value = 'Passwords do not match.'; return }
  resetPwdSaving.value = true
  try {
    await api.put(`/tenant/users/${resetPwdTarget.value.userId}/password`, { newPassword: resetPwdVal.value })
    showResetPwd.value = false
    toast(`Password reset for ${resetPwdTarget.value.firstName}.`)
  } catch (e: any) {
    resetPwdErr.value = v.parseApiError(e)
  } finally { resetPwdSaving.value = false }
}

const fmtDate  = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const initials = (u: any) => ((u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')).toUpperCase()
const avatarCls = (id: number) => `ps-avatar ps-avatar-${id % 8}`
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Page header -->
    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Users</h1>
        <p class="ps-page-sub">Manage your store staff and their roles.</p>
      </div>
      <button @click="openAdd" class="ps-btn ps-btn-primary">
        <i class="ph ph-plus"></i> Add User
      </button>
    </div>

    <!-- Datatable card -->
    <div class="ps-card overflow-hidden">

      <!-- Toolbar -->
      <div class="ps-table-toolbar">
        <div>
          <div class="ps-table-title">Staff Members</div>
          <div class="ps-table-subtitle">{{ filtered.length }} total user{{ filtered.length !== 1 ? 's' : '' }}</div>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <div class="ps-search">
            <i class="ph ph-magnifying-glass"></i>
            <input v-model="search" placeholder="Search…" />
          </div>
          <button class="ps-btn ps-btn-primary">
            <i class="ph ph-funnel"></i> Filter
          </button>
          <button class="ps-btn ps-btn-dark">
            <i class="ph ph-download-simple"></i> Export
          </button>
        </div>
      </div>

      <!-- Table body -->
      <div v-if="loading" class="p-6 space-y-3">
        <div v-for="i in 5" :key="i" class="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
      <div v-else-if="filtered.length === 0" class="flex flex-col items-center gap-3 py-16 text-slate-400">
        <i class="ph-fill ph-users text-5xl text-slate-200"></i>
        <p class="text-sm">No users found.</p>
      </div>
      <table v-else class="ps-table">
        <thead>
          <tr>
            <th style="width: 40px"><input type="checkbox" class="accent-blue-500" /></th>
            <th>ID</th>
            <th>Joined</th>
            <th>Name</th>
            <th>Email Address</th>
            <th>Role</th>
            <th>Status</th>
            <th style="width: 50px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in paged" :key="u.userId">
            <td><input type="checkbox" class="accent-blue-500" /></td>
            <td class="text-slate-500 font-medium">#{{ String(u.userId).padStart(5, '0') }}</td>
            <td class="text-slate-500">{{ fmtDate(u.createdAt) }}</td>
            <td>
              <div class="flex items-center gap-2.5">
                <div :class="avatarCls(u.userId)">{{ initials(u) }}</div>
                <span class="font-semibold text-slate-800">{{ u.firstName }} {{ u.lastName }}</span>
              </div>
            </td>
            <td class="text-slate-500">{{ u.email }}</td>
            <td><span class="ps-tag ps-tag-blue">{{ u.roleName ?? 'No Role' }}</span></td>
            <td>
              <span :class="['ps-tag', u.status === 'Active' ? 'ps-tag-green' : 'ps-tag-slate']">
                {{ u.status }}
              </span>
            </td>
            <td>
              <div class="relative">
                <button @click="openMenuId = openMenuId === u.userId ? null : u.userId"
                  class="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all">
                  <i class="ph ph-dots-three"></i>
                </button>
                <div v-if="openMenuId === u.userId"
                  class="absolute right-0 top-9 z-10 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 text-sm">
                  <button @click="openEdit(u)"
                    class="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                    <i class="ph ph-pencil-simple text-slate-400"></i> Edit
                  </button>
                  <button @click="openResetPwd(u)"
                    class="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                    <i class="ph ph-key text-slate-400"></i> Reset Password
                  </button>
                  <button v-if="u.status === 'Active'" @click="deactivate(u)"
                    class="w-full text-left px-3.5 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2">
                    <i class="ph ph-x-circle"></i> Deactivate
                  </button>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <PsPagination
        v-if="!loading"
        v-model:page="page"
        v-model:pageSize="pageSize"
        :total="filtered.length"
        record-label="users"
      />
    </div>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showModal" class="ps-modal-backdrop" @click.self="showModal = false">
          <div class="ps-modal-card" style="max-width: 560px">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">{{ isEdit ? 'Edit User' : 'Add New User' }}</h3>
              <button class="ps-modal-close" @click="showModal = false" aria-label="Close">
                <i class="ph ph-x"></i>
              </button>
            </div>
            <div class="ps-modal-body">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="ps-label">First Name *</label>
                  <input v-model="form.firstName" placeholder="First name" :class="['ps-input', fe.firstName && 'border-red-400']" />
                  <p v-if="fe.firstName" class="ps-field-error">{{ fe.firstName }}</p>
                </div>
                <div>
                  <label class="ps-label">Last Name</label>
                  <input v-model="form.lastName" placeholder="Last name" class="ps-input" />
                </div>
                <div v-if="!isEdit">
                  <label class="ps-label">Email *</label>
                  <input v-model="form.email" type="email" placeholder="user@email.com" :class="['ps-input', fe.email && 'border-red-400']" autocomplete="off" />
                  <p v-if="fe.email" class="ps-field-error">{{ fe.email }}</p>
                </div>
                <div>
                  <label class="ps-label">{{ isEdit ? 'New Password (blank to keep)' : 'Password *' }}</label>
                  <input v-model="form.password" type="password" placeholder="••••••••" :class="['ps-input', fe.password && 'border-red-400']" autocomplete="new-password" />
                  <p v-if="fe.password" class="ps-field-error">{{ fe.password }}</p>
                </div>
                <div>
                  <label class="ps-label">Role *</label>
                  <select v-model="form.roleTypeName" :class="['ps-input', fe.roleTypeName && 'border-red-400']">
                    <option value="">— Select Role —</option>
                    <option v-for="r in ROLES" :key="r.value" :value="r.value">{{ r.label }}</option>
                  </select>
                  <p v-if="fe.roleTypeName" class="ps-field-error">{{ fe.roleTypeName }}</p>
                </div>
                <div v-if="isEdit">
                  <label class="ps-label">Status</label>
                  <select v-model="form.status" class="ps-input">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="showModal = false">Cancel</button>
              <button class="ps-btn ps-btn-primary" :disabled="saving" @click="save">
                <i v-if="saving" class="ph ph-spinner animate-spin"></i>
                {{ saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Reset Password Modal -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showResetPwd" class="ps-modal-backdrop" @click.self="showResetPwd = false">
          <div class="ps-modal-card" style="max-width:420px">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title flex items-center gap-2">
                <i class="ph-fill ph-key text-blue-500"></i>
                Reset Password — {{ resetPwdTarget?.firstName }} {{ resetPwdTarget?.lastName }}
              </h3>
              <button class="ps-modal-close" @click="showResetPwd = false"><i class="ph ph-x"></i></button>
            </div>
            <div class="ps-modal-body flex flex-col gap-4">
              <div v-if="resetPwdErr" class="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                <i class="ph-fill ph-warning-circle mt-0.5 flex-shrink-0"></i><span>{{ resetPwdErr }}</span>
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="ps-label">New Password</label>
                <input v-model="resetPwdVal" type="password" placeholder="New password" class="ps-input" />
                <PasswordStrengthMeter ref="resetPwdMeterRef" :password="resetPwdVal" />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="ps-label">Confirm Password</label>
                <input v-model="resetPwdConfirm" type="password" placeholder="Repeat password" class="ps-input" />
              </div>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="showResetPwd = false">Cancel</button>
              <button class="ps-btn ps-btn-primary" :disabled="resetPwdSaving" @click="submitResetPwd">
                <i :class="resetPwdSaving ? 'ph ph-spinner animate-spin' : 'ph ph-lock-key'"></i>
                {{ resetPwdSaving ? 'Saving…' : 'Reset Password' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
