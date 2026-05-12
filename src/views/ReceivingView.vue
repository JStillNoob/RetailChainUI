<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '../services/api.ts'
import { useToast } from '../composables/useToast.ts'
import { useValidation } from '../composables/useValidation.ts'
import PsPagination from '../components/PsPagination.vue'

defineOptions({ name: 'ReceivingView' })

const { toast }  = useToast()
const { parseApiError } = useValidation()
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
const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))

// ── Confirm Modal ──────────────────────────────────────────────────────────────
const showConfirm = ref(false)
const confirmItem = ref<any>(null)
const confirming  = ref(false)
const formErr     = ref('')
const actualDate  = ref(new Date().toISOString().slice(0, 10))
const notes       = ref('')

interface LineInput { poItemId: number; productName: string; orderedQty: number; alreadyReceived: number; remaining: number; toReceive: string }
const lineInputs = ref<LineInput[]>([])

function openConfirm(d: any) {
  confirmItem.value = d
  actualDate.value  = new Date().toISOString().slice(0, 10)
  notes.value       = ''
  formErr.value     = ''
  lineInputs.value  = (d.items ?? []).map((i: any) => ({
    poItemId:        i.poItemId,
    productName:     i.productName,
    orderedQty:      Number(i.quantity),
    alreadyReceived: Number(i.receivedQty),
    remaining:       Number(i.remainingQty),
    toReceive:       String(Number(i.remainingQty)),
  }))
  showConfirm.value = true
}

const allFullyReceived = computed(() =>
  lineInputs.value.every(i => Number(i.toReceive) >= i.remaining && i.remaining > 0)
)

async function confirmDelivery() {
  formErr.value = ''
  const items = lineInputs.value
    .filter(i => Number(i.toReceive) > 0)
    .map(i => ({ poItemId: i.poItemId, receivedQty: Number(i.toReceive) }))

  if (!items.length) { formErr.value = 'Enter a received quantity for at least one item.'; return }

  for (const i of lineInputs.value) {
    if (Number(i.toReceive) > i.remaining) {
      formErr.value = `"${i.productName}": received qty exceeds remaining (${i.remaining}).`
      return
    }
  }

  confirming.value = true
  try {
    const res = await api.put(`/warehouse/receiving/${confirmItem.value.deliveryId}/confirm`, {
      actualDate: actualDate.value,
      notes:      notes.value || null,
      items,
    }).then(r => r.data)
    toast(res.message ?? 'Receipt recorded.')
    showConfirm.value = false
    await load()
  } catch (e: any) {
    formErr.value = parseApiError(e)
  } finally { confirming.value = false }
}

const fmtDate   = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const statusTag = (s: string) => s === 'In-Transit' ? 'ps-tag ps-tag-amber' : 'ps-tag ps-tag-blue'
const rcvTag    = (s: string) => ({ Received: 'ps-tag ps-tag-green', Partial: 'ps-tag ps-tag-amber', Pending: 'ps-tag ps-tag-slate' }[s] ?? 'ps-tag ps-tag-slate')
const avatarCls = (id: number) => `ps-avatar ps-avatar-${id % 8}`
</script>

