<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getProducts, createProduct, deleteProduct, getProductAttrTemplates, saveProductAttrValues } from '../services/tenant.ts'
import { useAuthStore } from '../stores/auth.ts'

defineOptions({ name: 'ProductsView' })

const auth = useAuthStore()

const products  = ref<any[]>([])
const loading   = ref(true)
const search    = ref('')
const openMenuId = ref<number | null>(null)

async function loadProducts() {
  loading.value = true
  try { products.value = await getProducts() }
  catch { products.value = [] }
  finally { loading.value = false }
}
onMounted(async () => {
  await loadProducts()
  await loadTemplates()
})

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return products.value
  return products.value.filter(p =>
    p.productName?.toLowerCase().includes(q) ||
    p.sku?.toLowerCase().includes(q)
  )
})

const page     = ref(1)
const pageSize = ref(10)
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
function goTo(p: number) { if (p >= 1 && p <= totalPages.value) page.value = p }

interface AttrTemplate {
  prodAttrTemplateId: number
  templateId?: number
  fieldName: string
  fieldType: 'text' | 'number' | 'date' | 'boolean'
  isRequired: boolean
}

const templates         = ref<AttrTemplate[]>([])
const templatesLoading  = ref(false)
const attrValues        = ref<Record<number, string | boolean | number>>({})

async function loadTemplates() {
  templatesLoading.value = true
  try { templates.value = await getProductAttrTemplates() }
  catch { templates.value = [] }
  finally { templatesLoading.value = false }
}

const showAdd  = ref(false)
const saving   = ref(false)
const prodForm = ref({
  productName: '',
  sku:         '',
  price:       '',
  quantity:    '',
  description: '',
})

function openAdd() {
  if ((auth.planName === 'Starter Plan' || auth.planName === 'No Plan') && products.value.length >= 10) {
    alert('Free Trial Limit: You can only add up to 10 products. Please upgrade your plan.')
    return
  }
  prodForm.value = { productName: '', sku: '', price: '', quantity: '', description: '' }
  attrValues.value = {}
  showAdd.value = true
}

async function submitProduct() {
  if (!prodForm.value.productName.trim()) return
  saving.value = true
  try {
    const created = await createProduct({
      ...prodForm.value,
      price:    Number(prodForm.value.price)    || 0,
      quantity: Number(prodForm.value.quantity) || 0,
    })

    const productId = created.productId ?? created.id
    if (productId && templates.value.length > 0) {
      const values = templates.value.map(t => ({
        templateId: t.prodAttrTemplateId ?? t.templateId,
        value: String(attrValues.value[t.prodAttrTemplateId ?? t.templateId!] ?? ''),
      }))
      try { await saveProductAttrValues(productId, values) }
      catch { /* non-blocking */ }
    }

    showAdd.value = false
    await loadProducts()
  } catch (err: any) {
    alert('Failed to add product: ' + (err?.response?.data?.message || err.message))
  } finally {
    saving.value = false
  }
}

async function removeProduct(id: number) {
  openMenuId.value = null
  if (!confirm('Delete this product?')) return
  try { await deleteProduct(id) }
  catch (err: any) { alert('Delete failed: ' + (err?.response?.data?.message || err.message)) }
  await loadProducts()
}

const fieldIcon = (type: string) => ({
  text: 'ph ph-text-t',
  number: 'ph ph-hash',
  date: 'ph ph-calendar',
  boolean: 'ph ph-toggle-right',
}[type] || 'ph ph-tag')

