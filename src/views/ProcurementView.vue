<script setup lang="ts">
import { useConfirm } from '../composables/useConfirm'
import { ref, computed, onMounted } from 'vue'
import api from '../services/api.ts'
import { getBranches } from '../services/tenant.ts'
import { useToast } from '../composables/useToast.ts'
import { useValidation } from '../composables/useValidation.ts'
import PsPagination from '../components/PsPagination.vue'

defineOptions({ name: 'ProcurementView' })

const { confirmDialog } = useConfirm()
const { toast } = useToast()
const { parseApiError } = useValidation()

const orders       = ref<any[]>([])
const suppliers    = ref<any[]>([])
const products     = ref<any[]>([])
const statuses     = ref<any[]>([])
const branches     = ref<any[]>([])
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
  try { branches.value = await getBranches() } catch { /* non-critical */ }
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
const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))

// ── Create PO ──────────────────────────────────────────────────────────────────
const showCreate = ref(false)
const creating   = ref(false)
const createErr  = ref('')

const poForm = ref({ supplierId: null as number | null, orderDate: new Date().toISOString().slice(0, 10), expectedDate: '', branchId: null as number | null, notes: '' })
interface PoItem { productId: number | null; quantity: string; unitCost: string }
const items = ref<PoItem[]>([{ productId: null, quantity: '', unitCost: '' }])

function addItem() { items.value.push({ productId: null, quantity: '', unitCost: '' }) }
function removeItem(i: number) { if (items.value.length > 1) items.value.splice(i, 1) }
const lineTotal = (item: PoItem) => (parseFloat(item.quantity) || 0) * (parseFloat(item.unitCost) || 0)
const grandTotal = computed(() => items.value.reduce((s, i) => s + lineTotal(i), 0))

async function createPo() {
  createErr.value = ''
  if (!poForm.value.supplierId) { createErr.value = 'Select a supplier.'; return }
  const validItems = items.value.filter(i => i.productId && parseFloat(i.quantity) > 0 && parseFloat(i.unitCost) > 0)
  if (!validItems.length) { createErr.value = 'Add at least one complete line item.'; return }
  creating.value = true
  try {
    await api.post('/procurement/purchase-orders', {
      supplierId:   poForm.value.supplierId,
      orderDate:    poForm.value.orderDate,
      expectedDate: poForm.value.expectedDate || null,
      branchId:     poForm.value.branchId || null,
      notes:        poForm.value.notes || null,
      items: validItems.map(i => ({ productId: i.productId, quantity: parseFloat(i.quantity), unitCost: parseFloat(i.unitCost) })),
    })
    toast('Purchase order created.')
    showCreate.value = false
    poForm.value = { supplierId: null, orderDate: new Date().toISOString().slice(0, 10), expectedDate: '', branchId: null, notes: '' }
    items.value = [{ productId: null, quantity: '', unitCost: '' }]
    await load()
  } catch (e) {
    createErr.value = parseApiError(e)
  } finally { creating.value = false }
}

// ── Edit PO ────────────────────────────────────────────────────────────────────
const showEdit  = ref(false)
const editing   = ref(false)
const editErr   = ref('')
const editPoId  = ref<number | null>(null)
const editForm  = ref({ supplierId: null as number | null, orderDate: '', expectedDate: '', branchId: null as number | null, notes: '' })
const editItems = ref<PoItem[]>([])

async function openEdit(po: any) {
  try {
    const detail = await api.get(`/procurement/purchase-orders/${po.poId}`).then(r => r.data)
    editPoId.value  = po.poId
    editForm.value  = {
      supplierId:   detail.items?.length ? null : null,  // will be set below
      orderDate:    detail.orderDate ?? '',
      expectedDate: detail.expectedDate ?? '',
      branchId:     detail.branchId ?? null,
      notes:        detail.notes ?? ''
    }
    // Find supplierId from the orders list
    const order = orders.value.find(o => o.poId === po.poId)
    const sup = suppliers.value.find(s => s.name === order?.supplierName)
    editForm.value.supplierId = sup?.supplierId ?? null
    editItems.value = (detail.items ?? []).map((i: any) => ({
      productId: i.productId,
      quantity:  String(i.quantity),
      unitCost:  String(i.unitCost),
    }))
    if (!editItems.value.length) editItems.value = [{ productId: null, quantity: '', unitCost: '' }]
    editErr.value = ''
    showEdit.value = true
  } catch { toast('Failed to load PO details.', 'error') }
}

