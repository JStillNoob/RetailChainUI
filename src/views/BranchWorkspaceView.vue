<script setup lang="ts">
/**
 * BranchWorkspaceView — Single-branch operations hub.
 * Route: /dashboard/branch/:branchId
 *
 * Always answers the question "Which branch am I managing right now?".
 * Tabs: Overview, Inventory, Cashier, Sales, Transfers, Reorder, Staff.
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api.ts'
import {
  getBranches, getBranchInventory, addProductToBranch, setMinQty,
  getProducts, transferStock,
} from '../services/tenant.ts'
import { getReorderRecommendations } from '../services/forecastService.ts'
import { useToast } from '../composables/useToast.ts'
import { useConfirm } from '../composables/useConfirm'

defineOptions({ name: 'BranchWorkspaceView' })

const route   = useRoute()
const router  = useRouter()
const { toast } = useToast()
const { confirmDialog } = useConfirm()

const branchId = computed(() => Number(route.params.branchId))

// ── Branch metadata ──────────────────────────────────────────────────────────
const branch = ref<any>(null)
const branchLoading = ref(true)

async function loadBranch() {
  branchLoading.value = true
  try {
    const all = await getBranches()
    branch.value = all.find((b: any) => b.branchId === branchId.value) ?? null
    if (!branch.value) toast('Branch not found.', 'error')
  } catch { toast('Failed to load branch.', 'error') }
  finally { branchLoading.value = false }
}

// ── Tabs ────────────────────────────────────────────────────────────────────
type TabId = 'overview' | 'inventory' | 'cashier' | 'sales' | 'transfers' | 'reorder' | 'staff'
const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview',  label: 'Overview',  icon: 'ph-chart-pie-slice' },
  { id: 'inventory', label: 'Inventory', icon: 'ph-package' },
  { id: 'cashier',   label: 'Cashier',   icon: 'ph-cash-register' },
  { id: 'sales',     label: 'Sales',     icon: 'ph-receipt' },
  { id: 'transfers', label: 'Transfers', icon: 'ph-arrows-left-right' },
  { id: 'reorder',   label: 'Reorder',   icon: 'ph-shopping-cart-simple' },
  { id: 'staff',     label: 'Staff',     icon: 'ph-users' },
]
const activeTab = ref<TabId>((route.query.tab as TabId) || 'overview')
function setTab(id: TabId) {
  activeTab.value = id
  router.replace({ query: { ...route.query, tab: id } })
}

// ── INVENTORY tab state ──────────────────────────────────────────────────────
const inventory     = ref<any[]>([])
const invLoading    = ref(false)
const invSearch     = ref('')
const invLowOnly    = ref(false)

const filteredInv = computed(() => {
  let list = inventory.value
  if (invLowOnly.value) list = list.filter((i: any) => i.isLowStock)
  const q = invSearch.value.toLowerCase()
  return q ? list.filter((i: any) => i.productName?.toLowerCase().includes(q)) : list
})

async function loadInventory() {
  if (!branchId.value) return
  invLoading.value = true
  try { inventory.value = await getBranchInventory(branchId.value) }
  catch { toast('Failed to load inventory.', 'error') }
  finally { invLoading.value = false }
}

const editingMinQty = ref<number | null>(null)
const minQtyInput   = ref(0)
function startEditMinQty(item: any) { editingMinQty.value = item.inventoryId; minQtyInput.value = item.minQty }
async function saveMinQty(item: any) {
  try {
    await setMinQty(branchId.value, item.inventoryId, minQtyInput.value)
    item.minQty     = minQtyInput.value
    item.isLowStock = item.minQty > 0 && item.qtyOnHand <= item.minQty
    toast('Min qty updated.')
  } catch { toast('Failed to update min qty.', 'error') }
  finally { editingMinQty.value = null }
}

// Add product modal
const showAddProduct = ref(false)
const allProducts    = ref<any[]>([])
const apProductId    = ref<number | null>(null)
const apInitialQty   = ref(0)
const apMinQty       = ref(0)
const apSaving       = ref(false)

async function openAddProduct() {
  if (!allProducts.value.length) {
    try { allProducts.value = await getProducts() } catch { toast('Failed to load products.', 'error'); return }
  }
  apProductId.value = null; apInitialQty.value = 0; apMinQty.value = 0
  showAddProduct.value = true
}
async function confirmAddProduct() {
  if (!apProductId.value) { toast('Select a product.', 'error'); return }
  apSaving.value = true
  try {
    await addProductToBranch(branchId.value, {
      productId:  apProductId.value,
      initialQty: apInitialQty.value,
      minQty:     apMinQty.value,
    })
    toast('Product added to branch.')
    showAddProduct.value = false
    await loadInventory()
  } catch { toast('Failed to add product (may already exist).', 'error') }
  finally { apSaving.value = false }
}

// ── SALES tab state ──────────────────────────────────────────────────────────
const sales         = ref<any[]>([])
const salesLoading  = ref(false)
const salesPage     = ref(1)
const salesPageSize = ref(20)
const salesTotal    = ref(0)
const salesDate     = ref<string>('')

async function loadSales() {
  if (!branchId.value) return
  salesLoading.value = true
  try {
    const params: Record<string, unknown> = {
      branchId: branchId.value,
      page:     salesPage.value,
      pageSize: salesPageSize.value,
    }
    if (salesDate.value) params.date = salesDate.value
    const res = await api.get('/cashier/sales/all', { params }).then(r => r.data)
    sales.value      = res.items ?? []
    salesTotal.value = res.total ?? 0
  } catch { toast('Failed to load sales.', 'error') }
  finally { salesLoading.value = false }
}

const totalSalesPages = computed(() =>
  Math.max(1, Math.ceil(salesTotal.value / salesPageSize.value))
)

// ── OVERVIEW tab — derived stats ─────────────────────────────────────────────
const todaySalesCount = ref(0)
const todaySalesTotal = ref(0)
const weekSalesTotal  = ref(0)
const overviewLoading = ref(false)

async function loadOverviewMetrics() {
  if (!branchId.value) return
  overviewLoading.value = true
  try {
    const today = new Date().toISOString().slice(0, 10)
    const r = await api.get('/cashier/sales/all', {
      params: { branchId: branchId.value, date: today, page: 1, pageSize: 200 },
    }).then(rr => rr.data)
    todaySalesCount.value = r.total ?? 0
    todaySalesTotal.value = (r.items ?? []).reduce((s: number, x: any) => s + Number(x.totalAmount ?? 0), 0)

    // Last 7 days — fetch each day's totals (cheap; up to 7 paged calls)
    let week = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const ds = d.toISOString().slice(0, 10)
      const dayRes = await api.get('/cashier/sales/all', {
        params: { branchId: branchId.value, date: ds, page: 1, pageSize: 200 },
      }).then(rr => rr.data)
      week += (dayRes.items ?? []).reduce((s: number, x: any) => s + Number(x.totalAmount ?? 0), 0)
    }
    weekSalesTotal.value = week
  } catch { /* tolerate transient failures */ }
  finally { overviewLoading.value = false }
}

