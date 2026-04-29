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
const loading = ref(true)
const error = ref('')

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

// Sparkline geometry. Fixed y-scale shared across all charts so flat data
// stays visually flat instead of being auto-stretched into a sawtooth.
const SP_W = 320,
  SP_H = 80,
  SP_PAD = 6
const Y_MIN = 0,
  Y_MAX = 12
function spark(data: number[]) {
  const stepX = (SP_W - SP_PAD * 2) / (data.length - 1)
  return data
    .map((v, i) => {
      const x = SP_PAD + i * stepX
      const t = (v - Y_MIN) / (Y_MAX - Y_MIN)
      const y = SP_H - SP_PAD - t * (SP_H - SP_PAD * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}
function sparkArea(data: number[]) {
  const pts = spark(data)
  const last = SP_W - SP_PAD,
    bottom = SP_H - SP_PAD
  return `M${pts.split(' ').join(' L')} L${last.toFixed(1)},${bottom} L${SP_PAD},${bottom} Z`
}

const D1 = [4, 4, 5, 5, 4, 5, 6, 6, 5, 6, 7, 7, 6, 7, 7, 8, 8, 7, 8, 9]
const D1m = [5, 5, 4, 5, 5, 6, 5, 5, 6, 6, 5, 6, 6, 7, 6, 7, 7, 6, 7, 8]
const D2 = [5, 5, 6, 6, 6, 7, 7, 6, 7, 7, 8, 7, 8, 8, 7, 8, 8, 9, 8, 9]
const D2m = [6, 6, 5, 6, 7, 6, 7, 7, 6, 7, 7, 8, 7, 7, 8, 7, 8, 8, 7, 8]
const D3 = [4, 5, 4, 4, 5, 4, 5, 5, 4, 5, 5, 4, 5, 5, 5, 4, 5, 5, 4, 5]
const D3m = [5, 4, 5, 5, 4, 5, 4, 5, 5, 4, 5, 5, 4, 5, 5, 5, 4, 5, 5, 4]
const D4 = [3, 4, 4, 5, 5, 5, 6, 6, 5, 6, 6, 7, 7, 6, 7, 7, 8, 8, 7, 8]
const D4m = [4, 5, 4, 5, 5, 6, 5, 6, 6, 5, 6, 6, 7, 6, 7, 7, 6, 7, 7, 7]

const kpis = computed(() => {
  if (!overview.value) return []
  const o = overview.value

  const activePct = o.totalTenants > 0
    ? Math.round((o.activeTenants / o.totalTenants) * 100)
    : null

  return [
    {
      title: 'Total Tenants',
      val: o.totalTenants.toLocaleString(),
      trend: o.newThisMonth > 0 ? 'up' : 'flat',
      pct: o.newThisMonth > 0 ? `+${o.newThisMonth} new` : null,
      chart: spark(D1),
      chartFill: sparkArea(D1),
      chartMuted: spark(D1m),
      link: '/admin/tenants',
    },
    {
      title: 'Active Tenants',
      val: o.activeTenants.toLocaleString(),
      trend: activePct !== null && activePct >= 90 ? 'up' : 'flat',
      pct: activePct !== null ? `${activePct}% active` : null,
      chart: spark(D2),
      chartFill: sparkArea(D2),
      chartMuted: spark(D2m),
      link: '/admin/tenants',
    },
    {
      title: 'Active Subscriptions',
      val: o.activeSubscriptions.toLocaleString(),
      trend: o.expiredSubscriptions > 0 ? 'down' : 'flat',
      pct: o.expiredSubscriptions > 0 ? `${o.expiredSubscriptions} expired` : null,
      chart: spark(D3),
      chartFill: sparkArea(D3),
      chartMuted: spark(D3m),
      link: '/admin/subscriptions',
    },
    {
      title: 'Monthly Revenue',
      val: formatCurrency(o.monthlyRevenue),
      trend: 'flat',
      pct: null,
      chart: spark(D4),
      chartFill: sparkArea(D4),
      chartMuted: spark(D4m),
      link: '/admin/subscriptions',
    },
  ]
})

const quickLinks = [
  {
    to: '/admin/tenants',
    icon: 'ph-fill ph-buildings',
    label: 'Tenants',
    desc: 'Manage tenant orgs',
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    to: '/admin/subscriptions',
    icon: 'ph-fill ph-credit-card',
    label: 'Billing',
    desc: 'Plans & subscriptions',
    color: 'text-purple-500',
    bg: 'bg-purple-50',
  },
  {
    to: '/admin/store-types',
    icon: 'ph-fill ph-storefront',
    label: 'Store Types',
    desc: 'Categories & templates',
    color: 'text-amber-500',
    bg: 'bg-amber-50',
  },
  {
    to: '/admin/analytics',
    icon: 'ph-fill ph-chart-bar',
    label: 'Analytics',
    desc: 'Platform metrics',
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
  },
  {
    to: '/admin/notifications',
    icon: 'ph-fill ph-bell',
    label: 'Notifications',
    desc: 'Broadcast messages',
    color: 'text-rose-500',
    bg: 'bg-rose-50',
  },
  {
    to: '/admin/audit-logs',
    icon: 'ph-fill ph-clipboard-text',
    label: 'Audit Logs',
    desc: 'Activity history',
    color: 'text-sky-500',
    bg: 'bg-sky-50',
  },
  {
    to: '/admin/accounts',
    icon: 'ph-fill ph-users-three',
    label: 'Admin Accounts',
    desc: 'Super-admin team',
    color: 'text-indigo-500',
    bg: 'bg-indigo-50',
  },
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
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <div
        v-for="i in 4"
        :key="i"
        class="flex flex-col bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden"
      >
        <div class="flex flex-col gap-3 px-6 pt-6 pb-5">
          <div class="h-3 w-24 bg-slate-100 rounded animate-pulse"></div>
          <div class="flex items-center gap-2">
            <div class="h-9 w-24 bg-slate-100 rounded animate-pulse"></div>
            <div class="h-5 w-16 bg-slate-100 rounded-full animate-pulse"></div>
          </div>
        </div>
        <div class="h-14 mt-auto bg-slate-50 animate-pulse"></div>
      </div>
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="bg-white rounded-xl border border-rose-200 p-6 flex items-center gap-3 text-rose-600"
    >
      <i class="ph-fill ph-warning-circle text-2xl"></i> {{ error }}
    </div>

    <template v-else-if="overview">
      <!-- KPI cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <router-link
          v-for="(k, idx) in kpis"
          :key="k.title"
          :to="k.link"
          class="group relative flex flex-col bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 overflow-hidden"
        >
          <!-- Top section: title + value + delta -->
          <div class="flex flex-col gap-3 px-6 pt-6 pb-5">
            <p class="text-[11px] font-semibold text-slate-400 tracking-[0.1em] uppercase">
              {{ k.title }}
            </p>
            <div class="flex items-baseline gap-3 flex-wrap">
              <p class="text-[34px] font-bold text-slate-900 tracking-tight leading-none">{{ k.val }}</p>
              <span
                v-if="k.pct"
                :class="[
                  'inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap',
                  k.trend === 'up'
                    ? 'bg-emerald-100 text-emerald-700'
                    : k.trend === 'down'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-slate-100 text-slate-500',
                ]"
              >
                {{ k.pct }}
              </span>
            </div>
          </div>

          <!-- Sparkline anchored to the bottom edge -->
          <svg class="block w-full h-14 mt-auto" viewBox="0 0 320 80" preserveAspectRatio="none">
            <defs>
              <linearGradient :id="`spark-grad-${idx}`" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.16" />
                <stop offset="100%" stop-color="#7c3aed" stop-opacity="0" />
              </linearGradient>
            </defs>
            <polyline
              :points="k.chartMuted"
              fill="none"
              stroke="#e2e8f0"
              stroke-width="1.25"
              stroke-linecap="round"
              stroke-linejoin="round"
              vector-effect="non-scaling-stroke"
            />
            <path :d="k.chartFill" :fill="`url(#spark-grad-${idx})`" />
            <polyline
              :points="k.chart"
              fill="none"
              stroke="#7c3aed"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
              vector-effect="non-scaling-stroke"
            />
          </svg>
        </router-link>
      </div>

      <!-- Quick Actions -->
      <div>
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Quick Actions
        </p>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <router-link
            v-for="link in quickLinks"
            :key="link.to"
            :to="link.to"
            class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow hover:border-slate-300 transition-all flex flex-col items-start gap-2.5 group"
          >
            <div
              :class="[
                'inline-flex items-center justify-center w-9 h-9 rounded-lg',
                link.bg,
                link.color,
                'group-hover:scale-105 transition-transform',
              ]"
            >
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
