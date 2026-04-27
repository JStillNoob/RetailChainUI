<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import {
  Chart, LineElement, PointElement, LinearScale, CategoryScale,
  Title, Tooltip, Legend, Filler, type ChartData
} from 'chart.js'
import { getProductForecast } from '../services/forecastService.ts'

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend, Filler)

const props = defineProps<{ productId: number; productName: string }>()

const canvas  = ref<HTMLCanvasElement | null>(null)
const loading = ref(true)
const error   = ref('')
let chart: Chart | null = null

async function build() {
  loading.value = true
  error.value   = ''

  try {
    const data = await getProductForecast(props.productId)
    const history = data.history ?? []

    const labels     = history.map((r: any) => `${r.forecastMonth}/${r.forecastYear}`)
    const forecasted = history.map((r: any) => Number(r.forecastedQty))
    const actual     = history.map((r: any) => r.actualQty != null ? Number(r.actualQty) : null)

    if (chart) { chart.destroy(); chart = null }
    if (!canvas.value) return

    const chartData: ChartData<'line'> = {
      labels,
      datasets: [
        {
          label:           'Forecasted Qty',
          data:            forecasted,
          borderColor:     '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.08)',
          fill:            true,
          tension:         0.4,
          pointBackgroundColor: '#6366f1',
          pointRadius:     4,
        },
        {
          label:           'Actual Qty',
          data:            actual,
          borderColor:     '#22c55e',
          backgroundColor: 'transparent',
          fill:            false,
          tension:         0.4,
          borderDash:      [5, 4],
          pointBackgroundColor: '#22c55e',
          pointRadius:     4,
        },
      ],
    }

    chart = new Chart(canvas.value, {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { size: 12 }, color: '#64748b' } },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          x: { grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
          y: { grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8', font: { size: 11 } }, beginAtZero: true },
        },
      },
    })
  } catch {
    error.value = 'Could not load chart data.'
  } finally {
    loading.value = false
  }
}

onMounted(build)
onUnmounted(() => { chart?.destroy() })
watch(() => props.productId, build)
</script>

<template>
  <div class="chart-wrap">
    <div class="chart-header">
      <i class="ph ph-chart-line"></i>
      <span>Forecast vs Actual — <strong>{{ productName }}</strong></span>
    </div>

    <div v-if="loading" class="chart-loading">
      <i class="ph ph-spinner spin"></i> Loading chart…
    </div>
    <div v-else-if="error" class="chart-error">
      <i class="ph ph-warning"></i> {{ error }}
    </div>
    <div v-else class="chart-canvas-wrap">
      <canvas ref="canvas"></canvas>
    </div>
  </div>
</template>

<style scoped>
.chart-wrap {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.chart-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #64748b;
  margin-bottom: 18px;
}
.chart-header i { font-size: 18px; color: #6366f1; }
.chart-header strong { color: #0f172a; }

.chart-canvas-wrap { height: 280px; position: relative; }
.chart-canvas-wrap canvas { width: 100% !important; }

.chart-loading, .chart-error {
  display: flex; align-items: center; gap: 8px;
  height: 200px; justify-content: center;
  font-size: 13px; color: #94a3b8;
}
.chart-error { color: #ef4444; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }
</style>