const totalProducts = computed(() => inventory.value.length)
const totalStock    = computed(() => inventory.value.reduce((s, i) => s + Number(i.qtyOnHand ?? 0), 0))
const lowStockCount = computed(() => inventory.value.filter(i => i.isLowStock && i.qtyOnHand > 0).length)
const outStockCount = computed(() => inventory.value.filter(i => Number(i.qtyOnHand) === 0).length)

// ── TRANSFERS tab state ──────────────────────────────────────────────────────
const transferProducts  = ref<any[]>([])
const trProductId       = ref<number | null>(null)
const trQty             = ref(0)
const trNote            = ref('')
const trSaving          = ref(false)
const trErr             = ref('')

async function loadTransferProducts() {
  if (!transferProducts.value.length) {
    try { transferProducts.value = await getProducts() } catch { toast('Failed to load products.', 'error') }
  }
}

async function submitTransfer() {
  trErr.value = ''
  if (!trProductId.value) { trErr.value = 'Select a product.'; return }
  if (!Number.isFinite(trQty.value) || trQty.value <= 0) { trErr.value = 'Quantity must be greater than zero.'; return }
  trSaving.value = true
  try {
    await transferStock({
      productId:  trProductId.value,
      quantity:   Number(trQty.value),
      toBranchId: branchId.value,
      note:       trNote.value.trim() || undefined,
    })
    toast('Stock transferred to this branch.')
    trProductId.value = null; trQty.value = 0; trNote.value = ''
    await loadInventory()
  } catch (e: any) {
    trErr.value = e?.response?.data?.message ?? 'Transfer failed.'
  } finally { trSaving.value = false }
}

