<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { Chart, registerables } from 'chart.js'
import { useAuthStore } from '../stores/auth.ts'
import { useRouter, useRoute } from 'vue-router'
import {
  getDashboardKpis, getDailySales, getBranchSales,
  getTopProducts, getInventoryStatus,
} from '../services/reportsService.ts'
import { getReorderRecommendations } from '../services/forecastService.ts'
import { getBranches } from '../services/tenant.ts'

Chart.register(...registerables)

defineOptions({ name: 'DashboardHome' })

const auth   = useAuthStore()
const router = useRouter()
const route  = useRoute()
const role   = computed(() => auth.roleTypeName)

// ── Payment success congratulations ──────────────────────────────────────────
const showCongrats = ref(false)
const congratsPlan = ref('')

onMounted(() => {
  if (route.query.payment === 'success') {
    congratsPlan.value = (route.query.plan as string) || 'your plan'
    showCongrats.value = true
    router.replace({ path: '/dashboard' })
  }
  if (role.value === 'TenantAdmin') loadDashboard()
})

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
})

// ── Dashboard state ───────────────────────────────────────────────────────────
const loading     = ref(true)
const kpis        = ref<any>(null)
const dailySales  = ref<any[]>([])
const topProducts = ref<any[]>([])
const invStatus   = ref<any[]>([])
const branchSales = ref<any[]>([])
const reorders    = ref<any[]>([])
const branches    = ref<any[]>([])

// ── Filters ───────────────────────────────────────────────────────────────────
const dateRange    = ref('30')
const branchFilter = ref<number | ''>('')

const dateOptions = [
  { label: 'Today',       value: '1'  },
  { label: '7 Days',      value: '7'  },
  { label: '30 Days',     value: '30' },
  { label: '90 Days',     value: '90' },
]

async function loadDashboard() {
  loading.value = true
  try {
    const days = Number.parseInt(dateRange.value) || 30
    const bid  = branchFilter.value === '' ? undefined : (branchFilter.value as number)
    const [k, ds, tp, inv, bs, rr, br] = await Promise.all([
      getDashboardKpis(bid),
      getDailySales(days, bid),
      getTopProducts(),
      getInventoryStatus(),
      getBranchSales(),
      getReorderRecommendations({ status: 'Pending' }),
      getBranches(),
    ])
    kpis.value        = k
    dailySales.value  = ds
    topProducts.value = tp
    invStatus.value   = inv
    branchSales.value = bs
    reorders.value    = Array.isArray(rr) ? rr : (rr?.items ?? [])
    branches.value    = Array.isArray(br) ? br : (br?.items ?? br?.branches ?? [])
  } catch (e) {
    console.error('Dashboard load error', e)
  } finally {
    loading.value = false
  }
}

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtPeso = (n: number) =>
  '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtNum = (n: number) => Number(n).toLocaleString()
const shortName = (s: string, max = 22) => s.length > max ? s.slice(0, max) + '…' : s

// ── KPI helpers ───────────────────────────────────────────────────────────────
const salesChangeCls = computed(() => {
  const p = kpis.value?.salesChangePct
  if (p == null) return 'text-slate-400'
  if (p > 0) return 'text-emerald-600'
  if (p < 0) return 'text-red-500'
  return 'text-slate-400'
})
const salesChangeIcon = computed(() => {
  const p = kpis.value?.salesChangePct
  if (p == null) return 'ph ph-minus'
  if (p > 0) return 'ph-fill ph-trend-up'
  if (p < 0) return 'ph-fill ph-trend-down'
  return 'ph ph-minus'
})

// ── Action panel data ─────────────────────────────────────────────────────────
const outOfStockItems = computed(() =>
  invStatus.value.filter((i: any) => i.stockStatus === 'Out of Stock').slice(0, 4)
)
const lowStockCount = computed(() =>
  invStatus.value.filter((i: any) => i.stockStatus === 'Low').length
)
const hasActions = computed(() =>
  outOfStockItems.value.length > 0 || lowStockCount.value > 0 || reorders.value.length > 0
)

// ── Chart refs & instances ────────────────────────────────────────────────────
const refSalesTrend  = ref<HTMLCanvasElement | null>(null)
const refTopProducts = ref<HTMLCanvasElement | null>(null)
const refInvDonut    = ref<HTMLCanvasElement | null>(null)
const refBranchSales = ref<HTMLCanvasElement | null>(null)

