<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '../services/api.ts'
import { useAuthStore } from '../stores/auth.ts'
import { useToast } from '../composables/useToast.ts'

defineOptions({ name: 'SuppliersView' })

const { toast } = useToast()
const auth      = useAuthStore()

const BASE = computed(() =>
  auth.roleTypeName === 'TenantAdmin' ? '/tenant/suppliers' : '/procurement/suppliers'
)

const suppliers    = ref<any[]>([])
const loading      = ref(true)
const search       = ref('')
const statusFilter = ref('Active')
const openMenuId   = ref<number | null>(null)

async function load() {
  loading.value = true
  try {
    const params: Record<string, string> = { status: statusFilter.value || '' }
    if (search.value) params.search = search.value
    suppliers.value = await api.get(BASE.value, { params }).then(r => r.data)
  } catch {
    toast('Failed to load suppliers.', 'error')
  } finally { loading.value = false }
}
onMounted(load)

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return suppliers.value
  return suppliers.value.filter(s =>
    s.name?.toLowerCase().includes(q) ||
    s.email?.toLowerCase().includes(q) ||
    s.city?.toLowerCase().includes(q)
  )
})

const page     = ref(1)
const pageSize = ref(10)
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
function goTo(p: number) { if (p >= 1 && p <= totalPages.value) page.value = p }

const showModal = ref(false)
const isEdit    = ref(false)
const editId    = ref<number | null>(null)
const saving    = ref(false)
const formErr   = ref('')
const form      = ref({ name: '', contactFirstName: '', contactLastName: '', email: '', phone: '', street: '', city: '', province: '', zipCode: '', rating: '' })

function openAdd() {
  isEdit.value = false; editId.value = null
  form.value   = { name: '', contactFirstName: '', contactLastName: '', email: '', phone: '', street: '', city: '', province: '', zipCode: '', rating: '' }
  formErr.value = ''; showModal.value = true
}

async function openEdit(s: any) {
  openMenuId.value = null
  isEdit.value = true; editId.value = s.supplierId; formErr.value = ''
  try {
    const detail = await api.get(`${BASE.value}/${s.supplierId}`).then(r => r.data)
    form.value = { name: detail.name ?? '', contactFirstName: detail.contactFirstName ?? '', contactLastName: detail.contactLastName ?? '', email: detail.email ?? '', phone: detail.phone ?? '', street: detail.street ?? '', city: detail.city ?? '', province: detail.province ?? '', zipCode: detail.zipCode ?? '', rating: detail.rating != null ? String(detail.rating) : '' }
  } catch {
    form.value = { ...s, contactFirstName: '', contactLastName: '', street: '', province: '', zipCode: '', rating: s.rating != null ? String(s.rating) : '' }
  }
  showModal.value = true
}

async function save() {
  formErr.value = ''
  if (!form.value.name.trim()) { formErr.value = 'Supplier name is required.'; return }
  saving.value = true
  try {
    const payload = { ...form.value, rating: form.value.rating ? parseFloat(form.value.rating) : null }
    if (isEdit.value) { await api.put(`${BASE.value}/${editId.value}`, payload); toast('Supplier updated.') }
    else              { await api.post(BASE.value, payload); toast('Supplier created.') }
    showModal.value = false; await load()
  } catch (e: any) {
    formErr.value = e.response?.data?.message ?? 'Save failed.'
  } finally { saving.value = false }
}

async function deactivate(s: any) {
  openMenuId.value = null
  if (!confirm(`Deactivate "${s.name}"?`)) return
  try { await api.delete(`${BASE.value}/${s.supplierId}`); toast('Supplier deactivated.'); await load() }
  catch { toast('Failed to deactivate supplier.', 'error') }
}

