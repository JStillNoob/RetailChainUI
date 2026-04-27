<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '../services/api.ts'
import { useToast } from '../composables/useToast.ts'

defineOptions({ name: 'ReceivingView' })

const { toast }  = useToast()
const deliveries = ref<any[]>([])
const loading    = ref(true)
const search     = ref('')

async function load() {
  loading.value = true
  try { deliveries.value = await api.get('/warehouse/receiving').then(r => r.data) }
  catch { toast('Failed to load pending deliveries.', 'error') }
  finally { loading.value = false }
}
onMounted(load)

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return deliveries.value
  return deliveries.value.filter(d =>
    String(d.deliveryId).includes(q) ||
    d.supplierName?.toLowerCase().includes(q) ||
    String(d.poId).includes(q)
  )
})

const page     = ref(1)
const pageSize = ref(10)
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
function goTo(p: number) { if (p >= 1 && p <= totalPages.value) page.value = p }

const showConfirm = ref(false)
const confirmItem = ref<any>(null)
const confirming  = ref(false)
const form        = ref({ actualDate: new Date().toISOString().slice(0, 10), isComplete: true, notes: '' })
const formErr     = ref('')

function openConfirm(d: any) {
  confirmItem.value = d
  form.value        = { actualDate: new Date().toISOString().slice(0, 10), isComplete: true, notes: '' }
  formErr.value     = ''
  showConfirm.value = true
}

async function confirmDelivery() {
  formErr.value = ''; confirming.value = true
  try {
    await api.put(`/warehouse/receiving/${confirmItem.value.deliveryId}/confirm`, {
      actualDate: form.value.actualDate, isComplete: form.value.isComplete, notes: form.value.notes || null,
    })
    toast(form.value.isComplete ? 'Delivery confirmed — inventory updated.' : 'Partial delivery recorded.')
    showConfirm.value = false; await load()
  } catch (e: any) {
    formErr.value = e.response?.data?.message ?? 'Failed to confirm delivery.'
  } finally { confirming.value = false }
}

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const statusTag = (s: string) => s === 'In-Transit' ? 'ps-tag ps-tag-amber' : 'ps-tag ps-tag-blue'
const avatarCls = (id: number) => `ps-avatar ps-avatar-${id % 8}`
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Page header -->
    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Receiving</h1>
        <p class="ps-page-sub">Pending and in-transit deliveries awaiting confirmation.</p>
      </div>
      <button @click="load" :disabled="loading" class="ps-btn ps-btn-outline">
        <i class="ph ph-arrows-clockwise" :class="{ 'animate-spin': loading }"></i> Refresh
      </button>
    </div>

    <!-- Datatable card -->
    <div class="ps-card overflow-hidden">

      <div class="ps-table-toolbar">
        <div>
          <div class="ps-table-title">Inbound Deliveries</div>
          <div class="ps-table-subtitle">{{ filtered.length }} pending</div>
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

      <div v-if="loading" class="p-6 space-y-3">
        <div v-for="i in 4" :key="i" class="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
      <div v-else-if="filtered.length === 0" class="flex flex-col items-center gap-3 py-16 text-slate-400">
        <i class="ph-fill ph-check-circle text-5xl text-slate-200"></i>
        <p class="text-sm">No pending deliveries. All caught up!</p>
      </div>
      <table v-else class="ps-table">
        <thead>
          <tr>
            <th style="width: 40px"><input type="checkbox" class="accent-blue-500" /></th>
            <th>Delivery #</th>
            <th>Supplier</th>
            <th>PO #</th>
            <th>Scheduled</th>
            <th>Carrier</th>
            <th>Tracking #</th>
            <th>Status</th>
            <th style="width: 130px"></th>
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
            <td class="text-slate-500">{{ d.carrierName ?? '—' }}</td>
            <td class="text-slate-500 text-xs">{{ d.trackingNo ?? '—' }}</td>
            <td><span :class="statusTag(d.status)">{{ d.status }}</span></td>
            <td>
              <button @click="openConfirm(d)" class="ps-btn ps-btn-primary" style="padding: 6px 14px; font-size: 12px;">
                <i class="ph ph-check"></i> Confirm
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

    <!-- Confirm Modal -->
    <Teleport to="body">
      <div v-if="showConfirm" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-5"
           @click.self="showConfirm = false">
        <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl">
          <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
            <h3 class="text-base font-bold text-slate-900">Confirm Delivery #{{ confirmItem?.deliveryId }}</h3>
            <button @click="showConfirm = false" class="text-slate-400 hover:text-slate-700 text-xl"><i class="ph ph-x"></i></button>
          </div>
          <div class="p-6">
            <p class="text-sm text-slate-500 mb-4">
              From <strong class="text-slate-700">{{ confirmItem?.supplierName }}</strong> — Scheduled {{ fmtDate(confirmItem?.scheduledDate) }}
            </p>

            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2 flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-700">Actual Delivery Date *</label>
                <input v-model="form.actualDate" type="date" class="ps-input" />
              </div>
              <div class="col-span-2 flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-700">Delivery Status</label>
                <div class="flex flex-col gap-2">
                  <button type="button" @click="form.isComplete = true"
                    :class="['flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all text-left',
                      form.isComplete ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300']">
                    <i class="ph ph-check-circle text-lg"></i> Complete — update inventory
                  </button>
                  <button type="button" @click="form.isComplete = false"
                    :class="['flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all text-left',
                      !form.isComplete ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300']">
                    <i class="ph ph-minus-circle text-lg"></i> Partial delivery
                  </button>
                </div>
              </div>
              <div class="col-span-2 flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-700">Notes</label>
                <input v-model="form.notes" placeholder="Optional notes…" class="ps-input" />
              </div>
            </div>

            <div v-if="form.isComplete" class="mt-4 flex items-start gap-2.5 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              <i class="ph ph-info text-lg mt-0.5 flex-shrink-0"></i>
              Confirming complete delivery will automatically update inventory stock levels.
            </div>
            <div v-if="formErr" class="mt-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {{ formErr }}
            </div>
          </div>
          <div class="flex justify-end gap-2.5 px-6 pb-6">
            <button @click="showConfirm = false" class="ps-btn ps-btn-outline">Cancel</button>
            <button @click="confirmDelivery" :disabled="confirming" class="ps-btn ps-btn-primary">
              <i v-if="confirming" class="ph ph-spinner animate-spin"></i>
              {{ confirming ? 'Confirming…' : 'Confirm Receipt' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
