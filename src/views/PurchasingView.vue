<template>
  <div class="min-h-screen bg-slate-50 p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Purchasing</h1>
        <p class="text-sm text-slate-500 mt-0.5">Manage procurement from reorder to goods receipt</p>
      </div>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
        <p class="text-xs text-slate-500 font-medium uppercase tracking-wider">Reorder Queue</p>
        <p class="text-3xl font-bold text-amber-500 mt-1">{{ queue.length }}</p>
        <p class="text-xs text-slate-400 mt-1">Awaiting PO creation</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
        <p class="text-xs text-slate-500 font-medium uppercase tracking-wider">Draft POs</p>
        <p class="text-3xl font-bold text-blue-500 mt-1">{{ countByStatus('Draft') }}</p>
        <p class="text-xs text-slate-400 mt-1">Not yet confirmed</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
        <p class="text-xs text-slate-500 font-medium uppercase tracking-wider">Ordered</p>
        <p class="text-3xl font-bold text-indigo-500 mt-1">{{ countByStatus('Ordered') }}</p>
        <p class="text-xs text-slate-400 mt-1">Pending delivery</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
        <p class="text-xs text-slate-500 font-medium uppercase tracking-wider">Received</p>
        <p class="text-3xl font-bold text-emerald-500 mt-1">{{ countByStatus('Received') }}</p>
        <p class="text-xs text-slate-400 mt-1">Stock updated</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="bg-white rounded-xl border border-slate-100 shadow-sm">
      <div class="flex border-b border-slate-100">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="px-5 py-3.5 text-sm font-medium transition-colors relative"
          :class="activeTab === tab.id
            ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-px'
            : 'text-slate-500 hover:text-slate-700'"
        >
          {{ tab.label }}
          <span
            v-if="tab.badge"
            class="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold"
            :class="activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'"
          >{{ tab.badge }}</span>
        </button>
      </div>

      <!-- ── Reorder Queue Tab ── -->
      <div v-if="activeTab === 'queue'" class="p-5">
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm text-slate-500">
            Select items to consolidate into a purchase order.
          </p>
          <button
            v-if="selected.length"
            @click="showCreateModal = true"
            class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <i class="ph-fill ph-shopping-cart-simple"></i>
            Create PO ({{ selected.length }} items)
          </button>
        </div>

        <div v-if="queueLoading" class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
        </div>
        <div v-else-if="!queue.length" class="text-center py-12 text-slate-400">
          <i class="ph-fill ph-check-circle text-4xl text-emerald-400 mb-2 block"></i>
          No items in the reorder queue. All stocks are being ordered.
        </div>
        <div v-else class="space-y-3">
          <!-- Select all -->
          <label class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer px-1">
            <input
              type="checkbox"
              class="w-4 h-4 accent-indigo-600"
              :checked="selected.length === queue.length"
              :indeterminate="selected.length > 0 && selected.length < queue.length"
              @change="toggleAll"
            />
            <span>Select all ({{ queue.length }})</span>
          </label>

          <div
            v-for="item in queue"
            :key="item.recommendationId"
            class="flex items-center gap-4 border border-slate-100 rounded-xl p-4 hover:border-indigo-200 transition-colors"
            :class="selected.includes(item.recommendationId) ? 'bg-indigo-50 border-indigo-200' : 'bg-white'"
          >
            <input
              type="checkbox"
              class="w-4 h-4 accent-indigo-600 shrink-0"
              :value="item.recommendationId"
              v-model="selected"
            />
            <div
              class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
              :class="trendColor(item.trendDirection)"
            >
              {{ initials(item.productName) }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="font-semibold text-slate-800 text-sm">{{ item.productName }}</p>
                <span class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
                  {{ item.branchName }}
                </span>
                <span class="flex items-center gap-1 text-xs font-medium" :class="trendTextColor(item.trendDirection)">
                  <i :class="trendIcon(item.trendDirection)"></i>
                  {{ item.trendDirection }}
                </span>
              </div>
              <div class="flex gap-4 mt-1.5 text-xs text-slate-500">
                <span>Stock: <strong class="text-slate-700">{{ item.currentStock }}</strong></span>
                <span>Reorder pt: <strong class="text-slate-700">{{ item.reorderPoint }}</strong></span>
                <span>Forecast/mo: <strong class="text-slate-700">{{ Math.round(item.forecastedMonthlyDemand) }}</strong></span>
              </div>
            </div>
            <div class="text-right shrink-0">
              <p class="text-xs text-slate-400">Recommended</p>
              <p class="text-lg font-bold text-amber-600">{{ Math.ceil(item.reorderQuantity) }} units</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Purchase Orders Tab ── -->
      <div v-if="activeTab === 'orders'" class="p-5">
        <div class="flex items-center gap-2 mb-4">
          <button
            v-for="s in ['All', 'Draft', 'Ordered', 'Received', 'Cancelled']"
            :key="s"
            @click="statusFilter = s"
            class="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
            :class="statusFilter === s
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          >
            {{ s }}
          </button>
        </div>

        <div v-if="ordersLoading" class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
        </div>
        <div v-else-if="!filteredOrders.length" class="text-center py-12 text-slate-400">
          <i class="ph-fill ph-file-text text-4xl mb-2 block"></i>
          No purchase orders found.
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="po in filteredOrders"
            :key="po.poId"
            class="border border-slate-100 rounded-xl p-4 bg-white hover:shadow-sm transition-shadow"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="font-semibold text-slate-800">PO #{{ po.poId }}</p>
                  <span class="px-2 py-0.5 rounded-full text-xs font-semibold" :class="statusClass(po.statusName)">
                    {{ po.statusName }}
                  </span>
                </div>
                <p class="text-sm text-slate-500 mt-0.5">
                  {{ po.supplierName }} &bull; {{ po.itemCount }} item{{ po.itemCount !== 1 ? 's' : '' }} &bull; Ordered {{ po.orderDate }}
                </p>
                <p v-if="po.expectedDate" class="text-xs text-slate-400 mt-0.5">
                  Expected: {{ po.expectedDate }}
                </p>

                <!-- Items inline -->
                <div class="mt-3 flex flex-wrap gap-2">
                  <span
                    v-for="item in po.items"
                    :key="item.poItemId"
                    class="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700"
                  >
                    <strong>{{ item.productName }}</strong>
                    &times; {{ Math.ceil(item.quantity) }}
                    <span v-if="item.branchId" class="text-slate-400">({{ getBranchName(item) }})</span>
                  </span>
                </div>
              </div>

              <div class="text-right shrink-0">
                <p class="text-lg font-bold text-slate-800">₱{{ formatMoney(po.totalAmount) }}</p>
                <div class="flex gap-2 mt-2 justify-end">
                  <button
                    v-if="po.statusName === 'Draft'"
                    @click="confirmOrder(po.poId)"
                    class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    Confirm Order
                  </button>
                  <button
                    v-if="po.statusName === 'Ordered'"
                    @click="openReceiveModal(po)"
                    class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    Receive Goods
                  </button>
                  <button
                    v-if="po.statusName === 'Draft'"
                    @click="cancelOrder(po.poId)"
                    class="px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Create PO Modal ── -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div class="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 class="text-lg font-bold text-slate-800">Create Purchase Order</h2>
          <button @click="showCreateModal = false" class="text-slate-400 hover:text-slate-600 text-xl leading-none">
            <i class="ph-fill ph-x"></i>
          </button>
        </div>
        <div class="p-5 space-y-4">
          <!-- Items summary -->
          <div class="bg-slate-50 rounded-xl p-3 space-y-2">
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wider">Selected Items ({{ selected.length }})</p>
            <div
              v-for="item in selectedQueueItems"
              :key="item.recommendationId"
              class="flex items-center justify-between text-sm"
            >
              <span class="text-slate-700">{{ item.productName }} <span class="text-slate-400">— {{ item.branchName }}</span></span>
              <span class="font-semibold text-slate-800">{{ Math.ceil(item.reorderQuantity) }} units</span>
            </div>
          </div>

          <!-- Supplier -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Supplier <span class="text-red-400">*</span></label>
            <select
              v-model="poForm.supplierId"
              class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option :value="null" disabled>Select supplier…</option>
              <option v-for="s in suppliers" :key="s.supplierId" :value="s.supplierId">
                {{ s.name }}
              </option>
            </select>
          </div>

          <!-- Expected Date -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Expected Delivery Date</label>
            <input
              type="date"
              v-model="poForm.expectedDate"
              class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>
        <div class="flex gap-3 p-5 pt-0">
          <button
            @click="showCreateModal = false"
            class="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="submitCreatePo"
            :disabled="!poForm.supplierId || createLoading"
            class="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <span v-if="createLoading" class="flex items-center justify-center gap-2">
              <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Creating…
            </span>
            <span v-else>Create Draft PO</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── Receive Goods Modal ── -->
    <div v-if="showReceiveModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div class="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 class="text-lg font-bold text-slate-800">Receive Goods — PO #{{ receiveTarget?.poId }}</h2>
          <button @click="showReceiveModal = false" class="text-slate-400 hover:text-slate-600 text-xl leading-none">
            <i class="ph-fill ph-x"></i>
          </button>
        </div>
        <div class="p-5 space-y-4">
          <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">
            <i class="ph-fill ph-info mr-1.5"></i>
            Confirming receipt will update inventory stock levels for all items in this order.
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Tracking Number <span class="text-slate-400">(optional)</span></label>
            <input
              type="text"
              v-model="receiveForm.trackingNo"
              placeholder="e.g. RC-20260506-001"
              class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
        </div>
        <div class="flex gap-3 p-5 pt-0">
          <button
            @click="showReceiveModal = false"
            class="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="submitReceive"
            :disabled="receiveLoading"
            class="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <span v-if="receiveLoading" class="flex items-center justify-center gap-2">
              <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Processing…
            </span>
            <span v-else>Confirm Receipt</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <transition name="toast">
      <div
        v-if="toast.show"
        class="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white"
        :class="toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'"
      >
        <i :class="toast.type === 'success' ? 'ph-fill ph-check-circle' : 'ph-fill ph-warning-circle'"></i>
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  getPurchaseQueue,
  getSuppliers,
  createPurchaseOrder,
  getPurchaseOrders,
  confirmPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
} from '../services/purchasingService.ts'

