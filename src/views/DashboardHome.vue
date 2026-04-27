<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../stores/auth.ts'
import api from '../services/api.ts'

defineOptions({ name: 'DashboardHome' })

const auth    = useAuthStore()
const loading = ref(true)
const error   = ref('')

const overview       = ref<any>(null)
const lowStockCount  = ref(0)
const pendingPoCount = ref(0)
const deliveryCounts = ref<Record<string, number>>({})
const todaySales     = ref(0)
const todayTxCount   = ref(0)

const role = computed(() => auth.roleTypeName)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
})

const phpFmt = (v: number) =>
  '₱ ' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v)

async function loadData() {
  loading.value = true; error.value = ''
  try {
    const r = role.value
    if (r === 'TenantAdmin') {
      overview.value = (await api.get('/tenant/analytics/overview')).data
    } else if (r === 'WarehouseStaff') {
      lowStockCount.value = (await api.get('/warehouse/inventory', { params: { lowStock: true } })).data.length
    } else if (r === 'ProcurementOfficer') {
      pendingPoCount.value = (await api.get('/procurement/purchase-orders', { params: { status: 'Pending' } })).data.length
    } else if (r === 'LogisticsStaff') {
      const all: any[] = (await api.get('/logistics/deliveries')).data
      deliveryCounts.value = {
        Scheduled:    all.filter(d => d.status === 'Scheduled').length,
        'In-Transit': all.filter(d => d.status === 'In-Transit').length,
        Delivered:    all.filter(d => d.status === 'Delivered').length,
      }
    } else if (r === 'Cashier') {
      const today = new Date().toISOString().slice(0, 10)
      const res   = (await api.get('/cashier/sales', { params: { date: today } })).data
      todayTxCount.value = res.total
      todaySales.value   = res.items?.reduce((s: number, t: any) => s + Number(t.totalAmount), 0) ?? 0
    }
  } catch {
    error.value = 'Could not load dashboard data.'
  } finally { loading.value = false }
}
onMounted(loadData)

const adminKpis = computed(() => [
  { icon: 'ph-fill ph-currency-circle-dollar', bg: 'bg-blue-50',   color: 'text-blue-500',   val: phpFmt(overview.value?.totalRevenue ?? 0), lbl: 'Total Revenue', trend: 'up', pct: '+18%' },
  { icon: 'ph-fill ph-shopping-cart',          bg: 'bg-green-50',  color: 'text-green-500',  val: (overview.value?.totalOrders ?? 0).toLocaleString(), lbl: 'Purchase Orders', trend: 'up', pct: '+5%' },
  { icon: 'ph-fill ph-users',                  bg: 'bg-sky-50',    color: 'text-sky-500',    val: (overview.value?.totalUsers ?? 0).toLocaleString(), lbl: 'Active Users', trend: 'up', pct: '+2%' },
  { icon: 'ph-fill ph-package',                bg: 'bg-amber-50',  color: 'text-amber-500',  val: (overview.value?.totalProducts ?? 0).toLocaleString(), lbl: 'Products', trend: 'flat', pct: '' },
  {
    icon:  'ph-fill ph-warning-circle',
    bg:    (overview.value?.lowStockCount ?? 0) > 0 ? 'bg-red-50'   : 'bg-green-50',
    color: (overview.value?.lowStockCount ?? 0) > 0 ? 'text-red-500' : 'text-green-500',
    val:   (overview.value?.lowStockCount ?? 0).toLocaleString(),
    lbl:   'Low Stock Items',
    trend: (overview.value?.lowStockCount ?? 0) > 0 ? 'down' : 'up',
    pct:   (overview.value?.lowStockCount ?? 0) > 0 ? `${overview.value?.lowStockCount}` : 'OK',
  },
  { icon: 'ph-fill ph-cash-register', bg: 'bg-purple-50', color: 'text-purple-500', val: phpFmt(overview.value?.todaySales ?? 0), lbl: "Today's Sales", trend: 'up', pct: '+12%' },
])

const adminLinks = [
  { to: '/dashboard/users',     icon: 'ph-fill ph-users',          label: 'Users',          desc: 'Staff & roles',          bg: 'bg-blue-50',    color: 'text-blue-500' },
  { to: '/dashboard/products',  icon: 'ph-fill ph-package',        label: 'Products',       desc: 'Catalog management',     bg: 'bg-amber-50',   color: 'text-amber-500' },
  { to: '/dashboard/suppliers', icon: 'ph-fill ph-users-three',    label: 'Suppliers',      desc: 'Partner network',        bg: 'bg-purple-50',  color: 'text-purple-500' },
  { to: '/dashboard/analytics', icon: 'ph-fill ph-chart-line-up',  label: 'Analytics',      desc: 'Business insights',      bg: 'bg-emerald-50', color: 'text-emerald-500' },
  { to: '/dashboard/audit',     icon: 'ph-fill ph-clipboard-text', label: 'Audit Log',      desc: 'Activity history',       bg: 'bg-sky-50',     color: 'text-sky-500' },
  { to: '/dashboard/store',     icon: 'ph-fill ph-storefront',     label: 'Store Settings', desc: 'Profile & address',      bg: 'bg-rose-50',    color: 'text-rose-500' },
]

