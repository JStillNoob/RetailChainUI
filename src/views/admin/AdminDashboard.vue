<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getAnalyticsOverview } from '../../services/superadmin.ts'

defineOptions({ name: 'AdminDashboard' })

interface Overview {
  totalTenants: number
  activeTenants: number
  suspendedTenants: number
  activeSubscriptions: number
  expiredSubscriptions: number
  monthlyRevenue: number
  newThisMonth: number
}

const overview = ref<Overview | null>(null)
const loading  = ref(true)
const error    = ref('')

onMounted(async () => {
  try {
    overview.value = await getAnalyticsOverview()
  } catch {
    error.value = 'Failed to load dashboard data.'
  } finally {
    loading.value = false
  }
})

const formatCurrency = (v: number) =>
  '₱ ' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v)

const kpis = computed(() => overview.value ? [
  { icon: 'ph-fill ph-buildings',                bg: 'bg-blue-50',   color: 'text-blue-500',   val: overview.value.totalTenants.toLocaleString(),       lbl: 'Total Tenants',        sub: `+${overview.value.newThisMonth} this month`,        trend: 'up',   pct: `+${overview.value.newThisMonth}` },
  { icon: 'ph-fill ph-check-circle',             bg: 'bg-emerald-50',color: 'text-emerald-500',val: overview.value.activeTenants.toLocaleString(),      lbl: 'Active Tenants',       sub: `${overview.value.suspendedTenants} suspended`,       trend: 'up',   pct: 'OK' },
  { icon: 'ph-fill ph-credit-card',              bg: 'bg-purple-50', color: 'text-purple-500', val: overview.value.activeSubscriptions.toLocaleString(),lbl: 'Active Subscriptions', sub: `${overview.value.expiredSubscriptions} expired`,    trend: 'flat', pct: '' },
  { icon: 'ph-fill ph-currency-circle-dollar',   bg: 'bg-amber-50',  color: 'text-amber-500',  val: formatCurrency(overview.value.monthlyRevenue),      lbl: 'Monthly Revenue',      sub: 'Active subscriptions',                                trend: 'up',   pct: '+12%' },
] : [])

const quickLinks = [
  { to: '/admin/tenants',       icon: 'ph-fill ph-buildings',     label: 'Tenants',         desc: 'Manage tenant orgs',    color: 'text-blue-500',   bg: 'bg-blue-50' },
  { to: '/admin/subscriptions', icon: 'ph-fill ph-credit-card',   label: 'Billing',         desc: 'Plans & subscriptions', color: 'text-purple-500', bg: 'bg-purple-50' },
  { to: '/admin/store-types',   icon: 'ph-fill ph-storefront',    label: 'Store Types',     desc: 'Categories & templates',color: 'text-amber-500',  bg: 'bg-amber-50' },
  { to: '/admin/analytics',     icon: 'ph-fill ph-chart-bar',     label: 'Analytics',       desc: 'Platform metrics',      color: 'text-emerald-500',bg: 'bg-emerald-50' },
  { to: '/admin/notifications', icon: 'ph-fill ph-bell',          label: 'Notifications',   desc: 'Broadcast messages',    color: 'text-rose-500',   bg: 'bg-rose-50' },
  { to: '/admin/audit-logs',    icon: 'ph-fill ph-clipboard-text',label: 'Audit Logs',      desc: 'Activity history',      color: 'text-sky-500',    bg: 'bg-sky-50' },
  { to: '/admin/accounts',      icon: 'ph-fill ph-users-three',   label: 'Admin Accounts',  desc: 'Super-admin team',      color: 'text-indigo-500', bg: 'bg-indigo-50' },
]
</script>

<template>
  <div class="flex flex-col gap-5 max-w-[1280px] mx-auto w-full">

    <!-- Header -->
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Super Admin Dashboard</h1>
        <p class="text-sm text-slate-500 mt-1">Platform overview and key metrics</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="i in 4" :key="i" class="h-28 bg-slate-100 rounded-xl animate-pulse"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-white rounded-xl border border-rose-200 p-6 flex items-center gap-3 text-rose-600">
      <i class="ph-fill ph-warning-circle text-2xl"></i> {{ error }}
    </div>

    <template v-else-if="overview">
      <!-- KPI cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <p class="text-[11px] text-slate-400 mt-0.5">{{ k.sub }}</p>
        </div>
      </div>

      <!-- Quick Actions — same card style as KPIs, grid of icon+label tiles -->
      <div>
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <router-link v-for="link in quickLinks" :key="link.to" :to="link.to"
            class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow hover:border-slate-300 transition-all flex flex-col items-start gap-2.5 group">
            <div :class="['inline-flex items-center justify-center w-9 h-9 rounded-lg', link.bg, link.color, 'group-hover:scale-105 transition-transform']">
              <i :class="[link.icon, 'text-lg']"></i>
            </div>
            <div>
              <p class="text-sm font-semibold text-slate-900 leading-tight">{{ link.label }}</p>
              <p class="text-[11px] text-slate-400 mt-0.5">{{ link.desc }}</p>
            </div>
          </router-link>
        </div>
      </div>
    </template>
  </div>
</template>
