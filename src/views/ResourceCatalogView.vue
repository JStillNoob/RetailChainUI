<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth.ts'
import { useToast } from '../composables/useToast.ts'
import { useConfirm } from '../composables/useConfirm'
import { getResources, getResourceUnits, createResource, updateResource, deleteResource, getUnits, createUnit, deleteUnit } from '../services/tenant.ts'

defineOptions({ name: 'ResourceCatalogView' })

interface Resource {
  resourceId: number
  name: string
  description: string | null
  unitId: number | null
  unitName: string | null
}

interface Unit {
  unitId: number
  unitName: string
}

const auth    = useAuthStore()
const { toast } = useToast()
const { confirmDialog } = useConfirm()

const isAdmin = computed(() => auth.roleTypeName === 'TenantAdmin')

const resources  = ref<Resource[]>([])
const units      = ref<Unit[]>([])
const loading    = ref(true)
const search     = ref('')
const openMenuId = ref<number | null>(null)

async function load() {
  loading.value = true
  try {
    resources.value = await getResources(search.value || undefined)
  } catch {
    toast('Failed to load resources.', 'error')
  } finally { loading.value = false }
}

onMounted(async () => {
  await Promise.all([load(), getResourceUnits().then(u => { units.value = u }).catch(() => {})])
})

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return resources.value
  return resources.value.filter(r =>
    r.name.toLowerCase().includes(q) ||
    (r.description ?? '').toLowerCase().includes(q)
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
const form      = ref({ name: '', description: '', unitId: null as number | null })

function openAdd() {
  isEdit.value = false; editId.value = null
  form.value   = { name: '', description: '', unitId: null }
  formErr.value = ''; showModal.value = true
}

function openEdit(r: Resource) {
  openMenuId.value = null
  isEdit.value = true; editId.value = r.resourceId; formErr.value = ''
  form.value   = { name: r.name, description: r.description ?? '', unitId: r.unitId }
  showModal.value = true
}

async function save() {
  formErr.value = ''
  if (!form.value.name.trim()) { formErr.value = 'Name is required.'; return }
  saving.value = true
  try {
    const payload = {
      name:        form.value.name.trim(),
      description: form.value.description.trim() || undefined,
      unitId:      form.value.unitId ?? null,
    }
    if (isEdit.value) {
      await updateResource(editId.value!, payload)
      toast('Resource updated.')
    } else {
      await createResource(payload)
      toast('Resource created.')
    }
    showModal.value = false; await load()
  } catch (e: any) {
    formErr.value = e.response?.data?.message ?? 'Save failed.'
  } finally { saving.value = false }
}

async function remove(r: Resource) {
  openMenuId.value = null
  if (!await confirmDialog(`Delete "${r.name}"? Products using this resource will lose their name.`)) return
  try {
    await deleteResource(r.resourceId)
    toast('Resource deleted.')
    await load()
  } catch (e: any) {
    toast(e.response?.data?.message ?? 'Delete failed.', 'error')
  }
}

const avatarCls = (id: number) => `ps-avatar ps-avatar-${id % 8}`

// ── Unit management panel ──────────────────────────────────────────────────
const showUnits   = ref(false)
const newUnitName = ref('')
const unitSaving  = ref(false)
const unitErr     = ref('')

async function loadUnits() {
  try { units.value = await getUnits() }
  catch { units.value = [] }
}

async function addUnit() {
  unitErr.value = ''
  if (!newUnitName.value.trim()) { unitErr.value = 'Unit name is required.'; return }
  unitSaving.value = true
  try {
    await createUnit(newUnitName.value.trim())
    newUnitName.value = ''
    await loadUnits()
    toast('Unit added.')
  } catch (e: any) {
    unitErr.value = e.response?.data?.message ?? 'Failed to add unit.'
  } finally { unitSaving.value = false }
}

async function removeUnit(id: number, name: string) {
  if (!await confirmDialog(`Delete unit "${name}"? Resources using it will lose their unit.`)) return
  try {
    await deleteUnit(id)
    await loadUnits()
    toast('Unit deleted.')
  } catch (e: any) {
    toast(e.response?.data?.message ?? 'Failed to delete unit.', 'error')
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Page header -->
    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Resource Catalog</h1>
        <p class="ps-page-sub">Define what items exist — names, descriptions, and units — before turning them into products.</p>
      </div>
      <div class="flex gap-2">
        <button v-if="isAdmin" @click="showUnits = true; loadUnits()" class="ps-btn ps-btn-outline">
          <i class="ph ph-ruler"></i> Manage Units
        </button>
        <button v-if="isAdmin" @click="openAdd" class="ps-btn ps-btn-primary">
          <i class="ph ph-plus"></i> Add Resource
        </button>
      </div>
    </div>

    <!-- Datatable card -->
    <div class="ps-card overflow-hidden">

      <div class="ps-table-toolbar">
        <div>
          <div class="ps-table-title">Resources</div>
          <div class="ps-table-subtitle">{{ filtered.length }} resource{{ filtered.length !== 1 ? 's' : '' }}</div>
        </div>
        <div class="flex items-center gap-3">
          <div class="ps-search">
            <i class="ph ph-magnifying-glass"></i>
            <input v-model="search" placeholder="Search by name or description…" @input="page = 1" />
          </div>
        </div>
      </div>

      <div v-if="loading" class="p-6 space-y-3">
        <div v-for="i in 5" :key="i" class="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
      <div v-else-if="filtered.length === 0" class="flex flex-col items-center gap-3 py-16 text-slate-400">
        <i class="ph-fill ph-book-open text-5xl text-slate-200"></i>
        <p class="text-sm">No resources found.</p>
        <button v-if="isAdmin" @click="openAdd" class="ps-btn ps-btn-primary mt-1">
          <i class="ph ph-plus"></i> Add Resource
        </button>
      </div>
      <table v-else class="ps-table">
        <thead>
          <tr>
            <th style="width: 40px"><input type="checkbox" class="accent-blue-500" /></th>
            <th>ID</th>
            <th>Name</th>
            <th>Unit</th>
            <th>Description</th>
            <th v-if="isAdmin" style="width: 50px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in paged" :key="r.resourceId">
            <td><input type="checkbox" class="accent-blue-500" /></td>
            <td class="text-slate-500 font-medium">#{{ String(r.resourceId).padStart(5, '0') }}</td>
            <td>
              <div class="flex items-center gap-2.5">
                <div :class="avatarCls(r.resourceId)">{{ r.name.charAt(0).toUpperCase() }}</div>
                <span class="font-semibold text-slate-800">{{ r.name }}</span>
              </div>
            </td>
            <td>
              <span v-if="r.unitName" class="ps-tag ps-tag-slate">{{ r.unitName }}</span>
              <span v-else class="text-slate-400 text-sm">—</span>
            </td>
            <td class="text-slate-500 text-sm">{{ r.description || '—' }}</td>
            <td v-if="isAdmin">
              <div class="relative">
                <button @click="openMenuId = openMenuId === r.resourceId ? null : r.resourceId"
                  class="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all">
                  <i class="ph ph-dots-three"></i>
                </button>
                <div v-if="openMenuId === r.resourceId"
                  class="absolute right-0 top-9 z-10 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 text-sm">
                  <button @click="openEdit(r)"
                    class="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                    <i class="ph ph-pencil-simple text-slate-400"></i> Edit
                  </button>
                  <button @click="remove(r)"
                    class="w-full text-left px-3.5 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2">
                    <i class="ph ph-trash"></i> Delete
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
        <span class="ps-pg-info">Showing {{ (page - 1) * pageSize + 1 }} to {{ Math.min(page * pageSize, filtered.length) }} of {{ filtered.length }} resources</span>
        <select v-model="pageSize" class="ps-pg-size" @change="page = 1">
          <option :value="10">10</option><option :value="25">25</option><option :value="50">50</option>
        </select>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showModal" class="ps-modal-backdrop" @click.self="showModal = false">
          <div class="ps-modal-card" style="max-width: 520px">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">{{ isEdit ? 'Edit Resource' : 'Add Resource' }}</h3>
              <button class="ps-modal-close" @click="showModal = false" aria-label="Close">
                <i class="ph ph-x"></i>
              </button>
            </div>
            <div class="ps-modal-body">
              <div class="flex flex-col gap-3">
                <div>
                  <label class="ps-label">Name *</label>
                  <input v-model="form.name" placeholder="e.g. Whole Milk 1L" class="ps-input" maxlength="150" />
                </div>
                <div>
                  <label class="ps-label">Unit</label>
                  <select v-model="form.unitId" class="ps-input">
                    <option :value="null">— no unit —</option>
                    <option v-for="u in units" :key="u.unitId" :value="u.unitId">{{ u.unitName }}</option>
                  </select>
                </div>
                <div>
                  <label class="ps-label">Description</label>
                  <textarea v-model="form.description" placeholder="Optional description…" class="ps-input" rows="3" maxlength="500" style="resize: vertical"></textarea>
                </div>
                <div v-if="formErr" class="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {{ formErr }}
                </div>
              </div>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="showModal = false">Cancel</button>
              <button class="ps-btn ps-btn-primary" :disabled="saving" @click="save">
                <i v-if="saving" class="ph ph-spinner animate-spin"></i>
                {{ saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Resource' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Manage Units Modal -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showUnits" class="ps-modal-backdrop" @click.self="showUnits = false">
          <div class="ps-modal-card" style="max-width: 420px">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">Manage Units</h3>
              <button class="ps-modal-close" @click="showUnits = false" aria-label="Close">
                <i class="ph ph-x"></i>
              </button>
            </div>
            <div class="ps-modal-body">

              <!-- Add new unit -->
              <div class="flex gap-2 mb-4">
                <input
                  v-model="newUnitName"
                  placeholder="e.g. kg, pcs, liters…"
                  class="ps-input flex-1"
                  maxlength="30"
                  @keyup.enter="addUnit"
                />
                <button class="ps-btn ps-btn-primary" :disabled="unitSaving" @click="addUnit">
                  <i v-if="unitSaving" class="ph ph-spinner animate-spin"></i>
                  <i v-else class="ph ph-plus"></i>
                  Add
                </button>
              </div>
              <div v-if="unitErr" class="px-3 py-2 mb-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {{ unitErr }}
              </div>

              <!-- Existing units list -->
              <div v-if="units.length === 0" class="text-center text-slate-400 text-sm py-6">
                No units yet. Add one above.
              </div>
              <ul v-else class="divide-y divide-slate-100">
                <li v-for="u in units" :key="u.unitId"
                  class="flex items-center justify-between py-2.5 px-1">
                  <span class="text-slate-700 font-medium">{{ u.unitName }}</span>
                  <button @click="removeUnit(u.unitId, u.unitName)"
                    class="w-7 h-7 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all">
                    <i class="ph ph-trash text-sm"></i>
                  </button>
                </li>
              </ul>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="showUnits = false">Close</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
