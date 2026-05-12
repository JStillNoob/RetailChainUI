<script setup lang="ts">
import { useConfirm } from '../composables/useConfirm'
import { ref, computed, onMounted } from 'vue'
import api from '../services/api.ts'
import { useToast } from '../composables/useToast.ts'
import { useValidation } from '../composables/useValidation.ts'
import PsPagination from '../components/PsPagination.vue'

defineOptions({ name: 'LogisticsView' })

const { confirmDialog } = useConfirm()
const { toast } = useToast()
const { parseApiError } = useValidation()

// ── Tabs ───────────────────────────────────────────────────────────────────────
const activeTab = ref<'deliveries' | 'carriers'>('deliveries')

// ── Deliveries ─────────────────────────────────────────────────────────────────
const deliveries   = ref<any[]>([])
const approvedPos  = ref<any[]>([])
const carriers     = ref<any[]>([])
const loading      = ref(true)
const statusFilter = ref('')
const search       = ref('')

const STATUSES = ['Scheduled', 'In-Transit', 'Delivered', 'Partially-Delivered', 'Failed', 'Returned']

async function load() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (statusFilter.value) params.status = statusFilter.value
    deliveries.value = await api.get('/logistics/deliveries', { params }).then(r => r.data)
  } catch { toast('Failed to load deliveries.', 'error') }
  finally { loading.value = false }
}

async function loadMeta() {
  try {
    const [pos, crs] = await Promise.all([
      api.get('/logistics/approved-pos').then(r => r.data),
      api.get('/logistics/carriers').then(r => r.data),
    ])
    approvedPos.value = pos
    carriers.value    = crs
  } catch { /* non-critical */ }
}

onMounted(async () => { await loadMeta(); await load() })

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return deliveries.value
  return deliveries.value.filter(d =>
    String(d.deliveryId).includes(q) ||
    d.supplierName?.toLowerCase().includes(q) ||
    d.trackingNo?.toLowerCase().includes(q)
  )
})

const page     = ref(1)
const pageSize = ref(10)
const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))

const counts = computed(() => {
  const all = deliveries.value
  return Object.fromEntries(STATUSES.map(s => [s, all.filter(d => d.status === s).length]))
})

// ── Create Delivery ────────────────────────────────────────────────────────────
const showCreate  = ref(false)
const creating    = ref(false)
const createErr   = ref('')
const createForm  = ref({ poId: null as number | null, scheduledDate: '', carrierId: null as number | null, trackingNo: '', notes: '' })

async function createDelivery() {
  createErr.value = ''
  if (!createForm.value.poId) { createErr.value = 'Select a purchase order.'; return }
  creating.value = true
  try {
    await api.post('/logistics/deliveries', {
      poId:          createForm.value.poId,
      scheduledDate: createForm.value.scheduledDate || null,
      carrierId:     createForm.value.carrierId || null,
      trackingNo:    createForm.value.trackingNo || null,
      notes:         createForm.value.notes || null,
    })
    toast('Delivery created.')
    showCreate.value = false
    createForm.value = { poId: null, scheduledDate: '', carrierId: null, trackingNo: '', notes: '' }
    await loadMeta(); await load()
  } catch (e) {
    createErr.value = parseApiError(e)
  } finally { creating.value = false }
}

// ── Update Delivery ────────────────────────────────────────────────────────────
const showUpdate  = ref(false)
const updateItem  = ref<any>(null)
const updating    = ref(false)
const updateErr   = ref('')
const updateForm  = ref({ status: '', trackingNo: '', carrierId: null as number | null, actualDate: '', notes: '', proofOfDelivery: '' })

function openUpdate(d: any) {
  updateItem.value = d
  updateForm.value = {
    status:          d.status ?? '',
    trackingNo:      d.trackingNo ?? '',
    carrierId:       d.carrierId ?? null,
    actualDate:      '',
    notes:           d.notes ?? '',
    proofOfDelivery: d.proofOfDelivery ?? '',
  }
  updateErr.value = ''; showUpdate.value = true
}

