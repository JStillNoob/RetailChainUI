<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '../services/api.ts'
import { useToast } from '../composables/useToast.ts'

defineOptions({ name: 'InventoryView' })

const { toast } = useToast()

const items   = ref<any[]>([])
const loading = ref(true)
const search  = ref('')
const lowOnly = ref(false)

async function load() {
  loading.value = true
  try {
    const params: Record<string, unknown> = {}
    if (lowOnly.value) params.lowStock = true
    items.value = await api.get('/warehouse/inventory', { params }).then(r => r.data)
  } catch { toast('Failed to load inventory.', 'error') }
  finally { loading.value = false }
}
onMounted(load)

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return items.value
  return items.value.filter(i =>
    i.productName?.toLowerCase().includes(q) ||
    i.sku?.toLowerCase().includes(q) ||
    i.location?.toLowerCase().includes(q)
  )
})

const page     = ref(1)
const pageSize = ref(10)
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
function goTo(p: number) { if (p >= 1 && p <= totalPages.value) page.value = p }

const stockColor = (item: any) => {
  if (item.qtyOnHand === 0) return '#EF4444'
  if (item.isLowStock)      return '#F59E0B'
  return '#22C55E'
}
const stockTagCls = (item: any) => {
  if (item.qtyOnHand === 0) return 'ps-tag ps-tag-red'
  if (item.isLowStock)      return 'ps-tag ps-tag-amber'
  return 'ps-tag ps-tag-green'
}
const stockLabel = (item: any) =>
  item.qtyOnHand === 0 ? 'Out of Stock' : item.isLowStock ? 'Low' : 'OK'
const stockBarPct = (item: any) => {
  if (item.qtyOnHand === 0 || item.reorderPoint === 0) return 0
  return Math.min((item.qtyOnHand / (item.reorderPoint * 3)) * 100, 100)
}

const showAdjust   = ref(false)
const adjustItem   = ref<any>(null)
const adjustSaving = ref(false)
const adjustForm   = ref({ adjustmentType: 'StockIn', quantity: '', location: '', note: '' })
const adjustErr    = ref('')

function openAdjust(item: any) {
  adjustItem.value = item
  adjustForm.value = { adjustmentType: 'StockIn', quantity: '', location: item.location ?? '', note: '' }
  adjustErr.value  = ''
  showAdjust.value = true
}

async function saveAdjust() {
  adjustErr.value = ''
  const qty = parseFloat(adjustForm.value.quantity)
  if (!qty || qty <= 0) { adjustErr.value = 'Enter a valid quantity.'; return }
  adjustSaving.value = true
  try {
    const res = await api.post('/warehouse/inventory/adjust', {
      productId: adjustItem.value.productId, adjustmentType: adjustForm.value.adjustmentType,
      quantity: qty, location: adjustForm.value.location || null, note: adjustForm.value.note || null,
    })
    toast(`${adjustForm.value.adjustmentType} recorded. New qty: ${res.data.newQtyOnHand}`)
    showAdjust.value = false; await load()
  } catch (e: any) {
    adjustErr.value = e.response?.data?.message ?? 'Adjustment failed.'
  } finally { adjustSaving.value = false }
}

