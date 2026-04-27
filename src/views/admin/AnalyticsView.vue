<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getAnalyticsOverview, getActiveTenants } from '../../services/superadmin.ts'

defineOptions({ name: 'AnalyticsView' })

const overview    = ref<any>(null)
const topTenants  = ref<any[]>([])
const loading     = ref(true)

onMounted(async () => {
  try {
    const [o, t] = await Promise.all([getAnalyticsOverview(), getActiveTenants()])
    overview.value   = o
    topTenants.value = t
  } finally { loading.value = false }
})

const fmt = (v: number) => '₱ ' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v)

const kpis = computed(() => overview.value ? [
  { icon: 'ph-fill ph-buildings',              bg: 'bg-blue-50',   color: 'text-blue-500',   val: overview.value.totalTenants.toLocaleString(),       lbl: 'Total Tenants',     trend: 'up',   pct: '+5%' },
  { icon: 'ph-fill ph-check-circle',           bg: 'bg-green-50',  color: 'text-green-500',  val: overview.value.activeTenants.toLocaleString(),      lbl: 'Active',            trend: 'up',   pct: '+3%' },
  { icon: 'ph-fill ph-credit-card',            bg: 'bg-purple-50', color: 'text-purple-500', val: overview.value.activeSubscriptions.toLocaleString(),lbl: 'Active Subs',       trend: 'flat', pct: '0%' },
  { icon: 'ph-fill ph-currency-circle-dollar', bg: 'bg-amber-50',  color: 'text-amber-500',  val: fmt(overview.value.monthlyRevenue),                 lbl: 'Monthly Revenue',   trend: 'up',   pct: '+12%' },
  { icon: 'ph-fill ph-user-plus',              bg: 'bg-sky-50',    color: 'text-sky-500',    val: overview.value.newThisMonth.toLocaleString(),       lbl: 'New This Month',    trend: 'up',   pct: 'New' },
] : [])

const avatarCls = (id: number) => `ps-avatar ps-avatar-${id % 8}`
</script>

<template>
  <div class="flex flex-col gap-5 max-w-[1280px] mx-auto w-full">

    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Analytics &amp; Reports</h1>
        <p class="ps-page-sub">Platform-wide metrics and most active tenants.</p>
      </div>
    </div>

    <div v-if="loading" class="grid grid-cols-5 gap-4">
      <div v-for="i in 5" :key="i" class="h-28 bg-slate-100 rounded-2xl animate-pulse"></div>
    </div>

    <template v-else>
      <!-- KPIs -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div v-for="k in kpis" :key="k.lbl"
          class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow transition-shadow">
          <div class="flex items-start justify-between gap-2">
            <div :class="['inline-flex items-center justify-center w-9 h-9 rounded-lg', k.bg, k.color]">
              <i :class="[k.icon, 'text-lg']"></i>
            </div>
            <span v-if="k.pct" :class="[
              'inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full',
              k.trend === 'up'   ? 'bg-emerald-50 text-emerald-700' :
              k.trend === 'down' ? 'bg-rose-50 text-rose-700' :
                                   'bg-slate-100 text-slate-600',
            ]">
              <i :class="k.trend === 'up' ? 'ph ph-arrow-up' : k.trend === 'down' ? 'ph ph-arrow-down' : 'ph ph-minus'" class="text-[10px]"></i>
              {{ k.pct }}
            </span>
          </div>
          <p class="text-xl font-bold text-slate-900 mt-3 leading-none">{{ k.val }}</p>
          <p class="text-xs text-slate-500 mt-1.5">{{ k.lbl }}</p>
        </div>
      </div>

      <!-- Most Active Tenants -->
      <div class="ps-card overflow-hidden">
        <div class="ps-table-toolbar">
          <div>
            <div class="ps-table-title">Most Active Tenants</div>
            <div class="ps-table-subtitle">{{ topTenants.length }} tenant{{ topTenants.length !== 1 ? 's' : '' }}</div>
          </div>
          <button class="ps-btn ps-btn-dark"><i class="ph ph-download-simple"></i> Export</button>
        </div>
        <table class="ps-table">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Email</th>
              <th>Users</th>
              <th>Activity Logs</th>
              <th>Plan</th>
              <th>Since</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in topTenants" :key="t.tenantId">
              <td>
                <div class="flex items-center gap-2.5">
                  <div :class="avatarCls(t.tenantId)">{{ (t.name ?? 'T').charAt(0).toUpperCase() }}</div>
                  <span class="font-semibold text-slate-800">{{ t.name }}</span>
                </div>
              </td>
              <td class="text-slate-500">{{ t.email }}</td>
              <td class="text-slate-700 font-semibold">{{ t.userCount }}</td>
              <td><span class="ps-tag ps-tag-purple">{{ t.logCount }}</span></td>
              <td class="text-slate-500">{{ t.plan ?? '—' }}</td>
              <td class="text-slate-500">{{ new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
@media (max-width: 1100px) { .grid-cols-5 { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 700px)  { .grid-cols-5 { grid-template-columns: repeat(2, 1fr); } }
</style>
