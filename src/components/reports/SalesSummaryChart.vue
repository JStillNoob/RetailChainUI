<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import {
  Chart, BarElement, LinearScale, CategoryScale,
  Title, Tooltip, Legend, type ChartData
} from 'chart.js'
import { getSalesByMonth, exportReportPdf } from '../../services/reportsService.ts'

Chart.register(BarElement, LinearScale, CategoryScale, Title, Tooltip, Legend)

const canvas  = ref<HTMLCanvasElement | null>(null)
const loading = ref(true)
const error   = ref('')
const rawData = ref<any[]>([])
let chart: Chart | null = null

const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const phpFmt = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(v)

async function load() {
  loading.value = true
  error.value   = ''
  try {
    rawData.value = await getSalesByMonth()
    buildChart()
  } catch {
    error.value = 'Could not load sales data.'
  } finally {
    loading.value = false
  }
}

function buildChart() {
  if (!canvas.value) return
  if (chart) { chart.destroy(); chart = null }

  const labels = rawData.value.map(r => `${monthLabels[r.month - 1]} ${r.year}`)
  const totals  = rawData.value.map(r => Number(r.totalSales))

  const data: ChartData<'bar'> = {
    labels,
    datasets: [{
      label: 'Total Sales (₱)',
      data: totals,
      backgroundColor: 'rgba(99,102,241,0.75)',
      borderColor: '#6366f1',
      borderWidth: 1,
      borderRadius: 6,
    }],
  }

  chart = new Chart(canvas.value, {
    type: 'bar',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => phpFmt(ctx.parsed.y ?? 0),
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: {
            color: '#94a3b8', font: { size: 11 },
            callback: v => '₱' + Number(v).toLocaleString(),
          },
          beginAtZero: true,
        },
      },
    },
  })
}

const exporting   = ref(false)
const exportError = ref('')

async function doExport() {
  exporting.value   = true
  exportError.value = ''
  try {
    await exportReportPdf('sales')
  } catch {
    exportError.value = 'Export failed. Please try again.'
  } finally {
    exporting.value = false
  }
}

onMounted(load)
onUnmounted(() => chart?.destroy())
watch(canvas, v => { if (v && rawData.value.length) buildChart() })

defineExpose({ reload: load })
</script>

<template>
  <div class="report-card">
    <div class="report-card-header">
      <div>
        <div class="report-card-title">
          <i class="ph ph-chart-bar" style="color:#6366f1"></i>
          Monthly Sales Summary
        </div>
        <div class="report-card-desc">Total sales revenue per month (last 12 months)</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn-ghost btn-sm" @click="load" title="Refresh">
          <i class="ph ph-arrows-clockwise"></i>
        </button>
        <button class="btn-export btn-sm" :disabled="exporting || rawData.length === 0" @click="doExport" title="Export PDF">
          <i :class="exporting ? 'ph ph-spinner spin' : 'ph ph-file-pdf'"></i>
          {{ exporting ? 'Exporting…' : 'Export PDF' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="chart-loader">
      <i class="ph ph-spinner spin"></i> Loading…
    </div>
    <div v-else-if="error" class="chart-error">
      <i class="ph ph-warning"></i> {{ error }}
    </div>
    <div v-else-if="rawData.length === 0" class="chart-empty">
      <i class="ph-fill ph-chart-bar" style="font-size:36px;color:#e2e8f0;"></i>
      <p>No sales data available yet.</p>
    </div>
    <div v-else class="chart-canvas-wrap">
      <canvas ref="canvas"></canvas>
    </div>

    <div v-if="exportError" class="export-error">
      <i class="ph ph-warning"></i> {{ exportError }}
    </div>

    <!-- Summary stats below chart -->
    <div v-if="!loading && rawData.length > 0" class="stats-strip">
      <div class="stat-item">
        <span class="stat-val">
          {{ phpFmt(rawData.reduce((s, r) => s + Number(r.totalSales), 0)) }}
        </span>
        <span class="stat-lbl">Total (12 mo)</span>
      </div>
      <div class="stat-item">
        <span class="stat-val">
          {{ phpFmt(rawData.reduce((s, r) => s + Number(r.totalSales), 0) / rawData.length) }}
        </span>
        <span class="stat-lbl">Monthly Avg</span>
      </div>
      <div class="stat-item">
        <span class="stat-val">
          {{ rawData.reduce((s, r) => s + (r.transactions ?? 0), 0).toLocaleString() }}
        </span>
        <span class="stat-lbl">Transactions</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.report-card {
  background: #fff; border: 1px solid #e2e8f0;
  border-radius: 16px; padding: 22px 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.report-card-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 20px; gap: 12px;
}
.report-card-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 15px; font-weight: 700; color: #0f172a;
}
.report-card-title i { font-size: 18px; }
.report-card-desc { font-size: 12px; color: #94a3b8; margin-top: 4px; }

.chart-canvas-wrap { height: 300px; position: relative; }

.chart-loader, .chart-error, .chart-empty {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; height: 240px; gap: 10px;
  font-size: 13px; color: #94a3b8;
}
.chart-loader { flex-direction: row; }
.chart-error { color: #ef4444; flex-direction: row; }
.chart-empty p { font-size: 13px; }

.stats-strip {
  display: flex; gap: 0; border-top: 1px solid #f1f5f9;
  margin-top: 18px; padding-top: 16px;
}
.stat-item {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 0 12px;
  border-right: 1px solid #f1f5f9;
}
.stat-item:last-child { border-right: none; }
.stat-val { font-size: 16px; font-weight: 800; color: #0f172a; }
.stat-lbl { font-size: 11px; color: #94a3b8; font-weight: 500; }

.btn-sm { padding: 6px 10px; font-size: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: none; cursor: pointer; color: #64748b; display: inline-flex; align-items: center; gap: 6px; transition: 0.15s; }
.btn-sm:hover:not(:disabled) { background: #f8fafc; }
.btn-sm:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-export { background: #2563eb !important; color: #ffffff !important; border-color: #2563eb !important; font-weight: 600; }
.btn-export:hover:not(:disabled) { background: #1d4ed8 !important; border-color: #1d4ed8 !important; }
.export-error { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: #fef2f2; color: #991b1b; font-size: 12px; border-radius: 8px; margin-bottom: 12px; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }
</style>
