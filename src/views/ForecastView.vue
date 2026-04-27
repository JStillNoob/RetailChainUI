<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getForecast, generateForecast } from '../services/forecastService.ts'
import ForecastChart from '../components/ForecastChart.vue'
import { useToast } from '../composables/useToast.ts'
import { useAuthStore } from '../stores/auth.ts'

defineOptions({ name: 'ForecastView' })

const { toast } = useToast()
const auth = useAuthStore()

const records    = ref<any[]>([])
const loading    = ref(true)
const generating = ref(false)
const search     = ref('')
const selectedProduct = ref<{ id: number; name: string } | null>(null)
const showChart  = ref(false)

const fmtDate  = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const monthName = (m: number) => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1] ?? m
const variance  = (f: number, a: number | null) => a == null ? null : +(f - a).toFixed(2)

const grouped = computed(() => {
  const map = new Map<number, any>()
  for (const r of records.value) {
    const existing = map.get(r.productId)
    if (!existing || r.forecastYear > existing.forecastYear ||
        (r.forecastYear === existing.forecastYear && r.forecastMonth > existing.forecastMonth)) {
      map.set(r.productId, r)
    }
  }
  return [...map.values()].sort((a, b) => a.productName.localeCompare(b.productName))
})

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return q ? grouped.value.filter(r => r.productName.toLowerCase().includes(q)) : grouped.value
})

const page     = ref(1)
const pageSize = ref(10)
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
function goTo(p: number) { if (p >= 1 && p <= totalPages.value) page.value = p }

async function load() {
  loading.value = true
  try { records.value = await getForecast() }
  catch { toast('Failed to load forecast data.', 'error') }
  finally { loading.value = false }
}
onMounted(load)

async function generate() {
  if (auth.planName === 'Starter Plan' || auth.planName === 'No Plan') {
    alert('Free Trial Limit: Data Forecasting is only available on Premium plans. Please upgrade to unlock this feature.')
    return
  }
  if (!confirm('Generate demand forecast for all active products? This will overwrite the current forecast for next month.')) return
  generating.value = true
  try {
    const res = await generateForecast()
    toast(res.message ?? 'Forecast generated successfully.', 'success')
    await load()
  } catch (err: any) {
    toast(err?.response?.data?.message ?? 'Forecast generation failed.', 'error')
  } finally {
    generating.value = false
  }
}

function viewChart(r: any) {
  if (auth.planName === 'Starter Plan' || auth.planName === 'No Plan') {
    alert('Free Trial Limit: Data Forecasting charts are only available on Premium plans. Please upgrade to unlock this feature.')
    return
  }
  selectedProduct.value = { id: r.productId, name: r.productName }
  showChart.value = true
}

const avatarCls = (id: number) => `ps-avatar ps-avatar-${id % 8}`
</script>

<template>
  <div class="flex flex-col gap-6">

    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Demand Forecast</h1>
        <p class="ps-page-sub">3-month moving average per product. Generate to refresh next month's forecast.</p>
      </div>
      <button @click="generate" :disabled="generating" class="ps-btn ps-btn-primary">
        <i :class="generating ? 'ph ph-spinner animate-spin' : 'ph ph-lightning'"></i>
        {{ generating ? 'Generating…' : 'Generate Forecast' }}
      </button>
    </div>

    <ForecastChart v-if="showChart && selectedProduct" :productId="selectedProduct.id" :productName="selectedProduct.name" />

    <div class="ps-card overflow-hidden">
      <div class="ps-table-toolbar">
        <div>
          <div class="ps-table-title">Latest Forecast</div>
          <div class="ps-table-subtitle">{{ filtered.length }} product{{ filtered.length !== 1 ? 's' : '' }}</div>
        </div>
        <div class="flex items-center gap-3">
          <div class="ps-search">
            <i class="ph ph-magnifying-glass"></i>
            <input v-model="search" placeholder="Search product…" />
          </div>
          <button class="ps-btn ps-btn-dark"><i class="ph ph-download-simple"></i> Export</button>
        </div>
      </div>

      <div v-if="loading" class="p-6 space-y-3">
        <div v-for="i in 5" :key="i" class="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
      <div v-else-if="filtered.length === 0" class="flex flex-col items-center gap-3 py-16 text-slate-400">
        <i class="ph-fill ph-chart-bar text-5xl text-slate-200"></i>
        <p class="text-sm">{{ search ? 'No products match your search.' : 'No forecast data yet. Click Generate to start.' }}</p>
      </div>
      <table v-else class="ps-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Period</th>
            <th>Forecasted Qty</th>
            <th>Actual Qty</th>
            <th>Variance</th>
            <th>Generated</th>
            <th style="width: 80px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in paged" :key="r.productId">
            <td>
              <div class="flex items-center gap-2.5">
                <div :class="avatarCls(r.productId)">{{ (r.productName ?? 'P').charAt(0).toUpperCase() }}</div>
                <span class="font-semibold text-slate-800">{{ r.productName }}</span>
              </div>
            </td>
            <td><span class="ps-tag ps-tag-blue">{{ monthName(r.forecastMonth) }} {{ r.forecastYear }}</span></td>
            <td class="font-bold text-slate-800">{{ Number(r.forecastedQty).toFixed(2) }}</td>
            <td>
              <span v-if="r.actualQty != null" class="text-slate-700">{{ Number(r.actualQty).toFixed(2) }}</span>
              <span v-else class="text-slate-400">—</span>
            </td>
            <td>
              <span v-if="variance(r.forecastedQty, r.actualQty) != null"
                :class="['ps-trend', variance(r.forecastedQty, r.actualQty)! > 0 ? 'ps-trend-down' : variance(r.forecastedQty, r.actualQty)! < 0 ? 'ps-trend-up' : 'ps-trend-flat']">
                {{ variance(r.forecastedQty, r.actualQty)! > 0 ? '+' : '' }}{{ variance(r.forecastedQty, r.actualQty) }}
              </span>
              <span v-else class="text-slate-400">—</span>
            </td>
            <td class="text-slate-500 text-xs">{{ fmtDate(r.generatedAt) }}</td>
            <td>
              <button @click="viewChart(r)" class="ps-btn ps-btn-outline" style="padding: 5px 12px; font-size: 11px;">
                <i class="ph ph-chart-line"></i> Chart
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="!loading && filtered.length > 0" class="ps-pagination">
        <button class="ps-pg-btn" :disabled="page === 1" @click="goTo(1)"><i class="ph ph-caret-double-left"></i></button>
        <button class="ps-pg-btn" :disabled="page === 1" @click="goTo(page - 1)"><i class="ph ph-caret-left"></i></button>
        <button v-for="p in totalPages" :key="p" :class="['ps-pg-btn', p === page && 'ps-pg-btn--active']" @click="goTo(p)">{{ p }}</button>
        <button class="ps-pg-btn" :disabled="page === totalPages" @click="goTo(page + 1)"><i class="ph ph-caret-right"></i></button>
        <button class="ps-pg-btn" :disabled="page === totalPages" @click="goTo(totalPages)"><i class="ph ph-caret-double-right"></i></button>
        <span class="ps-pg-info">Showing {{ (page - 1) * pageSize + 1 }} to {{ Math.min(page * pageSize, filtered.length) }} of {{ filtered.length }}</span>
      </div>
    </div>
  </div>
</template>