const CHARTS: Record<string, Chart> = {}

const C = {
  blue:   '#3B82F6', navy:   '#1E2B5E', green: '#22C55E',
  amber:  '#F59E0B', red:    '#EF4444', purple:'#A855F7',
  teal:   '#14B8A6', pink:   '#EC4899', slate: '#94A3B8',
}
const BRANCH_PALETTE = [C.blue, C.purple, C.teal, C.amber, C.pink, C.green, C.red]

const BASE = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: C.navy, padding: 10, cornerRadius: 8, titleFont: { size: 12 }, bodyFont: { size: 11 } },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#94A3B8', font: { size: 11 } } },
    y: { grid: { color: '#F1F5F9' }, ticks: { color: '#94A3B8', font: { size: 11 } } },
  },
}

function pesoTick(v: any) {
  const n = Number(v)
  if (n >= 1000000) return '₱' + (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return '₱' + (n / 1000).toFixed(0) + 'k'
  return '₱' + n
}

function destroyCharts() {
  Object.values(CHARTS).forEach(c => c.destroy())
  Object.keys(CHARTS).forEach(k => delete CHARTS[k])
}

function initCharts() {
  destroyCharts()

  // 1 ── Sales Trend (Line)
  if (refSalesTrend.value && dailySales.value.length > 0) {
    CHARTS.salesTrend = new Chart(refSalesTrend.value, {
      type: 'line',
      data: {
        labels: dailySales.value.map((d: any) =>
          new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        ),
        datasets: [{
          data: dailySales.value.map((d: any) => d.totalSales),
          borderColor: C.blue,
          backgroundColor: 'rgba(59,130,246,0.07)',
          fill: true, tension: 0.4,
          pointRadius: dailySales.value.length > 20 ? 0 : 3,
          pointBackgroundColor: C.blue, borderWidth: 2.5,
        }],
      },
      options: {
        ...BASE,
        plugins: { ...BASE.plugins, tooltip: { ...BASE.plugins.tooltip, callbacks: { label: (c: any) => ` ${fmtPeso(c.raw)}` } } },
        scales: { x: BASE.scales.x, y: { ...BASE.scales.y, ticks: { ...BASE.scales.y.ticks, callback: pesoTick } } },
      } as any,
    })
  }

  // 2 ── Top Products (Horizontal Bar)
  if (refTopProducts.value && topProducts.value.length > 0) {
    const tp = topProducts.value.slice(0, 7)
    CHARTS.topProducts = new Chart(refTopProducts.value, {
      type: 'bar',
      data: {
        labels: tp.map((p: any) => shortName(p.productName, 24)),
        datasets: [{
          data: tp.map((p: any) => p.totalRevenue),
          backgroundColor: tp.map((_: any, i: number) => i === 0 ? C.blue : `rgba(59,130,246,${0.85 - i * 0.08})`),
          borderRadius: 4, borderSkipped: false,
        }],
      },
      options: {
        indexAxis: 'y' as const,
        ...BASE,
        plugins: { ...BASE.plugins, tooltip: { ...BASE.plugins.tooltip, callbacks: { label: (c: any) => ` ${fmtPeso(c.raw)} · ${fmtNum(tp[c.dataIndex]?.totalQty)} units` } } },
        scales: {
          x: { ...BASE.scales.x, ticks: { ...BASE.scales.x.ticks, callback: pesoTick } },
          y: { grid: { display: false }, ticks: { color: '#475569', font: { size: 11 } } },
        },
      } as any,
    })
  }

  // 3 ── Inventory Status (Doughnut)
  if (refInvDonut.value && invStatus.value.length > 0) {
    const ok  = invStatus.value.filter((i: any) => i.stockStatus === 'OK').length
    const low = invStatus.value.filter((i: any) => i.stockStatus === 'Low').length
    const out = invStatus.value.filter((i: any) => i.stockStatus === 'Out of Stock').length
    const total = ok + low + out
    CHARTS.invDonut = new Chart(refInvDonut.value, {
      type: 'doughnut',
      data: {
        labels: ['In Stock', 'Low Stock', 'Out of Stock'],
        datasets: [{ data: [ok, low, out], backgroundColor: [C.green, C.amber, C.red], borderWidth: 0, hoverOffset: 8 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '70%',
        plugins: {
          legend: { display: true, position: 'bottom' as const, labels: { padding: 14, font: { size: 11 }, usePointStyle: true, boxWidth: 8 } },
          tooltip: { backgroundColor: C.navy, padding: 10, cornerRadius: 8, callbacks: { label: (c: any) => ` ${c.label}: ${c.raw} (${Math.round((c.raw as number / total) * 100)}%)` } },
        },
      },
    })
  }

  // 4 ── Branch Sales (Bar)
  if (refBranchSales.value && branchSales.value.length > 0) {
    CHARTS.branchSales = new Chart(refBranchSales.value, {
      type: 'bar',
      data: {
        labels: branchSales.value.map((b: any) => shortName(b.branchName, 16)),
        datasets: [{
          data: branchSales.value.map((b: any) => b.totalSales),
          backgroundColor: branchSales.value.map((_: any, i: number) => BRANCH_PALETTE[i % BRANCH_PALETTE.length]),
          borderRadius: 6, borderSkipped: false,
        }],
      },
      options: {
        ...BASE,
        plugins: { ...BASE.plugins, tooltip: { ...BASE.plugins.tooltip, callbacks: { label: (c: any) => ` ${fmtPeso(c.raw)} · ${fmtNum(branchSales.value[c.dataIndex]?.transactions)} orders` } } },
        scales: { x: BASE.scales.x, y: { ...BASE.scales.y, ticks: { ...BASE.scales.y.ticks, callback: pesoTick } } },
      } as any,
    })
  }
}

watch(loading, async (val) => {
  if (!val && role.value === 'TenantAdmin') {
    await nextTick()
    initCharts()
  }
})
onBeforeUnmount(destroyCharts)

// ── Quick access links (kept intact for all roles) ────────────────────────────
const adminLinks = [
  { to: '/dashboard/users',     icon: 'ph-fill ph-users',          label: 'Users',          desc: 'Staff & roles',       bg: 'bg-blue-50',    color: 'text-blue-500' },
  { to: '/dashboard/products',  icon: 'ph-fill ph-package',        label: 'Products',       desc: 'Catalog management',  bg: 'bg-amber-50',   color: 'text-amber-500' },
  { to: '/dashboard/suppliers', icon: 'ph-fill ph-users-three',    label: 'Suppliers',      desc: 'Partner network',     bg: 'bg-purple-50',  color: 'text-purple-500' },
  { to: '/dashboard/analytics', icon: 'ph-fill ph-chart-line-up',  label: 'Analytics',      desc: 'Business insights',   bg: 'bg-emerald-50', color: 'text-emerald-500' },
  { to: '/dashboard/audit',     icon: 'ph-fill ph-clipboard-text', label: 'Audit Log',      desc: 'Activity history',    bg: 'bg-sky-50',     color: 'text-sky-500' },
  { to: '/dashboard/store',     icon: 'ph-fill ph-storefront',     label: 'Store Settings', desc: 'Profile & address',   bg: 'bg-rose-50',    color: 'text-rose-500' },
]
const warehouseLinks = [
  { to: '/dashboard/inventory', icon: 'ph-fill ph-stack',             label: 'Inventory',       desc: 'Stock levels',       bg: 'bg-blue-50',    color: 'text-blue-500' },
  { to: '/dashboard/receiving', icon: 'ph-fill ph-arrow-circle-down', label: 'Receiving',       desc: 'Confirm deliveries', bg: 'bg-emerald-50', color: 'text-emerald-500' },
  { to: '/dashboard/products',  icon: 'ph-fill ph-package',           label: 'Products',        desc: 'Catalog',            bg: 'bg-amber-50',   color: 'text-amber-500' },
  { to: '/dashboard/forecast',  icon: 'ph-fill ph-chart-line-up',     label: 'Demand Forecast', desc: 'Predictive insights',bg: 'bg-purple-50',  color: 'text-purple-500' },
]
const procurementLinks = [
  { to: '/dashboard/procurement',icon: 'ph-fill ph-file-text',   label: 'Purchase Orders',desc: 'Manage POs',     bg: 'bg-amber-50',  color: 'text-amber-500' },
  { to: '/dashboard/suppliers',  icon: 'ph-fill ph-users-three', label: 'Suppliers',      desc: 'Partner network',bg: 'bg-purple-50', color: 'text-purple-500' },
  { to: '/dashboard/reports',    icon: 'ph-fill ph-chart-bar',   label: 'Reports',        desc: 'Spend analysis', bg: 'bg-blue-50',   color: 'text-blue-500' },
]
const logisticsLinks = [
  { to: '/dashboard/logistics',icon: 'ph-fill ph-truck',     label: 'Deliveries',desc: 'Track shipments',bg: 'bg-sky-50',  color: 'text-sky-500' },
  { to: '/dashboard/reports',  icon: 'ph-fill ph-chart-bar', label: 'Reports',   desc: 'Performance',    bg: 'bg-blue-50', color: 'text-blue-500' },
]
const cashierLinks = [
  { to: '/dashboard/sales',    icon: 'ph-fill ph-receipt',          label: 'Sales History',  desc: 'Past transactions',bg: 'bg-emerald-50', color: 'text-emerald-500' },
  { to: '/dashboard/products', icon: 'ph-fill ph-magnifying-glass', label: 'Product Lookup', desc: 'Browse catalog',   bg: 'bg-amber-50',   color: 'text-amber-500' },
]
</script>

<template>
  <div class="flex flex-col gap-5 max-w-[1280px] mx-auto w-full">

    <!-- Payment Success Modal -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showCongrats" class="ps-modal-backdrop" @click.self="showCongrats = false">
          <div class="ps-modal-card text-center" style="max-width: 440px">
            <div class="flex flex-col items-center gap-3 px-8 pt-10 pb-6">
              <div class="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                <i class="ph-fill ph-crown text-4xl text-indigo-500"></i>
              </div>
              <div>
                <h2 class="text-2xl font-bold text-slate-900">Congratulations!</h2>
                <p class="mt-2 text-slate-500 text-sm leading-relaxed">
                  You're now on the <strong class="text-indigo-600">{{ congratsPlan }}</strong>.<br>
                  All premium features are now unlocked and ready to use.
                </p>
              </div>
              <div class="w-full mt-2 p-4 bg-indigo-50 rounded-xl text-left space-y-2">
                <div class="flex items-center gap-2 text-sm text-indigo-700"><i class="ph-fill ph-check-circle text-indigo-500"></i> Subscription activated successfully</div>
                <div class="flex items-center gap-2 text-sm text-indigo-700"><i class="ph-fill ph-check-circle text-indigo-500"></i> Demand forecasting unlocked</div>
                <div class="flex items-center gap-2 text-sm text-indigo-700"><i class="ph-fill ph-check-circle text-indigo-500"></i> Branch management enabled</div>
              </div>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-primary w-full justify-center" @click="showCongrats = false">
                <i class="ph ph-rocket-launch"></i> Get Started
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══════════════════════════════════════════
         TENANT ADMIN DASHBOARD
    ══════════════════════════════════════════ -->
    <template v-if="role === 'TenantAdmin'">

      <!-- Header -->
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">
            {{ greeting }}, {{ auth.firstName || 'Admin' }} 👋
          </h1>
          <p class="text-sm text-slate-500 mt-0.5">
            {{ auth.roleTypeName }} ·
            {{ new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}
          </p>
        </div>
        <router-link to="/dashboard/analytics" class="ps-btn ps-btn-outline text-sm">
          <i class="ph ph-chart-line-up"></i> Advanced Analytics
        </router-link>
      </div>

      <!-- Loading state -->
      <template v-if="loading">
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div v-for="i in 6" :key="i" class="h-24 bg-slate-100 rounded-xl animate-pulse"></div>
        </div>
        <div class="h-8 w-56 bg-slate-100 rounded-lg animate-pulse"></div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="lg:col-span-2 h-72 bg-slate-100 rounded-xl animate-pulse"></div>
          <div class="h-72 bg-slate-100 rounded-xl animate-pulse"></div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="h-64 bg-slate-100 rounded-xl animate-pulse"></div>
          <div class="h-64 bg-slate-100 rounded-xl animate-pulse"></div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="h-64 bg-slate-100 rounded-xl animate-pulse"></div>
          <div class="h-64 bg-slate-100 rounded-xl animate-pulse"></div>
        </div>
      </template>

      <template v-else>

        <!-- ── KPI Summary Cards ───────────────────────── -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

          <!-- Today's Sales -->
          <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <div class="w-9 h-9 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center">
                <i class="ph-fill ph-currency-circle-dollar text-lg"></i>
              </div>
              <span :class="['text-xs font-semibold flex items-center gap-0.5', salesChangeCls]">
                <i :class="salesChangeIcon" class="text-xs"></i>
                {{ kpis?.salesChangePct != null ? Math.abs(kpis.salesChangePct) + '%' : '' }}
              </span>
            </div>
            <div class="text-xl font-bold text-slate-900 leading-tight">{{ fmtPeso(kpis?.todaySales ?? 0) }}</div>
            <div class="text-xs text-slate-500">Today's Sales</div>
          </div>

          <!-- Today's Transactions -->
          <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-2">
            <div class="w-9 h-9 bg-purple-50 text-purple-500 rounded-lg flex items-center justify-center">
              <i class="ph-fill ph-receipt text-lg"></i>
            </div>
            <div class="text-xl font-bold text-slate-900 leading-tight">{{ fmtNum(kpis?.ordersToday ?? 0) }}</div>
            <div class="text-xs text-slate-500">Transactions</div>
          </div>

          <!-- Low Stock -->
          <div :class="['bg-white border rounded-xl p-4 shadow-sm flex flex-col gap-2', (kpis?.lowStockCount ?? 0) > 0 ? 'border-amber-200' : 'border-slate-200']">
            <div class="w-9 h-9 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center">
              <i class="ph-fill ph-warning text-lg"></i>
            </div>
            <div :class="['text-xl font-bold leading-tight', (kpis?.lowStockCount ?? 0) > 0 ? 'text-amber-600' : 'text-slate-900']">
              {{ fmtNum(kpis?.lowStockCount ?? 0) }}
            </div>
            <div class="text-xs text-slate-500">Low Stock</div>
          </div>

          <!-- Out of Stock -->
          <div :class="['bg-white border rounded-xl p-4 shadow-sm flex flex-col gap-2', (kpis?.outOfStockCount ?? 0) > 0 ? 'border-red-200' : 'border-slate-200']">
            <div class="w-9 h-9 bg-red-50 text-red-500 rounded-lg flex items-center justify-center">
              <i class="ph-fill ph-x-circle text-lg"></i>
            </div>
            <div :class="['text-xl font-bold leading-tight', (kpis?.outOfStockCount ?? 0) > 0 ? 'text-red-600' : 'text-slate-900']">
              {{ fmtNum(kpis?.outOfStockCount ?? 0) }}
            </div>
            <div class="text-xs text-slate-500">Out of Stock</div>
          </div>

          <!-- Pending POs -->
          <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-2">
            <div class="w-9 h-9 bg-sky-50 text-sky-500 rounded-lg flex items-center justify-center">
              <i class="ph-fill ph-file-text text-lg"></i>
            </div>
            <div class="text-xl font-bold text-slate-900 leading-tight">{{ fmtNum(kpis?.pendingPOs ?? 0) }}</div>
            <div class="text-xs text-slate-500">Pending POs</div>
          </div>

          <!-- Forecast Reorders -->
          <div :class="['bg-white border rounded-xl p-4 shadow-sm flex flex-col gap-2', (kpis?.pendingReorders ?? 0) > 0 ? 'border-indigo-200' : 'border-slate-200']">
            <div class="w-9 h-9 bg-indigo-50 text-indigo-500 rounded-lg flex items-center justify-center">
              <i class="ph-fill ph-chart-line-up text-lg"></i>
            </div>
            <div :class="['text-xl font-bold leading-tight', (kpis?.pendingReorders ?? 0) > 0 ? 'text-indigo-600' : 'text-slate-900']">
              {{ fmtNum(kpis?.pendingReorders ?? 0) }}
            </div>
            <div class="text-xs text-slate-500">Forecast Reorders</div>
          </div>
        </div>

        <!-- ── Filter Bar ──────────────────────────────── -->
        <div class="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
          <i class="ph ph-funnel text-slate-400"></i>
          <div class="flex items-center gap-1 flex-wrap">
            <button
              v-for="opt in dateOptions" :key="opt.value"
              @click="dateRange = opt.value; loadDashboard()"
              :class="['px-3 py-1.5 text-xs font-semibold rounded-lg transition-all', dateRange === opt.value ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200']"
            >{{ opt.label }}</button>
          </div>
          <div class="w-px h-4 bg-slate-200 mx-1 hidden sm:block"></div>
          <select
            v-model="branchFilter"
            @change="loadDashboard()"
            class="text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">All Branches</option>
            <option v-for="b in branches" :key="b.branchId" :value="b.branchId">{{ b.branchName }}</option>
          </select>
        </div>

        <!-- ── Row 1: Sales Trend + Needs Action ─────────────────── -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <!-- Sales Trend Line Chart -->
          <div class="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div class="px-5 pt-5 pb-3 flex items-start justify-between flex-shrink-0">
              <div>
                <div class="font-bold text-slate-800">Sales Trend</div>
                <div class="text-xs text-slate-400 mt-0.5">
                  Revenue over the last {{ dateRange }} day{{ dateRange === '1' ? '' : 's' }}
                  <span v-if="branchFilter !== ''" class="ml-1 text-blue-500">· filtered by branch</span>
                </div>
              </div>
              <div v-if="dailySales.length > 0" class="text-right">
                <div class="text-sm font-bold text-slate-900">
                  {{ fmtPeso(dailySales.reduce((s: number, d: any) => s + d.totalSales, 0)) }}
                </div>
                <div class="text-[10px] text-slate-400">Period total</div>
              </div>
            </div>
            <div class="px-4 pb-5 flex-1" style="min-height: 220px">
              <div v-if="dailySales.length === 0" class="flex flex-col items-center justify-center h-full gap-2 text-slate-300 py-10">
                <i class="ph-fill ph-chart-line text-4xl"></i>
                <p class="text-sm text-slate-400">No sales data for this period</p>
              </div>
              <canvas v-else ref="refSalesTrend" style="width:100%;height:220px"></canvas>
            </div>
          </div>

          <!-- Needs Action Panel -->
          <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div class="px-5 pt-5 pb-3 border-b border-slate-100 flex-shrink-0">
              <div class="font-bold text-slate-800">Needs Attention</div>
              <div class="text-xs text-slate-400 mt-0.5">Items requiring action now</div>
            </div>
            <div class="flex-1 flex flex-col divide-y divide-slate-50 overflow-y-auto">

              <!-- No issues -->
              <div v-if="!hasActions" class="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center">
                <div class="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
                  <i class="ph-fill ph-check-circle text-2xl text-emerald-500"></i>
                </div>
                <p class="text-sm font-semibold text-slate-700">All clear!</p>
                <p class="text-xs text-slate-400">No immediate actions needed.</p>
              </div>

              <!-- Out of Stock -->
              <div v-if="outOfStockItems.length > 0" class="px-4 py-3.5">
                <div class="flex items-center gap-2 mb-2">
                  <span class="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></span>
                  <span class="text-xs font-bold text-red-600">Out of Stock ({{ kpis?.outOfStockCount ?? 0 }})</span>
                </div>
                <ul class="flex flex-col gap-1.5">
                  <li v-for="item in outOfStockItems" :key="item.productId"
                      class="flex items-center gap-2 text-xs text-slate-600">
                    <i class="ph ph-dot-outline text-red-400 flex-shrink-0"></i>
                    <span class="truncate">{{ item.productName }}</span>
                  </li>
                  <li v-if="(kpis?.outOfStockCount ?? 0) > 4" class="text-[11px] text-slate-400 pl-4">
                    + {{ (kpis?.outOfStockCount ?? 0) - 4 }} more items
                  </li>
                </ul>
                <router-link to="/dashboard/inventory" class="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-red-500 hover:underline">
                  View inventory <i class="ph ph-arrow-right text-[10px]"></i>
                </router-link>
              </div>

              <!-- Low Stock -->
              <div v-if="lowStockCount > 0" class="px-4 py-3.5">
                <div class="flex items-center gap-2 mb-1.5">
                  <span class="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"></span>
                  <span class="text-xs font-bold text-amber-600">Low Stock ({{ lowStockCount }})</span>
                </div>
                <p class="text-xs text-slate-500 pl-4">Approaching reorder threshold</p>
                <router-link to="/dashboard/inventory" class="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-amber-500 hover:underline">
                  Check levels <i class="ph ph-arrow-right text-[10px]"></i>
                </router-link>
              </div>

              <!-- Pending Reorders -->
              <div v-if="reorders.length > 0" class="px-4 py-3.5">
                <div class="flex items-center gap-2 mb-1.5">
                  <span class="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0"></span>
                  <span class="text-xs font-bold text-indigo-600">{{ reorders.length }} Reorder{{ reorders.length !== 1 ? 's' : '' }} Pending</span>
                </div>
                <p class="text-xs text-slate-500 pl-4">Ready to create purchase orders</p>
                <router-link to="/dashboard/forecast" class="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-indigo-500 hover:underline">
                  Create POs <i class="ph ph-arrow-right text-[10px]"></i>
                </router-link>
              </div>

              <!-- Pending POs -->
              <div v-if="(kpis?.pendingPOs ?? 0) > 0" class="px-4 py-3.5">
                <div class="flex items-center gap-2 mb-1.5">
                  <span class="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0"></span>
                  <span class="text-xs font-bold text-sky-600">{{ kpis?.pendingPOs }} Purchase Order{{ kpis?.pendingPOs !== 1 ? 's' : '' }}</span>
                </div>
                <p class="text-xs text-slate-500 pl-4">Awaiting delivery or approval</p>
                <router-link to="/dashboard/procurement" class="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-sky-500 hover:underline">
                  View POs <i class="ph ph-arrow-right text-[10px]"></i>
                </router-link>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Row 2: Top Products + Inventory Status ─────────────────── -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <!-- Top-Selling Products -->
          <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div class="px-5 pt-5 pb-3 flex items-start justify-between">
              <div>
                <div class="font-bold text-slate-800">Top-Selling Products</div>
                <div class="text-xs text-slate-400 mt-0.5">By total revenue · all time</div>
              </div>
              <span class="ps-tag ps-tag-blue text-[10px]">Top 7</span>
            </div>
            <div class="px-4 pb-5" style="height: 248px">
              <div v-if="topProducts.length === 0" class="flex flex-col items-center justify-center h-full gap-2 text-slate-300">
                <i class="ph-fill ph-package text-4xl"></i>
                <p class="text-sm text-slate-400">No product data available</p>
              </div>
              <canvas v-else ref="refTopProducts"></canvas>
            </div>
          </div>

          <!-- Inventory Status Donut -->
          <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div class="px-5 pt-5 pb-3 flex items-start justify-between">
              <div>
                <div class="font-bold text-slate-800">Inventory Status</div>
                <div class="text-xs text-slate-400 mt-0.5">Stock health overview</div>
              </div>
              <span class="ps-tag ps-tag-green text-[10px]">{{ invStatus.length }} items</span>
            </div>
            <div class="px-4 pb-5 flex flex-col items-center" style="height: 248px">
              <div v-if="invStatus.length === 0" class="flex flex-col items-center justify-center h-full gap-2 text-slate-300">
                <i class="ph-fill ph-stack text-4xl"></i>
                <p class="text-sm text-slate-400">No inventory data</p>
              </div>
              <template v-else>
                <canvas ref="refInvDonut" style="max-height: 220px; width: 100%"></canvas>
              </template>
            </div>
          </div>
        </div>

        <!-- ── Row 3: Branch Performance + Reorder Table ───────────── -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <!-- Branch Performance -->
          <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div class="px-5 pt-5 pb-3 flex items-start justify-between">
              <div>
                <div class="font-bold text-slate-800">Branch Performance</div>
                <div class="text-xs text-slate-400 mt-0.5">Total revenue per branch</div>
              </div>
              <span class="ps-tag ps-tag-purple text-[10px]">All time</span>
            </div>
            <div class="px-4 pb-5" style="height: 248px">
              <div v-if="branchSales.length === 0" class="flex flex-col items-center justify-center h-full gap-2 text-slate-300">
                <i class="ph-fill ph-storefront text-4xl"></i>
                <p class="text-sm text-slate-400">No branch sales data</p>
              </div>
              <canvas v-else ref="refBranchSales"></canvas>
            </div>
          </div>

          <!-- Reorder Recommendations Table -->
          <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div class="px-5 pt-5 pb-3 flex items-start justify-between flex-shrink-0">
              <div>
                <div class="font-bold text-slate-800">Reorder Recommendations</div>
                <div class="text-xs text-slate-400 mt-0.5">Products pending restocking</div>
              </div>
              <span :class="['ps-tag text-[10px]', reorders.length > 0 ? 'ps-tag-red' : 'ps-tag-green']">
                {{ reorders.length }} pending
              </span>
            </div>
            <div class="flex-1 overflow-hidden">
              <div v-if="reorders.length === 0" class="flex flex-col items-center gap-2 py-10 text-center">
                <i class="ph-fill ph-check-circle text-3xl text-emerald-200"></i>
                <p class="text-sm text-slate-400">No pending recommendations</p>
              </div>
              <table v-else class="w-full text-sm">
                <thead>
                  <tr class="border-b border-slate-100">
                    <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Product</th>
                    <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Branch</th>
                    <th class="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Stock</th>
                    <th class="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Order Qty</th>
                    <th class="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in reorders.slice(0, 6)" :key="r.reorderRecommendationId ?? r.id"
                      class="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td class="px-4 py-2.5 font-medium text-slate-800 text-xs max-w-[130px] truncate">{{ r.productName }}</td>
                    <td class="px-4 py-2.5 text-slate-500 text-xs max-w-[90px] truncate">{{ r.branchName ?? '—' }}</td>
                    <td class="px-4 py-2.5 text-right">
                      <span :class="['ps-tag text-[10px]', Number(r.currentStock) === 0 ? 'ps-tag-red' : 'ps-tag-amber']">
                        {{ r.currentStock }}
                      </span>
                    </td>
                    <td class="px-4 py-2.5 text-right font-bold text-slate-800 text-xs">{{ Math.ceil(r.reorderQuantity) }}</td>
                    <td class="px-4 py-2.5 text-right">
                      <span :class="['text-xs font-semibold', r.trendDirection === 'up' ? 'text-emerald-600' : r.trendDirection === 'down' ? 'text-red-500' : 'text-slate-400']">
                        <i :class="r.trendDirection === 'up' ? 'ph-fill ph-trend-up' : r.trendDirection === 'down' ? 'ph-fill ph-trend-down' : 'ph ph-minus'"></i>
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-if="reorders.length > 6" class="px-5 py-3 border-t border-slate-100">
                <router-link to="/dashboard/forecast" class="text-xs text-blue-500 font-semibold hover:underline">
                  View all {{ reorders.length }} recommendations →
                </router-link>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Access -->
        <div class="mt-1">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Access</p>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <router-link v-for="link in adminLinks" :key="link.to" :to="link.to"
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
    </template>

    <!-- ══════════════════════════════════════════
         OTHER ROLE DASHBOARDS
    ══════════════════════════════════════════ -->

    <template v-else-if="role === 'WarehouseStaff'">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">{{ greeting }}, {{ auth.firstName || 'User' }} 👋</h1>
          <p class="text-sm text-slate-500 mt-1">{{ auth.roleTypeName }} · {{ new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}</p>
        </div>
      </div>
      <div>
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Access</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <router-link v-for="link in warehouseLinks" :key="link.to" :to="link.to"
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

    <template v-else-if="role === 'ProcurementOfficer'">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">{{ greeting }}, {{ auth.firstName || 'User' }} 👋</h1>
          <p class="text-sm text-slate-500 mt-1">{{ auth.roleTypeName }} · {{ new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}</p>
        </div>
      </div>
      <div>
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Access</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <router-link v-for="link in procurementLinks" :key="link.to" :to="link.to"
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

    <template v-else-if="role === 'LogisticsStaff'">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">{{ greeting }}, {{ auth.firstName || 'User' }} 👋</h1>
          <p class="text-sm text-slate-500 mt-1">{{ auth.roleTypeName }} · {{ new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}</p>
        </div>
      </div>
      <div>
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Access</p>
        <div class="grid grid-cols-2 gap-3">
          <router-link v-for="link in logisticsLinks" :key="link.to" :to="link.to"
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

    <template v-else-if="role === 'Cashier'">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">{{ greeting }}, {{ auth.firstName || 'User' }} 👋</h1>
          <p class="text-sm text-slate-500 mt-1">{{ auth.roleTypeName }} · {{ new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}</p>
        </div>
      </div>
      <div>
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Access</p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <router-link to="/dashboard/pos"
            class="bg-blue-500 hover:bg-blue-600 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all flex flex-col items-start gap-2.5 text-white">
            <div class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/20">
              <i class="ph-fill ph-cash-register text-lg"></i>
            </div>
            <div>
              <p class="text-sm font-bold leading-tight">New Transaction</p>
              <p class="text-[11px] text-white/80 mt-0.5">Open POS register</p>
            </div>
          </router-link>
          <router-link v-for="link in cashierLinks" :key="link.to" :to="link.to"
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
