<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '../services/api.ts'
import { useToast } from '../composables/useToast.ts'

defineOptions({ name: 'UsersView' })

const { toast } = useToast()

const users   = ref<any[]>([])
const roles   = ref<any[]>([])
const loading = ref(true)
const search  = ref('')
const openMenuId = ref<number | null>(null)

async function load() {
  loading.value = true
  try {
    const [u, r] = await Promise.all([
      api.get('/tenant/users').then(r => r.data),
      api.get('/tenant/roles').then(r => r.data),
    ])
    users.value = u
    roles.value = r
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
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})
function goTo(p: number) { if (p >= 1 && p <= totalPages.value) page.value = p }

const showModal = ref(false)
const isEdit    = ref(false)
const saving    = ref(false)
const editId    = ref<number | null>(null)
const form      = ref({ firstName: '', lastName: '', email: '', password: '', roleId: null as number | null, status: 'Active' })
const formErr   = ref('')

function openAdd() {
  isEdit.value = false; editId.value = null
  form.value   = { firstName: '', lastName: '', email: '', password: '', roleId: null, status: 'Active' }
  formErr.value = ''; showModal.value = true
}

function openEdit(u: any) {
  isEdit.value = true; editId.value = u.userId
  form.value   = { firstName: u.firstName, lastName: u.lastName, email: u.email, password: '', roleId: u.roleId ?? null, status: u.status }
  formErr.value = ''; showModal.value = true
  openMenuId.value = null
}

async function save() {
  formErr.value = ''
  if (!form.value.firstName.trim() || !form.value.email.trim()) { formErr.value = 'First name and email are required.'; return }
  if (!isEdit.value && !form.value.password.trim()) { formErr.value = 'Password is required for new users.'; return }
  saving.value = true
  try {
    if (isEdit.value) {
      await api.put(`/tenant/users/${editId.value}`, { firstName: form.value.firstName, lastName: form.value.lastName, status: form.value.status, roleId: form.value.roleId, password: form.value.password || undefined })
      toast('User updated.')
    } else {
      await api.post('/tenant/users', { firstName: form.value.firstName, lastName: form.value.lastName, email: form.value.email, password: form.value.password, roleId: form.value.roleId })
      toast('User created.')
    }
    showModal.value = false; await load()
  } catch (e: any) {
    formErr.value = e.response?.data?.message ?? 'Save failed.'
  } finally { saving.value = false }
}

async function deactivate(u: any) {
  openMenuId.value = null
  if (!confirm(`Deactivate ${u.firstName} ${u.lastName}?`)) return
  try { await api.delete(`/tenant/users/${u.userId}`); toast('User deactivated.'); await load() }
  catch { toast('Failed to deactivate user.', 'error') }
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

      <!-- Pagination -->
      <div v-if="!loading && filtered.length > 0" class="ps-pagination">
        <button class="ps-pg-btn" :disabled="page === 1" @click="goTo(1)"><i class="ph ph-caret-double-left"></i></button>
        <button class="ps-pg-btn" :disabled="page === 1" @click="goTo(page - 1)"><i class="ph ph-caret-left"></i></button>
        <button v-for="p in totalPages" :key="p" :class="['ps-pg-btn', p === page && 'ps-pg-btn--active']" @click="goTo(p)">{{ p }}</button>
        <button class="ps-pg-btn" :disabled="page === totalPages" @click="goTo(page + 1)"><i class="ph ph-caret-right"></i></button>
        <button class="ps-pg-btn" :disabled="page === totalPages" @click="goTo(totalPages)"><i class="ph ph-caret-double-right"></i></button>
        <span class="ps-pg-info">Showing {{ (page - 1) * pageSize + 1 }} to {{ Math.min(page * pageSize, filtered.length) }} of {{ filtered.length }} users</span>
        <select v-model="pageSize" class="ps-pg-size" @change="page = 1">
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
        </select>
      </div>
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
                  <input v-model="form.firstName" placeholder="First name" class="ps-input" />
                </div>
                <div>
                  <label class="ps-label">Last Name</label>
                  <input v-model="form.lastName" placeholder="Last name" class="ps-input" />
                </div>
                <div v-if="!isEdit">
                  <label class="ps-label">Email *</label>
                  <input v-model="form.email" type="email" placeholder="user@email.com" class="ps-input" />
                </div>
                <div>
                  <label class="ps-label">{{ isEdit ? 'New Password (blank to keep)' : 'Password *' }}</label>
                  <input v-model="form.password" type="password" placeholder="••••••••" class="ps-input" />
                </div>
                <div>
                  <label class="ps-label">Role</label>
                  <select v-model="form.roleId" class="ps-input">
                    <option :value="null">— No Role —</option>
                    <option v-for="r in roles" :key="r.roleId" :value="r.roleId">{{ r.roleName }}</option>
                  </select>
                </div>
                <div v-if="isEdit">
                  <label class="ps-label">Status</label>
                  <select v-model="form.status" class="ps-input">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div v-if="formErr" class="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {{ formErr }}
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
  </div>
</template>
