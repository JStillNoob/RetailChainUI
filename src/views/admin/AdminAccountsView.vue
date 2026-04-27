<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getAdmins, createAdmin, deleteAdmin } from '../../services/superadmin.ts'
import { useAuthStore } from '../../stores/auth.ts'

interface AdminUser {
  userId: number
  firstName: string
  lastName: string
  email: string
  roleName: string | null
  status: string
  createdAt: string
}

defineOptions({ name: 'AdminAccountsView' })

const auth      = useAuthStore()
const admins    = ref<AdminUser[]>([])
const loading   = ref(true)
const showForm  = ref(false)
const form      = ref({ firstName: '', lastName: '', email: '', password: '' })
const submitting = ref(false)
const error     = ref('')

async function load() {
  loading.value = true
  try { admins.value = await getAdmins() }
  finally { loading.value = false }
}
onMounted(load)

const page     = ref(1)
const pageSize = ref(10)
const totalPages = computed(() => Math.max(1, Math.ceil(admins.value.length / pageSize.value)))
const paged = computed(() => admins.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
function goTo(p: number) { if (p >= 1 && p <= totalPages.value) page.value = p }

async function submit() {
  if (!form.value.firstName || !form.value.email || !form.value.password) {
    error.value = 'All fields are required.'; return
  }
  submitting.value = true; error.value = ''
  try {
    await createAdmin(form.value)
    showForm.value = false
    form.value = { firstName: '', lastName: '', email: '', password: '' }
    await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err?.response?.data?.message ?? 'Failed to create admin.'
  } finally { submitting.value = false }
}

async function remove(id: number) {
  if (id === auth.userId)   { alert('Cannot delete your own account.'); return }
  if (!confirm('Delete this admin?')) return
  await deleteAdmin(id); await load()
}

const initials = (a: AdminUser) => ((a.firstName?.[0] ?? '') + (a.lastName?.[0] ?? '')).toUpperCase()
const avatarCls = (id: number) => `ps-avatar ps-avatar-${id % 8}`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
</script>

<template>
  <div class="flex flex-col gap-6">

    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Admin Accounts</h1>
        <p class="ps-page-sub">Super admin team with platform-wide access.</p>
      </div>
      <button class="ps-btn ps-btn-primary" @click="showForm = true; error = ''">
        <i class="ph ph-plus"></i> Add Admin
      </button>
    </div>

    <div class="ps-card overflow-hidden">
      <div class="ps-table-toolbar">
        <div>
          <div class="ps-table-title">Super Admins</div>
          <div class="ps-table-subtitle">{{ admins.length }} account{{ admins.length !== 1 ? 's' : '' }}</div>
        </div>
        <div class="flex items-center gap-3">
          <button class="ps-btn ps-btn-dark"><i class="ph ph-download-simple"></i> Export</button>
        </div>
      </div>

      <div v-if="loading" class="p-6 space-y-3">
        <div v-for="i in 4" :key="i" class="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
      <table v-else class="ps-table">
        <thead>
          <tr>
            <th style="width: 40px"><input type="checkbox" class="accent-blue-500" /></th>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Created</th>
            <th style="width: 50px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in paged" :key="a.userId">
            <td><input type="checkbox" class="accent-blue-500" /></td>
            <td class="text-slate-500 font-medium">#{{ String(a.userId).padStart(5, '0') }}</td>
            <td>
              <div class="flex items-center gap-2.5">
                <div :class="avatarCls(a.userId)">{{ initials(a) }}</div>
                <div>
                  <span class="font-semibold text-slate-800">{{ a.firstName }} {{ a.lastName }}</span>
                  <span v-if="a.userId === auth.userId" class="ps-tag ps-tag-blue ml-2" style="font-size: 9px;">YOU</span>
                </div>
              </div>
            </td>
            <td class="text-slate-500">{{ a.email }}</td>
            <td><span class="ps-tag ps-tag-purple">{{ a.roleName ?? '—' }}</span></td>
            <td><span :class="['ps-tag', a.status === 'Active' ? 'ps-tag-green' : 'ps-tag-slate']">{{ a.status }}</span></td>
            <td class="text-slate-500">{{ fmtDate(a.createdAt) }}</td>
            <td>
              <button @click="remove(a.userId)" :disabled="a.userId === auth.userId"
                :title="a.userId === auth.userId ? 'Cannot delete your own account' : 'Delete'"
                class="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400">
                <i class="ph ph-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="!loading && admins.length > 0" class="ps-pagination">
        <button class="ps-pg-btn" :disabled="page === 1" @click="goTo(1)"><i class="ph ph-caret-double-left"></i></button>
        <button class="ps-pg-btn" :disabled="page === 1" @click="goTo(page - 1)"><i class="ph ph-caret-left"></i></button>
        <button v-for="p in totalPages" :key="p" :class="['ps-pg-btn', p === page && 'ps-pg-btn--active']" @click="goTo(p)">{{ p }}</button>
        <button class="ps-pg-btn" :disabled="page === totalPages" @click="goTo(page + 1)"><i class="ph ph-caret-right"></i></button>
        <button class="ps-pg-btn" :disabled="page === totalPages" @click="goTo(totalPages)"><i class="ph ph-caret-double-right"></i></button>
        <span class="ps-pg-info">Showing {{ (page - 1) * pageSize + 1 }} to {{ Math.min(page * pageSize, admins.length) }} of {{ admins.length }}</span>
      </div>
    </div>

    <!-- Create modal -->
    <Teleport to="body">
      <div v-if="showForm" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-5"
           @click.self="showForm = false">
        <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl">
          <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
            <h3 class="text-base font-bold text-slate-900">Create Super Admin</h3>
            <button @click="showForm = false" class="text-slate-400 hover:text-slate-700 text-xl"><i class="ph ph-x"></i></button>
          </div>
          <div class="p-6">
            <div v-if="error" class="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{{ error }}</div>
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-700">First Name</label>
                <input v-model="form.firstName" placeholder="John" class="ps-input" />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-700">Last Name</label>
                <input v-model="form.lastName" placeholder="Doe" class="ps-input" />
              </div>
              <div class="col-span-2 flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-700">Email</label>
                <input v-model="form.email" type="email" placeholder="admin@example.com" class="ps-input" />
              </div>
              <div class="col-span-2 flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-700">Password</label>
                <input v-model="form.password" type="password" placeholder="••••••••" class="ps-input" />
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-2.5 px-6 pb-6">
            <button @click="showForm = false" class="ps-btn ps-btn-outline">Cancel</button>
            <button @click="submit" :disabled="submitting" class="ps-btn ps-btn-primary">
              <i v-if="submitting" class="ph ph-spinner animate-spin"></i>
              {{ submitting ? 'Creating…' : 'Create Admin' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