// ── REORDER tab state ───────────────────────────────────────────────────────
const reorderRecs    = ref<any[]>([])
const reorderLoading = ref(false)

async function loadReorderRecs() {
  if (!branchId.value) return
  reorderLoading.value = true
  try {
    const all = await getReorderRecommendations({ status: 'Pending', branchId: branchId.value })
    reorderRecs.value = all.filter((r: any) => r.branchId === branchId.value)
  } catch { /* ignore — reorder may be unavailable on Starter plans */ }
  finally { reorderLoading.value = false }
}

// ── STAFF tab — derived from cashiers who've sold here ──────────────────────
const staff         = ref<{ name: string; count: number; total: number }[]>([])
const staffLoading  = ref(false)

async function loadStaff() {
  if (!branchId.value) return
  staffLoading.value = true
  try {
    const r = await api.get('/cashier/sales/all', {
      params: { branchId: branchId.value, page: 1, pageSize: 200 },
    }).then(rr => rr.data)
    const map = new Map<string, { name: string; count: number; total: number }>()
    for (const tx of r.items ?? []) {
      const name = tx.cashierName?.trim() || 'Unknown'
      const e = map.get(name) ?? { name, count: 0, total: 0 }
      e.count += 1
      e.total += Number(tx.totalAmount ?? 0)
      map.set(name, e)
    }
    staff.value = Array.from(map.values()).sort((a, b) => b.count - a.count)
  } catch { /* ignore */ }
  finally { staffLoading.value = false }
}

// ── Tab data fetch on activation ────────────────────────────────────────────
async function loadTabData(tab: TabId) {
  if (tab === 'overview')  { await Promise.all([loadInventory(), loadOverviewMetrics()]) }
  else if (tab === 'inventory') await loadInventory()
  else if (tab === 'sales')     await loadSales()
  else if (tab === 'transfers') { await Promise.all([loadInventory(), loadTransferProducts()]) }
  else if (tab === 'reorder')   await loadReorderRecs()
  else if (tab === 'staff')     await loadStaff()
}

watch(activeTab, (v) => loadTabData(v))
watch(() => branchId.value, () => { loadBranch(); loadTabData(activeTab.value) })

onMounted(async () => {
  await loadBranch()
  await loadTabData(activeTab.value)
})

