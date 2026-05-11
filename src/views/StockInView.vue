<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getProducts, getSuppliers, stockIn } from '../services/tenant.ts'
import { useToast } from '../composables/useToast.ts'
import PsPagination from '../components/PsPagination.vue'

defineOptions({ name: 'StockInView' })

const { toast } = useToast()

interface Product {
  productId:   number
  productName: string
  markPercent?: number
  price?:      number
  quantity?:   number
}

interface Supplier {
  supplierId: number
  name: string
}

const products  = ref<Product[]>([])
const suppliers = ref<Supplier[]>([])
const loading   = ref(true)
const search    = ref('')

async function loadProducts() {
  loading.value = true
  try { products.value = await getProducts() }
  catch { products.value = []; toast('Failed to load products.', 'error') }
  finally { loading.value = false }
}

async function loadSuppliers() {
  try { suppliers.value = await getSuppliers() }
  catch { suppliers.value = [] }
}

onMounted(async () => {
  await Promise.all([loadProducts(), loadSuppliers()])
})

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return products.value
  return products.value.filter(p =>
    p.productName?.toLowerCase().includes(q)
  )
})

const page     = ref(1)
const pageSize = ref(10)
const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))

const showAdd  = ref(false)
const saving   = ref(false)
const addErr   = ref('')
const today    = () => new Date().toISOString().slice(0, 10)
const form     = ref({
  productId:  null as number | null,
  quantity:   '',
  costPrice:  '',
  date:       today(),
  supplierId: null as number | null,
  notes:      '',
})

function openAdd(product?: Product) {
  form.value = {
    productId:  product?.productId ?? null,
    quantity:   '',
    costPrice:  '',
    date:       today(),
    supplierId: null,
    notes:      '',
  }
  addErr.value = ''
  showAdd.value = true
}

const selectedProduct = computed(() =>
  products.value.find(p => p.productId === form.value.productId) ?? null
)

function buildNote() {
  const parts: string[] = []
  if (form.value.date) parts.push(`Date: ${form.value.date}`)
  if (form.value.supplierId) {
    const s = suppliers.value.find(x => x.supplierId === form.value.supplierId)
    if (s) parts.push(`Supplier: ${s.name}`)
  }
  if (form.value.notes.trim()) parts.push(`Notes: ${form.value.notes.trim()}`)
  return parts.join('; ') || undefined
}

async function submit() {
  addErr.value = ''
  if (!form.value.productId)              { addErr.value = 'Please choose a product.';   return }
  const qty = Number(form.value.quantity)
  if (!Number.isFinite(qty) || qty <= 0)  { addErr.value = 'Quantity must be greater than zero.'; return }

  const cost = Number(form.value.costPrice)
  saving.value = true
  try {
    await stockIn({
      productId: form.value.productId,
      quantity: qty,
      costPrice: Number.isFinite(cost) && cost >= 0 ? cost : 0,
      note: buildNote(),
    })
    toast('Stock added.')
    showAdd.value = false
    await loadProducts()
  } catch (e: any) {
    const d = e?.response?.data
    addErr.value = d?.message ?? d?.title ?? `Failed to add stock. (${e?.response?.status ?? 'network error'})${d?.detail ? ': ' + d.detail : ''}`
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
        <h1 class="ps-page-title">Stock In</h1>
        <p class="ps-page-sub">Receive stock into the central warehouse. Use Stock Transfer to send items to specific branches.</p>
      </div>
      <button @click="openAdd()" class="ps-btn ps-btn-primary">
        <i class="ph ph-plus"></i> Add Stock
      </button>
    </div>

    <!-- Datatable card -->
    <div class="ps-card overflow-hidden">

      <div class="ps-table-toolbar">
        <div>
          <div class="ps-table-title">Products</div>
          <div class="ps-table-subtitle">{{ filtered.length }} product{{ filtered.length !== 1 ? 's' : '' }}</div>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <div class="ps-search">
            <i class="ph ph-magnifying-glass"></i>
            <input v-model="search" placeholder="Search by name…" />
          </div>
        </div>
      </div>

      <div v-if="loading" class="p-6 space-y-3">
        <div v-for="i in 5" :key="i" class="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
      <div v-else-if="filtered.length === 0" class="flex flex-col items-center gap-3 py-16 text-slate-400">
        <i class="ph-fill ph-package text-5xl text-slate-200"></i>
        <p class="text-sm">{{ search ? 'No results found.' : 'No products yet — add some in the Catalog first.' }}</p>
      </div>
      <table v-else class="ps-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Product</th>
            <th>Current Stock</th>
            <th style="width: 140px"></th>
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
              <button @click="openAdd(p)" class="ps-btn ps-btn-primary" style="padding: 6px 14px; font-size: 12px;">
                <i class="ph ph-plus"></i> Add Stock
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <PsPagination
        v-if="!loading"
        v-model:page="page"
        v-model:pageSize="pageSize"
        :total="filtered.length"
        record-label="batches"
      />
    </div>

    <!-- Add Stock Modal -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showAdd" class="ps-modal-backdrop" @click.self="showAdd = false">
          <div class="ps-modal-card" style="max-width: 520px">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">Add Stock</h3>
              <button class="ps-modal-close" @click="showAdd = false" aria-label="Close">
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
                  Current stock:
                  <strong class="text-slate-700">{{ (selectedProduct.quantity ?? 0).toLocaleString() }}</strong>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="ps-label">Quantity <span class="text-red-500">*</span></label>
                  <input v-model="form.quantity" type="number" min="1" step="1" placeholder="0" class="ps-input" />
                </div>
                <div>
                  <label class="ps-label">Cost Price (₱)</label>
                  <input v-model="form.costPrice" type="number" min="0" step="0.01" placeholder="0.00" class="ps-input" />
                </div>
              </div>

              <div>
                <label class="ps-label">Date</label>
                <input v-model="form.date" type="date" class="ps-input" />
              </div>

              <div>
                <label class="ps-label">Supplier</label>
                <select v-model="form.supplierId" class="ps-input">
                  <option :value="null">—  None / Not specified  —</option>
                  <option v-for="s in suppliers" :key="s.supplierId" :value="s.supplierId">{{ s.name }}</option>
                </select>
              </div>

              <div>
                <label class="ps-label">Notes</label>
                <input v-model="form.notes" placeholder="Optional notes…" class="ps-input" />
              </div>

              <div v-if="addErr" class="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {{ addErr }}
              </div>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="showAdd = false">Cancel</button>
              <button class="ps-btn ps-btn-primary" :disabled="saving" @click="submit">
                <i :class="saving ? 'ph ph-spinner animate-spin' : 'ph ph-plus'"></i>
                {{ saving ? 'Saving…' : 'Save Stock In' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