const warehouseLinks = [
  { to: '/dashboard/inventory', icon: 'ph-fill ph-stack',             label: 'Inventory',       desc: 'Stock levels',     bg: 'bg-blue-50',    color: 'text-blue-500' },
  { to: '/dashboard/receiving', icon: 'ph-fill ph-arrow-circle-down', label: 'Receiving',       desc: 'Confirm deliveries',bg: 'bg-emerald-50', color: 'text-emerald-500' },
  { to: '/dashboard/products',  icon: 'ph-fill ph-package',           label: 'Products',        desc: 'Catalog',          bg: 'bg-amber-50',   color: 'text-amber-500' },
  { to: '/dashboard/forecast',  icon: 'ph-fill ph-chart-line-up',     label: 'Demand Forecast', desc: 'Predictive insights',bg: 'bg-purple-50',  color: 'text-purple-500' },
]

const procurementLinks = [
  { to: '/dashboard/procurement', icon: 'ph-fill ph-file-text',   label: 'Purchase Orders', desc: 'Manage POs',     bg: 'bg-amber-50',  color: 'text-amber-500' },
  { to: '/dashboard/suppliers',   icon: 'ph-fill ph-users-three', label: 'Suppliers',       desc: 'Partner network',bg: 'bg-purple-50', color: 'text-purple-500' },
  { to: '/dashboard/reports',     icon: 'ph-fill ph-chart-bar',   label: 'Reports',         desc: 'Spend analysis', bg: 'bg-blue-50',   color: 'text-blue-500' },
]

const logisticsKpis = computed(() => [
  { icon: 'ph-fill ph-truck',        bg: 'bg-sky-50',   color: 'text-sky-500',   val: deliveryCounts.value['Scheduled']    ?? 0, lbl: 'Scheduled' },
  { icon: 'ph-fill ph-package',      bg: 'bg-amber-50', color: 'text-amber-500', val: deliveryCounts.value['In-Transit']   ?? 0, lbl: 'In Transit' },
  { icon: 'ph-fill ph-check-circle', bg: 'bg-green-50', color: 'text-green-500', val: deliveryCounts.value['Delivered']    ?? 0, lbl: 'Delivered' },
])

const logisticsLinks = [
  { to: '/dashboard/logistics', icon: 'ph-fill ph-truck',     label: 'Deliveries', desc: 'Track shipments', bg: 'bg-sky-50',  color: 'text-sky-500' },
  { to: '/dashboard/reports',   icon: 'ph-fill ph-chart-bar', label: 'Reports',    desc: 'Performance',     bg: 'bg-blue-50', color: 'text-blue-500' },
]

const cashierKpis = computed(() => [
  { icon: 'ph-fill ph-currency-circle-dollar', bg: 'bg-blue-50',  color: 'text-blue-500',  val: phpFmt(todaySales.value), lbl: "Today's Sales" },
  { icon: 'ph-fill ph-receipt',                bg: 'bg-green-50', color: 'text-green-500', val: todayTxCount.value,        lbl: 'Transactions Today' },
])

const cashierLinks = [
  { to: '/dashboard/sales',    icon: 'ph-fill ph-receipt',          label: 'Sales History',  desc: 'Past transactions', bg: 'bg-emerald-50', color: 'text-emerald-500' },
  { to: '/dashboard/products', icon: 'ph-fill ph-magnifying-glass', label: 'Product Lookup', desc: 'Browse catalog',    bg: 'bg-amber-50',   color: 'text-amber-500' },
]
</script>

