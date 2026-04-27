<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { Chart, BarElement, LinearScale, CategoryScale, Tooltip, Legend, LineElement, PointElement, Filler, type ChartData } from 'chart.js'
import api from '../services/api.ts'

Chart.register(BarElement, LinearScale, CategoryScale, Tooltip, Legend, LineElement, PointElement, Filler)

defineOptions({ name: 'TenantAnalyticsView' })

const loading  = ref(true)
const overview = ref<any>(null)
const monthly  = ref<any[]>([])
const topProds = ref<any[]>([])

const canvasRef = ref<HTMLCanvasElement | null>(null)
let chartInst: InstanceType<typeof Chart> | null = null

const phpFmt = (v: number) =>
  '₱ ' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v)

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

async function load() {
  loading.value = true
  try {
    const [ov, mo, tp] = await Promise.all([
      api.get('/tenant/analytics/overview').then(r => r.data),
      api.get('/tenant/analytics/sales-by-month').then(r => r.data),
      api.get('/tenant/analytics/top-products').then(r => r.data),
    ])
    overview.value = ov; monthly.value = mo; topProds.value = tp
    await nextTick(); buildChart()
  } catch {
    // silently fail — cards still render with 0
  } finally { loading.value = false }
}
onMounted(load)

function buildChart() {
  if (!canvasRef.value || monthly.value.length === 0) return
  if (chartInst) { chartInst.destroy(); chartInst = null }
  const labels = monthly.value.map(m => `${MONTHS[m.month - 1]} ${String(m.year).slice(2)}`)
  const totals = monthly.value.map(m => Number(m.totalSales))

  const ctx = canvasRef.value.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 0, 0, 280)
  grad.addColorStop(0, 'rgba(59,130,246,0.95)')
  grad.addColorStop(1, 'rgba(59,130,246,0.55)')

  const data: ChartData<'bar'> = {
    labels,
    datasets: [{
      label: 'Revenue (₱)',
      data: totals,
      backgroundColor: grad,
      borderColor: '#3B82F6',
      borderWidth: 0,
      borderRadius: 8,
      maxBarThickness: 36,
    }],
  }
  chartInst = new Chart(canvasRef.value, {
    type: 'bar', data,
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0F172A',
          titleColor: '#F8FAFC',
          bodyColor: '#F8FAFC',
          padding: 10,
          cornerRadius: 8,
          callbacks: { label: ctx => phpFmt(ctx.parsed.y ?? 0) },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#94A3B8', font: { size: 11 } } },
        y: { grid: { color: '#F1F5F9' }, ticks: { color: '#94A3B8', font: { size: 11 }, callback: v => '₱' + Number(v).toLocaleString() }, beginAtZero: true },
      },
    },
  })
}

const kpis = [
  { key: 'totalRevenue',  label: 'Total Revenue',    icon: 'ph-fill ph-currency-circle-dollar', color: 'text-blue-500',   bg: 'bg-blue-50',   trend: 'up',   pct: '+18%', fmt: (v: number) => phpFmt(v) },
  { key: 'todaySales',    label: "Today's Sales",    icon: 'ph-fill ph-cash-register',          color: 'text-green-500',  bg: 'bg-green-50',  trend: 'up',   pct: '+12%', fmt: (v: number) => phpFmt(v) },
  { key: 'totalOrders',   label: 'Purchase Orders',  icon: 'ph-fill ph-receipt',                color: 'text-sky-500',    bg: 'bg-sky-50',    trend: 'up',   pct: '+5%',  fmt: (v: number) => v.toLocaleString() },
  { key: 'lowStockCount', label: 'Low Stock Items',  icon: 'ph-fill ph-warning-circle',         color: 'text-red-500',    bg: 'bg-red-50',    trend: 'down', pct: '-3',   fmt: (v: number) => v.toLocaleString() },
]
</script>

