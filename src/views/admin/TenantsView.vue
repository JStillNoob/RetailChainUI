<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getTenants, updateTenantStatus, deleteTenant } from '../../services/superadmin.ts'

defineOptions({ name: 'TenantsView' })

const tenants   = ref<any[]>([])
const total     = ref(0)
const page      = ref(1)
const pageSize  = ref(20)
const search    = ref('')
const loading   = ref(true)
const error     = ref('')
const deleting  = ref<number | null>(null)
const openMenuId = ref<number | null>(null)

async function load() {
  loading.value = true
  try {
    const data = await getTenants(page.value, pageSize.value, search.value)
    tenants.value = data.items
    total.value   = data.total
  } catch { error.value = 'Failed to load tenants.' }
  finally   { loading.value = false }
}

onMounted(load)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
function goTo(p: number) { if (p >= 1 && p <= totalPages.value) { page.value = p; load() } }

const statusTag = (s: string) => ({
  Active: 'ps-tag ps-tag-green',
  Suspended: 'ps-tag ps-tag-red',
  Inactive: 'ps-tag ps-tag-slate',
  Pending: 'ps-tag ps-tag-amber',
}[s] ?? 'ps-tag ps-tag-slate')

async function changeStatus(id: number, status: string) {
  openMenuId.value = null
  await updateTenantStatus(id, status)
  await load()
}

async function remove(id: number) {
  openMenuId.value = null
  if (!confirm('Delete this tenant? This cannot be undone.')) return
  deleting.value = id
  try { await deleteTenant(id); await load() }
  finally { deleting.value = null }
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const avatarCls = (id: number) => `ps-avatar ps-avatar-${id % 8}`
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Page header -->
    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Tenant Management</h1>
        <p class="ps-page-sub">All tenant organisations on the platform.</p>
      </div>
      <button class="ps-btn ps-btn-outline" @click="load">
        <i class="ph ph-arrows-clockwise" :class="{ 'animate-spin': loading }"></i> Refresh
      </button>
    </div>

    <!-- Datatable card -->
    <div class="ps-card overflow-hidden">

      <div class="ps-table-toolbar">
        <div>
          <div class="ps-table-title">Tenants</div>
          <div class="ps-table-subtitle">{{ total.toLocaleString() }} total</div>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <div class="ps-search">
            <i class="ph ph-magnifying-glass"></i>
            <input v-model="search" @keyup.enter="load" placeholder="Search by name or email…" />
          </div>
          <button class="ps-btn ps-btn-primary"><i class="ph ph-funnel"></i> Filter</button>
          <button class="ps-btn ps-btn-dark"><i class="ph ph-download-simple"></i> Export</button>
        </div>
      </div>

      <div v-if="loading" class="p-6 space-y-3">
        <div v-for="i in 5" :key="i" class="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
      <div v-else-if="error" class="p-6 text-red-500 text-sm">{{ error }}</div>
      <div v-else-if="tenants.length === 0" class="flex flex-col items-center gap-3 py-16 text-slate-400">
        <i class="ph-fill ph-buildings text-5xl text-slate-200"></i>
        <p class="text-sm">No tenants found.</p>
      </div>
      <table v-else class="ps-table">
        <thead>
          <tr>
            <th style="width: 40px"><input type="checkbox" class="accent-blue-500" /></th>
            <th>ID</th>
            <th>Tenant</th>
            <th>Email</th>
            <th>Store Type</th>
            <th>Plan</th>
            <th>Status</th>
            <th>Created</th>
            <th style="width: 50px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in tenants" :key="t.tenantId">
            <td><input type="checkbox" class="accent-blue-500" /></td>
            <td class="text-slate-500 font-medium">#{{ String(t.tenantId).padStart(5, '0') }}</td>
            <td>
              <div class="flex items-center gap-2.5">
                <div :class="avatarCls(t.tenantId)">{{ (t.name ?? 'T').charAt(0).toUpperCase() }}</div>
                <span class="font-semibold text-slate-800">{{ t.name }}</span>
              </div>
            </td>
            <td class="text-slate-500">{{ t.email }}</td>
            <td class="text-slate-500">{{ t.storeType ?? '—' }}</td>
            <td class="text-slate-500">{{ t.activeSubscription ?? '—' }}</td>
            <td><span :class="statusTag(t.status)">{{ t.status }}</span></td>
            <td class="text-slate-500">{{ fmtDate(t.createdAt) }}</td>
            <td>
              <div class="relative">
                <button @click="openMenuId = openMenuId === t.tenantId ? null : t.tenantId"
                  class="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all">
                  <i class="ph ph-dots-three"></i>
                </button>
                <div v-if="openMenuId === t.tenantId"
                  class="absolute right-0 top-9 z-10 w-40 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 text-sm">
                  <button v-if="t.status !== 'Active'" @click="changeStatus(t.tenantId, 'Active')"
                    class="w-full text-left px-3.5 py-2 text-green-700 hover:bg-green-50 flex items-center gap-2">
                    <i class="ph ph-check-circle"></i> Activate
                  </button>
                  <button v-if="t.status !== 'Suspended'" @click="changeStatus(t.tenantId, 'Suspended')"
                    class="w-full text-left px-3.5 py-2 text-amber-700 hover:bg-amber-50 flex items-center gap-2">
                    <i class="ph ph-pause-circle"></i> Suspend
                  </button>
                  <button @click="remove(t.tenantId)" :disabled="deleting === t.tenantId"
                    class="w-full text-left px-3.5 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50">
                    <i class="ph ph-trash"></i> Delete
                  </button>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="!loading && tenants.length > 0" class="ps-pagination">
        <button class="ps-pg-btn" :disabled="page === 1" @click="goTo(1)"><i class="ph ph-caret-double-left"></i></button>
        <button class="ps-pg-btn" :disabled="page === 1" @click="goTo(page - 1)"><i class="ph ph-caret-left"></i></button>
        <button v-for="p in totalPages" :key="p" :class="['ps-pg-btn', p === page && 'ps-pg-btn--active']" @click="goTo(p)">{{ p }}</button>
        <button class="ps-pg-btn" :disabled="page === totalPages" @click="goTo(page + 1)"><i class="ph ph-caret-right"></i></button>
        <button class="ps-pg-btn" :disabled="page === totalPages" @click="goTo(totalPages)"><i class="ph ph-caret-double-right"></i></button>
        <span class="ps-pg-info">Page {{ page }} of {{ totalPages }} · {{ total.toLocaleString() }} total</span>
      </div>
    </div>
  </div>
</template>
