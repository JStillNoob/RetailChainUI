<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getAuditLogs } from '../../services/superadmin.ts'

defineOptions({ name: 'AuditLogsView' })

const logs    = ref<any[]>([])
const total   = ref(0)
const loading = ref(true)
const filters = ref({ tenantId: '', userId: '', module: '', action: '', from: '', to: '' })
const page    = ref(1)
const pageSize = ref(50)

async function load() {
  loading.value = true
  const params: Record<string, unknown> = { page: page.value, pageSize: pageSize.value }
  if (filters.value.tenantId) params.tenantId = filters.value.tenantId
  if (filters.value.userId)   params.userId   = filters.value.userId
  if (filters.value.module)   params.module   = filters.value.module
  if (filters.value.action)   params.action   = filters.value.action
  if (filters.value.from)     params.from     = filters.value.from
  if (filters.value.to)       params.to       = filters.value.to
  try { const d = await getAuditLogs(params); logs.value = d.items; total.value = d.total }
  finally { loading.value = false }
}
onMounted(load)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
function goTo(p: number) { if (p >= 1 && p <= totalPages.value) { page.value = p; load() } }

function resetFilters() {
  filters.value = { tenantId: '', userId: '', module: '', action: '', from: '', to: '' }
  page.value = 1; load()
}
</script>

<template>
  <div class="flex flex-col gap-6">

    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Audit Log Monitor</h1>
        <p class="ps-page-sub">All platform actions, searchable and exportable.</p>
      </div>
      <span class="ps-tag ps-tag-slate">{{ total.toLocaleString() }} records</span>
    </div>

    <!-- Filter card -->
    <div class="ps-card p-5">
      <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(170px, 1fr))">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-700">Tenant ID</label>
          <input v-model="filters.tenantId" placeholder="1" class="ps-input" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-700">User ID</label>
          <input v-model="filters.userId" placeholder="1" class="ps-input" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-700">Module</label>
          <input v-model="filters.module" placeholder="e.g. Inventory" class="ps-input" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-700">Action</label>
          <input v-model="filters.action" placeholder="e.g. Create" class="ps-input" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-700">From Date</label>
          <input v-model="filters.from" type="date" class="ps-input" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-700">To Date</label>
          <input v-model="filters.to" type="date" class="ps-input" />
        </div>
      </div>
      <div class="flex gap-2.5 mt-4">
        <button class="ps-btn ps-btn-primary" @click="load"><i class="ph ph-funnel"></i> Apply Filters</button>
        <button class="ps-btn ps-btn-outline" @click="resetFilters">Reset</button>
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
      <div v-else-if="logs.length === 0" class="flex flex-col items-center gap-3 py-16 text-slate-400">
        <i class="ph-fill ph-clipboard-text text-5xl text-slate-200"></i>
        <p class="text-sm">No logs found.</p>
      </div>
      <table v-else class="ps-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Tenant</th>
            <th>User</th>
            <th>Module</th>
            <th>Action</th>
            <th>Description</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in logs" :key="l.logId">
            <td class="text-slate-500 text-xs">{{ new Date(l.loggedAt).toLocaleString() }}</td>
            <td class="text-slate-700">#{{ l.tenantId }}</td>
            <td>
              <div class="font-semibold text-slate-800">{{ l.userName }}</div>
              <div class="text-xs text-slate-400">{{ l.userEmail }}</div>
            </td>
            <td><span class="ps-tag ps-tag-blue">{{ l.module }}</span></td>
            <td class="text-slate-700">{{ l.action }}</td>
            <td class="text-slate-500 text-xs max-w-[260px] truncate">{{ l.description }}</td>
            <td class="text-slate-400 text-xs">{{ l.ipAddress }}</td>
          </tr>
        </tbody>
      </table>

      <div v-if="!loading && logs.length > 0" class="ps-pagination">
        <button class="ps-pg-btn" :disabled="page === 1" @click="goTo(1)"><i class="ph ph-caret-double-left"></i></button>
        <button class="ps-pg-btn" :disabled="page === 1" @click="goTo(page - 1)"><i class="ph ph-caret-left"></i></button>
        <span class="ps-pg-info">Page {{ page }} of {{ totalPages }}</span>
        <button class="ps-pg-btn" :disabled="page === totalPages" @click="goTo(page + 1)"><i class="ph ph-caret-right"></i></button>
        <button class="ps-pg-btn" :disabled="page === totalPages" @click="goTo(totalPages)"><i class="ph ph-caret-double-right"></i></button>
      </div>
    </div>
  </div>
</template>