const formatPrice = (v: any) =>
  v != null ? `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

const avatarCls = (id: number) => `ps-avatar ps-avatar-${id % 8}`
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Page header -->
    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Products</h1>
        <p class="ps-page-sub">Manage your product catalog — fields adapt to your store type.</p>
      </div>
      <button @click="openAdd" class="ps-btn ps-btn-primary">
        <i class="ph ph-plus"></i> Add Product
      </button>
    </div>

    <!-- Custom-attr banner -->
    <div v-if="templates.length > 0" class="ps-card flex items-start gap-3 p-4 border-blue-200">
      <i class="ph-fill ph-info text-blue-500 text-lg mt-0.5"></i>
      <div class="text-sm text-slate-600 leading-relaxed">
        Your store type has <strong class="text-slate-800">{{ templates.length }} custom field{{ templates.length > 1 ? 's' : '' }}</strong>:
        <em class="font-semibold text-blue-700 not-italic">{{ templates.map(t => t.fieldName).join(', ') }}</em>.
        These appear when adding a product.
      </div>
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
            <input v-model="search" placeholder="Search by name or SKU…" />
          </div>
          <button class="ps-btn ps-btn-primary"><i class="ph ph-funnel"></i> Filter</button>
          <button class="ps-btn ps-btn-dark"><i class="ph ph-download-simple"></i> Export</button>
        </div>
      </div>

      <div v-if="loading" class="p-6 space-y-3">
        <div v-for="i in 5" :key="i" class="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
      <div v-else-if="filtered.length === 0" class="flex flex-col items-center gap-3 py-16 text-slate-400">
        <i class="ph-fill ph-package text-5xl text-slate-200"></i>
        <p class="text-sm">{{ search ? 'No results found.' : 'No products yet.' }}</p>
        <button v-if="!search" @click="openAdd" class="ps-btn ps-btn-primary mt-2">
          <i class="ph ph-plus"></i> Add First Product
        </button>
      </div>
      <table v-else class="ps-table">
        <thead>
          <tr>
            <th style="width: 40px"><input type="checkbox" class="accent-blue-500" /></th>
            <th>ID</th>
            <th>Product</th>
            <th>SKU</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Description</th>
            <th style="width: 50px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in paged" :key="p.productId ?? p.id">
            <td><input type="checkbox" class="accent-blue-500" /></td>
            <td class="text-slate-500 font-medium">#{{ String(p.productId ?? p.id).padStart(5, '0') }}</td>
            <td>
              <div class="flex items-center gap-2.5">
                <div :class="avatarCls(p.productId ?? p.id)">{{ (p.productName || 'P').charAt(0).toUpperCase() }}</div>
                <span class="font-semibold text-slate-800">{{ p.productName }}</span>
              </div>
            </td>
            <td class="text-slate-500 text-xs">{{ p.sku || '—' }}</td>
            <td class="font-bold text-slate-800">{{ formatPrice(p.price) }}</td>
            <td>
              <span :class="['ps-tag', (p.quantity ?? 0) > 0 ? 'ps-tag-green' : 'ps-tag-red']">
                {{ (p.quantity ?? 0).toLocaleString() }}
              </span>
            </td>
            <td class="text-slate-500 text-xs max-w-[260px] truncate">{{ p.description || '—' }}</td>
            <td>
              <button @click="removeProduct(p.productId ?? p.id)"
                class="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all">
                <i class="ph ph-trash"></i>
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

    <!-- Add Product Modal -->
    <Teleport to="body">
      <div v-if="showAdd" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-5"
           @click.self="showAdd = false">
        <div class="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
            <h3 class="text-base font-bold text-slate-900">Add Product</h3>
            <button @click="showAdd = false" class="text-slate-400 hover:text-slate-700 text-xl"><i class="ph ph-x"></i></button>
          </div>
          <div class="p-6">
            <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Basic Information</div>
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-700">Product Name <span class="text-red-500">*</span></label>
                <input v-model="prodForm.productName" placeholder="e.g. Samsung Galaxy S24" class="ps-input" />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-700">SKU / Barcode</label>
                <input v-model="prodForm.sku" placeholder="e.g. SAM-S24-128" class="ps-input" />
              </div>
              <div class="col-span-2 flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-700">Unit Price (₱)</label>
                <input v-model="prodForm.price" type="number" min="0" step="0.01" placeholder="0.00" class="ps-input" />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-700">Stock Quantity</label>
                <input v-model="prodForm.quantity" type="number" min="0" placeholder="0" class="ps-input" />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-700">Description</label>
                <input v-model="prodForm.description" placeholder="Optional short description" class="ps-input" />
              </div>
            </div>

            <template v-if="templates.length > 0">
              <hr class="border-slate-100 my-5" />
              <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <i class="ph ph-sliders text-blue-500"></i> Store-Specific Attributes
              </div>

              <div v-if="templatesLoading" class="text-sm text-slate-400 flex items-center gap-2">
                <i class="ph ph-spinner animate-spin"></i> Loading custom fields…
              </div>

              <div v-else class="grid grid-cols-2 gap-4 bg-blue-50/40 border border-blue-100 rounded-xl p-4">
                <div v-for="tmpl in templates" :key="tmpl.prodAttrTemplateId ?? tmpl.templateId" class="flex flex-col gap-1.5">
                  <label class="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <i :class="[fieldIcon(tmpl.fieldType), 'text-blue-500']"></i>
                    {{ tmpl.fieldName }}
                    <span v-if="tmpl.isRequired" class="text-red-500">*</span>
                  </label>
                  <input v-if="tmpl.fieldType === 'text'"
                    v-model="attrValues[tmpl.prodAttrTemplateId ?? tmpl.templateId!]"
                    :placeholder="`Enter ${tmpl.fieldName}`" class="ps-input" />
                  <input v-else-if="tmpl.fieldType === 'number'"
                    v-model="attrValues[tmpl.prodAttrTemplateId ?? tmpl.templateId!]" type="number"
                    :placeholder="`Enter ${tmpl.fieldName}`" class="ps-input" />
                  <input v-else-if="tmpl.fieldType === 'date'"
                    v-model="attrValues[tmpl.prodAttrTemplateId ?? tmpl.templateId!]" type="date" class="ps-input" />
                  <label v-else-if="tmpl.fieldType === 'boolean'" class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer py-2">
                    <input type="checkbox" v-model="attrValues[tmpl.prodAttrTemplateId ?? tmpl.templateId!]" class="w-4 h-4 accent-blue-500" />
                    <span>{{ tmpl.fieldName }}</span>
                  </label>
                </div>
              </div>
            </template>
          </div>
          <div class="flex justify-end gap-2.5 px-6 pb-6">
            <button @click="showAdd = false" class="ps-btn ps-btn-outline">Cancel</button>
            <button @click="submitProduct" :disabled="saving || !prodForm.productName.trim()" class="ps-btn ps-btn-primary">
              <i :class="saving ? 'ph ph-spinner animate-spin' : 'ph ph-plus'"></i>
              {{ saving ? 'Saving…' : 'Add Product' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
