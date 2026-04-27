<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '../services/api.ts'
import { useAuthStore } from '../stores/auth.ts'

defineOptions({ name: 'TenantAuditView' })

const auth = useAuthStore()

const logs    = ref<any[]>([])
const total   = ref(0)
const loading = ref(true)
const error   = ref('')
const page    = ref(1)
const pageSize = ref(50)
const filters = ref({ userId: '', module: '', action: '', from: '', to: '' })

const MODULES = ['Suppliers', 'Products', 'Inventory', 'Purchase Orders', 'Deliveries', 'Sales', 'Forecast', 'Users', 'Roles']
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE']

async function load() {
  loading.value = true
  error.value   = ''
  const params: Record<string, unknown> = { page: page.value, pageSize: pageSize.value }
  if (filters.value.userId)  params.userId = filters.value.userId
  if (filters.value.module)  params.module = filters.value.module
  if (filters.value.action)  params.action = filters.value.action

  try {
    const res = await api.get('/tenant/audit-logs', { params })
    logs.value  = res.data.items
    total.value = res.data.total
  } catch {
    error.value = 'Unable to load audit logs.'
  } finally {
    loading.value = false
  }
}
onMounted(load)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
function goTo(p: number) { if (p >= 1 && p <= totalPages.value) { page.value = p; load() } }

function applyFilters() { page.value = 1; load() }
function resetFilters() {
  filters.value = { userId: '', module: '', action: '', from: '', to: '' }
  page.value = 1; load()
}

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })

const actionTag = (a: string) => ({
  CREATE: 'ps-tag ps-tag-green',
  UPDATE: 'ps-tag ps-tag-amber',
  DELETE: 'ps-tag ps-tag-red',
}[a] ?? 'ps-tag ps-tag-slate')
</script>

<template>
  <div class="flex flex-col gap-6">

    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Audit Log</h1>
        <p class="ps-page-sub">All actions performed within your tenant.</p>
      </div>
      <span class="ps-tag ps-tag-slate">{{ total.toLocaleString() }} records</span>
    </div>

    <div v-if="!auth.isTenantAdmin && auth.roleTypeName !== 'SuperAdmin'" class="ps-card flex flex-col items-center gap-3 py-16 text-slate-400">
      <i class="ph ph-lock-key text-4xl text-slate-300"></i>
      <p class="text-sm">Only Tenant Admin and Super Admin can view audit logs.</p>
    </div>

    <template v-else>
      <!-- Filter card -->
      <div class="ps-card p-5">
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-slate-700">Module</label>
            <select v-model="filters.module" class="ps-input">
              <option value="">All Modules</option>
              <option v-for="m in MODULES" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-slate-700">Action</label>
            <select v-model="filters.action" class="ps-input">
              <option value="">All Actions</option>
              <option v-for="a in ACTIONS" :key="a" :value="a">{{ a }}</option>
            </select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-slate-700">User ID</label>
            <input v-model="filters.userId" type="number" placeholder="e.g. 5" class="ps-input" />
          </div>
        </div>
        <div class="flex gap-2.5 mt-4">
          <button @click="applyFilters" class="ps-btn ps-btn-primary"><i class="ph ph-funnel"></i> Apply</button>
          <button @click="resetFilters" class="ps-btn ps-btn-outline">Reset</button>
        </div>
      </div>

      <!-- Logs table -->
      <div class="ps-card overflow-hidden">
        <div class="ps-table-toolbar">
          <div>
            <div class="ps-table-title">Activity Log</div>
            <div class="ps-table-subtitle">{{ total.toLocaleString() }} entries</div>
          </div>
          <button class="ps-btn ps-btn-dark"><i class="ph ph-download-simple"></i> Export</button>
        </div>

        <div v-if="loading" class="p-6 space-y-3">
          <div v-for="i in 6" :key="i" class="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
        </div>
        <div v-else-if="error" class="p-6 text-red-500 text-sm flex items-center gap-2">
          <i class="ph ph-warning"></i> {{ error }}
        </div>
        <div v-else-if="logs.length === 0" class="flex flex-col items-center gap-3 py-16 text-slate-400">
          <i class="ph-fill ph-clipboard-text text-5xl text-slate-200"></i>
          <p class="text-sm">No audit logs found for the selected filters.</p>
        </div>
        <table v-else class="ps-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Module</th>
              <th>Action</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in logs" :key="l.logId">
              <td class="text-slate-500 text-xs">{{ fmtDateTime(l.loggedAt) }}</td>
              <td>
                <div class="font-semibold text-slate-800">{{ l.userName }}</div>
                <div class="text-xs text-slate-400">{{ l.userEmail }}</div>
              </td>
              <td><span class="ps-tag ps-tag-purple">{{ l.module }}</span></td>
              <td><span :class="actionTag(l.action)">{{ l.action }}</span></td>
              <td class="text-slate-500 text-xs max-w-[280px] truncate">{{ l.description }}</td>
            </tr>
          </tbody>
        </table>

        <div v-if="!loading && logs.length > 0 && totalPages > 1" class="ps-pagination">
          <button class="ps-pg-btn" :disabled="page === 1" @click="goTo(1)"><i class="ph ph-caret-double-left"></i></button>
          <button class="ps-pg-btn" :disabled="page === 1" @click="goTo(page - 1)"><i class="ph ph-caret-left"></i></button>
          <span class="ps-pg-info">Page {{ page }} of {{ totalPages }}</span>
          <button class="ps-pg-btn" :disabled="page === totalPages" @click="goTo(page + 1)"><i class="ph ph-caret-right"></i></button>
          <button class="ps-pg-btn" :disabled="page === totalPages" @click="goTo(totalPages)"><i class="ph ph-caret-double-right"></i></button>
        </div>
      </div>
    </template>
  </div>
</template>
