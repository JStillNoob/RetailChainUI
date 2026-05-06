<script setup lang="ts">
import { useConfirm } from '../composables/useConfirm'
import { ref, computed, onMounted } from 'vue'
import {
  getForecast,
  generateForecast,
  getReorderRecommendations,
  updateReorderStatus,
} from '../services/forecastService.ts'
import ForecastChart from '../components/ForecastChart.vue'
import { useToast } from '../composables/useToast.ts'
import { useAuthStore } from '../stores/auth.ts'

defineOptions({ name: 'ForecastView' })

const { confirmDialog } = useConfirm()
const { toast }         = useToast()
const auth              = useAuthStore()

// ── State ──────────────────────────────────────────────────────────────────────
const records      = ref<any[]>([])
const reorders     = ref<any[]>([])
const loading      = ref(true)
const generating   = ref(false)
const search       = ref('')
const activeTab    = ref<'forecast' | 'reorder'>('forecast')
const reorderStatus = ref('Pending')   // filter
const selectedProduct = ref<{ id: number; name: string } | null>(null)
const showChart    = ref(false)

const isPlanRestricted = computed(() =>
  auth.planName === 'Starter Plan' || auth.planName === 'No Plan'
)

// ── Formatters ─────────────────────────────────────────────────────────────────
const fmtDate   = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const monthName = (m: number) => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1] ?? m
const variance  = (f: number, a: number | null) => a == null ? null : +(f - a).toFixed(2)
const fmtQty    = (n: number) => Math.round(Number(n)).toString()
const fmtReorder = (n: number) => Math.ceil(Number(n)).toString()
const avatarCls = (id: number) => `ps-avatar ps-avatar-${id % 8}`

// ── Forecast table (latest per product) ───────────────────────────────────────
const grouped = computed(() => {
  const map = new Map<number, any>()
  for (const r of records.value) {
    const ex = map.get(r.productId)
    if (!ex || r.forecastYear > ex.forecastYear ||
        (r.forecastYear === ex.forecastYear && r.forecastMonth > ex.forecastMonth))
      map.set(r.productId, r)
  }
  return [...map.values()].sort((a, b) => a.productName.localeCompare(b.productName))
})

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return q ? grouped.value.filter(r => r.productName.toLowerCase().includes(q)) : grouped.value
})

const page       = ref(1)
const pageSize   = 10
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const paged      = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))
function goTo(p: number) { if (p >= 1 && p <= totalPages.value) page.value = p }

// ── Reorder recommendations ────────────────────────────────────────────────────
const filteredReorders = computed(() => {
  const q = search.value.toLowerCase()
  let list = reorders.value.filter(r => r.status === reorderStatus.value)
  if (q) list = list.filter(r => r.productName.toLowerCase().includes(q) || r.branchName?.toLowerCase().includes(q))
  return list
})

const pendingCount  = computed(() => reorders.value.filter(r => r.status === 'Pending').length)
const orderedCount  = computed(() => reorders.value.filter(r => r.status === 'Ordered').length)
const dismissedCount = computed(() => reorders.value.filter(r => r.status === 'Dismissed').length)

// ── Loaders ────────────────────────────────────────────────────────────────────
async function loadAll() {
  loading.value = true
  try {
    const [fc, ro] = await Promise.all([getForecast(), getReorderRecommendations()])
    records.value  = fc
    reorders.value = ro
  } catch {
    toast('Failed to load forecast data.', 'error')
  } finally {
    loading.value = false
  }
}
onMounted(loadAll)

async function generate() {
  if (!await confirmDialog('Generate WMA demand forecast and reorder recommendations for all active products?')) return
  generating.value = true
  try {
    const res = await generateForecast()
    toast(res.message ?? 'Forecast generated.', 'success')
    await loadAll()
    if ((res.recommendations ?? 0) > 0) activeTab.value = 'reorder'
  } catch (err: any) {
    toast(err?.response?.data?.message ?? 'Forecast generation failed.', 'error')
  } finally {
    generating.value = false
  }
}

async function markStatus(rec: any, status: string) {
  try {
    await updateReorderStatus(rec.recommendationId, status)
    rec.status = status
    toast(`Marked as ${status}.`, 'success')
  } catch {
    toast('Failed to update status.', 'error')
  }
}

function viewChart(r: any) {
  selectedProduct.value = { id: r.productId, name: r.productName }
  showChart.value = true
}

// ── Trend helpers ──────────────────────────────────────────────────────────────
const trendIcon  = (t: string) => t === 'up' ? 'ph-trend-up' : t === 'down' ? 'ph-trend-down' : 'ph-minus'
const trendColor = (t: string) => t === 'up' ? 'text-emerald-600' : t === 'down' ? 'text-red-500' : 'text-slate-400'
const trendLabel = (t: string) => t === 'up' ? 'Rising' : t === 'down' ? 'Declining' : 'Stable'