async function saveUpdate() {
  updateErr.value = ''; updating.value = true
  try {
    await api.put(`/logistics/deliveries/${updateItem.value.deliveryId}`, {
      status:          updateForm.value.status,
      trackingNo:      updateForm.value.trackingNo || null,
      carrierId:       updateForm.value.carrierId || null,
      actualDate:      updateForm.value.actualDate || null,
      notes:           updateForm.value.notes || null,
      proofOfDelivery: updateForm.value.proofOfDelivery || null,
    })
    toast('Delivery updated.'); showUpdate.value = false; await load()
  } catch (e) {
    updateErr.value = parseApiError(e)
  } finally { updating.value = false }
}

// ── Return Delivery ────────────────────────────────────────────────────────────
const showReturn  = ref(false)
const returnItem  = ref<any>(null)
const returning   = ref(false)
const returnErr   = ref('')
const returnReason = ref('')

function openReturn(d: any) {
  returnItem.value = d; returnReason.value = ''; returnErr.value = ''; showReturn.value = true
}

async function saveReturn() {
  returnErr.value = ''
  if (!returnReason.value.trim()) { returnErr.value = 'Reason is required.'; return }
  returning.value = true
  try {
    await api.post(`/logistics/deliveries/${returnItem.value.deliveryId}/return`, { returnReason: returnReason.value })
    toast('Delivery marked as returned.'); showReturn.value = false; await load()
  } catch (e) {
    returnErr.value = parseApiError(e)
  } finally { returning.value = false }
}

// ── Carriers tab ───────────────────────────────────────────────────────────────
const carriersLoading  = ref(false)
const carriersList     = ref<any[]>([])
const showCarrierModal = ref(false)
const carrierForm      = ref({ carrierId: null as number | null, carrierName: '', contactName: '', phone: '', email: '' })
const carrierErr       = ref('')
const savingCarrier    = ref(false)
const carrierSearch    = ref('')

async function loadCarriers() {
  carriersLoading.value = true
  try { carriersList.value = await api.get('/logistics/carriers', { params: { includeInactive: true } }).then(r => r.data) }
  catch { toast('Failed to load carriers.', 'error') }
  finally { carriersLoading.value = false }
}

const filteredCarriers = computed(() => {
  const q = carrierSearch.value.toLowerCase()
  return q ? carriersList.value.filter(c => c.carrierName.toLowerCase().includes(q)) : carriersList.value
})

function openCarrierCreate() {
  carrierForm.value = { carrierId: null, carrierName: '', contactName: '', phone: '', email: '' }
  carrierErr.value = ''; showCarrierModal.value = true
}

function openCarrierEdit(c: any) {
  carrierForm.value = { carrierId: c.carrierId, carrierName: c.carrierName, contactName: c.contactName ?? '', phone: c.phone ?? '', email: c.email ?? '' }
  carrierErr.value = ''; showCarrierModal.value = true
}

async function saveCarrier() {
  carrierErr.value = ''
  if (!carrierForm.value.carrierName.trim()) { carrierErr.value = 'Carrier name is required.'; return }
  savingCarrier.value = true
  try {
    if (carrierForm.value.carrierId) {
      await api.put(`/logistics/carriers/${carrierForm.value.carrierId}`, {
        carrierName: carrierForm.value.carrierName, contactName: carrierForm.value.contactName || null,
        phone: carrierForm.value.phone || null, email: carrierForm.value.email || null,
      })
      toast('Carrier updated.')
    } else {
      await api.post('/logistics/carriers', {
        carrierName: carrierForm.value.carrierName, contactName: carrierForm.value.contactName || null,
        phone: carrierForm.value.phone || null, email: carrierForm.value.email || null,
      })
      toast('Carrier added.')
    }
    showCarrierModal.value = false
    await loadCarriers()
    carriers.value = await api.get('/logistics/carriers').then(r => r.data)
  } catch (e) {
    carrierErr.value = parseApiError(e)
  } finally { savingCarrier.value = false }
}