// ── State ──
const activeTab = ref('queue')
const queue = ref<any[]>([])
const orders = ref<any[]>([])
const suppliers = ref<any[]>([])
const selected = ref<number[]>([])
const statusFilter = ref('All')

const queueLoading = ref(false)
const ordersLoading = ref(false)
const createLoading = ref(false)
const receiveLoading = ref(false)

const showCreateModal = ref(false)
const showReceiveModal = ref(false)
const receiveTarget = ref<any>(null)

const poForm = ref({ supplierId: null as number | null, expectedDate: '' })
const receiveForm = ref({ trackingNo: '' })

const toast = ref({ show: false, message: '', type: 'success' })

// ── Computed ──
const tabs = computed(() => [
  { id: 'queue', label: 'Reorder Queue', badge: queue.value.length || undefined },
  { id: 'orders', label: 'Purchase Orders', badge: orders.value.length || undefined },
])

const selectedQueueItems = computed(() =>
  queue.value.filter(q => selected.value.includes(q.recommendationId))
)

const filteredOrders = computed(() =>
  statusFilter.value === 'All'
    ? orders.value
    : orders.value.filter(o => o.statusName === statusFilter.value)
)

function countByStatus(s: string) {
  return orders.value.filter(o => o.statusName === s).length
}

// ── Helpers ──
function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function trendColor(t: string) {
  if (t === 'up') return 'bg-emerald-500'
  if (t === 'down') return 'bg-red-400'
  return 'bg-slate-400'
}

