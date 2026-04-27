<script setup lang="ts">
import { ref } from 'vue'
import {
  Chart, BarElement, LinearScale, CategoryScale,
  Tooltip, Legend, type ChartData
} from 'chart.js'
import { getProcurementCost } from '../services/reportsService.ts'
import SalesSummaryChart      from '../components/reports/SalesSummaryChart.vue'
import TopProductsChart       from '../components/reports/TopProductsChart.vue'
import InventoryStatusTable   from '../components/reports/InventoryStatusTable.vue'
import SupplierPerformanceTable from '../components/reports/SupplierPerformanceTable.vue'

Chart.register(BarElement, LinearScale, CategoryScale, Tooltip, Legend)

defineOptions({ name: 'ReportsDashboard' })

type Tab = 'sales' | 'top-products' | 'inventory' | 'suppliers' | 'procurement'

const activeTab = ref<Tab>('sales')

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'sales',       label: 'Sales Summary',        icon: 'ph ph-chart-bar'      },
  { key: 'top-products',label: 'Top Products',          icon: 'ph ph-trophy'         },
  { key: 'inventory',   label: 'Inventory Status',      icon: 'ph ph-warehouse'      },
  { key: 'suppliers',   label: 'Supplier Performance',  icon: 'ph ph-handshake'      },
  { key: 'procurement', label: 'Procurement Cost',      icon: 'ph ph-receipt'        },
]

const procCanvas  = ref<HTMLCanvasElement | null>(null)
const procLoading = ref(false)
const procError   = ref('')
const procData    = ref<any[]>([])
let procChart: InstanceType<typeof Chart> | null = null

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const phpFmt = (v: number) =>
  '₱ ' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v)

async function loadProcurement() {
  procLoading.value = true
  procError.value   = ''
  try {
    procData.value = await getProcurementCost()
    buildProcChart()
  } catch {
    procError.value = 'Could not load procurement data.'
  } finally {
    procLoading.value = false
  }
}

function buildProcChart() {
  if (!procCanvas.value || procData.value.length === 0) return
  if (procChart) { procChart.destroy(); procChart = null }

  const labels = procData.value.map(r => `${monthNames[r.month - 1]} ${r.year}`)
  const costs  = procData.value.map(r => Number(r.totalCost))

  const ctx = procCanvas.value.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 0, 0, 280)
  grad.addColorStop(0, 'rgba(59,130,246,0.95)')
  grad.addColorStop(1, 'rgba(59,130,246,0.55)')

  const data: ChartData<'bar'> = {
    labels,
    datasets: [{
      label: 'Procurement Spend (₱)',
      data: costs,
      backgroundColor: grad,
      borderColor: '#3B82F6',
      borderWidth: 0,
      borderRadius: 8,
      maxBarThickness: 36,
    }],
  }

  procChart = new Chart(procCanvas.value, {
    type: 'bar',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
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

function onTabChange(key: Tab) {
  activeTab.value = key
  if (key === 'procurement' && procData.value.length === 0) loadProcurement()
}
</script>

<template>
  <div class="flex flex-col gap-6">

    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Reports &amp; Analytics</h1>
        <p class="ps-page-sub">Actionable insights across sales, inventory, suppliers, and procurement.</p>
      </div>
    </div>

    <!-- Tab Bar -->
    <div class="ps-card p-1.5 flex gap-1 flex-wrap">
      <button v-for="tab in tabs" :key="tab.key"
        @click="onTabChange(tab.key)"
        :class="['inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap',
          activeTab === tab.key ? 'bg-blue-500 text-white shadow-[0_2px_8px_rgba(59,130,246,0.3)]' : 'text-slate-600 hover:bg-slate-50']">
        <i :class="tab.icon"></i> {{ tab.label }}
      </button>
    </div>

    <SalesSummaryChart v-if="activeTab === 'sales'" />
    <TopProductsChart v-if="activeTab === 'top-products'" />
    <InventoryStatusTable v-if="activeTab === 'inventory'" />
    <SupplierPerformanceTable v-if="activeTab === 'suppliers'" />

    <div v-if="activeTab === 'procurement'" class="ps-card p-6">
      <div class="flex items-start justify-between mb-4">
        <div>
          <h2 class="text-sm font-bold text-slate-900 flex items-center gap-2">
            <i class="ph ph-receipt text-blue-500"></i> Procurement Cost
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">Total purchasing spend per month</p>
        </div>
        <button @click="loadProcurement" class="ps-btn ps-btn-outline" style="padding: 6px 12px; font-size: 12px;">
          <i class="ph ph-arrows-clockwise"></i>
        </button>
      </div>

      <div v-if="procLoading" class="h-60 flex items-center justify-center gap-2 text-slate-400">
        <i class="ph ph-spinner animate-spin"></i> Loading…
      </div>
      <div v-else-if="procError" class="h-60 flex items-center justify-center gap-2 text-red-500">
        <i class="ph ph-warning"></i> {{ procError }}
      </div>
      <div v-else-if="procData.length === 0" class="h-60 flex flex-col items-center justify-center gap-3 text-slate-400">
        <i class="ph-fill ph-receipt text-4xl text-slate-200"></i>
        <p class="text-sm">No procurement data available yet.</p>
        <button @click="loadProcurement" class="ps-btn ps-btn-primary">
          <i class="ph ph-arrows-clockwise"></i> Load Data
        </button>
      </div>
      <div v-else>
        <div class="h-72 relative"><canvas ref="procCanvas"></canvas></div>

        <div class="flex border-t border-slate-100 mt-4 pt-4">
          <div class="flex-1 flex flex-col items-center gap-1 px-3 border-r border-slate-100">
            <div class="text-base font-extrabold text-slate-900">{{ phpFmt(procData.reduce((s,r) => s + Number(r.totalCost), 0)) }}</div>
            <div class="text-[11px] text-slate-400 font-medium">Total Spend</div>
          </div>
          <div class="flex-1 flex flex-col items-center gap-1 px-3 border-r border-slate-100">
            <div class="text-base font-extrabold text-slate-900">{{ phpFmt(procData.reduce((s,r) => s + Number(r.totalCost), 0) / procData.length) }}</div>
            <div class="text-[11px] text-slate-400 font-medium">Monthly Avg</div>
          </div>
          <div class="flex-1 flex flex-col items-center gap-1 px-3">
            <div class="text-base font-extrabold text-slate-900">{{ procData.reduce((s,r) => s + (r.orderCount ?? 0), 0).toLocaleString() }}</div>
            <div class="text-[11px] text-slate-400 font-medium">Total Orders</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