<template>
  <div class="flex flex-col gap-6">

    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Receiving</h1>
        <p class="ps-page-sub">Confirm inbound deliveries and record received quantities per line item.</p>
      </div>
      <button @click="load" :disabled="loading" class="ps-btn ps-btn-outline">
        <i class="ph ph-arrows-clockwise" :class="{ 'animate-spin': loading }"></i> Refresh
      </button>
    </div>

    <div class="ps-card overflow-hidden">
      <div class="ps-table-toolbar">
        <div>
          <div class="ps-table-title">Inbound Deliveries</div>
          <div class="ps-table-subtitle">{{ filtered.length }} pending</div>
        </div>
        <div class="ps-search">
          <i class="ph ph-magnifying-glass"></i>
          <input v-model="search" placeholder="Search by delivery, supplier or PO…" />
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
            <th style="width:40px"><input type="checkbox" class="accent-blue-500" /></th>
            <th>Delivery #</th>
            <th>Supplier</th>
            <th>PO #</th>
            <th>Scheduled</th>
            <th>Carrier</th>
            <th>Tracking #</th>
            <th>Status</th>
            <th>Items</th>
            <th style="width:130px"></th>
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
              <div class="flex flex-wrap gap-1">
                <span v-for="i in (d.items ?? [])" :key="i.poItemId" :class="rcvTag(i.receivingStatus)" :title="i.productName">
                  {{ i.receivingStatus === 'Received' ? '✓' : i.receivingStatus === 'Partial' ? '~' : '○' }}
                </span>
              </div>
            </td>
            <td>
              <button @click="openConfirm(d)" class="ps-btn ps-btn-primary" style="padding:6px 14px;font-size:12px;">
                <i class="ph ph-check"></i> Receive
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
        record-label="deliveries"
      />
    </div>

    <!-- ── Confirm Modal ───────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showConfirm" class="ps-modal-backdrop" @click.self="showConfirm = false">
          <div class="ps-modal-card" style="max-width:700px">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">Receive Delivery #{{ confirmItem?.deliveryId }}</h3>
              <button class="ps-modal-close" @click="showConfirm = false"><i class="ph ph-x"></i></button>
            </div>
            <div class="ps-modal-body">
              <p class="text-sm text-slate-500">
                From <strong class="text-slate-700">{{ confirmItem?.supplierName }}</strong> —
                Scheduled {{ fmtDate(confirmItem?.scheduledDate) }}
              </p>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="ps-label">Actual Receipt Date *</label>
                  <input v-model="actualDate" type="date" class="ps-input" />
                </div>
                <div>
                  <label class="ps-label">Notes</label>
                  <input v-model="notes" placeholder="Optional receiving notes…" class="ps-input" />
                </div>
              </div>

              <!-- Per-item quantity table -->
              <div>
                <div class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Line Items — Enter Received Quantities</div>
                <div class="border border-slate-200 rounded-lg overflow-hidden">
                  <div class="grid bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider"
                    style="grid-template-columns:1fr 90px 90px 90px 120px;gap:8px">
                    <span>Product</span>
                    <span class="text-right">Ordered</span>
                    <span class="text-right">Received</span>
                    <span class="text-right">Remaining</span>
                    <span class="text-right">Receiving Now</span>
                  </div>
                  <div v-for="item in lineInputs" :key="item.poItemId"
                    class="grid items-center px-3 py-2 border-t border-slate-100"
                    style="grid-template-columns:1fr 90px 90px 90px 120px;gap:8px"
                    :class="item.remaining <= 0 ? 'opacity-40' : ''">
                    <span class="text-sm text-slate-700 truncate">{{ item.productName }}</span>
                    <span class="text-right text-sm text-slate-500">{{ item.orderedQty }}</span>
                    <span class="text-right text-sm font-medium" :class="item.alreadyReceived > 0 ? 'text-emerald-600' : 'text-slate-400'">
                      {{ item.alreadyReceived }}
                    </span>
                    <span class="text-right text-sm font-semibold" :class="item.remaining > 0 ? 'text-amber-600' : 'text-slate-400'">
                      {{ item.remaining }}
                    </span>
                    <input v-if="item.remaining > 0" v-model="item.toReceive" type="number" min="0" :max="item.remaining"
                      class="ps-input text-right" style="padding:5px 8px" />
                    <span v-else class="text-right text-[11px] text-emerald-600 font-semibold pr-2">
                      <i class="ph ph-check-circle"></i> Done
                    </span>
                  </div>
                </div>
              </div>

              <div v-if="allFullyReceived" class="flex items-start gap-2.5 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                <i class="ph ph-info text-lg mt-0.5 flex-shrink-0"></i>
                All items fully received — delivery will be marked <strong>Delivered</strong> and inventory updated.
              </div>
              <div v-else class="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                <i class="ph ph-warning text-lg mt-0.5 flex-shrink-0"></i>
                Partial receipt — delivery will be marked <strong>Partially-Delivered</strong>. You can receive the rest later.
              </div>

              <div v-if="formErr" class="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{{ formErr }}</div>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="showConfirm = false">Cancel</button>
              <button class="ps-btn ps-btn-primary" :disabled="confirming" @click="confirmDelivery">
                <i v-if="confirming" class="ph ph-spinner animate-spin"></i>
                {{ confirming ? 'Confirming…' : 'Confirm Receipt' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
