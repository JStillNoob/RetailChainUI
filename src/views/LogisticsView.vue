<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '../services/api.ts'
import { useToast } from '../composables/useToast.ts'

defineOptions({ name: 'LogisticsView' })

const { toast } = useToast()

const deliveries   = ref<any[]>([])
const loading      = ref(true)
const statusFilter = ref('')
const search       = ref('')

const STATUSES = ['Scheduled', 'In-Transit', 'Delivered', 'Partially-Delivered', 'Failed']

async function load() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (statusFilter.value) params.status = statusFilter.value
    deliveries.value = await api.get('/logistics/deliveries', { params }).then(r => r.data)
  } catch { toast('Failed to load deliveries.', 'error') }
  finally { loading.value = false }
}
onMounted(load)

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
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
function goTo(p: number) { if (p >= 1 && p <= totalPages.value) page.value = p }

const counts = computed(() => {
  const all = deliveries.value
  return {
    Scheduled:    all.filter(d => d.status === 'Scheduled').length,
    'In-Transit': all.filter(d => d.status === 'In-Transit').length,
    Delivered:    all.filter(d => d.status === 'Delivered').length,
    Failed:       all.filter(d => d.status === 'Failed').length,
  }
})

const showUpdate = ref(false)
const updateItem = ref<any>(null)
const updating   = ref(false)
const updateForm = ref({ status: '', trackingNo: '', actualDate: '' })
const updateErr  = ref('')

function openUpdate(d: any) {
  updateItem.value = d
  updateForm.value = { status: d.status, trackingNo: d.trackingNo ?? '', actualDate: '' }
  updateErr.value  = ''; showUpdate.value = true
}

async function saveUpdate() {
  updateErr.value = ''; updating.value = true
  try {
    await api.put(`/logistics/deliveries/${updateItem.value.deliveryId}`, {
      status: updateForm.value.status, trackingNo: updateForm.value.trackingNo || null, actualDate: updateForm.value.actualDate || null,
    })
    toast('Delivery updated.'); showUpdate.value = false; await load()
  } catch (e: any) {
    updateErr.value = e.response?.data?.message ?? 'Update failed.'
  } finally { updating.value = false }
}

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const statusTag = (s: string): string => ({
  Scheduled:             'ps-tag ps-tag-slate',
  'In-Transit':          'ps-tag ps-tag-blue',
  Delivered:             'ps-tag ps-tag-green',
  'Partially-Delivered': 'ps-tag ps-tag-amber',
  Failed:                'ps-tag ps-tag-red',
}[s] ?? 'ps-tag ps-tag-slate')
const avatarCls = (id: number) => `ps-avatar ps-avatar-${id % 8}`
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Page header -->
    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Deliveries</h1>
        <p class="ps-page-sub">Track and manage all outbound/inbound deliveries.</p>
      </div>
      <button @click="load" :disabled="loading" class="ps-btn ps-btn-outline">
        <i class="ph ph-arrows-clockwise" :class="{ 'animate-spin': loading }"></i> Refresh
      </button>
    </div>

    <!-- Datatable card -->
    <div class="ps-card overflow-hidden">

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
          <button class="ps-btn ps-btn-primary"><i class="ph ph-funnel"></i> Filter</button>
          <button class="ps-btn ps-btn-dark"><i class="ph ph-download-simple"></i> Export</button>
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
        <p class="text-sm">{{ statusFilter ? 'No deliveries with this status.' : 'No deliveries found.' }}</p>
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
            <th style="width: 50px"></th>
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
            <td><span :class="statusTag(d.status)">{{ d.status }}</span></td>
            <td>
              <button @click="openUpdate(d)"
                class="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all" title="Update">
                <i class="ph ph-pencil-simple"></i>
              </button>
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
        <span class="ps-pg-info">Showing {{ (page - 1) * pageSize + 1 }} to {{ Math.min(page * pageSize, filtered.length) }} of {{ filtered.length }}</span>
        <select v-model="pageSize" class="ps-pg-size" @change="page = 1">
          <option :value="10">10</option><option :value="25">25</option><option :value="50">50</option>
        </select>
      </div>
    </div>

    <!-- Update Modal -->
    <Teleport to="body">
      <div v-if="showUpdate" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-5"
           @click.self="showUpdate = false">
        <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl">
          <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
            <h3 class="text-base font-bold text-slate-900">Update Delivery #{{ updateItem?.deliveryId }}</h3>
            <button @click="showUpdate = false" class="text-slate-400 hover:text-slate-700 text-xl"><i class="ph ph-x"></i></button>
          </div>
          <div class="p-6">
            <p class="text-sm text-slate-500 mb-4">{{ updateItem?.supplierName }} — PO-{{ updateItem?.poId }}</p>
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-700">Status</label>
                <select v-model="updateForm.status" class="ps-input">
                  <option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-700">Tracking Number</label>
                <input v-model="updateForm.trackingNo" placeholder="e.g. JRSPH12345" class="ps-input" />
              </div>
              <div v-if="updateForm.status === 'Delivered' || updateForm.status === 'Partially-Delivered'"
                   class="col-span-2 flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-700">Actual Delivery Date</label>
                <input v-model="updateForm.actualDate" type="date" class="ps-input" />
              </div>
            </div>
            <div v-if="updateErr" class="mt-4 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {{ updateErr }}
            </div>
          </div>
          <div class="flex justify-end gap-2.5 px-6 pb-6">
            <button @click="showUpdate = false" class="ps-btn ps-btn-outline">Cancel</button>
            <button @click="saveUpdate" :disabled="updating" class="ps-btn ps-btn-primary">
              <i v-if="updating" class="ph ph-spinner animate-spin"></i>
              {{ updating ? 'Saving…' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
