<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { Chart, registerables } from 'chart.js'
import {
  getSalesByMonth, getTopProducts, getInventoryStatus, getProcurementCost,
  getBranchSales, getInventoryByBranch, getSalesHeatmap, getForecastMonthly,
  exportReportPdf,
} from '../services/reportsService.ts'

Chart.register(...registerables)
defineOptions({ name: 'TenantAnalyticsView' })

type Tab = 'overview' | 'forecasting' | 'branches' | 'heatmap'

const activeTab  = ref<Tab>('overview')
const loading    = ref(true)

// ── Data ──────────────────────────────────────────────────────────────────────
const salesByMonth = ref<any[]>([])
const topProducts  = ref<any[]>([])
const invStatus    = ref<any[]>([])
const procCost     = ref<any[]>([])
const branchSales  = ref<any[]>([])
const invByBranch  = ref<any[]>([])
const heatmap      = ref<any[]>([])
const forecasts    = ref<any[]>([])

const phpFmt = (v: number) =>
  '₱' + new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(v)
const fmtNum = (n: number) => Number(n).toLocaleString()
const shortName = (s: string, max = 20) => s.length > max ? s.slice(0, max) + '…' : s
const monthLabel = (year: number, month: number) =>
  new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

function pesoTick(v: any) {
  const n = Number(v)
  if (n >= 1000000) return '₱' + (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000)    return '₱' + (n / 1000).toFixed(0) + 'k'
  return '₱' + n
}

// ── Chart canvas refs ─────────────────────────────────────────────────────────
const refMonthlySales    = ref<HTMLCanvasElement | null>(null)
const refTopProducts     = ref<HTMLCanvasElement | null>(null)
const refForecastArea    = ref<HTMLCanvasElement | null>(null)
const refSalesVsCost     = ref<HTMLCanvasElement | null>(null)
const refBranchBar       = ref<HTMLCanvasElement | null>(null)
const refInvByBranch     = ref<HTMLCanvasElement | null>(null)
const refRevDonut        = ref<HTMLCanvasElement | null>(null)

const CHARTS: Record<string, Chart> = {}