const stars = (r: number | null) => { const n = Math.round(r ?? 0); return { filled: n, empty: 5 - n } }
const avatarCls = (id: number) => `ps-avatar ps-avatar-${id % 8}`
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Page header -->
    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Suppliers</h1>
        <p class="ps-page-sub">Manage your procurement partner network.</p>
      </div>
      <button @click="openAdd" class="ps-btn ps-btn-primary">
        <i class="ph ph-plus"></i> Add Supplier
      </button>
    </div>

    <!-- Datatable card -->
    <div class="ps-card overflow-hidden">

      <div class="ps-table-toolbar">
        <div>
          <div class="ps-table-title">Suppliers</div>
          <div class="ps-table-subtitle">{{ filtered.length }} supplier{{ filtered.length !== 1 ? 's' : '' }}</div>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <div class="ps-search">
            <i class="ph ph-magnifying-glass"></i>
            <input v-model="search" placeholder="Search…" @input="load" />
          </div>
          <select v-model="statusFilter" @change="load" class="ps-pg-size" style="padding: 9px 14px;">
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <button class="ps-btn ps-btn-primary"><i class="ph ph-funnel"></i> Filter</button>
          <button class="ps-btn ps-btn-dark"><i class="ph ph-download-simple"></i> Export</button>
        </div>
      </div>

      <div v-if="loading" class="p-6 space-y-3">
        <div v-for="i in 5" :key="i" class="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
      <div v-else-if="filtered.length === 0" class="flex flex-col items-center gap-3 py-16 text-slate-400">
        <i class="ph-fill ph-users-three text-5xl text-slate-200"></i>
        <p class="text-sm">No suppliers found.</p>
      </div>
      <table v-else class="ps-table">
        <thead>
          <tr>
            <th style="width: 40px"><input type="checkbox" class="accent-blue-500" /></th>
            <th>ID</th>
            <th>Supplier</th>
            <th>Contact</th>
            <th>Email / Phone</th>
            <th>City</th>
            <th>Rating</th>
            <th>Status</th>
            <th style="width: 50px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in paged" :key="s.supplierId">
            <td><input type="checkbox" class="accent-blue-500" /></td>
            <td class="text-slate-500 font-medium">#{{ String(s.supplierId).padStart(5, '0') }}</td>
            <td>
              <div class="flex items-center gap-2.5">
                <div :class="avatarCls(s.supplierId)">{{ (s.name ?? 'S').charAt(0).toUpperCase() }}</div>
                <span class="font-semibold text-slate-800">{{ s.name }}</span>
              </div>
            </td>
            <td class="text-slate-500">{{ s.contactName?.trim() || '—' }}</td>
            <td>
              <div class="text-slate-700">{{ s.email || '—' }}</div>
              <div class="text-slate-400 text-xs">{{ s.phone || '' }}</div>
            </td>
            <td class="text-slate-500">{{ s.city || '—' }}</td>
            <td>
              <div class="flex items-center gap-0.5">
                <i v-for="n in stars(s.rating).filled" :key="'f'+n" class="ph-fill ph-star text-amber-400 text-xs"></i>
                <i v-for="n in stars(s.rating).empty"  :key="'e'+n" class="ph ph-star text-slate-200 text-xs"></i>
                <span class="text-xs text-slate-400 ml-1 font-semibold">{{ s.rating != null ? Number(s.rating).toFixed(1) : '—' }}</span>
              </div>
            </td>
            <td>
              <span :class="['ps-tag', s.status === 'Active' ? 'ps-tag-green' : 'ps-tag-slate']">
                {{ s.status }}
              </span>
            </td>
            <td>
              <div class="relative">
                <button @click="openMenuId = openMenuId === s.supplierId ? null : s.supplierId"
                  class="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all">
                  <i class="ph ph-dots-three"></i>
                </button>
                <div v-if="openMenuId === s.supplierId"
                  class="absolute right-0 top-9 z-10 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 text-sm">
                  <button @click="openEdit(s)"
                    class="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                    <i class="ph ph-pencil-simple text-slate-400"></i> Edit
                  </button>
                  <button v-if="s.status === 'Active'" @click="deactivate(s)"
                    class="w-full text-left px-3.5 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2">
                    <i class="ph ph-x-circle"></i> Deactivate
                  </button>
                </div>
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
        <span class="ps-pg-info">Showing {{ (page - 1) * pageSize + 1 }} to {{ Math.min(page * pageSize, filtered.length) }} of {{ filtered.length }} suppliers</span>
        <select v-model="pageSize" class="ps-pg-size" @change="page = 1">
          <option :value="10">10</option><option :value="25">25</option><option :value="50">50</option>
        </select>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showModal" class="ps-modal-backdrop" @click.self="showModal = false">
          <div class="ps-modal-card" style="max-width: 640px">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">{{ isEdit ? 'Edit Supplier' : 'Add Supplier' }}</h3>
              <button class="ps-modal-close" @click="showModal = false" aria-label="Close">
                <i class="ph ph-x"></i>
              </button>
            </div>
            <div class="ps-modal-body">
              <div class="grid grid-cols-2 gap-3">
                <div class="col-span-2">
                  <label class="ps-label">Supplier Name *</label>
                  <input v-model="form.name" placeholder="Company or supplier name" class="ps-input" />
                </div>
                <div>
                  <label class="ps-label">Contact First Name</label>
                  <input v-model="form.contactFirstName" placeholder="First name" class="ps-input" />
                </div>
                <div>
                  <label class="ps-label">Contact Last Name</label>
                  <input v-model="form.contactLastName" placeholder="Last name" class="ps-input" />
                </div>
                <div>
                  <label class="ps-label">Email</label>
                  <input v-model="form.email" type="email" placeholder="supplier@email.com" class="ps-input" />
                </div>
                <div>
                  <label class="ps-label">Phone</label>
                  <input v-model="form.phone" placeholder="+63 9XX XXX XXXX" class="ps-input" />
                </div>
                <div class="col-span-2">
                  <label class="ps-label">Street</label>
                  <input v-model="form.street" placeholder="Street address" class="ps-input" />
                </div>
                <div>
                  <label class="ps-label">City</label>
                  <input v-model="form.city" placeholder="City" class="ps-input" />
                </div>
                <div>
                  <label class="ps-label">Province</label>
                  <input v-model="form.province" placeholder="Province" class="ps-input" />
                </div>
                <div>
                  <label class="ps-label">ZIP Code</label>
                  <input v-model="form.zipCode" placeholder="ZIP" class="ps-input" />
                </div>
                <div>
                  <label class="ps-label">Rating (0–5)</label>
                  <input v-model="form.rating" type="number" placeholder="e.g. 4.5" class="ps-input" />
                </div>
              </div>
              <div v-if="formErr" class="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {{ formErr }}
              </div>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="showModal = false">Cancel</button>
              <button class="ps-btn ps-btn-primary" :disabled="saving" @click="save">
                <i v-if="saving" class="ph ph-spinner animate-spin"></i>
                {{ saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Supplier' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