const lowCount = computed(() => items.value.filter(i => i.isLowStock || i.qtyOnHand === 0).length)
const totalUnits = computed(() => items.value.reduce((s, i) => s + Number(i.qtyOnHand ?? 0), 0))
const okCount = computed(() => items.value.length - lowCount.value)
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Page header -->
    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Inventory</h1>
        <p class="ps-page-sub">Track stock levels across your products.</p>
      </div>
      <button @click="load" :disabled="loading" class="ps-btn ps-btn-outline">
        <i class="ph ph-arrows-clockwise" :class="{ 'animate-spin': loading }"></i> Refresh
      </button>
    </div>

    <!-- KPI summary -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div class="flex items-start justify-between gap-2">
          <div class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 text-blue-500">
            <i class="ph-fill ph-package text-lg"></i>
          </div>
        </div>
        <p class="text-xl font-bold text-slate-900 mt-3 leading-none">{{ items.length.toLocaleString() }}</p>
        <p class="text-xs text-slate-500 mt-1.5">Total Products</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div class="flex items-start justify-between gap-2">
          <div class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-sky-50 text-sky-500">
            <i class="ph-fill ph-stack text-lg"></i>
          </div>
          <span class="inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
            <i class="ph ph-arrow-up text-[10px]"></i> Tracked
          </span>
        </div>
        <p class="text-xl font-bold text-slate-900 mt-3 leading-none">{{ totalUnits.toLocaleString() }}</p>
        <p class="text-xs text-slate-500 mt-1.5">Units On Hand</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div class="flex items-start justify-between gap-2">
          <div :class="['inline-flex items-center justify-center w-9 h-9 rounded-lg',
            lowCount > 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500']">
            <i class="ph-fill ph-warning-circle text-lg"></i>
          </div>
          <span :class="[
            'inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full',
            lowCount > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700',
          ]">
            <i class="ph ph-check text-[10px]"></i> {{ okCount }} OK
          </span>
        </div>
        <p class="text-xl font-bold text-slate-900 mt-3 leading-none">{{ lowCount.toLocaleString() }}</p>
        <p class="text-xs text-slate-500 mt-1.5">Low Stock Items</p>
      </div>
    </div>

    <!-- Datatable card -->
    <div class="ps-card overflow-hidden">

      <div class="ps-table-toolbar">
        <div>
          <div class="ps-table-title">Stock Records</div>
          <div class="ps-table-subtitle">{{ filtered.length }} item{{ filtered.length !== 1 ? 's' : '' }}</div>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <div class="ps-search">
            <i class="ph ph-magnifying-glass"></i>
            <input v-model="search" placeholder="Search…" />
          </div>
          <label class="flex items-center gap-2 cursor-pointer">
            <button type="button" role="switch" :aria-checked="lowOnly"
              @click="lowOnly = !lowOnly; load()"
              :class="['relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200',
                lowOnly ? 'bg-blue-500' : 'bg-slate-200']">
              <span :class="['inline-block h-4 w-4 mt-0.5 transform rounded-full bg-white shadow transition-transform',
                lowOnly ? 'translate-x-4' : 'translate-x-0.5']"></span>
            </button>
            <span class="text-sm text-slate-600 font-medium">Low stock only</span>
          </label>
          <button class="ps-btn ps-btn-primary"><i class="ph ph-funnel"></i> Filter</button>
          <button class="ps-btn ps-btn-dark"><i class="ph ph-download-simple"></i> Export</button>
        </div>
      </div>

      <div v-if="loading" class="p-6 space-y-3">
        <div v-for="i in 6" :key="i" class="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
      <div v-else-if="filtered.length === 0" class="flex flex-col items-center gap-3 py-16 text-slate-400">
        <i class="ph-fill ph-stack text-5xl text-slate-200"></i>
        <p class="text-sm">No inventory records found.</p>
      </div>
      <table v-else class="ps-table">
        <thead>
          <tr>
            <th style="width: 40px"><input type="checkbox" class="accent-blue-500" /></th>
            <th>Product</th>
            <th>SKU</th>
            <th>On Hand</th>
            <th>Reserved</th>
            <th>Reorder At</th>
            <th>Stock Level</th>
            <th>Location</th>
            <th>Status</th>
            <th style="width: 50px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in paged" :key="item.inventoryId">
            <td><input type="checkbox" class="accent-blue-500" /></td>
            <td class="font-semibold text-slate-800">{{ item.productName }}</td>
            <td class="text-slate-500 text-xs">{{ item.sku ?? '—' }}</td>
            <td class="font-bold text-slate-800">{{ Number(item.qtyOnHand).toLocaleString() }}</td>
            <td class="text-slate-500">{{ Number(item.qtyReserved).toLocaleString() }}</td>
            <td class="text-slate-500">{{ Number(item.reorderPoint).toLocaleString() }}</td>
            <td>
              <div class="h-2 bg-slate-100 rounded-full overflow-hidden w-24">
                <div class="h-full rounded-full transition-all" :style="{ width: stockBarPct(item) + '%', background: stockColor(item) }"></div>
              </div>
            </td>
            <td class="text-slate-500 text-xs">{{ item.location || '—' }}</td>
            <td><span :class="stockTagCls(item)">{{ stockLabel(item) }}</span></td>
            <td>
              <button @click="openAdjust(item)"
                class="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all" title="Adjust stock">
                <i class="ph ph-pencil-simple"></i>
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
        <span class="ps-pg-info">Showing {{ (page - 1) * pageSize + 1 }} to {{ Math.min(page * pageSize, filtered.length) }} of {{ filtered.length }} items</span>
        <select v-model="pageSize" class="ps-pg-size" @change="page = 1">
          <option :value="10">10</option><option :value="25">25</option><option :value="50">50</option>
        </select>
      </div>
    </div>

    <!-- Adjust Modal -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showAdjust" class="ps-modal-backdrop" @click.self="showAdjust = false">
          <div class="ps-modal-card">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">Stock Adjustment — {{ adjustItem?.productName }}</h3>
              <button class="ps-modal-close" @click="showAdjust = false" aria-label="Close">
                <i class="ph ph-x"></i>
              </button>
            </div>
            <div class="ps-modal-body">
              <p class="text-sm text-slate-500">Current: <strong class="text-slate-800">{{ Number(adjustItem?.qtyOnHand).toLocaleString() }} units</strong></p>

              <div>
                <label class="ps-label">Adjustment Type</label>
                <div class="flex gap-2">
                  <button type="button" @click="adjustForm.adjustmentType = 'StockIn'"
                    :class="['flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all cursor-pointer flex-1 justify-center',
                      adjustForm.adjustmentType === 'StockIn' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300']">
                    <i class="ph ph-plus-circle"></i> Stock In (+)
                  </button>
                  <button type="button" @click="adjustForm.adjustmentType = 'StockOut'"
                    :class="['flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all cursor-pointer flex-1 justify-center',
                      adjustForm.adjustmentType === 'StockOut' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300']">
                    <i class="ph ph-minus-circle"></i> Stock Out (-)
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="ps-label">Quantity *</label>
                  <input v-model="adjustForm.quantity" type="number" placeholder="0" class="ps-input" />
                </div>
                <div>
                  <label class="ps-label">Location</label>
                  <input v-model="adjustForm.location" placeholder="e.g. Aisle 3" class="ps-input" />
                </div>
                <div class="col-span-2">
                  <label class="ps-label">Note</label>
                  <input v-model="adjustForm.note" placeholder="Optional note" class="ps-input" />
                </div>
              </div>

              <div v-if="adjustErr" class="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {{ adjustErr }}
              </div>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="showAdjust = false">Cancel</button>
              <button class="ps-btn ps-btn-primary" :disabled="adjustSaving" @click="saveAdjust">
                <i v-if="adjustSaving" class="ph ph-spinner animate-spin"></i>
                {{ adjustSaving ? 'Saving…' : 'Apply Adjustment' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