const C = {
  blue: '#3B82F6', navy: '#1E2B5E', green: '#22C55E',
  amber: '#F59E0B', red: '#EF4444', purple: '#A855F7',
  teal: '#14B8A6', pink: '#EC4899', slate: '#94A3B8',
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

// ── Overview computed ─────────────────────────────────────────────────────────
const totalRevenue  = () => salesByMonth.value.reduce((s: number, m: any) => s + Number(m.totalSales), 0)
const monthlyAvg    = () => totalRevenue() / (salesByMonth.value.length || 1)
const totalTxns     = () => salesByMonth.value.reduce((s: number, m: any) => s + (m.transactions ?? 0), 0)
const outOfStock    = () => invStatus.value.filter((i: any) => i.stockStatus === 'Out of Stock').length
const lowStock      = () => invStatus.value.filter((i: any) => i.stockStatus === 'Low').length

// ── Data loading ──────────────────────────────────────────────────────────────
async function loadAll() {
  loading.value = true
  try {
    const [sbm, tp, inv, pc, bs, ibb, hm, fc] = await Promise.all([
      getSalesByMonth(), getTopProducts(), getInventoryStatus(), getProcurementCost(),
      getBranchSales(), getInventoryByBranch(), getSalesHeatmap(), getForecastMonthly(),
    ])
    salesByMonth.value = sbm
    topProducts.value  = tp
    invStatus.value    = inv
    procCost.value     = pc
    branchSales.value  = bs
    invByBranch.value  = ibb
    heatmap.value      = hm
    forecasts.value    = fc
  } catch (e) {
    console.error('Analytics load error', e)
  } finally {
    loading.value = false
  }
}
onMounted(loadAll)

// ── Chart initialization ──────────────────────────────────────────────────────
function destroyCharts() {
  Object.values(CHARTS).forEach(c => c.destroy())
  Object.keys(CHARTS).forEach(k => delete CHARTS[k])
}

function buildOverviewCharts() {
  // Monthly Sales Bar
  if (refMonthlySales.value && salesByMonth.value.length > 0) {
    CHARTS.monthly = new Chart(refMonthlySales.value, {
      type: 'bar',
      data: {
        labels: salesByMonth.value.map((m: any) => monthLabel(m.year, m.month)),
        datasets: [{
          label: 'Revenue',
          data: salesByMonth.value.map((m: any) => m.totalSales),
          backgroundColor: 'rgba(59,130,246,0.85)',
          borderRadius: 6, borderSkipped: false, maxBarThickness: 40,
        }],
      },
      options: {
        ...BASE,
        plugins: { ...BASE.plugins, tooltip: { ...BASE.plugins.tooltip, callbacks: { label: (c: any) => ` ${phpFmt(c.raw)}` } } },
        scales: { x: BASE.scales.x, y: { ...BASE.scales.y, ticks: { ...BASE.scales.y.ticks, callback: pesoTick } } },
      } as any,
    })
  }

  // Top Products progress bars (rendered as HTML, no chart needed)

  // Revenue Donut
  if (refRevDonut.value && topProducts.value.length > 0) {
    const top5 = topProducts.value.slice(0, 5)
    const rest = topProducts.value.slice(5).reduce((s: number, p: any) => s + p.totalRevenue, 0)
    CHARTS.revDonut = new Chart(refRevDonut.value, {
      type: 'doughnut',
      data: {
        labels: [...top5.map((p: any) => shortName(p.productName)), ...(rest > 0 ? ['Others'] : [])],
        datasets: [{
          data: [...top5.map((p: any) => p.totalRevenue), ...(rest > 0 ? [rest] : [])],
          backgroundColor: [C.blue, C.purple, C.teal, C.green, C.amber, C.slate],
          borderWidth: 0, hoverOffset: 8,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: {
          legend: { display: true, position: 'right' as const, labels: { font: { size: 10 }, usePointStyle: true, padding: 10, boxWidth: 8 } },
          tooltip: { backgroundColor: C.navy, padding: 10, cornerRadius: 8, callbacks: { label: (c: any) => ` ${phpFmt(c.raw)}` } },
        },
      },
    })
  }
}

function buildForecastCharts() {
  // Forecast Area (Forecasted vs Actual by month)
  if (refForecastArea.value) {
    const labels = forecasts.value.map((f: any) => monthLabel(f.year, f.month))
    CHARTS.forecastArea = new Chart(refForecastArea.value, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Forecasted', data: forecasts.value.map((f: any) => f.totalForecasted), borderColor: C.purple, backgroundColor: 'rgba(168,85,247,0.08)', fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2.5 },
          { label: 'Actual',     data: forecasts.value.map((f: any) => f.totalActual),     borderColor: C.teal,   backgroundColor: 'rgba(20,184,166,0.06)',  fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2.5 },
        ],
      },
      options: {
        ...BASE,
        plugins: {
          ...BASE.plugins,
          legend: { display: true, position: 'top' as const, labels: { font: { size: 11 }, usePointStyle: true, padding: 14 } },
          tooltip: { ...BASE.plugins.tooltip, callbacks: { label: (c: any) => ` ${c.dataset.label}: ${fmtNum(c.raw)} units` } },
        },
        scales: { x: BASE.scales.x, y: { ...BASE.scales.y, ticks: { ...BASE.scales.y.ticks, callback: (v: any) => fmtNum(v) + ' u' } } },
      } as any,
    })
  }

  // Sales vs Procurement Cost Combo
  if (refSalesVsCost.value && salesByMonth.value.length > 0) {
    const labels    = salesByMonth.value.map((s: any) => monthLabel(s.year, s.month))
    const salesData = salesByMonth.value.map((s: any) => s.totalSales)
    const costData  = salesByMonth.value.map((s: any) => {
      const c = procCost.value.find((p: any) => p.year === s.year && p.month === s.month)
      return c ? c.totalCost : 0
    })
    CHARTS.salesVsCost = new Chart(refSalesVsCost.value, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { type: 'bar' as const,  label: 'Sales Revenue',    data: salesData, backgroundColor: 'rgba(59,130,246,0.80)', borderRadius: 4, order: 2 },
          { type: 'line' as const, label: 'Procurement Cost', data: costData,  borderColor: C.amber, backgroundColor: 'transparent', tension: 0.4, pointRadius: 3, borderWidth: 2.5, order: 1 },
        ],
      },
      options: {
        ...BASE,
        plugins: {
          ...BASE.plugins,
          legend: { display: true, position: 'top' as const, labels: { font: { size: 11 }, usePointStyle: true, padding: 14 } },
          tooltip: { ...BASE.plugins.tooltip, callbacks: { label: (c: any) => ` ${c.dataset.label}: ${phpFmt(c.raw)}` } },
        },
        scales: { x: BASE.scales.x, y: { ...BASE.scales.y, ticks: { ...BASE.scales.y.ticks, callback: pesoTick } } },
      } as any,
    })
  }
}

