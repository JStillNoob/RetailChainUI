<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getInventoryStatus } from '../../services/reportsService.ts'

const loading = ref(true)
const error   = ref('')
const items   = ref<any[]>([])
const filter  = ref<'All' | 'Out of Stock' | 'Low' | 'OK'>('All')
const search  = ref('')

async function load() {
  loading.value = true
  error.value   = ''
  try { items.value = await getInventoryStatus() }
  catch { error.value = 'Could not load inventory data.' }
  finally { loading.value = false }
}
onMounted(load)

const filtered = computed(() => {
  let list = items.value
  if (filter.value !== 'All') list = list.filter(i => i.stockStatus === filter.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(i => i.productName?.toLowerCase().includes(q))
  }
  return list
})

const counts = computed(() => ({
  out: items.value.filter(i => i.stockStatus === 'Out of Stock').length,
  low: items.value.filter(i => i.stockStatus === 'Low').length,
  ok:  items.value.filter(i => i.stockStatus === 'OK').length,
}))

const statusBadge = (s: string) => ({
  'Out of Stock': 'badge-red',
  'Low':          'badge-yellow',
  'OK':           'badge-green',
}[s] ?? 'badge-gray')

const stockBarWidth = (qty: number, reorder: number) => {
  if (qty === 0) return 0
  const pct = reorder > 0 ? (qty / (reorder * 3)) * 100 : 50
  return Math.min(pct, 100)
}
const stockBarColor = (s: string) => ({
  'Out of Stock': '#ef4444',
  'Low':          '#f59e0b',
  'OK':           '#22c55e',
}[s] ?? '#94a3b8')

defineExpose({ reload: load })
</script>

<template>
  <div class="report-card">
    <div class="report-card-header">
      <div>
        <div class="report-card-title">
          <i class="ph ph-warehouse" style="color:#0ea5e9"></i>
          Inventory Status
        </div>
        <div class="report-card-desc">Current stock levels with reorder alerts</div>
      </div>
      <button class="btn-ghost btn-sm" @click="load">
        <i class="ph ph-arrows-clockwise"></i>
      </button>
    </div>

    <!-- Summary pills -->
    <div v-if="!loading && items.length > 0" class="status-pills">
      <button
        v-for="s in (['All', 'Out of Stock', 'Low', 'OK'] as const)"
        :key="s"
        class="pill"
        :class="{ 'pill-active': filter === s }"
        @click="filter = s"
      >
        <span
          v-if="s !== 'All'"
          class="pill-dot"
          :style="{ background: s === 'Out of Stock' ? '#ef4444' : s === 'Low' ? '#f59e0b' : '#22c55e' }"
        ></span>
        {{ s }}
        <span class="pill-count">
          {{
            s === 'All' ? items.length :
            s === 'Out of Stock' ? counts.out :
            s === 'Low' ? counts.low : counts.ok
          }}
        </span>
      </button>

      <div class="search-box" style="margin-left:auto">
        <i class="ph ph-magnifying-glass"></i>
        <input v-model="search" placeholder="Search…" style="width:140px" />
      </div>
    </div>

    <div v-if="loading" class="chart-loader"><i class="ph ph-spinner spin"></i> Loading…</div>
    <div v-else-if="error" class="chart-error"><i class="ph ph-warning"></i> {{ error }}</div>
    <div v-else-if="filtered.length === 0" class="chart-empty">
      <i class="ph-fill ph-warehouse" style="font-size:36px;color:#e2e8f0;"></i>
      <p>{{ search || filter !== 'All' ? 'No items match.' : 'No inventory records found.' }}</p>
    </div>

    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Qty on Hand</th>
            <th>Reorder Point</th>
            <th>Stock Level</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filtered" :key="item.productId">
            <td>
              <div class="cell-name">{{ item.productName }}</div>
              <div v-if="item.location" class="cell-muted">{{ item.location }}</div>
            </td>
            <td><strong>{{ Number(item.qtyOnHand).toLocaleString() }}</strong></td>
            <td><span class="cell-muted">{{ Number(item.reorderPoint).toLocaleString() }}</span></td>
            <td style="min-width:120px;">
              <div class="stock-bar-wrap">
                <div
                  class="stock-bar"
                  :style="{
                    width: stockBarWidth(item.qtyOnHand, item.reorderPoint) + '%',
                    background: stockBarColor(item.stockStatus),
                  }"
                ></div>
              </div>
            </td>
            <td>
              <span class="badge" :class="statusBadge(item.stockStatus)">{{ item.stockStatus }}</span>
            </td>
          </tr>
        </tbody>
      </table>
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
  margin-bottom: 16px; gap: 12px;
}
.report-card-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 15px; font-weight: 700; color: #0f172a;
}
.report-card-title i { font-size: 18px; }
.report-card-desc { font-size: 12px; color: #94a3b8; margin-top: 4px; }

.status-pills { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 99px; font-size: 12px; font-weight: 600;
  border: 1.5px solid #e2e8f0; background: #fff; cursor: pointer; color: #374151;
  transition: all 0.15s;
}
.pill:hover { border-color: #c7d2fe; background: #f5f3ff; }
.pill-active { border-color: #6366f1; background: rgba(99,102,241,0.08); color: #4f46e5; }
.pill-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.pill-count {
  background: rgba(0,0,0,0.07); padding: 1px 7px; border-radius: 99px;
  font-size: 10px; font-weight: 700;
}

.table-wrap { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th {
  text-align: left; padding: 10px 14px; background: #f8fafc;
  color: #64748b; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.5px;
  border-bottom: 1px solid #e2e8f0; white-space: nowrap;
}
.data-table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: #fafbff; }

.cell-name  { font-weight: 600; color: #0f172a; font-size: 13px; }
.cell-muted { color: #94a3b8; font-size: 12px; }

.badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 99px; font-size: 11px; font-weight: 700; }
.badge-green  { background: rgba(34,197,94,0.1);  color: #16a34a; }
.badge-yellow { background: rgba(245,158,11,0.1); color: #b45309; }
.badge-red    { background: rgba(239,68,68,0.1);  color: #dc2626; }
.badge-gray   { background: rgba(100,116,139,0.1); color: #64748b; }

.stock-bar-wrap {
  height: 8px; background: #f1f5f9; border-radius: 99px; overflow: hidden; width: 100%;
}
.stock-bar { height: 100%; border-radius: 99px; transition: width 0.4s ease; min-width: 2px; }

.search-box { display: flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0; border-radius: 9px; padding: 7px 12px; background: #fff; }
.search-box i { color: #94a3b8; font-size: 14px; }
.search-box input { border: none; outline: none; font-size: 13px; color: #374151; font-family: inherit; }

.chart-loader, .chart-error, .chart-empty {
  display: flex; align-items: center; justify-content: center;
  height: 160px; gap: 10px; font-size: 13px; color: #94a3b8; flex-direction: column;
}
.chart-loader { flex-direction: row; }
.chart-error  { color: #ef4444; flex-direction: row; }
.chart-empty p { font-size: 13px; }

.btn-sm { padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: none; cursor: pointer; color: #64748b; font-size: 13px; transition: 0.15s; display: inline-flex; align-items: center; gap: 6px; }
.btn-sm:hover { background: #f8fafc; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }
</style>