<template>
  <div class="flex flex-col gap-5 max-w-[1280px] mx-auto w-full">

    <!-- Greeting -->
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">{{ greeting }}, {{ auth.firstName || 'User' }} 👋</h1>
        <p class="text-sm text-slate-500 mt-1">
          {{ auth.roleTypeName }} · {{ new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}
        </p>
      </div>
      <button @click="loadData" :disabled="loading"
        class="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg transition-all disabled:opacity-60">
        <i class="ph ph-arrows-clockwise" :class="{ 'animate-spin': loading }"></i> Refresh
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-4 gap-4">
      <div v-for="i in 4" :key="i" class="h-28 bg-slate-100 rounded-2xl animate-pulse"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-white rounded-xl border border-rose-200 flex flex-col items-center justify-center gap-3 py-16 text-rose-600">
      <i class="ph ph-warning-circle text-4xl"></i>
      <p class="text-sm">{{ error }}</p>
      <button @click="loadData"
        class="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm transition-all">
        Try Again
      </button>
    </div>

    <template v-else>

      <!-- TenantAdmin -->
      <template v-if="role === 'TenantAdmin' && overview">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="kpi in adminKpis" :key="kpi.lbl"
            class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow transition-shadow">
            <div class="flex items-start justify-between gap-2">
              <div :class="['inline-flex items-center justify-center w-9 h-9 rounded-lg', kpi.bg, kpi.color]">
                <i :class="[kpi.icon, 'text-lg']"></i>
              </div>
              <span v-if="kpi.pct" :class="[
                'inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full',
                kpi.trend === 'up'   ? 'bg-emerald-50 text-emerald-700' :
                kpi.trend === 'down' ? 'bg-rose-50 text-rose-700' :
                                       'bg-slate-100 text-slate-600',
              ]">
                <i :class="kpi.trend === 'up' ? 'ph ph-arrow-up' : kpi.trend === 'down' ? 'ph ph-arrow-down' : 'ph ph-minus'" class="text-[10px]"></i>
                {{ kpi.pct }}
              </span>
            </div>
            <p class="text-xl font-bold text-slate-900 mt-3 leading-none">{{ kpi.val }}</p>
            <p class="text-xs text-slate-500 mt-1.5">{{ kpi.lbl }}</p>
          </div>
        </div>
        <div>
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

      <!-- WarehouseStaff -->
      <template v-else-if="role === 'WarehouseStaff'">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow transition-shadow">
            <div class="flex items-start justify-between gap-2">
              <div :class="['inline-flex items-center justify-center w-9 h-9 rounded-lg',
                lowStockCount > 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500']">
                <i class="ph-fill ph-warning-circle text-lg"></i>
              </div>
              <span :class="[
                'inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full',
                lowStockCount > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700',
              ]">
                <i :class="lowStockCount > 0 ? 'ph ph-arrow-down' : 'ph ph-check'" class="text-[10px]"></i>
                {{ lowStockCount > 0 ? 'Action' : 'OK' }}
              </span>
            </div>
            <p class="text-xl font-bold text-slate-900 mt-3 leading-none">{{ lowStockCount }}</p>
            <p class="text-xs text-slate-500 mt-1.5">Low Stock Items</p>
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

      <!-- ProcurementOfficer -->
      <template v-else-if="role === 'ProcurementOfficer'">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow transition-shadow">
            <div class="flex items-start justify-between gap-2">
              <div class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-amber-50 text-amber-500">
                <i class="ph-fill ph-file-text text-lg"></i>
              </div>
              <span class="inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                <i class="ph ph-clock text-[10px]"></i> Awaiting
              </span>
            </div>
            <p class="text-xl font-bold text-slate-900 mt-3 leading-none">{{ pendingPoCount }}</p>
            <p class="text-xs text-slate-500 mt-1.5">Pending Purchase Orders</p>
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

      <!-- LogisticsStaff -->
      <template v-else-if="role === 'LogisticsStaff'">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="kpi in logisticsKpis" :key="kpi.lbl"
            class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow transition-shadow">
            <div class="flex items-start justify-between gap-2">
              <div :class="['inline-flex items-center justify-center w-9 h-9 rounded-lg', kpi.bg, kpi.color]">
                <i :class="[kpi.icon, 'text-lg']"></i>
              </div>
            </div>
            <p class="text-xl font-bold text-slate-900 mt-3 leading-none">{{ kpi.val }}</p>
            <p class="text-xs text-slate-500 mt-1.5">{{ kpi.lbl }}</p>
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

      <!-- Cashier -->
      <template v-else-if="role === 'Cashier'">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div v-for="kpi in cashierKpis" :key="kpi.lbl"
            class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow transition-shadow">
            <div class="flex items-start justify-between gap-2">
              <div :class="['inline-flex items-center justify-center w-9 h-9 rounded-lg', kpi.bg, kpi.color]">
                <i :class="[kpi.icon, 'text-lg']"></i>
              </div>
              <span class="inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                <i class="ph ph-arrow-up text-[10px]"></i> Today
              </span>
            </div>
            <p class="text-xl font-bold text-slate-900 mt-3 leading-none">{{ kpi.val }}</p>
            <p class="text-xs text-slate-500 mt-1.5">{{ kpi.lbl }}</p>
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

    </template>
  </div>
</template>
