<script setup lang="ts">
import { useConfirm } from '../composables/useConfirm'
import { ref, computed, onMounted } from 'vue'
import {
  getBranches, createBranch, updateBranch, deleteBranch,
  getBranchInventory, addProductToBranch, setMinQty,
  getBranchStockOverview, getProducts
} from '../services/tenant.ts'
import { useToast } from '../composables/useToast.ts'

defineOptions({ name: 'BranchesView' })

const { confirmDialog } = useConfirm()
const { toast } = useToast()

// ── Branches list ────────────────────────────────────────────────────────────
const branches  = ref<any[]>([])
const loading   = ref(true)
const search    = ref('')

async function loadBranches() {
  loading.value = true
  try { branches.value = await getBranches() }
  catch { toast('Failed to load branches.', 'error') }
  finally { loading.value = false }
}
onMounted(loadBranches)

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return q
    ? branches.value.filter(b => b.branchName?.toLowerCase().includes(q) || b.address?.toLowerCase().includes(q))
    : branches.value
})

// ── Create / Edit branch ─────────────────────────────────────────────────────
const showForm  = ref(false)
const editId    = ref<number | null>(null)
const formName  = ref('')
const formAddr  = ref('')
const formStatus = ref('Active')
const saving    = ref(false)

function openCreate() {
  editId.value = null; formName.value = ''; formAddr.value = ''; formStatus.value = 'Active'
  showForm.value = true
}
function openEdit(b: any) {
  editId.value = b.branchId; formName.value = b.branchName; formAddr.value = b.address ?? ''; formStatus.value = b.status
  showForm.value = true
}
function closeForm() { showForm.value = false }

async function saveBranch() {
  if (!formName.value.trim()) { toast('Branch name is required.', 'error'); return }
  saving.value = true
  try {
    if (editId.value) {
      await updateBranch(editId.value, { branchName: formName.value, address: formAddr.value, status: formStatus.value })
      toast('Branch updated.')
    } else {
      await createBranch({ branchName: formName.value, address: formAddr.value })
      toast('Branch created.')
    }
    closeForm()
    await loadBranches()
    await loadOverview()
  } catch { toast('Failed to save branch.', 'error') }
  finally { saving.value = false }
}

async function removeBranch(b: any) {
  if (!await confirmDialog(`Delete branch "${b.branchName}"? This cannot be undone.`)) return
  try {
    await deleteBranch(b.branchId)
    toast('Branch deleted.')
    await loadBranches()
    await loadOverview()
  } catch { toast('Failed to delete branch.', 'error') }
}

// ── Stock Overview (cross-branch dashboard) ──────────────────────────────────
const overview = ref<any[]>([])
const overviewLoading = ref(false)

async function loadOverview() {
  overviewLoading.value = true
  try { overview.value = await getBranchStockOverview() }
  catch { /* silently fail — no branches yet */ }
  finally { overviewLoading.value = false }
}
onMounted(loadOverview)

// ── Branch inventory drawer ──────────────────────────────────────────────────
const selectedBranch = ref<any>(null)
const branchInv      = ref<any[]>([])
const invLoading     = ref(false)
const invSearch      = ref('')
const showLowOnly    = ref(false)

const filteredInv = computed(() => {
  let list = branchInv.value
  if (showLowOnly.value) list = list.filter(i => i.isLowStock)
  const q = invSearch.value.toLowerCase()
  return q ? list.filter(i => i.productName?.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q)) : list
})

async function openBranch(b: any) {
  selectedBranch.value = b
  invLoading.value = true
  try { branchInv.value = await getBranchInventory(b.branchId) }
  catch { toast('Failed to load inventory.', 'error') }
  finally { invLoading.value = false }
}
function closeBranch() { selectedBranch.value = null; branchInv.value = []; showLowOnly.value = false; invSearch.value = '' }

// ── Add product to branch ────────────────────────────────────────────────────
const showAddProduct = ref(false)
const products       = ref<any[]>([])
const apProductId    = ref<number | null>(null)
const apInitialQty   = ref(0)
const apMinQty       = ref(0)
const apSaving       = ref(false)