// ── Stock bar ──────────────────────────────────────────────────────────────────
const stockPct = (current: number, reorder: number) =>
  Math.min(100, Math.round((current / Math.max(reorder * 2, 1)) * 100))
const stockBarColor = (current: number, reorder: number) =>
  current <= 0 ? 'bg-red-500' : current <= reorder ? 'bg-amber-400' : 'bg-emerald-400'
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- ── Premium Gate ──────────────────────────────────────────────────────── -->
    <div v-if="isPlanRestricted" class="flex flex-col items-center justify-center min-h-[60vh]">
      <div class="ps-card max-w-md w-full p-10 flex flex-col items-center text-center gap-5">
        <div class="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center">
          <i class="ph-fill ph-crown text-4xl text-amber-400"></i>
        </div>
        <div>
          <h2 class="text-xl font-bold text-slate-800 mb-1">Premium Feature</h2>
          <p class="text-sm text-slate-500">Demand Forecasting and Reorder Recommendations are available on <strong>Standard</strong> and <strong>Premium</strong> plans.</p>
        </div>
        <router-link to="/dashboard/upgrade" class="ps-btn ps-btn-primary w-full justify-center">
          <i class="ph ph-arrow-circle-up"></i> Upgrade Plan
        </router-link>
        <button @click="$router.back()" class="ps-btn ps-btn-outline w-full justify-center">
          <i class="ph ph-arrow-left"></i> Go Back
        </button>
      </div>
    </div>

    <template v-else>

      <!-- ── Page header ─────────────────────────────────────────────────────── -->
      <div class="ps-page-header">
        <div>
          <h1 class="ps-page-title">Demand Forecast & Reorder Engine</h1>
          <p class="ps-page-sub">WMA-powered predictions drive automated reorder recommendations — fast-moving: 3-month window, slow-moving: 6-month window.</p>
        </div>
        <button @click="generate" :disabled="generating" class="ps-btn ps-btn-primary">
          <i :class="generating ? 'ph ph-spinner animate-spin' : 'ph ph-lightning'"></i>
          {{ generating ? 'Generating…' : 'Generate Forecast' }}
        </button>
      </div>

      <!-- ── Summary cards ───────────────────────────────────────────────────── -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <i class="ph-fill ph-chart-line-up text-indigo-500 text-lg"></i>
          </div>
          <div>
            <p class="text-xs text-slate-500">Forecasts</p>
            <p class="text-xl font-bold text-slate-800">{{ grouped.length }}</p>
          </div>
        </div>
        <div
          class="bg-white rounded-xl border p-4 shadow-sm flex items-center gap-3 cursor-pointer hover:border-amber-300 transition-colors"
          :class="pendingCount > 0 ? 'border-amber-200' : 'border-slate-200'"
          @click="activeTab = 'reorder'; reorderStatus = 'Pending'"
        >
          <div class="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
            <i class="ph-fill ph-warning text-amber-500 text-lg"></i>
          </div>
          <div>
            <p class="text-xs text-slate-500">Pending Orders</p>
            <p class="text-xl font-bold text-slate-800">{{ pendingCount }}</p>
          </div>
        </div>
        <div
          class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3 cursor-pointer hover:border-emerald-300 transition-colors"
          @click="activeTab = 'reorder'; reorderStatus = 'Ordered'"
        >
          <div class="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <i class="ph-fill ph-check-circle text-emerald-500 text-lg"></i>
          </div>
          <div>
            <p class="text-xs text-slate-500">Ordered</p>
            <p class="text-xl font-bold text-slate-800">{{ orderedCount }}</p>
          </div>
        </div>
        <div
          class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3 cursor-pointer hover:border-slate-300 transition-colors"
          @click="activeTab = 'reorder'; reorderStatus = 'Dismissed'"
        >
          <div class="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            <i class="ph-fill ph-x-circle text-slate-400 text-lg"></i>
          </div>
          <div>
            <p class="text-xs text-slate-500">Dismissed</p>
            <p class="text-xl font-bold text-slate-800">{{ dismissedCount }}</p>
          </div>
        </div>
      </div>

      <!-- ── ForecastChart ───────────────────────────────────────────────────── -->
      <ForecastChart v-if="showChart && selectedProduct" :productId="selectedProduct.id" :productName="selectedProduct.name" />

      <!-- ── Tabs ────────────────────────────────────────────────────────────── -->
      <div class="ps-card overflow-hidden">
        <!-- Tab bar -->
        <div class="flex items-center gap-0 border-b border-slate-200 px-4 pt-2">
          <button
            @click="activeTab = 'forecast'"
            :class="[
              'px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
              activeTab === 'forecast'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            ]"
          >
            <i class="ph ph-chart-line-up mr-1.5"></i>Demand Forecast
          </button>
          <button
            @click="activeTab = 'reorder'"
            :class="[
              'px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-1.5',
              activeTab === 'reorder'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            ]"
          >
            <i class="ph ph-package"></i>Reorder Recommendations
            <span v-if="pendingCount > 0" class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">{{ pendingCount }}</span>
          </button>
          <!-- Toolbar right -->
          <div class="ml-auto flex items-center gap-2 pb-1">
            <div class="ps-search" style="min-width: 200px">
              <i class="ph ph-magnifying-glass"></i>
              <input v-model="search" placeholder="Search…" />
            </div>
          </div>
        </div>

        <!-- ────────────────────────────────────────────────────────────────────
             TAB: Demand Forecast
             ──────────────────────────────────────────────────────────────────── -->
        <div v-if="activeTab === 'forecast'">
          <div v-if="loading" class="p-6 space-y-3">
            <div v-for="i in 5" :key="i" class="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
          </div>
          <div v-else-if="filtered.length === 0" class="flex flex-col items-center gap-3 py-16 text-slate-400">
            <i class="ph-fill ph-chart-bar text-5xl text-slate-200"></i>
            <p class="text-sm">{{ search ? 'No products match your search.' : 'No forecast data yet — click Generate Forecast to start.' }}</p>
          </div>
          <table v-else class="ps-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Period</th>
                <th>Forecasted Qty</th>
                <th>Actual Qty</th>
                <th>Variance</th>
                <th>WMA Window</th>
                <th>Generated</th>
                <th style="width:80px"></th>
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
                <td class="font-bold text-slate-800">{{ fmtQty(r.forecastedQty) }}</td>
                <td>
                  <span v-if="r.actualQty != null" class="text-slate-700">{{ fmtQty(r.actualQty) }}</span>
                  <span v-else class="text-slate-400">—</span>
                </td>
                <td>
                  <span v-if="variance(r.forecastedQty, r.actualQty) != null"
                    :class="['ps-trend', variance(r.forecastedQty, r.actualQty)! > 0 ? 'ps-trend-down' : variance(r.forecastedQty, r.actualQty)! < 0 ? 'ps-trend-up' : 'ps-trend-flat']">
                    {{ variance(r.forecastedQty, r.actualQty)! > 0 ? '+' : '' }}{{ variance(r.forecastedQty, r.actualQty) }}
                  </span>
                  <span v-else class="text-slate-400">—</span>
                </td>
                <td>
                  <span :class="['ps-tag', r.windowMonths === 3 ? 'ps-tag-green' : 'ps-tag-blue']">
                    {{ r.windowMonths ?? 3 }}M WMA
                  </span>
                </td>
                <td class="text-slate-500 text-xs">{{ fmtDate(r.generatedAt) }}</td>
                <td>
                  <button @click="viewChart(r)" class="ps-btn ps-btn-outline" style="padding:5px 12px;font-size:11px">
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
            <span class="ps-pg-info">{{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, filtered.length) }} of {{ filtered.length }}</span>
          </div>
        </div>

        <!-- ────────────────────────────────────────────────────────────────────
             TAB: Reorder Recommendations
             ──────────────────────────────────────────────────────────────────── -->
        <div v-else>
          <!-- Status filter pills -->
          <div class="flex items-center gap-2 px-4 pt-3 pb-2">
            <button
              v-for="s in ['Pending', 'Ordered', 'Dismissed']" :key="s"
              @click="reorderStatus = s"
              :class="[
                'px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
                reorderStatus === s
                  ? s === 'Pending'   ? 'bg-amber-100 border-amber-400 text-amber-700'
                  : s === 'Ordered'   ? 'bg-emerald-100 border-emerald-400 text-emerald-700'
                  :                    'bg-slate-100 border-slate-400 text-slate-600'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              ]"
            >
              {{ s }}
              <span class="ml-1 opacity-70">
                ({{ s === 'Pending' ? pendingCount : s === 'Ordered' ? orderedCount : dismissedCount }})
              </span>
            </button>
          </div>

          <!-- Loading skeleton -->
          <div v-if="loading" class="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <div v-for="i in 6" :key="i" class="h-52 bg-slate-100 rounded-xl animate-pulse"></div>
          </div>

          <!-- Empty state -->
          <div v-else-if="filteredReorders.length === 0" class="flex flex-col items-center gap-3 py-16 text-slate-400">
            <i class="ph-fill ph-package text-5xl text-slate-200"></i>
            <p class="text-sm font-medium text-slate-500">
              {{ reorderStatus === 'Pending' ? 'No pending reorder recommendations.' : `No ${reorderStatus.toLowerCase()} recommendations.` }}
            </p>
            <p v-if="reorderStatus === 'Pending'" class="text-xs text-slate-400">Click <strong>Generate Forecast</strong> to run the reorder engine.</p>
          </div>

          <!-- Recommendation cards -->
          <div v-else class="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <div
              v-for="r in filteredReorders" :key="r.recommendationId"
              class="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3 shadow-sm hover:shadow transition-shadow"
              :class="r.status === 'Ordered' ? 'border-emerald-200 bg-emerald-50/30' : r.status === 'Dismissed' ? 'opacity-60' : ''"
            >
              <!-- Header: product + branch + trend -->
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <div :class="avatarCls(r.productId)" class="flex-shrink-0">
                    {{ (r.productName ?? 'P').charAt(0).toUpperCase() }}
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-bold text-slate-800 truncate leading-tight">{{ r.productName }}</p>
                    <span class="inline-block text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5">{{ r.branchName }}</span>
                  </div>
                </div>
                <div :class="['flex items-center gap-1 text-xs font-semibold flex-shrink-0', trendColor(r.trendDirection)]">
                  <i :class="['ph-fill', trendIcon(r.trendDirection)]"></i>
                  {{ trendLabel(r.trendDirection) }}
                </div>
              </div>

              <!-- Stock bar -->
              <div>
                <div class="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>Current stock</span>
                  <span class="font-semibold" :class="r.currentStock <= r.reorderPoint ? 'text-red-600' : 'text-slate-700'">
                    {{ fmtQty(r.currentStock) }} / Reorder at {{ fmtQty(r.reorderPoint) }}
                  </span>
                </div>
                <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    :class="['h-full rounded-full transition-all', stockBarColor(r.currentStock, r.reorderPoint)]"
                    :style="{ width: stockPct(r.currentStock, r.reorderPoint) + '%' }"
                  ></div>
                </div>
              </div>

              <!-- Stats grid -->
              <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                <div class="flex justify-between">
                  <span class="text-slate-400">Monthly forecast</span>
                  <span class="font-semibold text-slate-700">{{ fmtQty(r.forecastedMonthlyDemand) }} units</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">Daily demand</span>
                  <span class="font-semibold text-slate-700">{{ Number(r.forecastedDailyDemand).toFixed(2) }}/day</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">Safety stock ({{ r.safetyStockDays }}d)</span>
                  <span class="font-semibold text-slate-700">{{ fmtQty(r.safetyStock) }} units</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">Lead time ({{ r.leadTimeDays }}d)</span>
                  <span class="font-semibold text-slate-700">{{ Math.ceil(r.forecastedDailyDemand * r.leadTimeDays) }} units</span>
                </div>
              </div>

              <!-- Recommended qty highlight -->
              <div class="flex items-center justify-between rounded-lg px-3 py-2"
                :class="r.status === 'Ordered' ? 'bg-emerald-100' : 'bg-amber-50 border border-amber-200'">
                <span class="text-xs font-semibold" :class="r.status === 'Ordered' ? 'text-emerald-700' : 'text-amber-800'">
                  <i class="ph-fill ph-package mr-1"></i>Recommended Order
                </span>
                <span class="text-lg font-extrabold" :class="r.status === 'Ordered' ? 'text-emerald-700' : 'text-amber-700'">
                  {{ fmtReorder(r.reorderQuantity) }} units
                </span>
              </div>

              <!-- Action buttons -->
              <div v-if="r.status === 'Pending'" class="flex gap-2 pt-0.5">
                <button
                  @click="markStatus(r, 'Ordered')"
                  class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
                >
                  <i class="ph ph-check-circle"></i> Mark Ordered
                </button>
                <button
                  @click="markStatus(r, 'Dismissed')"
                  class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors"
                >
                  <i class="ph ph-x-circle"></i> Dismiss
                </button>
              </div>
              <div v-else-if="r.status === 'Ordered'" class="flex gap-2 pt-0.5">
                <button
                  @click="markStatus(r, 'Pending')"
                  class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-500 text-xs font-semibold transition-colors"
                >
                  <i class="ph ph-arrow-counter-clockwise"></i> Revert to Pending
                </button>
              </div>
              <div v-else class="flex gap-2 pt-0.5">
                <button
                  @click="markStatus(r, 'Pending')"
                  class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-500 text-xs font-semibold transition-colors"
                >
                  <i class="ph ph-arrow-counter-clockwise"></i> Restore
                </button>
              </div>

              <!-- Timestamp -->
              <p class="text-[10px] text-slate-400 text-right -mt-1">Generated {{ fmtDate(r.generatedAt) }}</p>
            </div>
          </div>
        </div>

      </div><!-- end ps-card -->
    </template>
  </div>
</template>