function buildBranchCharts() {
  // Branch Sales Bar
  if (refBranchBar.value && branchSales.value.length > 0) {
    CHARTS.branchBar = new Chart(refBranchBar.value, {
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
        plugins: { ...BASE.plugins, tooltip: { ...BASE.plugins.tooltip, callbacks: { label: (c: any) => ` ${phpFmt(c.raw)} · ${fmtNum(branchSales.value[c.dataIndex]?.transactions)} orders` } } },
        scales: { x: BASE.scales.x, y: { ...BASE.scales.y, ticks: { ...BASE.scales.y.ticks, callback: pesoTick } } },
      } as any,
    })
  }

  // Inventory by Branch Stacked Bar
  if (refInvByBranch.value && invByBranch.value.length > 0) {
    CHARTS.invByBranch = new Chart(refInvByBranch.value, {
      type: 'bar',
      data: {
        labels: invByBranch.value.map((b: any) => shortName(b.branchName, 14)),
        datasets: [
          { label: 'In Stock',     data: invByBranch.value.map((b: any) => b.inStock),    backgroundColor: 'rgba(34,197,94,0.82)',  stack: 's', borderRadius: 0 },
          { label: 'Low Stock',    data: invByBranch.value.map((b: any) => b.lowStock),   backgroundColor: 'rgba(245,158,11,0.82)', stack: 's', borderRadius: 0 },
          { label: 'Out of Stock', data: invByBranch.value.map((b: any) => b.outOfStock), backgroundColor: 'rgba(239,68,68,0.82)',  stack: 's', borderRadius: 0 },
        ],
      },
      options: {
        ...BASE,
        plugins: { ...BASE.plugins, legend: { display: true, position: 'top' as const, labels: { font: { size: 11 }, usePointStyle: true, padding: 14 } } },
        scales: { x: { ...BASE.scales.x, stacked: true }, y: { ...BASE.scales.y, stacked: true } },
      } as any,
    })
  }
}

async function switchTab(tab: Tab) {
  destroyCharts()
  activeTab.value = tab
  await nextTick()
  if (tab === 'overview')    buildOverviewCharts()
  if (tab === 'forecasting') buildForecastCharts()
  if (tab === 'branches')    buildBranchCharts()
}

watch(loading, async (val) => {
  if (!val) { await nextTick(); buildOverviewCharts() }
})
onBeforeUnmount(destroyCharts)

const exporting   = ref(false)
const exportError = ref('')

async function doExport() {
  exporting.value   = true
  exportError.value = ''
  try { await exportReportPdf('analytics') }
  catch (e: unknown) {
    const axErr = e as { response?: { data?: unknown } }
    const blob = axErr?.response?.data
    if (blob instanceof Blob) {
      try {
        const text = await blob.text()
        const json = JSON.parse(text)
        exportError.value = json.message || json.inner || 'Export failed.'
      } catch { exportError.value = 'Export failed. Please try again.' }
    } else {
      exportError.value = 'Export failed. Please try again.'
    }
  }
  finally { exporting.value = false }
}

// ── Heatmap helpers ───────────────────────────────────────────────────────────
const HM_DAYS    = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HM_PERIODS = ['Morning', 'Afternoon', 'Evening', 'Night']
const maxHeat    = () => Math.max(1, ...heatmap.value.map((h: any) => h.totalSales))

function heatOpacity(day: number, period: string) {
  const cell = heatmap.value.find((h: any) => h.dayOfWeek === day && h.period === period)
  if (!cell) return 0.04
  return 0.08 + (cell.totalSales / maxHeat()) * 0.88
}
function heatLabel(day: number, period: string) {
  const cell = heatmap.value.find((h: any) => h.dayOfWeek === day && h.period === period)
  return cell ? phpFmt(cell.totalSales) : '—'
}
</script>

