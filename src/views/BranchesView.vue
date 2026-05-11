<script setup lang="ts">
/**
 * BranchesView — entry list for branch management.
 * Each card shows summary stats and routes into a per-branch workspace.
 * Flow: Sidebar → Branches → Select Branch → Branch Workspace
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  getBranches, createBranch, updateBranch, deleteBranch,
  getBranchStockOverview,
} from '../services/tenant.ts'
import api from '../services/api.ts'
import { useToast } from '../composables/useToast.ts'
import { useConfirm } from '../composables/useConfirm'

defineOptions({ name: 'BranchesView' })

const router = useRouter()
const { confirmDialog } = useConfirm()
const { toast } = useToast()

// ── Branch list ──────────────────────────────────────────────────────────────
const branches  = ref<any[]>([])
const overview  = ref<any[]>([])
const todayMap  = ref<Map<number, { count: number; total: number }>>(new Map())
const loading   = ref(true)
const search    = ref('')

async function loadAll() {
  loading.value = true
  try {
    const [list, ov] = await Promise.all([getBranches(), getBranchStockOverview()])
    branches.value = list
    overview.value = ov

    // Fetch today's sales per branch in parallel
    const today = new Date().toISOString().slice(0, 10)
    const m = new Map<number, { count: number; total: number }>()
    await Promise.all(list.map(async (b: any) => {
      try {
        const r = await api.get('/cashier/sales/all', {
          params: { branchId: b.branchId, date: today, page: 1, pageSize: 200 },
        }).then(rr => rr.data)
        const total = (r.items ?? []).reduce((s: number, x: any) => s + Number(x.totalAmount ?? 0), 0)
        m.set(b.branchId, { count: r.total ?? 0, total })
      } catch {
        m.set(b.branchId, { count: 0, total: 0 })
      }
    }))
    todayMap.value = m
  } catch { toast('Failed to load branches.', 'error') }
  finally { loading.value = false }
}
onMounted(loadAll)

const enriched = computed(() => {
  return branches.value.map((b: any) => {
    const ov = overview.value.find((o: any) => o.branchId === b.branchId) ?? {}
    const today = todayMap.value.get(b.branchId) ?? { count: 0, total: 0 }
    return {
      ...b,
      totalProducts: ov.totalProducts ?? 0,
      totalStock:    ov.totalStock ?? 0,
      lowStockCount: ov.lowStockCount ?? 0,
      outOfStock:    ov.outOfStock ?? 0,
      todayCount:    today.count,
      todayTotal:    today.total,
    }
  })
})

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return q
    ? enriched.value.filter(b => b.branchName?.toLowerCase().includes(q) || b.address?.toLowerCase().includes(q))
    : enriched.value
})

// ── Navigation ──────────────────────────────────────────────────────────────
function viewBranch(b: any)   { router.push({ name: 'branch-workspace', params: { branchId: String(b.branchId) } }) }
function openCashier(b: any)  { router.push({ name: 'pos', query: { branchId: String(b.branchId) } }) }

// ── Create / Edit branch modal ───────────────────────────────────────────────
const showForm   = ref(false)
const editId     = ref<number | null>(null)
const formName   = ref('')
const formAddr   = ref('')
const formStatus = ref('Active')
const saving     = ref(false)

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
    await loadAll()
  } catch (e: any) {
    toast(e?.response?.data?.message ?? 'Failed to save branch.', 'error')
  } finally { saving.value = false }
}

async function removeBranch(b: any) {
  if (!await confirmDialog(`Delete branch "${b.branchName}"? This cannot be undone.`)) return
  try {
    await deleteBranch(b.branchId)
    toast('Branch deleted.')
    await loadAll()
  } catch { toast('Failed to delete branch.', 'error') }
}

const fmtPeso = (n: number) => '₱' + Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Aggregate KPI across all branches
const kpiBranches  = computed(() => filtered.value.length)
const kpiProducts  = computed(() => filtered.value.reduce((s, b) => s + (b.totalProducts ?? 0), 0))
const kpiLowStock  = computed(() => filtered.value.reduce((s, b) => s + (b.lowStockCount ?? 0), 0))
const kpiTodaySales= computed(() => filtered.value.reduce((s, b) => s + (b.todayTotal ?? 0), 0))
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- ══ Header ══════════════════════════════════════════════════════════ -->
    <div class="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Branches</h1>
        <p class="text-sm text-slate-500">Select a branch to open its workspace and manage inventory, cashier, sales and staff.</p>
      </div>
      <div class="flex gap-2">
        <button @click="loadAll" :disabled="loading" class="ps-btn ps-btn-outline">
          <i class="ph ph-arrows-clockwise" :class="{ 'animate-spin': loading }"></i> Refresh
        </button>
        <button class="ps-btn ps-btn-primary" @click="openCreate">
          <i class="ph ph-plus"></i> Add Branch
        </button>
      </div>
    </div>

    <!-- ══ Aggregate KPI bar ════════════════════════════════════════════════ -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-xs uppercase tracking-wider font-semibold text-slate-400">Branches</div>
        <div class="text-2xl font-extrabold text-slate-800 mt-1">{{ kpiBranches }}</div>
      </div>
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-xs uppercase tracking-wider font-semibold text-slate-400">Total Products</div>
        <div class="text-2xl font-extrabold text-slate-800 mt-1">{{ kpiProducts.toLocaleString() }}</div>
      </div>
      <div class="bg-white border border-amber-200 rounded-xl p-4">
        <div class="text-xs uppercase tracking-wider font-semibold text-amber-600">Low Stock Items</div>
        <div class="text-2xl font-extrabold text-amber-700 mt-1">{{ kpiLowStock }}</div>
      </div>
      <div class="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl p-4">
        <div class="text-xs uppercase tracking-wider font-semibold opacity-80">Today's Sales (All)</div>
        <div class="text-2xl font-extrabold mt-1">{{ fmtPeso(kpiTodaySales) }}</div>
      </div>
    </div>

    <!-- ══ Toolbar ════════════════════════════════════════════════════════════ -->
    <div class="ps-search" style="max-width:340px">
      <i class="ph ph-magnifying-glass"></i>
      <input v-model="search" placeholder="Search branches…" />
    </div>

    <!-- ══ Branch cards ═══════════════════════════════════════════════════════ -->
    <div v-if="loading" class="py-12 text-center text-slate-400">Loading…</div>
    <div v-else-if="filtered.length === 0" class="py-12 text-center text-slate-400">No branches found.</div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="b in filtered" :key="b.branchId"
        class="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg transition-shadow flex flex-col">

        <!-- Card header -->
        <div class="flex items-start justify-between gap-2 mb-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <div class="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <i class="ph-fill ph-storefront text-lg text-indigo-600"></i>
              </div>
              <h3 class="font-bold text-slate-800 truncate">{{ b.branchName }}</h3>
            </div>
            <p class="text-xs text-slate-500 mt-1.5 ml-11 line-clamp-1">{{ b.address || 'No address' }}</p>
          </div>
          <span class="px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
            :class="b.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'">
            {{ b.status }}
          </span>
        </div>

        <!-- Stats grid -->
        <div class="grid grid-cols-4 gap-2 my-3 text-center">
          <div class="bg-slate-50 rounded-lg py-2">
            <div class="text-base font-extrabold text-slate-800">{{ b.totalProducts }}</div>
            <div class="text-[10px] uppercase tracking-wide text-slate-500">Products</div>
          </div>
          <div class="bg-slate-50 rounded-lg py-2">
            <div class="text-base font-extrabold text-slate-800">{{ b.totalStock }}</div>
            <div class="text-[10px] uppercase tracking-wide text-slate-500">Stock</div>
          </div>
          <div class="rounded-lg py-2" :class="b.lowStockCount > 0 ? 'bg-amber-50' : 'bg-slate-50'">
            <div class="text-base font-extrabold" :class="b.lowStockCount > 0 ? 'text-amber-700' : 'text-slate-800'">{{ b.lowStockCount }}</div>
            <div class="text-[10px] uppercase tracking-wide" :class="b.lowStockCount > 0 ? 'text-amber-700' : 'text-slate-500'">Low</div>
          </div>
          <div class="rounded-lg py-2" :class="b.outOfStock > 0 ? 'bg-red-50' : 'bg-slate-50'">
            <div class="text-base font-extrabold" :class="b.outOfStock > 0 ? 'text-red-700' : 'text-slate-800'">{{ b.outOfStock }}</div>
            <div class="text-[10px] uppercase tracking-wide" :class="b.outOfStock > 0 ? 'text-red-700' : 'text-slate-500'">Out</div>
          </div>
        </div>

        <!-- Today's sales pill -->
        <div class="flex items-center justify-between bg-indigo-50 rounded-lg px-3 py-2 mb-4">
          <div class="flex items-center gap-2">
            <i class="ph ph-receipt text-indigo-600"></i>
            <span class="text-xs text-slate-500">Today's Sales</span>
          </div>
          <div class="text-right">
            <div class="font-extrabold text-indigo-700 text-sm">{{ fmtPeso(b.todayTotal) }}</div>
            <div class="text-[10px] text-slate-500">{{ b.todayCount }} tx</div>
          </div>
        </div>

        <!-- Primary actions -->
        <div class="grid grid-cols-2 gap-2 mt-auto">
          <button @click="viewBranch(b)" class="ps-btn ps-btn-primary justify-center">
            <i class="ph ph-arrow-right"></i> View Branch
          </button>
          <button @click="openCashier(b)" class="ps-btn ps-btn-outline justify-center">
            <i class="ph ph-cash-register"></i> Open Cashier
          </button>
        </div>

        <!-- Secondary admin actions -->
        <div class="flex gap-2 mt-2 text-xs">
          <button @click="openEdit(b)" class="text-slate-500 hover:text-blue-600 inline-flex items-center gap-1">
            <i class="ph ph-pencil-simple"></i> Edit
          </button>
          <span class="text-slate-300">·</span>
          <button @click="removeBranch(b)" class="text-slate-500 hover:text-red-600 inline-flex items-center gap-1">
            <i class="ph ph-trash"></i> Delete
          </button>
        </div>
      </div>
    </div>

    <!-- ══ Create / Edit Modal ═════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showForm" class="ps-modal-backdrop" @click.self="closeForm">
          <div class="ps-modal-card" style="max-width:460px">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">{{ editId ? 'Edit Branch' : 'New Branch' }}</h3>
              <button class="ps-modal-close" @click="closeForm"><i class="ph ph-x"></i></button>
            </div>
            <div class="ps-modal-body">
              <div>
                <label for="b-name" class="ps-label">Branch Name *</label>
                <input id="b-name" v-model="formName" class="ps-input" placeholder="e.g. Matina Branch" />
              </div>
              <div>
                <label for="b-addr" class="ps-label">Address</label>
                <input id="b-addr" v-model="formAddr" class="ps-input" placeholder="e.g. MacArthur Hwy" />
              </div>
              <div v-if="editId">
                <label for="b-status" class="ps-label">Status</label>
                <select id="b-status" v-model="formStatus" class="ps-input">
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="closeForm">Cancel</button>
              <button class="ps-btn ps-btn-primary" :disabled="saving" @click="saveBranch">
                {{ saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Branch' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>