function trendTextColor(t: string) {
  if (t === 'up') return 'text-emerald-600'
  if (t === 'down') return 'text-red-500'
  return 'text-slate-400'
}

function trendIcon(t: string) {
  if (t === 'up') return 'ph-fill ph-trend-up'
  if (t === 'down') return 'ph-fill ph-trend-down'
  return 'ph-fill ph-minus'
}

function statusClass(s: string) {
  if (s === 'Draft') return 'bg-blue-100 text-blue-700'
  if (s === 'Ordered') return 'bg-indigo-100 text-indigo-700'
  if (s === 'Received') return 'bg-emerald-100 text-emerald-700'
  if (s === 'Cancelled') return 'bg-red-100 text-red-700'
  return 'bg-slate-100 text-slate-600'
}

function formatMoney(n: number) {
  return Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getBranchName(item: any) {
  return item.branchName ?? `Branch ${item.branchId}`
}

function toggleAll(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  selected.value = checked ? queue.value.map((q: any) => q.recommendationId) : []
}

function showToast(message: string, type: 'success' | 'error' = 'success') {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 3000)
}

// ── Data loading ──
async function loadQueue() {
  queueLoading.value = true
  try {
    queue.value = await getPurchaseQueue()
  } finally {
    queueLoading.value = false
  }
}

