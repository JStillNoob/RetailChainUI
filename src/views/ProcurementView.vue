<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '../services/api.ts'
import { useToast } from '../composables/useToast.ts'

defineOptions({ name: 'ProcurementView' })

const { toast } = useToast()

const orders       = ref<any[]>([])
const suppliers    = ref<any[]>([])
const products     = ref<any[]>([])
const statuses     = ref<any[]>([])
const loading      = ref(true)
const statusFilter = ref('')
const search       = ref('')

async function load() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (statusFilter.value) params.status = statusFilter.value
    orders.value = await api.get('/procurement/purchase-orders', { params }).then(r => r.data)
  } catch { toast('Failed to load purchase orders.', 'error') }
  finally { loading.value = false }
}

async function loadMeta() {
  try {
    const [sup, prod, stat] = await Promise.all([
      api.get('/procurement/suppliers').then(r => r.data),
      api.get('/procurement/products').then(r => r.data),
      api.get('/procurement/order-statuses').then(r => r.data),
    ])
    suppliers.value = sup; products.value = prod; statuses.value = stat
  } catch { /* non-critical */ }
  if (!statuses.value.length) {
    statuses.value = [
      { statusId: 1, statusName: 'Pending' },
      { statusId: 2, statusName: 'Approved' },
      { statusId: 3, statusName: 'In-Transit' },
      { statusId: 4, statusName: 'Received' },
      { statusId: 5, statusName: 'Cancelled' },
    ]
  }
}

onMounted(async () => {
  await loadMeta()
  const pending = statuses.value.find((s: any) => s.statusName === 'Pending')
  if (pending) poForm.value.statusId = pending.statusId
  await load()
})

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return orders.value
  return orders.value.filter(o =>
    String(o.poId).includes(q) ||
    o.supplierName?.toLowerCase().includes(q)
  )
})

const page     = ref(1)
const pageSize = ref(10)
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
function goTo(p: number) { if (p >= 1 && p <= totalPages.value) page.value = p }

const showCreate = ref(false)
const creating   = ref(false)
const createErr  = ref('')

const poForm = ref({
  supplierId: null as number | null,
  statusId:   null as number | null,
  orderDate:  new Date().toISOString().slice(0, 10),
  expectedDate: '',
})

interface PoItem { productId: number | null; quantity: string; unitCost: string }
const items = ref<PoItem[]>([{ productId: null, quantity: '', unitCost: '' }])

function addItem() { items.value.push({ productId: null, quantity: '', unitCost: '' }) }
function removeItem(i: number) { if (items.value.length > 1) items.value.splice(i, 1) }

const lineTotal = (item: PoItem) => (parseFloat(item.quantity) || 0) * (parseFloat(item.unitCost) || 0)
const grandTotal = computed(() => items.value.reduce((s, i) => s + lineTotal(i), 0))
const phpFmt = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(v)

async function createPo() {
  createErr.value = ''
  if (!poForm.value.supplierId) { createErr.value = 'Select a supplier.'; return }
  const validItems = items.value.filter(i => i.productId && parseFloat(i.quantity) > 0 && parseFloat(i.unitCost) > 0)
  if (!validItems.length) { createErr.value = 'Add at least one complete line item.'; return }
  creating.value = true
  try {
    await api.post('/procurement/purchase-orders', {
      supplierId:   poForm.value.supplierId,
      statusId:     poForm.value.statusId,
      orderDate:    poForm.value.orderDate,
      expectedDate: poForm.value.expectedDate || null,
      items: validItems.map(i => ({ productId: i.productId, quantity: parseFloat(i.quantity), unitCost: parseFloat(i.unitCost) })),
    })
    toast('Purchase order created.'); showCreate.value = false
    const pending = statuses.value.find((s: any) => s.statusName === 'Pending')
    poForm.value = { supplierId: null, statusId: pending?.statusId ?? null, orderDate: new Date().toISOString().slice(0, 10), expectedDate: '' }
    items.value = [{ productId: null, quantity: '', unitCost: '' }]
    await load()
  } catch (e: any) {
    createErr.value = e.response?.data?.message ?? 'Failed to create PO.'
  } finally { creating.value = false }
}

async function cancelPo(po: any) {
  if (!confirm(`Cancel PO #${po.poId} from ${po.supplierName}? This cannot be undone.`)) return
  try { await api.delete(`/procurement/purchase-orders/${po.poId}`); toast('Purchase order cancelled.'); await load() }
  catch (e: any) { toast(e.response?.data?.message ?? 'Failed to cancel PO.', 'error') }
}

const showDetail = ref(false)
const detail     = ref<any>(null)
const detLoading = ref(false)