<template>
  <div class="flex flex-col gap-5 max-w-[1280px] mx-auto w-full">

    <!-- Page header -->
    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Analytics</h1>
        <p class="ps-page-sub">Real-time business performance overview.</p>
      </div>
      <button @click="load" :disabled="loading" class="ps-btn ps-btn-outline">
        <i class="ph ph-arrows-clockwise" :class="{ 'animate-spin': loading }"></i> Refresh
      </button>
    </div>

    <!-- Loading skeletons -->
    <div v-if="loading">
      <div class="grid grid-cols-4 gap-4 mb-5">
        <div v-for="i in 4" :key="i" class="h-28 bg-slate-100 rounded-2xl animate-pulse"></div>
      </div>
      <div class="h-80 bg-slate-100 rounded-2xl animate-pulse"></div>
    </div>

    <template v-else>
      <!-- KPI cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="k in kpis" :key="k.key"
          class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow transition-shadow">
          <div class="flex items-start justify-between gap-2">
            <div :class="['inline-flex items-center justify-center w-9 h-9 rounded-lg', k.bg, k.color]">
              <i :class="[k.icon, 'text-lg']"></i>
            </div>
            <span :class="[
              'inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full',
              k.trend === 'up'   ? 'bg-emerald-50 text-emerald-700' :
              k.trend === 'down' ? 'bg-rose-50 text-rose-700' :
                                   'bg-slate-100 text-slate-600',
            ]">
              <i :class="k.trend === 'up' ? 'ph ph-arrow-up' : 'ph ph-arrow-down'" class="text-[10px]"></i>
              {{ k.pct }}
            </span>
          </div>
          <p class="text-xl font-bold text-slate-900 mt-3 leading-none">{{ k.fmt(overview?.[k.key] ?? 0) }}</p>
          <p class="text-xs text-slate-500 mt-1.5">{{ k.label }}</p>
        </div>
      </div>

      <!-- Revenue Chart -->
      <div v-if="monthly.length > 0" class="ps-card p-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-sm font-bold text-slate-900">Sales Performance</h2>
            <p class="text-xs text-slate-400 mt-0.5">Last 12 months</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="ps-tag ps-tag-blue"><i class="ph-fill ph-circle text-[6px] mr-1"></i> Revenue</span>
          </div>
        </div>
        <div class="h-64 relative"><canvas ref="canvasRef"></canvas></div>
        <div class="flex border-t border-slate-100 mt-4 pt-4">
          <div class="flex-1 flex flex-col items-center gap-1 px-3 border-r border-slate-100">
            <div class="text-base font-extrabold text-slate-900">{{ phpFmt(monthly.reduce((s, m) => s + Number(m.totalSales), 0)) }}</div>
            <div class="text-[11px] text-slate-400 font-medium">Total Revenue</div>
          </div>
          <div class="flex-1 flex flex-col items-center gap-1 px-3 border-r border-slate-100">
            <div class="text-base font-extrabold text-slate-900">{{ phpFmt(monthly.reduce((s, m) => s + Number(m.totalSales), 0) / (monthly.length || 1)) }}</div>
            <div class="text-[11px] text-slate-400 font-medium">Monthly Avg</div>
          </div>
          <div class="flex-1 flex flex-col items-center gap-1 px-3">
            <div class="text-base font-extrabold text-slate-900">{{ monthly.reduce((s, m) => s + (m.transactions ?? 0), 0).toLocaleString() }}</div>
            <div class="text-[11px] text-slate-400 font-medium">Transactions</div>
          </div>
        </div>
      </div>

      <!-- Top Products -->
      <div v-if="topProds.length > 0" class="ps-card p-6">
        <h2 class="text-sm font-bold text-slate-900 mb-4">Top Products by Revenue</h2>
        <div class="flex flex-col gap-4">
          <div v-for="(p, i) in topProds.slice(0, 8)" :key="p.productId" class="flex items-center gap-4">
            <div :class="['text-sm font-extrabold min-w-[28px] text-center',
              i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-slate-300']">
              #{{ i + 1 }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold text-slate-800 truncate mb-1.5">{{ p.productName }}</div>
              <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                  :style="{ width: ((p.totalRevenue / (topProds[0]?.totalRevenue || 1)) * 100) + '%' }"></div>
              </div>
            </div>
            <div class="text-right flex-shrink-0">
              <div class="text-sm font-bold text-slate-900">{{ phpFmt(p.totalRevenue) }}</div>
              <div class="text-[11px] text-slate-400 mt-0.5">{{ Number(p.totalQty).toLocaleString() }} sold</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
@media (max-width: 900px) { .grid-cols-4 { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .grid-cols-4 { grid-template-columns: 1fr; } }
</style>