async function loadOrders() {
  ordersLoading.value = true
  try {
    orders.value = await getPurchaseOrders()
  } finally {
    ordersLoading.value = false
  }
}

async function loadSuppliers() {
  suppliers.value = await getSuppliers()
}

// ── Actions ──
async function submitCreatePo() {
  if (!poForm.value.supplierId || !selected.value.length) return
  createLoading.value = true
  try {
    await createPurchaseOrder({
      supplierId: poForm.value.supplierId!,
      recommendationIds: selected.value,
      expectedDate: poForm.value.expectedDate || undefined,
    })
    showToast('Purchase order created as Draft')
    showCreateModal.value = false
    selected.value = []
    poForm.value = { supplierId: null, expectedDate: '' }
    await Promise.all([loadQueue(), loadOrders()])
    activeTab.value = 'orders'
  } catch {
    showToast('Failed to create purchase order', 'error')
  } finally {
    createLoading.value = false
  }
}

async function confirmOrder(id: number) {
  try {
    await confirmPurchaseOrder(id)
    showToast('Order confirmed and sent to supplier')
    await loadOrders()
  } catch {
    showToast('Failed to confirm order', 'error')
  }
}

function openReceiveModal(po: any) {
  receiveTarget.value = po
  receiveForm.value = { trackingNo: '' }
  showReceiveModal.value = true
}

async function submitReceive() {
  if (!receiveTarget.value) return
  receiveLoading.value = true
  try {
    await receivePurchaseOrder(receiveTarget.value.poId, {
      trackingNo: receiveForm.value.trackingNo || undefined,
    })
    showToast('Goods received. Inventory updated.')
    showReceiveModal.value = false
    await loadOrders()
  } catch {
    showToast('Failed to receive goods', 'error')
  } finally {
    receiveLoading.value = false
  }
}

async function cancelOrder(id: number) {
  if (!confirm('Cancel this purchase order?')) return
  try {
    await cancelPurchaseOrder(id)
    showToast('Purchase order cancelled')
    await loadOrders()
  } catch {
    showToast('Failed to cancel order', 'error')
  }
}

// ── Init ──
onMounted(() => {
  loadQueue()
  loadOrders()
  loadSuppliers()
})
</script>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(1rem); }
</style>