async function viewDetail(po: any) {
  showDetail.value = true; detLoading.value = true
  try { detail.value = await api.get(`/procurement/purchase-orders/${po.poId}`).then(r => r.data) }
  catch { toast('Failed to load PO details.', 'error') }
  finally { detLoading.value = false }
}

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const statusTag = (s: string): string => ({
  Pending:      'ps-tag ps-tag-amber',
  Approved:     'ps-tag ps-tag-blue',
  'In-Transit': 'ps-tag ps-tag-blue',
  Received:     'ps-tag ps-tag-green',
  Cancelled:    'ps-tag ps-tag-slate',
}[s] ?? 'ps-tag ps-tag-slate')
const avatarCls = (id: number) => `ps-avatar ps-avatar-${id % 8}`
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Page header -->
    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Purchase Orders</h1>
        <p class="ps-page-sub">Manage procurement and supplier orders.</p>
      </div>
      <button @click="showCreate = true" class="ps-btn ps-btn-primary">
        <i class="ph ph-plus"></i> New PO
      </button>
    </div>

    <!-- Datatable card -->
    <div class="ps-card overflow-hidden">

      <div class="ps-table-toolbar">
        <div>
          <div class="ps-table-title">Purchase Orders</div>
          <div class="ps-table-subtitle">{{ filtered.length }} order{{ filtered.length !== 1 ? 's' : '' }}</div>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <div class="ps-search">
            <i class="ph ph-magnifying-glass"></i>
            <input v-model="search" placeholder="Search…" />
          </div>
          <select v-model="statusFilter" @change="load" class="ps-pg-size" style="padding: 9px 14px;">
            <option value="">All Statuses</option>
            <option v-for="s in statuses" :key="s.statusId" :value="s.statusName">{{ s.statusName }}</option>
          </select>
          <button class="ps-btn ps-btn-primary"><i class="ph ph-funnel"></i> Filter</button>
          <button class="ps-btn ps-btn-dark"><i class="ph ph-download-simple"></i> Export</button>
        </div>
      </div>

      <div v-if="loading" class="p-6 space-y-3">
        <div v-for="i in 5" :key="i" class="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
      <div v-else-if="filtered.length === 0" class="flex flex-col items-center gap-3 py-16 text-slate-400">
        <i class="ph-fill ph-file-text text-5xl text-slate-200"></i>
        <p class="text-sm">{{ statusFilter ? 'No orders with this status.' : 'No purchase orders yet.' }}</p>
      </div>
      <table v-else class="ps-table">
        <thead>
          <tr>
            <th style="width: 40px"><input type="checkbox" class="accent-blue-500" /></th>
            <th>PO #</th>
            <th>Supplier</th>
            <th>Order Date</th>
            <th>Expected</th>
            <th>Items</th>
            <th>Total</th>
            <th>Status</th>
            <th style="width: 100px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in paged" :key="o.poId">
            <td><input type="checkbox" class="accent-blue-500" /></td>
            <td class="font-semibold text-slate-800">#{{ o.poId }}</td>
            <td>
              <div class="flex items-center gap-2.5">
                <div :class="avatarCls(o.poId)">{{ (o.supplierName ?? 'S').charAt(0).toUpperCase() }}</div>
                <span class="text-slate-700">{{ o.supplierName }}</span>
              </div>
            </td>
            <td class="text-slate-500">{{ fmtDate(o.orderDate) }}</td>
            <td class="text-slate-500">{{ fmtDate(o.expectedDate) }}</td>
            <td><span class="ps-tag ps-tag-slate">{{ o.itemCount }}</span></td>
            <td class="font-bold text-slate-800">{{ phpFmt(o.totalAmount) }}</td>
            <td><span :class="statusTag(o.status)">{{ o.status }}</span></td>
            <td>
              <div class="flex items-center gap-1">
                <button @click="viewDetail(o)"
                  class="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all" title="View">
                  <i class="ph ph-eye"></i>
                </button>
                <button v-if="o.status === 'Pending'" @click="cancelPo(o)"
                  class="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all" title="Cancel">
                  <i class="ph ph-x-circle"></i>
                </button>
              </div>
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
        <select v-model="pageSize" class="ps-pg-size" @change="page = 1">
          <option :value="10">10</option><option :value="25">25</option><option :value="50">50</option>
        </select>
      </div>
    </div>

    <!-- Create PO Modal -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showCreate" class="ps-modal-backdrop" @click.self="showCreate = false">
          <div class="ps-modal-card" style="max-width: 800px">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">New Purchase Order</h3>
              <button class="ps-modal-close" @click="showCreate = false" aria-label="Close">
                <i class="ph ph-x"></i>
              </button>
            </div>
            <div class="ps-modal-body">
              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="ps-label">Supplier *</label>
                  <select v-model="poForm.supplierId" class="ps-input">
                    <option :value="null">— Select supplier —</option>
                    <option v-for="s in suppliers" :key="s.supplierId" :value="s.supplierId">{{ s.name }}</option>
                  </select>
                </div>
                <div>
                  <label class="ps-label">Order Date</label>
                  <input v-model="poForm.orderDate" type="date" class="ps-input" />
                </div>
                <div>
                  <label class="ps-label">Expected Delivery</label>
                  <input v-model="poForm.expectedDate" type="date" class="ps-input" />
                </div>
              </div>

              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-700 uppercase tracking-wider">Line Items</span>
                <button @click="addItem" class="ps-btn ps-btn-outline ps-btn-sm">
                  <i class="ph ph-plus"></i> Add Line
                </button>
              </div>

              <div class="border border-slate-200 rounded-lg overflow-hidden">
                <div class="grid bg-slate-50 px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider" style="grid-template-columns:1fr 110px 120px 110px 40px;gap:8px">
                  <span>Product</span><span>Quantity</span><span>Unit Cost</span><span>Subtotal</span><span></span>
                </div>
                <div v-for="(item, idx) in items" :key="idx"
                  class="grid items-center px-3 py-2 border-t border-slate-100 hover:bg-slate-50/50"
                  style="grid-template-columns:1fr 110px 120px 110px 40px;gap:8px">
                  <select v-model="item.productId" class="ps-input">
                    <option :value="null">— Select product —</option>
                    <option v-for="p in products" :key="p.productId" :value="p.productId">{{ p.productName }}</option>
                  </select>
                  <input v-model="item.quantity" type="number" min="0" placeholder="0" class="ps-input" />
                  <input v-model="item.unitCost" type="number" min="0" step="0.01" placeholder="0.00" class="ps-input" />
                  <span class="font-semibold text-sm text-slate-800">{{ phpFmt(lineTotal(item)) }}</span>
                  <button @click="removeItem(idx)" :disabled="items.length === 1"
                    class="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30">
                    <i class="ph ph-trash text-sm"></i>
                  </button>
                </div>
              </div>

              <div class="text-right text-sm font-semibold text-slate-800 pt-3 border-t border-dashed border-slate-200">
                Grand Total: <strong class="text-base">{{ phpFmt(grandTotal) }}</strong>
              </div>
              <div v-if="createErr" class="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {{ createErr }}
              </div>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="showCreate = false">Cancel</button>
              <button class="ps-btn ps-btn-primary" :disabled="creating" @click="createPo">
                <i v-if="creating" class="ph ph-spinner animate-spin"></i>
                {{ creating ? 'Creating…' : 'Create Purchase Order' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Detail Modal -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showDetail" class="ps-modal-backdrop" @click.self="showDetail = false">
          <div class="ps-modal-card" style="max-width: 600px">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">PO #{{ detail?.poId }} — {{ detail?.supplierName }}</h3>
              <button class="ps-modal-close" @click="showDetail = false" aria-label="Close">
                <i class="ph ph-x"></i>
              </button>
            </div>
            <div class="ps-modal-body">
              <div v-if="detLoading" class="flex items-center justify-center gap-2 py-10 text-slate-400">
                <i class="ph ph-spinner animate-spin text-xl text-blue-500"></i> Loading…
              </div>
              <template v-else-if="detail">
                <div class="grid grid-cols-4 gap-3">
                  <div class="bg-slate-50 rounded-lg p-3">
                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status</div>
                    <span :class="statusTag(detail.status)">{{ detail.status }}</span>
                  </div>
                  <div class="bg-slate-50 rounded-lg p-3">
                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Order Date</div>
                    <div class="text-sm font-semibold text-slate-800">{{ fmtDate(detail.orderDate) }}</div>
                  </div>
                  <div class="bg-slate-50 rounded-lg p-3">
                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Expected</div>
                    <div class="text-sm font-semibold text-slate-800">{{ fmtDate(detail.expectedDate) }}</div>
                  </div>
                  <div class="bg-slate-50 rounded-lg p-3">
                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total</div>
                    <div class="text-sm font-bold text-slate-900">{{ phpFmt(detail.totalAmount) }}</div>
                  </div>
                </div>
                <table class="w-full text-sm border border-slate-100 rounded-lg overflow-hidden">
                  <thead class="bg-slate-50">
                    <tr>
                      <th class="px-3 py-2 text-left text-xs font-semibold text-slate-500">Product</th>
                      <th class="px-3 py-2 text-right text-xs font-semibold text-slate-500">Qty</th>
                      <th class="px-3 py-2 text-right text-xs font-semibold text-slate-500">Unit Cost</th>
                      <th class="px-3 py-2 text-right text-xs font-semibold text-slate-500">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="i in detail.items" :key="i.poItemId" class="border-t border-slate-100">
                      <td class="px-3 py-2.5 text-slate-700">{{ i.productName }}</td>
                      <td class="px-3 py-2.5 text-right text-slate-600">{{ Number(i.quantity).toLocaleString() }}</td>
                      <td class="px-3 py-2.5 text-right text-slate-500">{{ phpFmt(i.unitCost) }}</td>
                      <td class="px-3 py-2.5 text-right font-semibold text-slate-800">{{ phpFmt(i.subtotal) }}</td>
                    </tr>
                  </tbody>
                </table>
              </template>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="showDetail = false">Close</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