async function deactivateCarrier(c: any) {
  if (!await confirmDialog(`Deactivate carrier "${c.carrierName}"?`)) return
  try {
    await api.delete(`/logistics/carriers/${c.carrierId}`)
    toast('Carrier deactivated.')
    await loadCarriers()
  } catch (e: any) { toast(parseApiError(e), 'error') }
}

function handleTabChange(tab: 'deliveries' | 'carriers') {
  activeTab.value = tab
  if (tab === 'carriers' && !carriersList.value.length) loadCarriers()
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const phpFmt  = (v: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(v)

const statusTag = (s: string): string => ({
  Scheduled:             'ps-tag ps-tag-slate',
  'In-Transit':          'ps-tag ps-tag-blue',
  Delivered:             'ps-tag ps-tag-green',
  'Partially-Delivered': 'ps-tag ps-tag-amber',
  Failed:                'ps-tag ps-tag-red',
  Returned:              'ps-tag ps-tag-red',
}[s] ?? 'ps-tag ps-tag-slate')

const avatarCls = (id: number) => `ps-avatar ps-avatar-${id % 8}`
const canReturn = (d: any) => d.status !== 'Returned' && d.status !== 'Failed' && d.status !== 'Delivered'
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Page header -->
    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Logistics & Distribution</h1>
        <p class="ps-page-sub">Track shipments, manage deliveries, and configure carriers.</p>
      </div>
      <div class="flex gap-2">
        <button @click="load" :disabled="loading" class="ps-btn ps-btn-outline">
          <i class="ph ph-arrows-clockwise" :class="{ 'animate-spin': loading }"></i> Refresh
        </button>
        <button v-if="activeTab === 'deliveries'" @click="showCreate = true" class="ps-btn ps-btn-primary">
          <i class="ph ph-plus"></i> New Delivery
        </button>
        <button v-if="activeTab === 'carriers'" @click="openCarrierCreate" class="ps-btn ps-btn-primary">
          <i class="ph ph-plus"></i> Add Carrier
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="ps-card overflow-hidden">
      <div class="flex border-b border-slate-200 px-4 pt-1">
        <button @click="handleTabChange('deliveries')"
          :class="['px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-2',
            activeTab === 'deliveries' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700']">
          <i class="ph ph-truck"></i> Deliveries
          <span class="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{{ deliveries.length }}</span>
        </button>
        <button @click="handleTabChange('carriers')"
          :class="['px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-2',
            activeTab === 'carriers' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700']">
          <i class="ph ph-buildings"></i> Carriers
        </button>
      </div>

      <!-- ── Deliveries Tab ──────────────────────────────────────────────────── -->
      <template v-if="activeTab === 'deliveries'">
        <div class="ps-table-toolbar">
          <div>
            <div class="ps-table-title">Delivery Tracking</div>
            <div class="ps-table-subtitle">{{ filtered.length }} record{{ filtered.length !== 1 ? 's' : '' }}</div>
          </div>
          <div class="flex items-center gap-3 flex-wrap">
            <div class="ps-search">
              <i class="ph ph-magnifying-glass"></i>
              <input v-model="search" placeholder="Search…" />
            </div>
          </div>
        </div>

        <!-- Status filter pills -->
        <div class="px-6 py-3 flex flex-wrap gap-2 border-b border-slate-100">
          <button @click="statusFilter = ''; load()"
            :class="['inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all',
              statusFilter === '' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200']">
            All <span class="bg-black/10 px-1.5 py-0.5 rounded-full text-[10px] font-bold">{{ deliveries.length }}</span>
          </button>
          <button v-for="s in STATUSES" :key="s" @click="statusFilter = s; load()"
            :class="['inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all',
              statusFilter === s ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200']">
            {{ s }} <span class="bg-black/10 px-1.5 py-0.5 rounded-full text-[10px] font-bold">{{ (counts as any)[s] ?? 0 }}</span>
          </button>
        </div>

        <div v-if="loading" class="p-6 space-y-3">
          <div v-for="i in 5" :key="i" class="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
        </div>
        <div v-else-if="filtered.length === 0" class="flex flex-col items-center gap-3 py-16 text-slate-400">
          <i class="ph-fill ph-truck text-5xl text-slate-200"></i>
          <p class="text-sm">{{ statusFilter ? 'No deliveries with this status.' : 'No deliveries yet. Create one for an approved PO.' }}</p>
        </div>
        <table v-else class="ps-table">
          <thead>
            <tr>
              <th style="width: 40px"><input type="checkbox" class="accent-blue-500" /></th>
              <th>Delivery #</th>
              <th>Supplier</th>
              <th>PO #</th>
              <th>Scheduled</th>
              <th>Actual</th>
              <th>Carrier</th>
              <th>Tracking #</th>
              <th>Status</th>
              <th style="width: 80px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in paged" :key="d.deliveryId">
              <td><input type="checkbox" class="accent-blue-500" /></td>
              <td class="font-semibold text-slate-800">#{{ d.deliveryId }}</td>
              <td>
                <div class="flex items-center gap-2.5">
                  <div :class="avatarCls(d.deliveryId)">{{ (d.supplierName ?? 'S').charAt(0).toUpperCase() }}</div>
                  <span class="text-slate-700">{{ d.supplierName }}</span>
                </div>
              </td>
              <td class="text-slate-500">PO-{{ d.poId }}</td>
              <td class="text-slate-500">{{ fmtDate(d.scheduledDate) }}</td>
              <td class="text-slate-500">{{ fmtDate(d.actualDate) }}</td>
              <td class="text-slate-500">{{ d.carrierName ?? '—' }}</td>
              <td class="text-slate-500 text-xs">{{ d.trackingNo ?? '—' }}</td>
              <td>
                <span :class="statusTag(d.status)">{{ d.status }}</span>
                <div v-if="d.returnReason" class="text-[10px] text-red-400 mt-0.5 max-w-[120px] truncate" :title="d.returnReason">{{ d.returnReason }}</div>
              </td>
              <td>
                <div class="flex items-center gap-1">
                  <button @click="openUpdate(d)" v-if="d.status !== 'Returned' && d.status !== 'Delivered'"
                    class="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all" title="Update">
                    <i class="ph ph-pencil-simple"></i>
                  </button>
                  <button v-if="canReturn(d)" @click="openReturn(d)"
                    class="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all" title="Mark Returned">
                    <i class="ph ph-arrow-counter-clockwise"></i>
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
          record-label="deliveries"
        />
      </template>

      <!-- ── Carriers Tab ────────────────────────────────────────────────────── -->
      <template v-else>
        <div class="ps-table-toolbar">
          <div>
            <div class="ps-table-title">Carrier Management</div>
            <div class="ps-table-subtitle">{{ filteredCarriers.length }} carrier{{ filteredCarriers.length !== 1 ? 's' : '' }}</div>
          </div>
          <div class="ps-search">
            <i class="ph ph-magnifying-glass"></i>
            <input v-model="carrierSearch" placeholder="Search carriers…" />
          </div>
        </div>

        <div v-if="carriersLoading" class="p-6 space-y-3">
          <div v-for="i in 4" :key="i" class="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
        </div>
        <div v-else-if="!filteredCarriers.length" class="flex flex-col items-center gap-3 py-16 text-slate-400">
          <i class="ph-fill ph-buildings text-5xl text-slate-200"></i>
          <p class="text-sm">No carriers yet. Add one to get started.</p>
        </div>
        <table v-else class="ps-table">
          <thead>
            <tr>
              <th>Carrier Name</th>
              <th>Contact</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Status</th>
              <th style="width: 80px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in filteredCarriers" :key="c.carrierId" :class="c.status === 'Inactive' ? 'opacity-50' : ''">
              <td class="font-semibold text-slate-800">{{ c.carrierName }}</td>
              <td class="text-slate-600">{{ c.contactName ?? '—' }}</td>
              <td class="text-slate-500 text-sm">{{ c.phone ?? '—' }}</td>
              <td class="text-slate-500 text-sm">{{ c.email ?? '—' }}</td>
              <td>
                <span :class="c.status === 'Active' ? 'ps-tag ps-tag-green' : 'ps-tag ps-tag-slate'">{{ c.status }}</span>
              </td>
              <td>
                <div class="flex gap-1">
                  <button @click="openCarrierEdit(c)"
                    class="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all" title="Edit">
                    <i class="ph ph-pencil-simple"></i>
                  </button>
                  <button v-if="c.status === 'Active'" @click="deactivateCarrier(c)"
                    class="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all" title="Deactivate">
                    <i class="ph ph-x-circle"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </div>

    <!-- ── Create Delivery Modal ───────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showCreate" class="ps-modal-backdrop" @click.self="showCreate = false">
          <div class="ps-modal-card">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">Create New Delivery</h3>
              <button class="ps-modal-close" @click="showCreate = false"><i class="ph ph-x"></i></button>
            </div>
            <div class="ps-modal-body">
              <div v-if="!approvedPos.length" class="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                <i class="ph ph-warning text-lg flex-shrink-0 mt-0.5"></i>
                No approved purchase orders available. A PO must be approved by Procurement before a delivery can be created.
              </div>
              <div>
                <label class="ps-label">Purchase Order (Approved) *</label>
                <select v-model="createForm.poId" class="ps-input">
                  <option :value="null">— Select approved PO —</option>
                  <option v-for="p in approvedPos" :key="p.poId" :value="p.poId">
                    PO #{{ p.poId }} — {{ p.supplierName }} ({{ phpFmt(p.totalAmount) }})
                  </option>
                </select>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="ps-label">Scheduled Date</label>
                  <input v-model="createForm.scheduledDate" type="date" class="ps-input" />
                </div>
                <div>
                  <label class="ps-label">Carrier</label>
                  <select v-model="createForm.carrierId" class="ps-input">
                    <option :value="null">— No carrier assigned —</option>
                    <option v-for="c in carriers" :key="c.carrierId" :value="c.carrierId">{{ c.carrierName }}</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="ps-label">Tracking Number</label>
                <input v-model="createForm.trackingNo" placeholder="e.g. JRSPH12345" class="ps-input" />
              </div>
              <div>
                <label class="ps-label">Notes</label>
                <input v-model="createForm.notes" placeholder="Delivery notes…" class="ps-input" />
              </div>
              <div v-if="createErr" class="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{{ createErr }}</div>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="showCreate = false">Cancel</button>
              <button class="ps-btn ps-btn-primary" :disabled="creating || !approvedPos.length" @click="createDelivery">
                <i v-if="creating" class="ph ph-spinner animate-spin"></i>
                {{ creating ? 'Creating…' : 'Create Delivery' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Update Delivery Modal ───────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showUpdate" class="ps-modal-backdrop" @click.self="showUpdate = false">
          <div class="ps-modal-card">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">Update Delivery #{{ updateItem?.deliveryId }}</h3>
              <button class="ps-modal-close" @click="showUpdate = false"><i class="ph ph-x"></i></button>
            </div>
            <div class="ps-modal-body">
              <p class="text-sm text-slate-500">{{ updateItem?.supplierName }} — PO-{{ updateItem?.poId }}</p>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="ps-label">Status</label>
                  <select v-model="updateForm.status" class="ps-input">
                    <option v-for="s in ['Scheduled','In-Transit','Delivered','Failed','Partially-Delivered']" :key="s" :value="s">{{ s }}</option>
                  </select>
                </div>
                <div>
                  <label class="ps-label">Carrier</label>
                  <select v-model="updateForm.carrierId" class="ps-input">
                    <option :value="null">— No carrier —</option>
                    <option v-for="c in carriers" :key="c.carrierId" :value="c.carrierId">{{ c.carrierName }}</option>
                  </select>
                </div>
                <div>
                  <label class="ps-label">Tracking Number</label>
                  <input v-model="updateForm.trackingNo" placeholder="e.g. JRSPH12345" class="ps-input" />
                </div>
                <div v-if="['Delivered','Partially-Delivered'].includes(updateForm.status)">
                  <label class="ps-label">Actual Delivery Date</label>
                  <input v-model="updateForm.actualDate" type="date" class="ps-input" />
                </div>
              </div>
              <div>
                <label class="ps-label">Notes</label>
                <input v-model="updateForm.notes" placeholder="Delivery notes…" class="ps-input" />
              </div>
              <div v-if="updateForm.status === 'Delivered'">
                <label class="ps-label">Proof of Delivery URL</label>
                <input v-model="updateForm.proofOfDelivery" placeholder="https://…" class="ps-input" />
              </div>
              <div v-if="updateErr" class="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{{ updateErr }}</div>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="showUpdate = false">Cancel</button>
              <button class="ps-btn ps-btn-primary" :disabled="updating" @click="saveUpdate">
                <i v-if="updating" class="ph ph-spinner animate-spin"></i>
                {{ updating ? 'Saving…' : 'Save Changes' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Return Delivery Modal ───────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showReturn" class="ps-modal-backdrop" @click.self="showReturn = false">
          <div class="ps-modal-card" style="max-width: 480px">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">Mark Delivery #{{ returnItem?.deliveryId }} as Returned</h3>
              <button class="ps-modal-close" @click="showReturn = false"><i class="ph ph-x"></i></button>
            </div>
            <div class="ps-modal-body">
              <p class="text-sm text-slate-500 mb-1">{{ returnItem?.supplierName }} — PO-{{ returnItem?.poId }}</p>
              <div class="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <i class="ph ph-warning text-lg flex-shrink-0 mt-0.5"></i>
                The PO will be reverted to Approved status so a new delivery can be dispatched.
              </div>
              <div>
                <label class="ps-label">Return / Rejection Reason *</label>
                <textarea v-model="returnReason" rows="3" placeholder="Describe why the delivery is being returned…"
                  class="ps-input resize-none"></textarea>
              </div>
              <div v-if="returnErr" class="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{{ returnErr }}</div>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="showReturn = false">Cancel</button>
              <button class="ps-btn ps-btn-danger ps-btn-primary" :disabled="returning" @click="saveReturn"
                style="background:#ef4444;border-color:#ef4444;">
                <i v-if="returning" class="ph ph-spinner animate-spin"></i>
                {{ returning ? 'Recording…' : 'Confirm Return' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Carrier Add/Edit Modal ──────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showCarrierModal" class="ps-modal-backdrop" @click.self="showCarrierModal = false">
          <div class="ps-modal-card" style="max-width: 480px">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">{{ carrierForm.carrierId ? 'Edit Carrier' : 'Add New Carrier' }}</h3>
              <button class="ps-modal-close" @click="showCarrierModal = false"><i class="ph ph-x"></i></button>
            </div>
            <div class="ps-modal-body">
              <div>
                <label class="ps-label">Carrier Name *</label>
                <input v-model="carrierForm.carrierName" placeholder="e.g. JRS Express" class="ps-input" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="ps-label">Contact Name</label>
                  <input v-model="carrierForm.contactName" placeholder="Coordinator name" class="ps-input" />
                </div>
                <div>
                  <label class="ps-label">Phone</label>
                  <input v-model="carrierForm.phone" placeholder="+63 9XX XXX XXXX" class="ps-input" />
                </div>
              </div>
              <div>
                <label class="ps-label">Email</label>
                <input v-model="carrierForm.email" placeholder="pickup@carrier.com" class="ps-input" />
              </div>
              <div v-if="carrierErr" class="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{{ carrierErr }}</div>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="showCarrierModal = false">Cancel</button>
              <button class="ps-btn ps-btn-primary" :disabled="savingCarrier" @click="saveCarrier">
                <i v-if="savingCarrier" class="ph ph-spinner animate-spin"></i>
                {{ savingCarrier ? 'Saving…' : (carrierForm.carrierId ? 'Update Carrier' : 'Add Carrier') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