const editLineTotal  = (item: PoItem) => (parseFloat(item.quantity) || 0) * (parseFloat(item.unitCost) || 0)
const editGrandTotal = computed(() => editItems.value.reduce((s, i) => s + editLineTotal(i), 0))
function addEditItem() { editItems.value.push({ productId: null, quantity: '', unitCost: '' }) }
function removeEditItem(i: number) { if (editItems.value.length > 1) editItems.value.splice(i, 1) }

async function savePo() {
  editErr.value = ''
  if (!editForm.value.supplierId) { editErr.value = 'Select a supplier.'; return }
  const validItems = editItems.value.filter(i => i.productId && parseFloat(i.quantity) > 0 && parseFloat(i.unitCost) > 0)
  if (!validItems.length) { editErr.value = 'Add at least one complete line item.'; return }
  editing.value = true
  try {
    await api.put(`/procurement/purchase-orders/${editPoId.value}`, {
      supplierId:   editForm.value.supplierId,
      orderDate:    editForm.value.orderDate,
      expectedDate: editForm.value.expectedDate || null,
      branchId:     editForm.value.branchId || null,
      notes:        editForm.value.notes || null,
      items: validItems.map(i => ({ productId: i.productId, quantity: parseFloat(i.quantity), unitCost: parseFloat(i.unitCost) })),
    })
    toast('Purchase order updated.')
    showEdit.value = false
    await load()
  } catch (e) {
    editErr.value = parseApiError(e)
  } finally { editing.value = false }
}

// ── Approve ────────────────────────────────────────────────────────────────────
async function approvePo(po: any) {
  if (!await confirmDialog(`Approve PO #${po.poId} from ${po.supplierName}? This will allow logistics to create a delivery.`)) return
  try {
    await api.put(`/procurement/purchase-orders/${po.poId}/approve`)
    toast('Purchase order approved.')
    await load()
  } catch (e) { toast(parseApiError(e), 'error') }
}

// ── Cancel ─────────────────────────────────────────────────────────────────────
async function cancelPo(po: any) {
  if (!await confirmDialog(`Cancel PO #${po.poId} from ${po.supplierName}?`)) return
  try {
    await api.delete(`/procurement/purchase-orders/${po.poId}`)
    toast('Purchase order cancelled.')
    await load()
  } catch (e) { toast(parseApiError(e), 'error') }
}

// ── Detail ─────────────────────────────────────────────────────────────────────
const showDetail = ref(false)
const detail     = ref<any>(null)
const detLoading = ref(false)