async function openAddProduct() {
  if (!products.value.length) {
    try { products.value = await getProducts() } catch { toast('Failed to load products.', 'error'); return }
  }
  apProductId.value = null; apInitialQty.value = 0; apMinQty.value = 0
  showAddProduct.value = true
}

async function confirmAddProduct() {
  if (!apProductId.value) { toast('Select a product.', 'error'); return }
  apSaving.value = true
  try {
    await addProductToBranch(selectedBranch.value.branchId, {
      productId: apProductId.value,
      initialQty: apInitialQty.value,
      minQty: apMinQty.value
    })
    toast('Product added to branch.')
    showAddProduct.value = false
    branchInv.value = await getBranchInventory(selectedBranch.value.branchId)
  } catch { toast('Failed to add product (may already exist).', 'error') }
  finally { apSaving.value = false }
}

// ── Edit MinQty inline ────────────────────────────────────────────────────────
const editingMinQty   = ref<number | null>(null)
const minQtyInput     = ref(0)

function startEditMinQty(item: any) { editingMinQty.value = item.inventoryId; minQtyInput.value = item.minQty }
async function saveMinQty(item: any) {
  try {
    await setMinQty(selectedBranch.value.branchId, item.inventoryId, minQtyInput.value)
    item.minQty = minQtyInput.value
    item.isLowStock = item.minQty > 0 && item.qtyOnHand <= item.minQty
    toast('Min qty updated.')
  } catch { toast('Failed to update min qty.', 'error') }
  finally { editingMinQty.value = null }
}

const stockTagCls = (item: any) => {
  if (item.qtyOnHand === 0) return 'ps-tag ps-tag-red'
  if (item.isLowStock)      return 'ps-tag ps-tag-amber'
  return 'ps-tag ps-tag-green'
}
const stockLabel = (item: any) => {
  if (item.qtyOnHand === 0) return 'Out of Stock'
  if (item.isLowStock)      return 'Low Stock'
  return 'In Stock'
}
</script>

