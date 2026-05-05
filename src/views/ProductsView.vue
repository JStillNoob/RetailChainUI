<script setup lang="ts">
import { useConfirm } from '../composables/useConfirm'
import { ref, onMounted, computed } from 'vue'
import { getProducts, createProduct, deleteProduct, getProductAttrTemplates, saveProductAttrValues, getResources } from '../services/tenant.ts'
import { useAuthStore } from '../stores/auth.ts'

defineOptions({ name: 'ProductsView' })

const { confirmDialog } = useConfirm()
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

interface Resource { resourceId: number; name: string; description: string | null }
const resources        = ref<Resource[]>([])
const resourceSearch   = ref('')

async function loadResources() {
  try { resources.value = await getResources() }
  catch { resources.value = [] }
}

const filteredResources = computed(() => {
  const q = resourceSearch.value.toLowerCase()
  if (!q) return resources.value
  return resources.value.filter(r => r.name.toLowerCase().includes(q))
})

onMounted(async () => {
  await Promise.all([loadProducts(), loadTemplates(), loadResources()])
})

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
const formErr  = ref('')
const prodForm = ref({
  resourceId:  0,
  price:       '',
  markPercent: '',
})

function openAdd() {
  if ((auth.planName === 'Starter Plan' || auth.planName === 'No Plan') && products.value.length >= 10) {
    alert('Free Trial Limit: You can only add up to 10 products. Please upgrade your plan.')
    return
  }
  prodForm.value = { resourceId: 0, price: '', markPercent: '' }
  attrValues.value = {}
  resourceSearch.value = ''
  formErr.value = ''
  showAdd.value = true
}

async function submitProduct() {
  formErr.value = ''
  if (!prodForm.value.resourceId) { formErr.value = 'Please select a resource.'; return }
  saving.value = true
  try {
    const created = await createProduct({
      resourceId:  prodForm.value.resourceId,
      price:       Number(prodForm.value.price) || 0,
      markPercent: Number(prodForm.value.markPercent) || 0,
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
    formErr.value = 'Failed to add product: ' + (err?.response?.data?.message || err.message)
  } finally {
    saving.value = false
  }
}

async function removeProduct(id: number) {
  openMenuId.value = null
  if (!await confirmDialog('Delete this product?')) return
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
            <input v-model="search" placeholder="Search by name…" />
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
            <th>Markup %</th>
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
            <td class="text-slate-500 text-xs">{{ p.markPercent != null ? p.markPercent + '%' : '—' }}</td>
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
      <Transition name="ps-modal">
        <div v-if="showAdd" class="ps-modal-backdrop" @click.self="showAdd = false">
          <div class="ps-modal-card" style="max-width: 640px">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">Add Product</h3>
              <button class="ps-modal-close" @click="showAdd = false" aria-label="Close">
                <i class="ph ph-x"></i>
              </button>
            </div>
            <div class="ps-modal-body">
              <div>
                <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Basic Information</div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="col-span-2">
                    <label class="ps-label">Resource <span class="text-red-500">*</span></label>
                    <input v-model="resourceSearch" placeholder="Search resources…" class="ps-input mb-1.5" />
                    <select v-model="prodForm.resourceId" class="ps-input">
                      <option :value="0" disabled>— select a resource —</option>
                      <option v-for="r in filteredResources" :key="r.resourceId" :value="r.resourceId">
                        {{ r.name }}{{ r.description ? ` — ${r.description}` : '' }}
                      </option>
                    </select>
                    <p v-if="resources.length === 0" class="text-xs text-amber-600 mt-1">
                      No resources found. <a href="/dashboard/resources" class="underline">Add resources first</a>.
                    </p>
                  </div>
                  <div>
                    <label class="ps-label">Unit Price (₱)</label>
                    <input v-model="prodForm.price" type="number" min="0" step="0.01" placeholder="0.00" class="ps-input" />
                  </div>
                  <div>
                    <label class="ps-label">Markup %</label>
                    <input v-model="prodForm.markPercent" type="number" min="0" step="0.01" placeholder="0.00" class="ps-input" />
                  </div>
                </div>
              </div>

              <template v-if="templates.length > 0">
                <div>
                  <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <i class="ph ph-sliders text-blue-500"></i> Store-Specific Attributes
                  </div>

                  <div v-if="templatesLoading" class="text-sm text-slate-400 flex items-center gap-2">
                    <i class="ph ph-spinner animate-spin"></i> Loading custom fields…
                  </div>

                  <div v-else class="grid grid-cols-2 gap-3 bg-blue-50/40 border border-blue-100 rounded-lg p-4">
                    <div v-for="tmpl in templates" :key="tmpl.prodAttrTemplateId ?? tmpl.templateId">
                      <label class="ps-label flex items-center gap-1">
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
                </div>
              </template>
              <div v-if="formErr" class="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {{ formErr }}
              </div>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="showAdd = false">Cancel</button>
              <button class="ps-btn ps-btn-primary" :disabled="saving || !prodForm.resourceId" @click="submitProduct">
                <i :class="saving ? 'ph ph-spinner animate-spin' : 'ph ph-plus'"></i>
                {{ saving ? 'Saving…' : 'Add Product' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