async function viewDetail(po: any) {
  showDetail.value = true; detLoading.value = true
  try { detail.value = await api.get(`/procurement/purchase-orders/${po.poId}`).then(r => r.data) }
  catch { toast('Failed to load PO details.', 'error') }
  finally { detLoading.value = false }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const phpFmt  = (v: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(v)
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const statusTag = (s: string): string => ({
  Pending:      'ps-tag ps-tag-amber',
  Approved:     'ps-tag ps-tag-blue',
  'In-Transit': 'ps-tag ps-tag-blue',
  Received:     'ps-tag ps-tag-green',
  Cancelled:    'ps-tag ps-tag-slate',
}[s] ?? 'ps-tag ps-tag-slate')

const receivingTag = (s: string): string => ({
  Pending:  'ps-tag ps-tag-slate',
  Partial:  'ps-tag ps-tag-amber',
  Received: 'ps-tag ps-tag-green',
}[s] ?? 'ps-tag ps-tag-slate')

const avatarCls = (id: number) => `ps-avatar ps-avatar-${id % 8}`
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Page header -->
    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Purchase Orders</h1>
        <p class="ps-page-sub">Create, approve, and manage procurement orders through the full workflow.</p>
      </div>
      <button @click="showCreate = true" class="ps-btn ps-btn-primary">
        <i class="ph ph-plus"></i> New PO
      </button>
    </div>

    <!-- Flow indicator -->
    <div class="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-semibold">
        <i class="ph-fill ph-pencil-simple"></i> Draft (Pending)
      </span>
      <i class="ph ph-arrow-right text-slate-300"></i>
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-semibold">
        <i class="ph-fill ph-check-circle"></i> Approved
      </span>
      <i class="ph ph-arrow-right text-slate-300"></i>
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-semibold">
        <i class="ph-fill ph-truck"></i> In-Transit (Logistics)
      </span>
      <i class="ph ph-arrow-right text-slate-300"></i>
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 font-semibold">
        <i class="ph-fill ph-warehouse"></i> Received
      </span>
    </div>

    <!-- Table card -->
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
            <th style="width: 130px"></th>
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
            <td>
              <span :class="statusTag(o.status)">{{ o.status }}</span>
              <div v-if="o.approvedBy" class="text-[10px] text-slate-400 mt-0.5">by {{ o.approvedBy }}</div>
            </td>
            <td>
              <div class="flex items-center gap-1">
                <button @click="viewDetail(o)"
                  class="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all" title="View">
                  <i class="ph ph-eye"></i>
                </button>
                <button v-if="o.status === 'Pending'" @click="openEdit(o)"
                  class="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-all" title="Edit">
                  <i class="ph ph-pencil-simple"></i>
                </button>
                <button v-if="o.status === 'Pending'" @click="approvePo(o)"
                  class="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-green-50 hover:text-green-600 transition-all" title="Approve">
                  <i class="ph ph-check-circle"></i>
                </button>
                <button v-if="o.status === 'Pending' || o.status === 'Approved'" @click="cancelPo(o)"
                  class="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all" title="Cancel">
                  <i class="ph ph-x-circle"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <PsPagination
        v-if="!loading"
        v-model:page="page"
        v-model:pageSize="pageSize"
        :total="filtered.length"
        record-label="orders"
      />
    </div>

    <!-- ── Create PO Modal ──────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showCreate" class="ps-modal-backdrop" @click.self="showCreate = false">
          <div class="ps-modal-card" style="max-width: 820px">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">New Purchase Order</h3>
              <button class="ps-modal-close" @click="showCreate = false"><i class="ph ph-x"></i></button>
            </div>
            <div class="ps-modal-body">
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div class="sm:col-span-3">
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
                <div>
                  <label class="ps-label">Branch <span class="text-slate-400 font-normal">(optional)</span></label>
                  <select v-model="poForm.branchId" class="ps-input">
                    <option :value="null">— Warehouse —</option>
                    <option v-for="b in branches" :key="b.branchId" :value="b.branchId">{{ b.branchName }}</option>
                  </select>
                </div>
                <div class="sm:col-span-3">
                  <label class="ps-label">Notes <span class="text-slate-400 font-normal">(optional)</span></label>
                  <input v-model="poForm.notes" placeholder="Purchase order notes…" class="ps-input" />
                </div>
              </div>

              <div class="flex items-center justify-between mt-1">
                <span class="text-xs font-bold text-slate-700 uppercase tracking-wider">Line Items</span>
                <button @click="addItem" class="ps-btn ps-btn-outline ps-btn-sm"><i class="ph ph-plus"></i> Add Line</button>
              </div>

              <div class="border border-slate-200 rounded-lg overflow-hidden">
                <div class="grid bg-slate-50 px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider" style="grid-template-columns:1fr 110px 120px 110px 40px;gap:8px">
                  <span>Product</span><span>Quantity</span><span>Unit Cost</span><span>Subtotal</span><span></span>
                </div>
                <div v-for="(item, idx) in items" :key="idx"
                  class="grid items-center px-3 py-2 border-t border-slate-100" style="grid-template-columns:1fr 110px 120px 110px 40px;gap:8px">
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
              <div v-if="createErr" class="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{{ createErr }}</div>
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

    <!-- ── Edit PO Modal ────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showEdit" class="ps-modal-backdrop" @click.self="showEdit = false">
          <div class="ps-modal-card" style="max-width: 820px">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">Edit PO #{{ editPoId }}</h3>
              <button class="ps-modal-close" @click="showEdit = false"><i class="ph ph-x"></i></button>
            </div>
            <div class="ps-modal-body">
              <div class="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 mb-1">
                <i class="ph ph-warning text-lg flex-shrink-0 mt-0.5"></i>
                Editing replaces all line items. Only Pending purchase orders can be edited.
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div class="sm:col-span-3">
                  <label class="ps-label">Supplier *</label>
                  <select v-model="editForm.supplierId" class="ps-input">
                    <option :value="null">— Select supplier —</option>
                    <option v-for="s in suppliers" :key="s.supplierId" :value="s.supplierId">{{ s.name }}</option>
                  </select>
                </div>
                <div>
                  <label class="ps-label">Order Date</label>
                  <input v-model="editForm.orderDate" type="date" class="ps-input" />
                </div>
                <div>
                  <label class="ps-label">Expected Delivery</label>
                  <input v-model="editForm.expectedDate" type="date" class="ps-input" />
                </div>
                <div>
                  <label class="ps-label">Branch</label>
                  <select v-model="editForm.branchId" class="ps-input">
                    <option :value="null">— Warehouse —</option>
                    <option v-for="b in branches" :key="b.branchId" :value="b.branchId">{{ b.branchName }}</option>
                  </select>
                </div>
                <div class="sm:col-span-3">
                  <label class="ps-label">Notes</label>
                  <input v-model="editForm.notes" placeholder="Purchase order notes…" class="ps-input" />
                </div>
              </div>

              <div class="flex items-center justify-between mt-1">
                <span class="text-xs font-bold text-slate-700 uppercase tracking-wider">Line Items</span>
                <button @click="addEditItem" class="ps-btn ps-btn-outline ps-btn-sm"><i class="ph ph-plus"></i> Add Line</button>
              </div>

              <div class="border border-slate-200 rounded-lg overflow-hidden">
                <div class="grid bg-slate-50 px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider" style="grid-template-columns:1fr 110px 120px 110px 40px;gap:8px">
                  <span>Product</span><span>Quantity</span><span>Unit Cost</span><span>Subtotal</span><span></span>
                </div>
                <div v-for="(item, idx) in editItems" :key="idx"
                  class="grid items-center px-3 py-2 border-t border-slate-100" style="grid-template-columns:1fr 110px 120px 110px 40px;gap:8px">
                  <select v-model="item.productId" class="ps-input">
                    <option :value="null">— Select product —</option>
                    <option v-for="p in products" :key="p.productId" :value="p.productId">{{ p.productName }}</option>
                  </select>
                  <input v-model="item.quantity" type="number" min="0" placeholder="0" class="ps-input" />
                  <input v-model="item.unitCost" type="number" min="0" step="0.01" placeholder="0.00" class="ps-input" />
                  <span class="font-semibold text-sm text-slate-800">{{ phpFmt(editLineTotal(item)) }}</span>
                  <button @click="removeEditItem(idx)" :disabled="editItems.length === 1"
                    class="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30">
                    <i class="ph ph-trash text-sm"></i>
                  </button>
                </div>
              </div>

              <div class="text-right text-sm font-semibold text-slate-800 pt-3 border-t border-dashed border-slate-200">
                Grand Total: <strong class="text-base">{{ phpFmt(editGrandTotal) }}</strong>
              </div>
              <div v-if="editErr" class="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{{ editErr }}</div>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="showEdit = false">Cancel</button>
              <button class="ps-btn ps-btn-primary" :disabled="editing" @click="savePo">
                <i v-if="editing" class="ph ph-spinner animate-spin"></i>
                {{ editing ? 'Saving…' : 'Save Changes' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Detail Modal ─────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showDetail" class="ps-modal-backdrop" @click.self="showDetail = false">
          <div class="ps-modal-card" style="max-width: 680px">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">PO #{{ detail?.poId }} — {{ detail?.supplierName }}</h3>
              <button class="ps-modal-close" @click="showDetail = false"><i class="ph ph-x"></i></button>
            </div>
            <div class="ps-modal-body">
              <div v-if="detLoading" class="flex items-center justify-center gap-2 py-10 text-slate-400">
                <i class="ph ph-spinner animate-spin text-xl text-blue-500"></i> Loading…
              </div>
              <template v-else-if="detail">
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                <div v-if="detail.notes" class="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-600">
                  <span class="font-semibold text-slate-500 mr-2">Notes:</span>{{ detail.notes }}
                </div>
                <table class="w-full text-sm border border-slate-100 rounded-lg overflow-hidden">
                  <thead class="bg-slate-50">
                    <tr>
                      <th class="px-3 py-2 text-left text-xs font-semibold text-slate-500">Product</th>
                      <th class="px-3 py-2 text-right text-xs font-semibold text-slate-500">Ordered</th>
                      <th class="px-3 py-2 text-right text-xs font-semibold text-slate-500">Received</th>
                      <th class="px-3 py-2 text-right text-xs font-semibold text-slate-500">Remaining</th>
                      <th class="px-3 py-2 text-center text-xs font-semibold text-slate-500">Status</th>
                      <th class="px-3 py-2 text-right text-xs font-semibold text-slate-500">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="i in detail.items" :key="i.poItemId" class="border-t border-slate-100">
                      <td class="px-3 py-2.5 text-slate-700">{{ i.productName }}</td>
                      <td class="px-3 py-2.5 text-right text-slate-600">{{ Number(i.quantity).toLocaleString() }}</td>
                      <td class="px-3 py-2.5 text-right text-emerald-600 font-medium">{{ Number(i.receivedQty).toLocaleString() }}</td>
                      <td class="px-3 py-2.5 text-right text-amber-600">{{ Number(i.remainingQty).toLocaleString() }}</td>
                      <td class="px-3 py-2.5 text-center"><span :class="receivingTag(i.receivingStatus)">{{ i.receivingStatus }}</span></td>
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