<template>
  <div class="inv-page">

    <!-- ══ Header ══════════════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div>
        <h2 class="page-title">Branch Management</h2>
        <p class="page-sub">Create branches, track per-branch inventory and low-stock alerts.</p>
      </div>
      <button class="btn-primary" @click="openCreate">
        <i class="ph ph-plus" /> Add Branch
      </button>
    </div>

    <!-- ══ Stock Overview Cards ════════════════════════════════════════════════ -->
    <section v-if="overview.length" class="overview-section">
      <h3 class="section-label">Cross-Branch Overview</h3>
      <div class="overview-grid">
        <div v-for="ov in overview" :key="ov.branchId" class="ov-card" @click="openBranch(branches.find(b => b.branchId === ov.branchId))">
          <div class="ov-card__name">{{ ov.branchName }}</div>
          <div class="ov-card__stats">
            <div class="ov-stat">
              <span class="ov-stat__val">{{ ov.totalProducts }}</span>
              <span class="ov-stat__lbl">Products</span>
            </div>
            <div class="ov-stat">
              <span class="ov-stat__val">{{ ov.totalStock }}</span>
              <span class="ov-stat__lbl">Total Stock</span>
            </div>
            <div class="ov-stat" :class="{ 'ov-stat--warn': ov.lowStockCount > 0 }">
              <span class="ov-stat__val">{{ ov.lowStockCount }}</span>
              <span class="ov-stat__lbl">Low Stock</span>
            </div>
            <div class="ov-stat" :class="{ 'ov-stat--danger': ov.outOfStock > 0 }">
              <span class="ov-stat__val">{{ ov.outOfStock }}</span>
              <span class="ov-stat__lbl">Out of Stock</span>
            </div>
          </div>
          <div v-if="ov.lowStockCount > 0" class="ov-card__alert">
            <i class="ph ph-warning" /> {{ ov.lowStockCount }} item(s) need restocking
          </div>
        </div>
      </div>
    </section>

    <!-- ══ Branch list ═════════════════════════════════════════════════════════ -->
    <div class="toolbar">
      <div class="search-wrap">
        <i class="ph ph-magnifying-glass" />
        <input v-model="search" placeholder="Search branches…" />
      </div>
    </div>

    <div v-if="loading" class="state-msg"><i class="ph ph-spinner" /> Loading…</div>

    <div v-else-if="filtered.length === 0" class="state-msg">No branches found.</div>

    <div v-else class="branch-grid">
      <div v-for="b in filtered" :key="b.branchId" class="branch-card">
        <div class="branch-card__header">
          <div>
            <div class="branch-card__name">{{ b.branchName }}</div>
            <div class="branch-card__addr">{{ b.address || '—' }}</div>
          </div>
          <span :class="b.status === 'Active' ? 'ps-tag ps-tag-green' : 'ps-tag ps-tag-grey'">{{ b.status }}</span>
        </div>
        <div class="branch-card__actions">
          <button class="btn-sm btn-outline" @click="openBranch(b)"><i class="ph ph-warehouse" /> Inventory</button>
          <button class="btn-sm btn-outline" @click="openEdit(b)"><i class="ph ph-pencil" /> Edit</button>
          <button class="btn-sm btn-danger-outline" @click="removeBranch(b)"><i class="ph ph-trash" /></button>
        </div>
      </div>
    </div>

    <!-- ══ Create / Edit Modal ═════════════════════════════════════════════════ -->
    <div v-if="showForm" class="modal-backdrop" @click.self="closeForm">
      <div class="modal">
        <div class="modal__header">
          <span>{{ editId ? 'Edit Branch' : 'New Branch' }}</span>
          <button class="modal__close" @click="closeForm"><i class="ph ph-x" /></button>
        </div>
        <div class="modal__body">
          <label class="form-label">Branch Name *</label>
          <input v-model="formName" class="form-control" placeholder="e.g. Main Branch" />

          <label class="form-label mt-2">Address</label>
          <input v-model="formAddr" class="form-control" placeholder="e.g. 123 Main St" />

          <template v-if="editId">
            <label class="form-label mt-2">Status</label>
            <select v-model="formStatus" class="form-control">
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </template>
        </div>
        <div class="modal__footer">
          <button class="btn-outline" @click="closeForm">Cancel</button>
          <button class="btn-primary" :disabled="saving" @click="saveBranch">
            {{ saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Branch' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ══ Branch Inventory Drawer ═════════════════════════════════════════════ -->
    <div v-if="selectedBranch" class="drawer-backdrop" @click.self="closeBranch">
      <div class="drawer">
        <div class="drawer__header">
          <div>
            <span class="drawer__title">{{ selectedBranch.branchName }}</span>
            <span class="drawer__sub">Branch Inventory</span>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn-sm btn-primary" @click="openAddProduct"><i class="ph ph-plus" /> Add Product</button>
            <button class="modal__close" @click="closeBranch"><i class="ph ph-x" /></button>
          </div>
        </div>

        <div class="drawer__toolbar">
          <div class="search-wrap">
            <i class="ph ph-magnifying-glass" />
            <input v-model="invSearch" placeholder="Search…" />
          </div>
          <label class="toggle-label">
            <input type="checkbox" v-model="showLowOnly" />
            Low stock only
          </label>
        </div>

        <div v-if="invLoading" class="state-msg"><i class="ph ph-spinner" /> Loading…</div>
        <div v-else-if="filteredInv.length === 0" class="state-msg">No products tracked in this branch yet.</div>

        <table v-else class="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>On Hand</th>
              <th>Min Qty</th>
              <th>Status</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredInv" :key="item.inventoryId">
              <td>{{ item.productName }}</td>
              <td class="mono">{{ item.sku }}</td>
              <td class="num">{{ item.qtyOnHand }}</td>
              <td class="num">
                <template v-if="editingMinQty === item.inventoryId">
                  <input type="number" v-model="minQtyInput" class="inline-input" min="0" style="width:70px" />
                  <button class="btn-xs btn-primary" @click="saveMinQty(item)"><i class="ph ph-check" /></button>
                  <button class="btn-xs btn-outline" @click="editingMinQty = null"><i class="ph ph-x" /></button>
                </template>
                <template v-else>
                  {{ item.minQty }}
                  <button class="btn-xs btn-ghost" @click="startEditMinQty(item)"><i class="ph ph-pencil-simple" /></button>
                </template>
              </td>
              <td><span :class="stockTagCls(item)">{{ stockLabel(item) }}</span></td>
              <td>{{ item.location || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══ Add Product to Branch Modal ════════════════════════════════════════ -->
    <div v-if="showAddProduct" class="modal-backdrop" @click.self="showAddProduct = false">
      <div class="modal">
        <div class="modal__header">
          <span>Add Product to {{ selectedBranch?.branchName }}</span>
          <button class="modal__close" @click="showAddProduct = false"><i class="ph ph-x" /></button>
        </div>
        <div class="modal__body">
          <label class="form-label">Product *</label>
          <select v-model="apProductId" class="form-control">
            <option :value="null" disabled>— Select product —</option>
            <option v-for="p in products" :key="p.productId" :value="p.productId">{{ p.productName }} ({{ p.sku }})</option>
          </select>

          <label class="form-label mt-2">Initial Qty</label>
          <input type="number" v-model="apInitialQty" class="form-control" min="0" />

          <label class="form-label mt-2">Min Qty (low-stock threshold)</label>
          <input type="number" v-model="apMinQty" class="form-control" min="0" />
        </div>
        <div class="modal__footer">
          <button class="btn-outline" @click="showAddProduct = false">Cancel</button>
          <button class="btn-primary" :disabled="apSaving" @click="confirmAddProduct">
            {{ apSaving ? 'Adding…' : 'Add to Branch' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.inv-page { padding: 24px; max-width: 1100px; margin: 0 auto; }

.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
.page-title  { font-size: 1.5rem; font-weight: 700; margin: 0; }
.page-sub    { color: var(--text-secondary, #6B7280); margin: 4px 0 0; font-size: .9rem; }

/* Overview */
.overview-section { margin-bottom: 28px; }
.section-label    { font-size: .8rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-secondary, #6B7280); margin: 0 0 12px; }
.overview-grid    { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.ov-card          { background: var(--card-bg, #fff); border: 1px solid var(--border, #E5E7EB); border-radius: 12px; padding: 16px; cursor: pointer; transition: box-shadow .15s; }
.ov-card:hover    { box-shadow: 0 4px 16px rgba(0,0,0,.08); }
.ov-card__name    { font-weight: 700; font-size: 1rem; margin-bottom: 12px; }
.ov-card__stats   { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.ov-stat          { display: flex; flex-direction: column; align-items: center; min-width: 48px; }
.ov-stat__val     { font-size: 1.2rem; font-weight: 700; }
.ov-stat__lbl     { font-size: .7rem; color: var(--text-secondary, #6B7280); }
.ov-stat--warn .ov-stat__val   { color: #D97706; }
.ov-stat--danger .ov-stat__val { color: #DC2626; }
.ov-card__alert   { font-size: .78rem; color: #D97706; display: flex; align-items: center; gap: 4px; margin-top: 4px; }

/* Branches grid */
.toolbar        { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.search-wrap    { display: flex; align-items: center; gap: 8px; background: var(--card-bg,#fff); border: 1px solid var(--border,#E5E7EB); border-radius: 8px; padding: 6px 12px; flex: 1; max-width: 340px; }
.search-wrap i  { color: var(--text-secondary,#6B7280); }
.search-wrap input { border: none; outline: none; background: transparent; width: 100%; }

.branch-grid     { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.branch-card     { background: var(--card-bg,#fff); border: 1px solid var(--border,#E5E7EB); border-radius: 12px; padding: 20px; }
.branch-card__header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.branch-card__name   { font-weight: 700; font-size: 1rem; }
.branch-card__addr   { font-size: .82rem; color: var(--text-secondary,#6B7280); margin-top: 2px; }
.branch-card__actions { display: flex; gap: 8px; flex-wrap: wrap; }

/* Modal */
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.modal          { background: var(--card-bg,#fff); border-radius: 16px; width: min(480px, 95vw); box-shadow: 0 20px 60px rgba(0,0,0,.2); }
.modal__header  { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px 0; font-size: 1.1rem; font-weight: 700; }
.modal__close   { background: none; border: none; cursor: pointer; font-size: 1.2rem; color: var(--text-secondary,#6B7280); }
.modal__body    { padding: 20px 24px; display: flex; flex-direction: column; gap: 4px; }
.modal__footer  { padding: 0 24px 24px; display: flex; justify-content: flex-end; gap: 8px; }

/* Drawer */
.drawer-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 900; display: flex; justify-content: flex-end; }
.drawer          { background: var(--card-bg,#fff); width: min(760px, 100vw); height: 100%; display: flex; flex-direction: column; box-shadow: -8px 0 40px rgba(0,0,0,.12); overflow: hidden; }
.drawer__header  { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border,#E5E7EB); }
.drawer__title   { font-size: 1.15rem; font-weight: 700; display: block; }
.drawer__sub     { font-size: .8rem; color: var(--text-secondary,#6B7280); }
.drawer__toolbar { display: flex; align-items: center; gap: 12px; padding: 12px 24px; border-bottom: 1px solid var(--border,#E5E7EB); }
.toggle-label    { display: flex; align-items: center; gap: 6px; font-size: .88rem; cursor: pointer; white-space: nowrap; }

/* Table */
.data-table      { width: 100%; border-collapse: collapse; font-size: .88rem; overflow-y: auto; flex: 1; }
.data-table th   { text-align: left; padding: 10px 16px; background: var(--table-head-bg,#F9FAFB); font-weight: 600; font-size: .75rem; text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid var(--border,#E5E7EB); position: sticky; top: 0; }
.data-table td   { padding: 10px 16px; border-bottom: 1px solid var(--border,#E5E7EB); }
.num   { text-align: right; font-variant-numeric: tabular-nums; }
.mono  { font-family: monospace; font-size: .82rem; }

/* Inline input */
.inline-input { border: 1px solid var(--border,#E5E7EB); border-radius: 6px; padding: 2px 6px; font-size: .85rem; }

/* Tags */
.ps-tag        { display: inline-flex; align-items: center; border-radius: 99px; padding: 2px 10px; font-size: .75rem; font-weight: 600; }
.ps-tag-green  { background: #DCFCE7; color: #15803D; }
.ps-tag-amber  { background: #FEF9C3; color: #92400E; }
.ps-tag-red    { background: #FEE2E2; color: #991B1B; }
.ps-tag-grey   { background: #F3F4F6; color: #6B7280; }

/* Buttons */
.btn-primary        { background: var(--primary,#4F46E5); color: #fff; border: none; border-radius: 8px; padding: 9px 18px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.btn-outline        { background: transparent; border: 1px solid var(--border,#E5E7EB); border-radius: 8px; padding: 9px 18px; font-weight: 600; cursor: pointer; }
.btn-danger-outline { background: transparent; border: 1px solid #FCA5A5; color: #DC2626; border-radius: 8px; padding: 9px 12px; cursor: pointer; }
.btn-sm             { padding: 6px 12px; font-size: .85rem; border-radius: 7px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; }
.btn-xs             { padding: 3px 7px; font-size: .78rem; border-radius: 5px; cursor: pointer; border: 1px solid var(--border,#E5E7EB); background: transparent; display: inline-flex; align-items: center; gap: 3px; }
.btn-ghost          { background: transparent; border: none; }

.form-label { font-size: .85rem; font-weight: 600; color: var(--text-secondary,#374151); }
.form-control { width: 100%; border: 1px solid var(--border,#E5E7EB); border-radius: 8px; padding: 9px 12px; font-size: .9rem; box-sizing: border-box; background: var(--input-bg,#fff); }
.mt-2 { margin-top: 8px; }

.state-msg { text-align: center; padding: 48px 0; color: var(--text-secondary,#6B7280); font-size: .95rem; }
</style>