// ── Helpers ──────────────────────────────────────────────────────────────────
function openCashier() {
  router.push({ path: '/dashboard/pos', query: { branchId: String(branchId.value) } })
}
function backToBranches() { router.push('/dashboard/branches') }
const fmtPeso = (n: number) => '₱' + Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (d: string) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'
const stockTagCls = (item: any) => {
  if (item.qtyOnHand === 0) return 'bg-red-100 text-red-700'
  if (item.isLowStock)      return 'bg-amber-100 text-amber-700'
  return 'bg-emerald-100 text-emerald-700'
}
const stockLabel = (item: any) => {
  if (item.qtyOnHand === 0) return 'Out of Stock'
  if (item.isLowStock)      return 'Low Stock'
  return 'In Stock'
}
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- ══ Workspace Header ═══════════════════════════════════════════════ -->
    <div class="flex items-start justify-between gap-3 flex-wrap">
      <div class="flex items-center gap-3">
        <button @click="backToBranches"
          class="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
          aria-label="Back to branches">
          <i class="ph ph-arrow-left"></i>
        </button>
        <div>
          <div class="text-xs uppercase tracking-wider font-semibold text-slate-400">Branch Workspace</div>
          <h1 class="text-2xl font-bold text-slate-800">
            {{ branchLoading ? 'Loading…' : (branch?.branchName ?? '—') }}
          </h1>
          <p class="text-sm text-slate-500">
            {{ branch?.address || 'No address' }}
            <span v-if="branch?.status"
              class="ml-2 inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
              :class="branch.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'">
              {{ branch.status }}
            </span>
          </p>
        </div>
      </div>
      <button @click="openCashier"
        class="ps-btn ps-btn-primary">
        <i class="ph ph-cash-register"></i> Open Cashier
      </button>
    </div>

    <!-- ══ Tab Bar ═══════════════════════════════════════════════════════════ -->
    <div class="ps-card overflow-hidden">
      <div class="flex border-b border-slate-100 overflow-x-auto">
        <button v-for="t in tabs" :key="t.id"
          @click="setTab(t.id)"
          class="flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors"
          :class="activeTab === t.id
            ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-px bg-indigo-50/50'
            : 'text-slate-500 hover:text-slate-700'">
          <i :class="`ph ${t.icon}`"></i>
          {{ t.label }}
        </button>
      </div>

      <!-- ══ Tab: Overview ═══════════════════════════════════════════════════ -->
      <section v-if="activeTab === 'overview'" class="p-6">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <div class="text-xs uppercase tracking-wider font-semibold text-slate-400">Products</div>
            <div class="text-3xl font-extrabold text-slate-800 mt-1">{{ totalProducts }}</div>
          </div>
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <div class="text-xs uppercase tracking-wider font-semibold text-slate-400">Total Stock</div>
            <div class="text-3xl font-extrabold text-slate-800 mt-1">{{ totalStock.toLocaleString() }}</div>
          </div>
          <div class="bg-white border border-amber-200 rounded-xl p-4">
            <div class="text-xs uppercase tracking-wider font-semibold text-amber-600">Low Stock</div>
            <div class="text-3xl font-extrabold text-amber-700 mt-1">{{ lowStockCount }}</div>
          </div>
          <div class="bg-white border border-red-200 rounded-xl p-4">
            <div class="text-xs uppercase tracking-wider font-semibold text-red-600">Out of Stock</div>
            <div class="text-3xl font-extrabold text-red-700 mt-1">{{ outStockCount }}</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div class="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl p-4">
            <div class="text-xs uppercase tracking-wider font-semibold opacity-80">Today's Sales</div>
            <div class="text-2xl font-extrabold mt-1">{{ fmtPeso(todaySalesTotal) }}</div>
            <div class="text-xs opacity-80 mt-1">{{ todaySalesCount }} transaction{{ todaySalesCount === 1 ? '' : 's' }}</div>
          </div>
          <div class="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-4">
            <div class="text-xs uppercase tracking-wider font-semibold opacity-80">Last 7 Days</div>
            <div class="text-2xl font-extrabold mt-1">{{ fmtPeso(weekSalesTotal) }}</div>
            <div class="text-xs opacity-80 mt-1">7-day total revenue</div>
          </div>
          <div class="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-4">
            <div class="text-xs uppercase tracking-wider font-semibold opacity-80">Reorder Items</div>
            <div class="text-2xl font-extrabold mt-1">{{ reorderRecs.length || lowStockCount }}</div>
            <div class="text-xs opacity-80 mt-1">Need attention</div>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <button @click="setTab('inventory')" class="ps-btn ps-btn-outline"><i class="ph ph-package"></i> Manage Inventory</button>
          <button @click="setTab('transfers')" class="ps-btn ps-btn-outline"><i class="ph ph-arrows-left-right"></i> Transfer Stock In</button>
          <button @click="setTab('reorder')"   class="ps-btn ps-btn-outline"><i class="ph ph-shopping-cart-simple"></i> Review Reorders</button>
          <button @click="openCashier"          class="ps-btn ps-btn-primary"><i class="ph ph-cash-register"></i> Open Cashier</button>
        </div>
      </section>

      <!-- ══ Tab: Inventory ══════════════════════════════════════════════════ -->
      <section v-if="activeTab === 'inventory'" class="p-6">
        <div class="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <h3 class="font-bold text-slate-800">Branch Inventory</h3>
            <p class="text-sm text-slate-500">{{ filteredInv.length }} of {{ inventory.length }} products</p>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <div class="ps-search">
              <i class="ph ph-magnifying-glass"></i>
              <input v-model="invSearch" placeholder="Search products…" />
            </div>
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" v-model="invLowOnly" class="accent-blue-500" />
              Low stock only
            </label>
            <button @click="openAddProduct" class="ps-btn ps-btn-primary">
              <i class="ph ph-plus"></i> Add Product
            </button>
          </div>
        </div>

        <div v-if="invLoading" class="py-8 text-center text-slate-400">Loading…</div>
        <div v-else-if="filteredInv.length === 0" class="py-12 text-center text-slate-400">
          No products tracked in this branch yet.
        </div>
        <table v-else class="ps-table">
          <thead>
            <tr>
              <th>Product</th>
              <th class="text-right">On Hand</th>
              <th class="text-right">Min Qty</th>
              <th>Status</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredInv" :key="item.inventoryId">
              <td class="font-semibold text-slate-700">{{ item.productName }}</td>
              <td class="text-right">{{ item.qtyOnHand }} <span class="text-slate-400 text-xs">{{ item.unitName ?? 'units' }}</span></td>
              <td class="text-right">
                <template v-if="editingMinQty === item.inventoryId">
                  <input type="number" v-model="minQtyInput" class="ps-input inline-flex" style="width:80px;padding:4px 8px" min="0" />
                  <button class="ps-btn ps-btn-primary" style="padding:4px 8px;margin-left:4px" @click="saveMinQty(item)"><i class="ph ph-check"></i></button>
                </template>
                <template v-else>
                  {{ item.minQty }}
                  <button class="text-slate-400 hover:text-blue-500 ml-2" @click="startEditMinQty(item)"><i class="ph ph-pencil-simple"></i></button>
                </template>
              </td>
              <td>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" :class="stockTagCls(item)">
                  {{ stockLabel(item) }}
                </span>
              </td>
              <td class="text-slate-500">{{ item.location || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- ══ Tab: Cashier ════════════════════════════════════════════════════ -->
      <section v-if="activeTab === 'cashier'" class="p-6">
        <div class="flex flex-col items-center text-center gap-5 py-10">
          <div class="w-20 h-20 rounded-2xl bg-indigo-100 flex items-center justify-center">
            <i class="ph-fill ph-cash-register text-4xl text-indigo-600"></i>
          </div>
          <div>
            <h3 class="text-xl font-bold text-slate-800">Cashier — {{ branch?.branchName }}</h3>
            <p class="text-sm text-slate-500 max-w-md mx-auto mt-1">
              Launching the Cashier will sell only from <strong>{{ branch?.branchName }}</strong>'s available stock.
              Branch context is locked for the entire transaction.
            </p>
          </div>
          <div class="grid grid-cols-3 gap-4 w-full max-w-md">
            <div class="bg-slate-50 rounded-xl p-3">
              <div class="text-xs text-slate-500">In Stock</div>
              <div class="text-xl font-bold text-slate-800">{{ totalProducts - outStockCount }}</div>
            </div>
            <div class="bg-amber-50 rounded-xl p-3">
              <div class="text-xs text-amber-700">Low Stock</div>
              <div class="text-xl font-bold text-amber-800">{{ lowStockCount }}</div>
            </div>
            <div class="bg-red-50 rounded-xl p-3">
              <div class="text-xs text-red-700">Out</div>
              <div class="text-xl font-bold text-red-800">{{ outStockCount }}</div>
            </div>
          </div>
          <button @click="openCashier" class="ps-btn ps-btn-primary" style="padding:12px 28px;font-size:15px">
            <i class="ph ph-arrow-right"></i> Open Cashier for this Branch
          </button>
        </div>
      </section>

      <!-- ══ Tab: Sales ══════════════════════════════════════════════════════ -->
      <section v-if="activeTab === 'sales'" class="p-6">
        <div class="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <h3 class="font-bold text-slate-800">Sales History</h3>
            <p class="text-sm text-slate-500">All transactions recorded at this branch</p>
          </div>
          <div class="flex items-center gap-2">
            <input type="date" v-model="salesDate" @change="salesPage = 1; loadSales()" class="ps-input" style="padding:8px 10px" />
            <button v-if="salesDate" @click="salesDate = ''; loadSales()" class="ps-btn ps-btn-outline">Clear</button>
            <button @click="loadSales()" :disabled="salesLoading" class="ps-btn ps-btn-outline">
              <i class="ph ph-arrows-clockwise"></i> Refresh
            </button>
          </div>
        </div>
        <div v-if="salesLoading" class="py-8 text-center text-slate-400">Loading…</div>
        <div v-else-if="sales.length === 0" class="py-12 text-center text-slate-400">No sales found{{ salesDate ? ' for ' + salesDate : '' }}.</div>
        <table v-else class="ps-table">
          <thead>
            <tr>
              <th>Tx #</th>
              <th>Date</th>
              <th>Cashier</th>
              <th>Items</th>
              <th>Method</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in sales" :key="s.transactionId">
              <td class="font-semibold">#{{ s.transactionId }}</td>
              <td class="text-slate-500 text-sm">{{ fmtDate(s.transactionDate) }}</td>
              <td class="text-slate-700">{{ s.cashierName ?? '—' }}</td>
              <td>{{ s.itemCount ?? '—' }}</td>
              <td><span class="inline-block px-2 py-0.5 bg-slate-100 rounded-full text-xs">{{ s.paymentMethod ?? 'Cash' }}</span></td>
              <td class="text-right font-bold text-slate-800">{{ fmtPeso(s.totalAmount) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="!salesLoading && sales.length > 0" class="flex items-center justify-between mt-4 text-sm">
          <span class="text-slate-500">{{ (salesPage - 1) * salesPageSize + 1 }}–{{ Math.min(salesPage * salesPageSize, salesTotal) }} of {{ salesTotal }}</span>
          <div class="flex gap-1">
            <button class="ps-btn ps-btn-outline" :disabled="salesPage === 1" @click="salesPage--; loadSales()">Prev</button>
            <button class="ps-btn ps-btn-outline" :disabled="salesPage >= totalSalesPages" @click="salesPage++; loadSales()">Next</button>
          </div>
        </div>
      </section>

      <!-- ══ Tab: Transfers ══════════════════════════════════════════════════ -->
      <section v-if="activeTab === 'transfers'" class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 class="font-bold text-slate-800 mb-1">Transfer Stock to {{ branch?.branchName }}</h3>
            <p class="text-sm text-slate-500 mb-4">Move products from the central warehouse into this branch.</p>
            <div class="space-y-3">
              <div>
                <label for="tr-product" class="ps-label">Product *</label>
                <select id="tr-product" v-model="trProductId" class="ps-input">
                  <option :value="null" disabled>Select a product…</option>
                  <option v-for="p in transferProducts" :key="p.productId" :value="p.productId">
                    {{ p.productName }} <template v-if="p.quantity != null">(WH: {{ p.quantity }})</template>
                  </option>
                </select>
              </div>
              <div>
                <label for="tr-qty" class="ps-label">Quantity *</label>
                <input id="tr-qty" type="number" v-model="trQty" min="1" placeholder="0" class="ps-input" />
              </div>
              <div>
                <label for="tr-note" class="ps-label">Note</label>
                <input id="tr-note" v-model="trNote" placeholder="e.g. Friday restock" class="ps-input" />
              </div>
              <div v-if="trErr" class="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{{ trErr }}</div>
              <button class="ps-btn ps-btn-primary w-full justify-center" :disabled="trSaving" @click="submitTransfer">
                <i v-if="trSaving" class="ph ph-spinner animate-spin"></i>
                <i v-else class="ph ph-arrow-right"></i>
                {{ trSaving ? 'Transferring…' : 'Transfer to Branch' }}
              </button>
            </div>
          </div>

          <div>
            <h3 class="font-bold text-slate-800 mb-1">Branch Stock Snapshot</h3>
            <p class="text-sm text-slate-500 mb-4">Current quantities at this branch.</p>
            <div class="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-50 sticky top-0">
                  <tr>
                    <th class="text-left py-2 px-3 font-semibold text-xs uppercase tracking-wider text-slate-500">Product</th>
                    <th class="text-right py-2 px-3 font-semibold text-xs uppercase tracking-wider text-slate-500">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="i in inventory" :key="i.inventoryId" class="border-t border-slate-100">
                    <td class="py-2 px-3">{{ i.productName }}</td>
                    <td class="py-2 px-3 text-right font-semibold" :class="i.qtyOnHand === 0 ? 'text-red-600' : i.isLowStock ? 'text-amber-600' : 'text-slate-700'">
                      {{ i.qtyOnHand }} <span class="text-slate-400 text-xs">{{ i.unitName ?? 'units' }}</span>
                    </td>
                  </tr>
                  <tr v-if="inventory.length === 0">
                    <td colspan="2" class="py-6 text-center text-slate-400">No products in this branch.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <!-- ══ Tab: Reorder ════════════════════════════════════════════════════ -->
      <section v-if="activeTab === 'reorder'" class="p-6">
        <div class="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <h3 class="font-bold text-slate-800">Reorder Recommendations</h3>
            <p class="text-sm text-slate-500">Low-stock products at this branch with suggested order quantities</p>
          </div>
          <button @click="loadReorderRecs" :disabled="reorderLoading" class="ps-btn ps-btn-outline">
            <i class="ph ph-arrows-clockwise"></i> Refresh
          </button>
        </div>
        <div v-if="reorderLoading" class="py-8 text-center text-slate-400">Loading…</div>
        <div v-else-if="reorderRecs.length === 0" class="py-12 text-center text-slate-400">
          <i class="ph-fill ph-check-circle text-4xl text-emerald-300 mb-2"></i>
          <p>No reorder recommendations — all stock is healthy.</p>
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div v-for="r in reorderRecs" :key="r.recommendationId"
            class="border border-amber-200 bg-amber-50/30 rounded-xl p-4">
            <div class="flex items-start justify-between gap-2 mb-2">
              <div>
                <div class="font-semibold text-slate-800">{{ r.productName }}</div>
                <div class="text-xs text-slate-500">Trend: {{ r.trendDirection }}</div>
              </div>
              <span class="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">{{ r.status }}</span>
            </div>
            <div class="grid grid-cols-3 gap-2 text-xs mt-3">
              <div><div class="text-slate-400">Current</div><div class="font-bold text-slate-700">{{ r.currentStock }}</div></div>
              <div><div class="text-slate-400">Reorder pt</div><div class="font-bold text-slate-700">{{ r.reorderPoint }}</div></div>
              <div><div class="text-slate-400">Forecast/mo</div><div class="font-bold text-slate-700">{{ Math.round(r.forecastedMonthlyDemand) }}</div></div>
            </div>
            <div class="mt-3 px-3 py-2 bg-amber-100 rounded-lg text-amber-800 font-bold flex items-center justify-between">
              <span class="text-xs">Recommended Order</span>
              <span class="text-base">{{ Math.ceil(r.reorderQuantity) }} {{ r.unitName ?? 'units' }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ══ Tab: Staff ══════════════════════════════════════════════════════ -->
      <section v-if="activeTab === 'staff'" class="p-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-bold text-slate-800">Staff at this Branch</h3>
            <p class="text-sm text-slate-500">Cashiers ranked by recent transaction count</p>
          </div>
          <button @click="loadStaff" :disabled="staffLoading" class="ps-btn ps-btn-outline">
            <i class="ph ph-arrows-clockwise"></i> Refresh
          </button>
        </div>
        <div v-if="staffLoading" class="py-8 text-center text-slate-400">Loading…</div>
        <div v-else-if="staff.length === 0" class="py-12 text-center text-slate-400">No transactions recorded yet.</div>
        <table v-else class="ps-table">
          <thead>
            <tr>
              <th>Cashier</th>
              <th class="text-right">Transactions</th>
              <th class="text-right">Sales Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, idx) in staff" :key="s.name">
              <td class="font-semibold text-slate-700">
                <span class="inline-block w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold mr-2 text-center leading-7">
                  {{ idx + 1 }}
                </span>
                {{ s.name }}
              </td>
              <td class="text-right">{{ s.count }}</td>
              <td class="text-right font-bold">{{ fmtPeso(s.total) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>

    <!-- ══ Add Product Modal ════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showAddProduct" class="ps-modal-backdrop" @click.self="showAddProduct = false">
          <div class="ps-modal-card" style="max-width:460px">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">Add Product to {{ branch?.branchName }}</h3>
              <button class="ps-modal-close" @click="showAddProduct = false"><i class="ph ph-x"></i></button>
            </div>
            <div class="ps-modal-body">
              <div>
                <label for="ap-product" class="ps-label">Product *</label>
                <select id="ap-product" v-model="apProductId" class="ps-input">
                  <option :value="null" disabled>— Select product —</option>
                  <option v-for="p in allProducts" :key="p.productId" :value="p.productId">{{ p.productName }}</option>
                </select>
              </div>
              <div>
                <label for="ap-init" class="ps-label">Initial Quantity</label>
                <input id="ap-init" type="number" v-model="apInitialQty" min="0" class="ps-input" />
              </div>
              <div>
                <label for="ap-min" class="ps-label">Min Qty (low-stock threshold)</label>
                <input id="ap-min" type="number" v-model="apMinQty" min="0" class="ps-input" />
              </div>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="showAddProduct = false">Cancel</button>
              <button class="ps-btn ps-btn-primary" :disabled="apSaving" @click="confirmAddProduct">
                {{ apSaving ? 'Adding…' : 'Add to Branch' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>