<template>
  <div class="flex flex-col gap-5 max-w-[1280px] mx-auto w-full">

    <!-- Page Header -->
    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Analytics</h1>
        <p class="ps-page-sub">Deep-dive business intelligence across sales, inventory, branches, and forecasting.</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <button @click="loadAll" :disabled="loading" class="ps-btn ps-btn-outline">
          <i class="ph ph-arrows-clockwise" :class="{ 'animate-spin': loading }"></i> Refresh
        </button>
        <div class="flex flex-col items-end gap-1">
          <button
            class="ps-btn ps-btn-dark"
            :disabled="exporting || loading || salesByMonth.length === 0"
            :style="{ opacity: (exporting || loading || salesByMonth.length === 0) ? '0.6' : '1', cursor: (exporting || loading || salesByMonth.length === 0) ? 'not-allowed' : 'pointer' }"
            @click="doExport"
          >
            <i :class="exporting ? 'ph ph-spinner animate-spin' : 'ph ph-file-pdf'"></i>
            {{ exporting ? 'Exporting…' : 'Export PDF' }}
          </button>
          <span v-if="exportError" class="text-xs font-medium" style="color:#991b1b;">
            <i class="ph ph-warning"></i> {{ exportError }}
          </span>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col gap-4">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="h-24 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
      <div class="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="h-72 bg-slate-100 rounded-xl animate-pulse"></div>
        <div class="h-72 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
    </div>

    <template v-else>

      <!-- KPI Summary Row -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div class="w-9 h-9 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center mb-3">
            <i class="ph-fill ph-currency-circle-dollar text-lg"></i>
          </div>
          <div class="text-xl font-bold text-slate-900">{{ phpFmt(totalRevenue()) }}</div>
          <div class="text-xs text-slate-500 mt-0.5">Total Revenue</div>
          <div class="text-[10px] text-slate-400 mt-1">Last 12 months</div>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div class="w-9 h-9 bg-purple-50 text-purple-500 rounded-lg flex items-center justify-center mb-3">
            <i class="ph-fill ph-chart-bar text-lg"></i>
          </div>
          <div class="text-xl font-bold text-slate-900">{{ phpFmt(monthlyAvg()) }}</div>
          <div class="text-xs text-slate-500 mt-0.5">Monthly Average</div>
          <div class="text-[10px] text-slate-400 mt-1">{{ salesByMonth.length }} months tracked</div>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div class="w-9 h-9 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center mb-3">
            <i class="ph-fill ph-receipt text-lg"></i>
          </div>
          <div class="text-xl font-bold text-slate-900">{{ fmtNum(totalTxns()) }}</div>
          <div class="text-xs text-slate-500 mt-0.5">Total Transactions</div>
          <div class="text-[10px] text-slate-400 mt-1">All time</div>
        </div>
        <div :class="['bg-white border rounded-xl p-4 shadow-sm', outOfStock() > 0 ? 'border-red-200' : 'border-slate-200']">
          <div class="w-9 h-9 bg-red-50 text-red-500 rounded-lg flex items-center justify-center mb-3">
            <i class="ph-fill ph-warning-circle text-lg"></i>
          </div>
          <div class="text-xl font-bold text-red-600">{{ outOfStock() + lowStock() }}</div>
          <div class="text-xs text-slate-500 mt-0.5">Stock Issues</div>
          <div class="text-[10px] text-slate-400 mt-1">{{ outOfStock() }} out · {{ lowStock() }} low</div>
        </div>
      </div>

      <!-- Tab Bar -->
      <div class="bg-white border border-slate-200 rounded-xl p-1.5 flex gap-1 flex-wrap shadow-sm">
        <button
          v-for="tab in ([
            { key: 'overview',    label: 'Overview',         icon: 'ph ph-squares-four' },
            { key: 'forecasting', label: 'Forecasting',      icon: 'ph ph-chart-line-up' },
            { key: 'branches',    label: 'Branch Analysis',  icon: 'ph ph-buildings' },
            { key: 'heatmap',     label: 'Peak Sales Time',  icon: 'ph ph-calendar-blank' },
          ] as const)"
          :key="tab.key"
          @click="switchTab(tab.key)"
          :class="['inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap',
            activeTab === tab.key ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50']"
        >
          <i :class="tab.icon"></i> {{ tab.label }}
        </button>
      </div>

      <!-- ── OVERVIEW TAB ──────────────────────────────────────────── -->
      <template v-if="activeTab === 'overview'">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <!-- Monthly Sales Bar (2/3) -->
          <div class="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div class="px-5 pt-5 pb-3 flex items-start justify-between">
              <div>
                <div class="font-bold text-slate-800">Monthly Sales Revenue</div>
                <div class="text-xs text-slate-400 mt-0.5">Last 12 months · all branches</div>
              </div>
              <div class="flex items-center gap-2">
                <div class="text-right">
                  <div class="text-sm font-bold text-slate-900">{{ phpFmt(totalRevenue()) }}</div>
                  <div class="text-[10px] text-slate-400">12-month total</div>
                </div>
              </div>
            </div>
            <div class="px-4 pb-5" style="height: 260px">
              <div v-if="salesByMonth.length === 0" class="flex flex-col items-center justify-center h-full gap-2 text-slate-300">
                <i class="ph-fill ph-chart-bar text-4xl"></i>
                <p class="text-sm text-slate-400">No sales data available</p>
              </div>
              <canvas v-else ref="refMonthlySales"></canvas>
            </div>
            <!-- Summary strip -->
            <div v-if="salesByMonth.length > 0" class="flex border-t border-slate-100">
              <div class="flex-1 flex flex-col items-center gap-0.5 px-3 py-3 border-r border-slate-100">
                <div class="text-sm font-extrabold text-slate-900">{{ phpFmt(monthlyAvg()) }}</div>
                <div class="text-[11px] text-slate-400">Monthly Avg</div>
              </div>
              <div class="flex-1 flex flex-col items-center gap-0.5 px-3 py-3 border-r border-slate-100">
                <div class="text-sm font-extrabold text-slate-900">{{ phpFmt(Math.max(...salesByMonth.map((m: any) => m.totalSales))) }}</div>
                <div class="text-[11px] text-slate-400">Best Month</div>
              </div>
              <div class="flex-1 flex flex-col items-center gap-0.5 px-3 py-3">
                <div class="text-sm font-extrabold text-slate-900">{{ fmtNum(totalTxns()) }}</div>
                <div class="text-[11px] text-slate-400">Transactions</div>
              </div>
            </div>
          </div>

          <!-- Revenue Distribution Donut (1/3) -->
          <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div class="px-5 pt-5 pb-3">
              <div class="font-bold text-slate-800">Revenue by Product</div>
              <div class="text-xs text-slate-400 mt-0.5">Top 5 products · all time</div>
            </div>
            <div class="px-4 pb-5" style="height: 310px">
              <div v-if="topProducts.length === 0" class="flex flex-col items-center justify-center h-full gap-2 text-slate-300">
                <i class="ph-fill ph-chart-donut text-4xl"></i>
                <p class="text-sm text-slate-400">No data available</p>
              </div>
              <canvas v-else ref="refRevDonut"></canvas>
            </div>
          </div>
        </div>

        <!-- Top Products ranked list -->
        <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div class="flex items-start justify-between mb-4">
            <div>
              <div class="font-bold text-slate-800">Top Products by Revenue</div>
              <div class="text-xs text-slate-400 mt-0.5">All-time sales performance</div>
            </div>
            <span class="ps-tag ps-tag-blue text-[10px]">Top {{ Math.min(topProducts.length, 10) }}</span>
          </div>
          <div v-if="topProducts.length === 0" class="py-8 text-center text-slate-400 text-sm">No product data available.</div>
          <div v-else class="flex flex-col gap-3.5">
            <div v-for="(p, i) in topProducts.slice(0, 10)" :key="p.productId" class="flex items-center gap-4">
              <div :class="['text-sm font-extrabold min-w-[28px] text-center tabular-nums',
                i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-slate-300']">
                #{{ i + 1 }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-semibold text-slate-800 truncate mb-1.5">{{ p.productName }}</div>
                <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                    :style="{ width: ((p.totalRevenue / (topProducts[0]?.totalRevenue || 1)) * 100) + '%' }"></div>
                </div>
              </div>
              <div class="text-right flex-shrink-0">
                <div class="text-sm font-bold text-slate-900">{{ phpFmt(p.totalRevenue) }}</div>
                <div class="text-[11px] text-slate-400 mt-0.5">{{ fmtNum(p.totalQty) }} sold</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Inventory Status Table -->
        <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div class="px-5 pt-5 pb-3 flex items-start justify-between">
            <div>
              <div class="font-bold text-slate-800">Inventory Status</div>
              <div class="text-xs text-slate-400 mt-0.5">All products · current stock levels</div>
            </div>
            <div class="flex gap-2">
              <span class="ps-tag ps-tag-green text-[10px]">{{ invStatus.filter((i: any) => i.stockStatus === 'OK').length }} OK</span>
              <span class="ps-tag ps-tag-amber text-[10px]">{{ invStatus.filter((i: any) => i.stockStatus === 'Low').length }} Low</span>
              <span class="ps-tag ps-tag-red text-[10px]">{{ invStatus.filter((i: any) => i.stockStatus === 'Out of Stock').length }} Out</span>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="ps-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Location</th>
                  <th class="text-right">On Hand</th>
                  <th class="text-right">Reorder Point</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in invStatus.slice(0, 20)" :key="item.productId">
                  <td class="font-medium text-slate-800">{{ item.productName }}</td>
                  <td class="text-slate-500">{{ item.location ?? '—' }}</td>
                  <td class="text-right font-semibold">{{ item.qtyOnHand }}</td>
                  <td class="text-right text-slate-500">{{ item.reorderPoint }}</td>
                  <td>
                    <span :class="['ps-tag text-[10px]',
                      item.stockStatus === 'OK'           ? 'ps-tag-green' :
                      item.stockStatus === 'Low'          ? 'ps-tag-amber' : 'ps-tag-red']">
                      {{ item.stockStatus === 'Out of Stock' ? 'Out' : item.stockStatus }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-if="invStatus.length > 20" class="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
              Showing 20 of {{ invStatus.length }} products.
              <router-link to="/dashboard/inventory" class="text-blue-500 font-semibold hover:underline ml-1">View all in Inventory →</router-link>
            </div>
          </div>
        </div>
      </template>

      <!-- ── FORECASTING TAB ────────────────────────────────────────── -->
      <template v-if="activeTab === 'forecasting'">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <!-- Forecasted vs Actual (Area) -->
          <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div class="px-5 pt-5 pb-3 flex items-start justify-between">
              <div>
                <div class="font-bold text-slate-800">Forecasted Demand</div>
                <div class="text-xs text-slate-400 mt-0.5">WMA forecast vs actual units · last 6 months</div>
              </div>
              <span class="ps-tag ps-tag-purple text-[10px]">WMA Model</span>
            </div>
            <div class="px-4 pb-5" style="height: 280px">
              <div v-if="forecasts.length === 0" class="flex flex-col items-center justify-center h-full gap-2 text-slate-300">
                <i class="ph-fill ph-chart-line-up text-4xl"></i>
                <p class="text-sm text-slate-400 text-center">No forecast data.<br>Go to Demand Forecast to generate.</p>
                <router-link to="/dashboard/forecast" class="ps-btn ps-btn-primary text-xs mt-1">
                  <i class="ph ph-chart-line-up"></i> Go to Forecast
                </router-link>
              </div>
              <canvas v-else ref="refForecastArea"></canvas>
            </div>
          </div>

          <!-- Sales vs Procurement Cost (Combo) -->
          <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div class="px-5 pt-5 pb-3 flex items-start justify-between">
              <div>
                <div class="font-bold text-slate-800">Sales vs Procurement Cost</div>
                <div class="text-xs text-slate-400 mt-0.5">Monthly revenue and purchasing spend</div>
              </div>
              <span class="ps-tag ps-tag-amber text-[10px]">12 Months</span>
            </div>
            <div class="px-4 pb-5" style="height: 280px">
              <div v-if="salesByMonth.length === 0" class="flex flex-col items-center justify-center h-full gap-2 text-slate-300">
                <i class="ph-fill ph-chart-bar text-4xl"></i>
                <p class="text-sm text-slate-400">No data available</p>
              </div>
              <canvas v-else ref="refSalesVsCost"></canvas>
            </div>
          </div>
        </div>

        <!-- Profit margin summary -->
        <div v-if="salesByMonth.length > 0 && procCost.length > 0" class="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div class="font-bold text-slate-800 mb-3">Revenue vs Spend Summary</div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div class="text-center p-3 bg-blue-50 rounded-xl">
              <div class="text-base font-extrabold text-blue-700">{{ phpFmt(salesByMonth.reduce((s: number, m: any) => s + Number(m.totalSales), 0)) }}</div>
              <div class="text-xs text-blue-500 mt-0.5">Total Revenue</div>
            </div>
            <div class="text-center p-3 bg-amber-50 rounded-xl">
              <div class="text-base font-extrabold text-amber-700">{{ phpFmt(procCost.reduce((s: number, p: any) => s + Number(p.totalCost), 0)) }}</div>
              <div class="text-xs text-amber-500 mt-0.5">Total Procurement</div>
            </div>
            <div class="text-center p-3 bg-emerald-50 rounded-xl">
              <div class="text-base font-extrabold text-emerald-700">
                {{ phpFmt(salesByMonth.reduce((s: number, m: any) => s + Number(m.totalSales), 0) - procCost.reduce((s: number, p: any) => s + Number(p.totalCost), 0)) }}
              </div>
              <div class="text-xs text-emerald-500 mt-0.5">Gross Margin</div>
            </div>
            <div class="text-center p-3 bg-slate-50 rounded-xl">
              <div class="text-base font-extrabold text-slate-700">
                {{ procCost.reduce((s: number, p: any) => s + p.orderCount, 0) }}
              </div>
              <div class="text-xs text-slate-500 mt-0.5">Purchase Orders</div>
            </div>
          </div>
        </div>
      </template>

      <!-- ── BRANCH ANALYSIS TAB ────────────────────────────────────── -->
      <template v-if="activeTab === 'branches'">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <!-- Branch Sales Bar -->
          <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div class="px-5 pt-5 pb-3 flex items-start justify-between">
              <div>
                <div class="font-bold text-slate-800">Branch Revenue</div>
                <div class="text-xs text-slate-400 mt-0.5">Total sales per branch · all time</div>
              </div>
              <span class="ps-tag ps-tag-blue text-[10px]">{{ branchSales.length }} branches</span>
            </div>
            <div class="px-4 pb-5" style="height: 280px">
              <div v-if="branchSales.length === 0" class="flex flex-col items-center justify-center h-full gap-2 text-slate-300">
                <i class="ph-fill ph-storefront text-4xl"></i>
                <p class="text-sm text-slate-400">No branch sales data</p>
              </div>
              <canvas v-else ref="refBranchBar"></canvas>
            </div>
          </div>

          <!-- Inventory by Branch Stacked Bar -->
          <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div class="px-5 pt-5 pb-3 flex items-start justify-between">
              <div>
                <div class="font-bold text-slate-800">Stock by Branch</div>
                <div class="text-xs text-slate-400 mt-0.5">In stock · low · out of stock per branch</div>
              </div>
              <span class="ps-tag ps-tag-green text-[10px]">Inventory</span>
            </div>
            <div class="px-4 pb-5" style="height: 280px">
              <div v-if="invByBranch.length === 0" class="flex flex-col items-center justify-center h-full gap-2 text-slate-300">
                <i class="ph-fill ph-buildings text-4xl"></i>
                <p class="text-sm text-slate-400">No branch inventory data</p>
              </div>
              <canvas v-else ref="refInvByBranch"></canvas>
            </div>
          </div>
        </div>

        <!-- Branch comparison table -->
        <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div class="px-5 pt-5 pb-3">
            <div class="font-bold text-slate-800">Branch Breakdown</div>
            <div class="text-xs text-slate-400 mt-0.5">Revenue, transactions, and stock health per branch</div>
          </div>
          <div class="overflow-x-auto">
            <table class="ps-table">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th class="text-right">Total Revenue</th>
                  <th class="text-right">Transactions</th>
                  <th class="text-right">In Stock</th>
                  <th class="text-right">Low Stock</th>
                  <th class="text-right">Out of Stock</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="b in branchSales" :key="b.branchId">
                  <td class="font-semibold text-slate-800">{{ b.branchName }}</td>
                  <td class="text-right font-semibold text-slate-900">{{ phpFmt(b.totalSales) }}</td>
                  <td class="text-right text-slate-500">{{ fmtNum(b.transactions) }}</td>
                  <td class="text-right">
                    <span class="ps-tag ps-tag-green text-[10px]">
                      {{ invByBranch.find((x: any) => x.branchId === b.branchId)?.inStock ?? '—' }}
                    </span>
                  </td>
                  <td class="text-right">
                    <span class="ps-tag ps-tag-amber text-[10px]">
                      {{ invByBranch.find((x: any) => x.branchId === b.branchId)?.lowStock ?? '—' }}
                    </span>
                  </td>
                  <td class="text-right">
                    <span class="ps-tag ps-tag-red text-[10px]">
                      {{ invByBranch.find((x: any) => x.branchId === b.branchId)?.outOfStock ?? '—' }}
                    </span>
                  </td>
                </tr>
                <tr v-if="branchSales.length === 0">
                  <td colspan="6" class="text-center text-slate-400 py-8">No branch data available.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- ── HEATMAP TAB ─────────────────────────────────────────────── -->
      <template v-if="activeTab === 'heatmap'">
        <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <div class="flex items-start justify-between mb-5">
            <div>
              <div class="font-bold text-slate-800">Peak Sales Time</div>
              <div class="text-xs text-slate-400 mt-0.5">Sales intensity by day of week and time period · last 30 days</div>
            </div>
            <span class="ps-tag ps-tag-slate text-[10px]">Heatmap</span>
          </div>

          <div v-if="heatmap.length === 0" class="flex flex-col items-center gap-3 py-16 text-slate-300">
            <i class="ph-fill ph-calendar-blank text-5xl"></i>
            <p class="text-sm text-slate-400">No transaction data available for the last 30 days.</p>
          </div>

          <div v-else class="overflow-x-auto">
            <div class="grid gap-2 min-w-[420px]" style="grid-template-columns: 80px repeat(7, 1fr)">
              <!-- Header -->
              <div></div>
              <div v-for="d in HM_DAYS" :key="d" class="text-center text-xs font-bold text-slate-500 pb-1">{{ d }}</div>
              <!-- Rows -->
              <template v-for="period in HM_PERIODS" :key="period">
                <div class="text-xs font-semibold text-slate-400 flex items-center pr-2 leading-tight">{{ period }}</div>
                <div
                  v-for="(_, di) in HM_DAYS" :key="di"
                  class="h-12 rounded-xl flex items-center justify-center cursor-default transition-transform hover:scale-105 group relative"
                  :style="{ backgroundColor: `rgba(59,130,246,${heatOpacity(di, period)})` }"
                  :title="`${HM_DAYS[di]} ${period}: ${heatLabel(di, period)}`"
                >
                  <span class="text-[9px] font-bold text-blue-900/70 opacity-0 group-hover:opacity-100 transition-opacity absolute bg-white/95 px-1.5 py-0.5 rounded shadow-sm z-10 pointer-events-none whitespace-nowrap">
                    {{ heatLabel(di, period) }}
                  </span>
                </div>
              </template>
            </div>

            <!-- Legend -->
            <div class="flex items-center gap-2 mt-5 justify-end">
              <span class="text-xs text-slate-400">Low</span>
              <div class="flex gap-1">
                <div v-for="i in 7" :key="i" class="w-6 h-4 rounded" :style="{ backgroundColor: `rgba(59,130,246,${0.06 + i * 0.13})` }"></div>
              </div>
              <span class="text-xs text-slate-400">High</span>
            </div>
          </div>

          <!-- Day summary -->
          <div v-if="heatmap.length > 0" class="mt-6 pt-5 border-t border-slate-100">
            <div class="text-xs font-semibold text-slate-500 mb-3">Busiest Days</div>
            <div class="grid grid-cols-7 gap-2">
              <div v-for="(day, di) in HM_DAYS" :key="day" class="text-center">
                <div class="text-xs font-bold text-slate-600 mb-1">{{ day }}</div>
                <div class="text-xs text-slate-800 font-semibold">
                  {{ phpFmt(heatmap.filter((h: any) => h.dayOfWeek === di).reduce((s: number, h: any) => s + h.totalSales, 0)) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

    </template>
  </div>
</template>
