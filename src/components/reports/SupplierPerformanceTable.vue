<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getSupplierPerformance } from '../../services/reportsService.ts'

const loading = ref(true)
const error   = ref('')
const items   = ref<any[]>([])
const search  = ref('')

async function load() {
  loading.value = true
  error.value   = ''
  try { items.value = await getSupplierPerformance() }
  catch { error.value = 'Could not load supplier performance data.' }
  finally { loading.value = false }
}
onMounted(load)

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return q ? items.value.filter(s => s.name.toLowerCase().includes(q)) : items.value
})

const phpFmt = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(v)

// Rating displayed as star icons (out of 5)
const stars = (rating: number | null) => {
  const r = Math.round(rating ?? 0)
  return { filled: r, empty: 5 - r }
}

defineExpose({ reload: load })
</script>

<template>
  <div class="report-card">
    <div class="report-card-header">
      <div>
        <div class="report-card-title">
          <i class="ph ph-handshake" style="color:#10b981"></i>
          Supplier Performance
        </div>
        <div class="report-card-desc">Ratings, order history, and total spending per supplier</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <div class="search-box">
          <i class="ph ph-magnifying-glass"></i>
          <input v-model="search" placeholder="Search supplier…" style="width:160px" />
        </div>
        <button class="btn-sm" @click="load"><i class="ph ph-arrows-clockwise"></i></button>
      </div>
    </div>

    <div v-if="loading" class="chart-loader"><i class="ph ph-spinner spin"></i> Loading…</div>
    <div v-else-if="error" class="chart-error"><i class="ph ph-warning"></i> {{ error }}</div>
    <div v-else-if="filtered.length === 0" class="chart-empty">
      <i class="ph-fill ph-handshake" style="font-size:36px;color:#e2e8f0;"></i>
      <p>{{ search ? 'No suppliers match.' : 'No supplier data available.' }}</p>
    </div>

    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Supplier</th>
            <th>Rating</th>
            <th>Total Orders</th>
            <th>Total Spend</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in filtered" :key="s.supplierId">
            <td>
              <div class="supplier-row">
                <div class="supplier-avatar">{{ (s.name ?? 'S').charAt(0).toUpperCase() }}</div>
                <div class="cell-name">{{ s.name }}</div>
              </div>
            </td>
            <td>
              <div class="stars-row">
                <i
                  v-for="n in stars(s.rating).filled"
                  :key="'f' + n"
                  class="ph-fill ph-star star-filled"
                ></i>
                <i
                  v-for="n in stars(s.rating).empty"
                  :key="'e' + n"
                  class="ph ph-star star-empty"
                ></i>
                <span class="star-val">{{ s.rating != null ? Number(s.rating).toFixed(1) : '—' }}</span>
              </div>
            </td>
            <td>
              <span class="badge badge-blue">{{ (s.totalOrders ?? 0).toLocaleString() }}</span>
            </td>
            <td>
              <strong>{{ phpFmt(s.totalSpend ?? 0) }}</strong>
            </td>
            <td>
              <span
                class="badge"
                :class="s.status === 'Active' ? 'badge-green' : 'badge-gray'"
              >{{ s.status ?? 'Active' }}</span>
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
  margin-bottom: 18px; gap: 12px; flex-wrap: wrap;
}
.report-card-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 15px; font-weight: 700; color: #0f172a;
}
.report-card-title i { font-size: 18px; }
.report-card-desc { font-size: 12px; color: #94a3b8; margin-top: 4px; }

.table-wrap { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th {
  text-align: left; padding: 10px 14px; background: #f8fafc;
  color: #64748b; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.5px;
  border-bottom: 1px solid #e2e8f0; white-space: nowrap;
}
.data-table td { padding: 13px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: #fafbff; }

.supplier-row { display: flex; align-items: center; gap: 10px; }
.supplier-avatar {
  width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
  background: linear-gradient(135deg, #6366f1, #a855f7);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 13px; font-weight: 800;
}
.cell-name { font-weight: 600; color: #0f172a; font-size: 13px; }

.stars-row { display: flex; align-items: center; gap: 3px; }
.star-filled { color: #f59e0b; font-size: 14px; }
.star-empty  { color: #e2e8f0; font-size: 14px; }
.star-val { font-size: 12px; color: #64748b; margin-left: 5px; font-weight: 600; }

.badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 99px; font-size: 11px; font-weight: 700; }
.badge-green  { background: rgba(34,197,94,0.1);  color: #16a34a; }
.badge-gray   { background: rgba(100,116,139,0.1); color: #64748b; }
.badge-blue   { background: rgba(59,130,246,0.1);  color: #2563eb; }

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
