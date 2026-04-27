<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import {
  Chart, BarElement, LinearScale, CategoryScale,
  Tooltip, Legend, type ChartData
} from 'chart.js'
import { getTopProducts } from '../../services/reportsService.ts'

Chart.register(BarElement, LinearScale, CategoryScale, Tooltip, Legend)

const canvas  = ref<HTMLCanvasElement | null>(null)
const loading = ref(true)
const error   = ref('')
const items   = ref<any[]>([])
let chart: Chart | null = null

const phpFmt = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(v)

const palette = [
  '#6366f1','#8b5cf6','#a855f7','#ec4899','#f43f5e',
]

async function load() {
  loading.value = true
  error.value   = ''
  try {
    const all = await getTopProducts()
    items.value = all.slice(0, 5)
    buildChart()
  } catch {
    error.value = 'Could not load top products.'
  } finally {
    loading.value = false
  }
}

function buildChart() {
  if (!canvas.value || items.value.length === 0) return
  if (chart) { chart.destroy(); chart = null }

  const labels   = items.value.map(i => i.productName)
  const revenues = items.value.map(i => Number(i.totalRevenue))

  const data: ChartData<'bar'> = {
    labels,
    datasets: [{
      label: 'Revenue (₱)',
      data: revenues,
      backgroundColor: palette.slice(0, items.value.length),
      borderRadius: 6,
    }],
  }

  chart = new Chart(canvas.value, {
    type: 'bar',
    data,
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => `Revenue: ${phpFmt(ctx.parsed.x ?? 0)}` },
        },
      },
      scales: {
        x: {
          grid: { color: '#f1f5f9' },
          ticks: {
            color: '#94a3b8', font: { size: 11 },
            callback: v => '₱' + Number(v).toLocaleString(),
          },
          beginAtZero: true,
        },
        y: { grid: { display: false }, ticks: { color: '#374151', font: { size: 12, weight: 600 } } },
      },
    },
  })
}

onMounted(load)
onUnmounted(() => chart?.destroy())
watch(canvas, v => { if (v && items.value.length) buildChart() })

defineExpose({ reload: load })
</script>

<template>
  <div class="report-card">
    <div class="report-card-header">
      <div>
        <div class="report-card-title">
          <i class="ph ph-trophy" style="color:#f59e0b"></i>
          Top 5 Best-Selling Products
        </div>
        <div class="report-card-desc">Ranked by total revenue generated</div>
      </div>
      <button class="btn-ghost btn-sm" @click="load">
        <i class="ph ph-arrows-clockwise"></i>
      </button>
    </div>

    <div v-if="loading" class="chart-loader">
      <i class="ph ph-spinner spin"></i> Loading…
    </div>
    <div v-else-if="error" class="chart-error">
      <i class="ph ph-warning"></i> {{ error }}
    </div>
    <div v-else-if="items.length === 0" class="chart-empty">
      <i class="ph-fill ph-trophy" style="font-size:36px;color:#e2e8f0;"></i>
      <p>No sales data available yet.</p>
    </div>
    <div v-else>
      <div class="chart-canvas-wrap">
        <canvas ref="canvas"></canvas>
      </div>

      <!-- Data table below chart -->
      <div class="products-table">
        <div
          v-for="(item, i) in items"
          :key="item.productId"
          class="product-row"
        >
          <div class="rank-badge" :style="{ background: palette[i] }">{{ i + 1 }}</div>
          <div class="product-info">
            <div class="product-name">{{ item.productName }}</div>
            <div class="product-meta">{{ Number(item.totalQty).toLocaleString() }} units sold</div>
          </div>
          <div class="product-revenue">{{ phpFmt(item.totalRevenue) }}</div>
        </div>
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

.chart-canvas-wrap { height: 220px; position: relative; margin-bottom: 16px; }

.chart-loader, .chart-error, .chart-empty {
  display: flex; align-items: center; justify-content: center;
  height: 200px; gap: 10px; font-size: 13px; color: #94a3b8;
  flex-direction: column;
}
.chart-loader { flex-direction: row; }
.chart-error  { color: #ef4444; flex-direction: row; }
.chart-empty p { font-size: 13px; }

.products-table {
  display: flex; flex-direction: column; gap: 10px;
  border-top: 1px solid #f1f5f9; padding-top: 16px;
}
.product-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 14px; background: #f8fafc; border-radius: 10px;
}
.rank-badge {
  width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 12px; font-weight: 800;
}
.product-info { flex: 1; min-width: 0; }
.product-name { font-size: 13px; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.product-meta { font-size: 11px; color: #94a3b8; }
.product-revenue { font-size: 13px; font-weight: 800; color: #0f172a; white-space: nowrap; }

.btn-sm { padding: 6px 10px !important; font-size: 12px !important; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }
</style>
