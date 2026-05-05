<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getProducts, getBranches, transferStock } from '../services/tenant.ts'
import { useToast } from '../composables/useToast.ts'

defineOptions({ name: 'StockTransferView' })

const { toast } = useToast()

interface Product {
  productId:   number
  productName: string
  quantity?:   number
}

interface Branch {
  branchId:   number
  branchName: string
}

const products = ref<Product[]>([])
const branches = ref<Branch[]>([])
const loading  = ref(true)
const search   = ref('')

async function load() {
  loading.value = true
  try {
    const [p, b] = await Promise.all([getProducts(), getBranches()])
    products.value = p
    branches.value = b
  } catch {
    toast('Failed to load data.', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(load)

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return products.value
  return products.value.filter(p => p.productName?.toLowerCase().includes(q))
})

const page     = ref(1)
const pageSize = ref(10)
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
function goTo(p: number) { if (p >= 1 && p <= totalPages.value) page.value = p }

const showModal  = ref(false)
const saving     = ref(false)
const formErr    = ref('')
const form = ref({
  productId:  null as number | null,
  toBranchId: null as number | null,
  quantity:   '',
  note:       '',
})

function openTransfer(product?: Product) {
  form.value = {
    productId:  product?.productId ?? null,
    toBranchId: null,
    quantity:   '',
    note:       '',
  }
  formErr.value = ''
  showModal.value = true
}

const selectedProduct = computed(() =>
  products.value.find(p => p.productId === form.value.productId) ?? null
)

async function submit() {
  formErr.value = ''
  if (!form.value.productId)              { formErr.value = 'Please select a product.'; return }
  if (!form.value.toBranchId)             { formErr.value = 'Please select a destination branch.'; return }
  const qty = Number(form.value.quantity)
  if (!Number.isFinite(qty) || qty <= 0)  { formErr.value = 'Quantity must be greater than zero.'; return }

  const warehouseQty = selectedProduct.value?.quantity ?? 0
  if (qty > warehouseQty) {
    formErr.value = `Only ${warehouseQty.toLocaleString()} units available in warehouse.`
    return
  }

  saving.value = true
  try {
    await transferStock({
      productId:  form.value.productId,
      quantity:   qty,
      toBranchId: form.value.toBranchId,
      note:       form.value.note.trim() || undefined,
    })
    toast('Stock transferred successfully.')
    showModal.value = false
    await load()
  } catch (e: any) {
    const d = e?.response?.data
    formErr.value = d?.message ?? `Transfer failed. (${e?.response?.status ?? 'network error'})`
  } finally {
    saving.value = false
  }
}

const avatarCls = (id: number) => `ps-avatar ps-avatar-${id % 8}`
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Page header -->
    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Stock Transfer</h1>
        <p class="ps-page-sub">Move stock from the central warehouse to a specific branch.</p>
      </div>
    </div>

    <!-- Datatable card -->
    <div class="ps-card overflow-hidden">

      <div class="ps-table-toolbar">
        <div>
          <div class="ps-table-title">Warehouse Stock</div>
          <div class="ps-table-subtitle">{{ filtered.length }} product{{ filtered.length !== 1 ? 's' : '' }}</div>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <div class="ps-search">
            <i class="ph ph-magnifying-glass"></i>
            <input v-model="search" placeholder="Search by name…" @input="page = 1" />
          </div>
        </div>
      </div>

      <div v-if="loading" class="p-6 space-y-3">
        <div v-for="i in 5" :key="i" class="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
      <div v-else-if="filtered.length === 0" class="flex flex-col items-center gap-3 py-16 text-slate-400">
        <i class="ph-fill ph-arrows-left-right text-5xl text-slate-200"></i>
        <p class="text-sm">{{ search ? 'No results found.' : 'No products yet.' }}</p>
      </div>
      <table v-else class="ps-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Product</th>
            <th>Warehouse Stock</th>
            <th style="width: 160px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in paged" :key="p.productId">
            <td class="text-slate-500 font-medium">#{{ String(p.productId).padStart(5, '0') }}</td>
            <td>
              <div class="flex items-center gap-2.5">
                <div :class="avatarCls(p.productId)">{{ (p.productName || 'P').charAt(0).toUpperCase() }}</div>
                <span class="font-semibold text-slate-800">{{ p.productName }}</span>
              </div>
            </td>
            <td>
              <span :class="['ps-tag', (p.quantity ?? 0) > 0 ? 'ps-tag-green' : 'ps-tag-red']">
                {{ (p.quantity ?? 0).toLocaleString() }}
              </span>
            </td>
            <td>
              <button
                @click="openTransfer(p)"
                :disabled="(p.quantity ?? 0) <= 0"
                class="ps-btn ps-btn-primary"
                style="padding: 6px 14px; font-size: 12px;"
                :title="(p.quantity ?? 0) <= 0 ? 'No warehouse stock to transfer' : ''"
              >
                <i class="ph ph-arrows-left-right"></i> Transfer
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="!loading && filtered.length > 0" class="ps-pagination">
        <button class="ps-pg-btn" :disabled="page === 1" @click="goTo(1)"><i class="ph ph-caret-double-left"></i></button>
        <button class="ps-pg-btn" :disabled="page === 1" @click="goTo(page - 1)"><i class="ph ph-caret-left"></i></button>
        <button v-for="pg in totalPages" :key="pg" :class="['ps-pg-btn', pg === page && 'ps-pg-btn--active']" @click="goTo(pg)">{{ pg }}</button>
        <button class="ps-pg-btn" :disabled="page === totalPages" @click="goTo(page + 1)"><i class="ph ph-caret-right"></i></button>
        <button class="ps-pg-btn" :disabled="page === totalPages" @click="goTo(totalPages)"><i class="ph ph-caret-double-right"></i></button>
        <span class="ps-pg-info">Showing {{ (page - 1) * pageSize + 1 }} to {{ Math.min(page * pageSize, filtered.length) }} of {{ filtered.length }}</span>
        <select v-model="pageSize" class="ps-pg-size" @change="page = 1">
          <option :value="10">10</option><option :value="25">25</option><option :value="50">50</option>
        </select>
      </div>
    </div>

    <!-- Transfer Modal -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showModal" class="ps-modal-backdrop" @click.self="showModal = false">
          <div class="ps-modal-card" style="max-width: 480px">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">Transfer Stock</h3>
              <button class="ps-modal-close" @click="showModal = false" aria-label="Close">
                <i class="ph ph-x"></i>
              </button>
            </div>
            <div class="ps-modal-body">

              <div>
                <label class="ps-label">Product <span class="text-red-500">*</span></label>
                <select v-model="form.productId" class="ps-input">
                  <option :value="null" disabled>Select a product…</option>
                  <option v-for="p in products" :key="p.productId" :value="p.productId">
                    {{ p.productName }}
                  </option>
                </select>
                <div v-if="selectedProduct" class="mt-1.5 text-xs text-slate-500">
                  Warehouse stock:
                  <strong class="text-slate-700">{{ (selectedProduct.quantity ?? 0).toLocaleString() }}</strong>
                </div>
              </div>

              <div>
                <label class="ps-label">Destination Branch <span class="text-red-500">*</span></label>
                <select v-model="form.toBranchId" class="ps-input">
                  <option :value="null" disabled>Select a branch…</option>
                  <option v-for="b in branches" :key="b.branchId" :value="b.branchId">{{ b.branchName }}</option>
                </select>
                <div v-if="branches.length === 0" class="mt-1 text-xs text-amber-600">
                  No branches yet. Create a branch first.
                </div>
              </div>

              <div>
                <label class="ps-label">Quantity <span class="text-red-500">*</span></label>
                <input v-model="form.quantity" type="number" min="1" step="1" placeholder="0" class="ps-input" />
              </div>

              <div>
                <label class="ps-label">Note</label>
                <input v-model="form.note" placeholder="Optional note…" class="ps-input" />
              </div>

              <div v-if="formErr" class="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {{ formErr }}
              </div>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="showModal = false">Cancel</button>
              <button class="ps-btn ps-btn-primary" :disabled="saving" @click="submit">
                <i :class="saving ? 'ph ph-spinner animate-spin' : 'ph ph-arrows-left-right'"></i>
                {{ saving ? 'Transferring…' : 'Transfer' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
