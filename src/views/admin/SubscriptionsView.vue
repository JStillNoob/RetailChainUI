<script setup lang="ts">
import { useConfirm } from '../../composables/useConfirm'
import { useToast } from '../../composables/useToast.ts'
import { ref, computed, onMounted } from 'vue'
import {
  getPlans, createPlan, updatePlan, deletePlan,
  getSubscriptions, createSubscription, renewSubscription,
  changeSubscriptionStatus, deleteSubscription, getSubscriptionHistory, getPendingPlanChanges, getTenants
} from '../../services/superadmin.ts'
import PsPagination from '../../components/PsPagination.vue'

defineOptions({ name: 'SubscriptionsView' })

const { confirmDialog } = useConfirm()
const { toast } = useToast()

// ── Data ──────────────────────────────────────────────────────────────────────
const plans         = ref<any[]>([])
const subscriptions = ref<any[]>([])
const tenants       = ref<any[]>([])
const pending       = ref<any[]>([])
const loading       = ref(true)
const statusFilter  = ref('')

// ── Plan modal ────────────────────────────────────────────────────────────────
const showPlanModal = ref(false)
const isEditPlan    = ref(false)
const editPlanId    = ref<number | null>(null)
const planForm = ref({
  planName: '', price: '', billingCycle: 'Monthly', features: '',
  hasInventory: true, hasCashier: true, hasSales: true, hasReports: true,
  hasPurchasing: true, hasForecasting: false, hasMultiBranch: false,
  hasUserManagement: true, maxProducts: '', trialDays: '0'
})

// ── Create subscription modal ─────────────────────────────────────────────────
const showCreateSub  = ref(false)
const createSubForm  = ref({ tenantId: '', planId: '', billingCycle: 'Monthly', status: 'Active' })
const creatingSub    = ref(false)

// ── History drawer ────────────────────────────────────────────────────────────
const showHistory    = ref(false)
const historySubId   = ref<number | null>(null)
const historyItems   = ref<any[]>([])
const historyLoading = ref(false)

// ── Pagination ────────────────────────────────────────────────────────────────
const subsPage     = ref(1)
const subsPageSize = ref(10)
const subsPaged    = computed(() =>
  subscriptions.value.slice((subsPage.value - 1) * subsPageSize.value, subsPage.value * subsPageSize.value))

async function load() {
  loading.value = true
  try {
    const [p, s, t, pc] = await Promise.all([
      getPlans(),
      getSubscriptions(statusFilter.value || undefined),
      getTenants(1, 200),
      getPendingPlanChanges()
    ])
    plans.value         = p
    subscriptions.value = s
    tenants.value       = t.items ?? t
    pending.value       = pc
  } finally { loading.value = false }
}
onMounted(load)

// ── Plans ─────────────────────────────────────────────────────────────────────
function openNewPlan() {
  isEditPlan.value = false; editPlanId.value = null
  planForm.value = {
    planName: '', price: '', billingCycle: 'Monthly', features: '',
    hasInventory: true, hasCashier: true, hasSales: true, hasReports: true,
    hasPurchasing: true, hasForecasting: false, hasMultiBranch: false,
    hasUserManagement: true, maxProducts: '', trialDays: '0'
  }
  showPlanModal.value = true
}

function openEditPlan(p: any) {
  isEditPlan.value = true; editPlanId.value = p.planId
  planForm.value = {
    planName: p.planName, price: String(p.price), billingCycle: p.billingCycle ?? 'Monthly',
    features: p.features ?? '',
    hasInventory: p.hasInventory, hasCashier: p.hasCashier, hasSales: p.hasSales,
    hasReports: p.hasReports, hasPurchasing: p.hasPurchasing, hasForecasting: p.hasForecasting,
    hasMultiBranch: p.hasMultiBranch, hasUserManagement: p.hasUserManagement,
    maxProducts: p.maxProducts != null ? String(p.maxProducts) : '',
    trialDays: String(p.trialDays ?? 0)
  }
  showPlanModal.value = true
}

async function submitPlan() {
  const payload = {
    ...planForm.value,
    price: Number.parseFloat(planForm.value.price) || 0,
    maxProducts: planForm.value.maxProducts ? Number.parseInt(planForm.value.maxProducts) : null,
    trialDays: Number.parseInt(planForm.value.trialDays) || 0
  }
  try {
    if (isEditPlan.value && editPlanId.value) {
      await updatePlan(editPlanId.value, payload); toast('Plan updated.')
    } else {
      await createPlan(payload); toast('Plan created.')
    }
    showPlanModal.value = false; await load()
  } catch (e: any) { toast(e.response?.data?.message ?? 'Failed to save plan.', 'error') }
}

async function removePlan(p: any) {
  if (!await confirmDialog(`Delete "${p.planName}"? This cannot be undone.`)) return
  try { await deletePlan(p.planId); toast('Plan deleted.'); await load() }
  catch (e: any) { toast(e.response?.data?.message ?? 'Cannot delete plan.', 'error') }
}

// ── Subscription actions ──────────────────────────────────────────────────────
async function submitCreateSub() {
  if (!createSubForm.value.tenantId || !createSubForm.value.planId) {
    toast('Select a tenant and plan.', 'error'); return
  }
  creatingSub.value = true
  try {
    await createSubscription({
      tenantId: Number.parseInt(createSubForm.value.tenantId),
      planId: Number.parseInt(createSubForm.value.planId),
      billingCycle: createSubForm.value.billingCycle,
      status: createSubForm.value.status || null
    })
    toast('Subscription created.'); showCreateSub.value = false; await load()
  } catch (e: any) { toast(e.response?.data?.message ?? 'Failed to create.', 'error') }
  finally { creatingSub.value = false }
}

async function doRenew(s: any) {
  const cycle = await promptCycle(); if (!cycle) return
  try { await renewSubscription(s.subscriptionId, cycle); toast('Renewed.'); await load() }
  catch (e: any) { toast(e.response?.data?.message ?? 'Failed to renew.', 'error') }
}

async function doStatus(s: any, status: string) {
  if (!await confirmDialog(`Set status to "${status}" for ${s.tenantName}?`)) return
  try { await changeSubscriptionStatus(s.subscriptionId, status); toast(`Status set to ${status}.`); await load() }
  catch (e: any) { toast(e.response?.data?.message ?? 'Failed.', 'error') }
}

async function doDelete(s: any) {
  if (!await confirmDialog(`Delete this ${s.planName} subscription for ${s.tenantName}? This cannot be undone.`, {
    title: 'Delete Subscription', confirmText: 'Delete', confirmColor: 'ps-btn-danger'
  })) return
  try { await deleteSubscription(s.subscriptionId); toast('Subscription deleted.'); await load() }
  catch (e: any) { toast(e.response?.data?.message ?? 'Failed to delete.', 'error') }
}

async function viewHistory(s: any) {
  historySubId.value = s.subscriptionId
  historyLoading.value = true
  showHistory.value = true
  try { historyItems.value = await getSubscriptionHistory(s.subscriptionId) }
  finally { historyLoading.value = false }
}

function promptCycle(): Promise<string | null> {
  return Promise.resolve(confirm('Use Annual billing? (Cancel = Monthly)') ? 'Annually' : 'Monthly')
}

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const statusCls: Record<string, string> = {
  Active: 'ps-tag-green', Trial: 'ps-tag-blue', Expired: 'ps-tag-red',
  Suspended: 'ps-tag-orange', Cancelled: 'ps-tag-slate', Pending: 'ps-tag-amber'
}

const planFeatures = [
  { key: 'hasInventory', label: 'Inventory' }, { key: 'hasCashier', label: 'Cashier' },
  { key: 'hasSales', label: 'Sales' }, { key: 'hasReports', label: 'Reports' },
  { key: 'hasPurchasing', label: 'Purchasing' }, { key: 'hasForecasting', label: 'Forecasting' },
  { key: 'hasMultiBranch', label: 'Multi-Branch' }, { key: 'hasUserManagement', label: 'User Mgmt' },
]
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Header -->
    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Subscriptions &amp; Billing</h1>
        <p class="ps-page-sub">Manage plans, tenant subscriptions, and billing.</p>
      </div>
      <div class="flex gap-2">
        <button class="ps-btn ps-btn-outline" @click="showCreateSub = true">
          <i class="ph ph-plus"></i> Assign Subscription
        </button>
        <button class="ps-btn ps-btn-primary" @click="openNewPlan">
          <i class="ph ph-plus"></i> New Plan
        </button>
      </div>
    </div>

    <!-- Pending plan changes banner -->
    <div v-if="pending.length > 0"
      class="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm">
      <i class="ph-fill ph-clock text-amber-500 text-xl flex-shrink-0"></i>
      <p class="flex-1">
        <strong>{{ pending.length }}</strong> pending plan change{{ pending.length !== 1 ? 's' : '' }} scheduled.
        They will be auto-applied at each tenant's billing cycle end.
      </p>
    </div>

    <!-- Plans table -->
    <div class="ps-card overflow-hidden">
      <div class="ps-table-toolbar">
        <div>
          <div class="ps-table-title">Subscription Plans</div>
          <div class="ps-table-subtitle">{{ plans.length }} plan{{ plans.length !== 1 ? 's' : '' }}</div>
        </div>
      </div>
      <div v-if="loading" class="p-6 space-y-3">
        <div v-for="i in 3" :key="i" class="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
      <table v-else class="ps-table">
        <thead>
          <tr>
            <th>Plan</th><th>Price</th><th>Cycle</th><th>Trial</th>
            <th>Features</th><th>Max Products</th><th>Subscribers</th>
            <th style="width: 80px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in plans" :key="p.planId">
            <td class="font-bold text-slate-800">{{ p.planName }}</td>
            <td class="font-semibold text-slate-700">{{ p.price === 0 ? 'Free' : `₱${Number(p.price).toLocaleString()}` }}</td>
            <td class="text-slate-500">{{ p.billingCycle }}</td>
            <td class="text-slate-500">{{ p.trialDays > 0 ? `${p.trialDays}d` : '—' }}</td>
            <td>
              <div class="flex flex-wrap gap-1">
                <span v-for="f in planFeatures" :key="f.key"
                  :class="['text-xs px-1.5 py-0.5 rounded font-semibold', p[f.key] ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-300']">
                  {{ f.label }}
                </span>
              </div>
            </td>
            <td class="text-slate-500">{{ p.maxProducts != null ? p.maxProducts.toLocaleString() : '∞' }}</td>
            <td><span class="ps-tag ps-tag-green">{{ p.activeCount }}</span></td>
            <td>
              <div class="flex gap-1">
                <button @click="openEditPlan(p)"
                  class="w-7 h-7 inline-flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all">
                  <i class="ph ph-pencil-simple text-sm"></i>
                </button>
                <button @click="removePlan(p)"
                  class="w-7 h-7 inline-flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all">
                  <i class="ph ph-trash text-sm"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Subscriptions table -->
    <div class="ps-card overflow-hidden">
      <div class="ps-table-toolbar">
        <div>
          <div class="ps-table-title">All Subscriptions</div>
          <div class="ps-table-subtitle">{{ subscriptions.length }} total</div>
        </div>
        <div class="flex items-center gap-3">
          <select v-model="statusFilter" @change="load" class="ps-pg-size" style="padding: 9px 14px;">
            <option value="">All Status</option>
            <option>Active</option><option>Trial</option><option>Expired</option>
            <option>Suspended</option><option>Cancelled</option>
          </select>
          <button class="ps-btn ps-btn-dark"><i class="ph ph-download-simple"></i> Export</button>
        </div>
      </div>
      <table v-if="!loading" class="ps-table">
        <thead>
          <tr>
            <th>Tenant</th><th>Plan</th><th>Price</th>
            <th>Start</th><th>End</th><th>Status</th><th>Pending</th>
            <th style="width: 50px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in subsPaged" :key="s.subscriptionId">
            <td class="font-semibold text-slate-800">{{ s.tenantName }}</td>
            <td class="text-slate-700">{{ s.planName }}</td>
            <td class="font-semibold text-slate-800">{{ s.price === 0 ? 'Free' : `₱${Number(s.price).toLocaleString()}` }}</td>
            <td class="text-slate-500 text-xs">{{ fmtDate(s.startDate) }}</td>
            <td class="text-slate-500 text-xs">{{ fmtDate(s.endDate) }}</td>
            <td>
              <span :class="['ps-tag', statusCls[s.status] ?? 'ps-tag-slate']">{{ s.status }}</span>
            </td>
            <td>
              <span v-if="s.hasPendingChange" class="ps-tag ps-tag-amber text-xs">Change queued</span>
              <span v-else class="text-slate-300 text-xs">—</span>
            </td>
            <td>
              <div class="relative group">
                <button class="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all">
                  <i class="ph ph-dots-three"></i>
                </button>
                <div class="absolute right-0 top-9 z-20 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 text-sm hidden group-hover:block">
                  <button @click="doRenew(s)" class="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                    <i class="ph ph-arrow-clockwise text-slate-400"></i> Renew
                  </button>
                  <button @click="doStatus(s, 'Active')" class="w-full text-left px-3.5 py-2 text-green-600 hover:bg-green-50 flex items-center gap-2">
                    <i class="ph ph-check-circle"></i> Set Active
                  </button>
                  <button @click="doStatus(s, 'Suspended')" class="w-full text-left px-3.5 py-2 text-amber-600 hover:bg-amber-50 flex items-center gap-2">
                    <i class="ph ph-pause-circle"></i> Suspend
                  </button>
                  <button @click="doStatus(s, 'Cancelled')" class="w-full text-left px-3.5 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2">
                    <i class="ph ph-x-circle"></i> Cancel
                  </button>
                  <hr class="my-1 border-slate-100">
                  <button @click="viewHistory(s)" class="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                    <i class="ph ph-clock-clockwise text-slate-400"></i> View History
                  </button>
                  <template v-if="s.status !== 'Active' && s.status !== 'Trial'">
                    <hr class="my-1 border-slate-100">
                    <button @click="doDelete(s)" class="w-full text-left px-3.5 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2">
                      <i class="ph ph-trash"></i> Delete
                    </button>
                  </template>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <PsPagination v-if="!loading" v-model:page="subsPage" v-model:pageSize="subsPageSize"
        :total="subscriptions.length" record-label="subscriptions" />
    </div>

    <!-- Plan create/edit modal -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showPlanModal" class="ps-modal-backdrop" @click.self="showPlanModal = false">
          <div class="ps-modal-card" style="max-width: 640px">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">{{ isEditPlan ? 'Edit Plan' : 'Create Plan' }}</h3>
              <button class="ps-modal-close" @click="showPlanModal = false"><i class="ph ph-x"></i></button>
            </div>
            <div class="ps-modal-body">
              <div class="grid grid-cols-3 gap-3 mb-3">
                <div><label class="ps-label">Plan Name</label>
                  <input v-model="planForm.planName" class="ps-input" placeholder="e.g. Premium Plan" /></div>
                <div><label class="ps-label">Price (₱)</label>
                  <input v-model="planForm.price" type="number" class="ps-input" placeholder="0 for free" /></div>
                <div><label class="ps-label">Billing Cycle</label>
                  <select v-model="planForm.billingCycle" class="ps-input">
                    <option>Monthly</option><option>Quarterly</option><option>Annually</option>
                  </select></div>
                <div><label class="ps-label">Max Products</label>
                  <input v-model="planForm.maxProducts" type="number" class="ps-input" placeholder="blank = unlimited" /></div>
                <div><label class="ps-label">Trial Days</label>
                  <input v-model="planForm.trialDays" type="number" class="ps-input" placeholder="0" /></div>
              </div>
              <div class="mb-3">
                <label class="ps-label">Description / Features (display text)</label>
                <textarea v-model="planForm.features" rows="2" class="ps-input" placeholder="Short description shown to tenants…"></textarea>
              </div>
              <div>
                <label class="ps-label mb-2 block">Feature Access</label>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <label v-for="f in planFeatures" :key="f.key"
                    class="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm select-none"
                    :class="planForm[f.key as keyof typeof planForm] ? 'border-indigo-300 bg-indigo-50' : ''">
                    <input type="checkbox" v-model="planForm[f.key as keyof typeof planForm]" class="accent-indigo-600" />
                    {{ f.label }}
                  </label>
                </div>
              </div>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="showPlanModal = false">Cancel</button>
              <button class="ps-btn ps-btn-primary" @click="submitPlan">
                {{ isEditPlan ? 'Save Changes' : 'Create Plan' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Create subscription modal -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showCreateSub" class="ps-modal-backdrop" @click.self="showCreateSub = false">
          <div class="ps-modal-card" style="max-width: 480px">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">Assign Subscription</h3>
              <button class="ps-modal-close" @click="showCreateSub = false"><i class="ph ph-x"></i></button>
            </div>
            <div class="ps-modal-body">
              <div class="grid grid-cols-2 gap-3">
                <div class="col-span-2">
                  <label class="ps-label">Tenant</label>
                  <select v-model="createSubForm.tenantId" class="ps-input">
                    <option value="">Select tenant…</option>
                    <option v-for="t in tenants" :key="t.tenantId" :value="t.tenantId">
                      {{ t.name }} (#{{ t.tenantId }})
                    </option>
                  </select>
                </div>
                <div>
                  <label class="ps-label">Plan</label>
                  <select v-model="createSubForm.planId" class="ps-input">
                    <option value="">Select plan…</option>
                    <option v-for="p in plans" :key="p.planId" :value="p.planId">{{ p.planName }}</option>
                  </select>
                </div>
                <div>
                  <label class="ps-label">Billing Cycle</label>
                  <select v-model="createSubForm.billingCycle" class="ps-input">
                    <option>Monthly</option><option>Annually</option>
                  </select>
                </div>
                <div>
                  <label class="ps-label">Initial Status</label>
                  <select v-model="createSubForm.status" class="ps-input">
                    <option>Active</option><option>Trial</option><option>Pending</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="showCreateSub = false">Cancel</button>
              <button class="ps-btn ps-btn-primary" :disabled="creatingSub" @click="submitCreateSub">
                <i v-if="creatingSub" class="ph ph-spinner animate-spin"></i>
                Assign Subscription
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- History drawer -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showHistory" class="ps-modal-backdrop" @click.self="showHistory = false">
          <div class="ps-modal-card" style="max-width: 520px">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">Subscription History #{{ historySubId }}</h3>
              <button class="ps-modal-close" @click="showHistory = false"><i class="ph ph-x"></i></button>
            </div>
            <div class="ps-modal-body max-h-96 overflow-y-auto">
              <div v-if="historyLoading" class="space-y-3">
                <div v-for="i in 4" :key="i" class="h-10 bg-slate-100 rounded-xl animate-pulse"></div>
              </div>
              <div v-else-if="historyItems.length === 0" class="text-center py-8 text-slate-400 text-sm">
                No history found.
              </div>
              <div v-else class="divide-y divide-slate-100">
                <div v-for="h in historyItems" :key="h.historyId" class="py-3">
                  <div class="flex items-center justify-between mb-0.5">
                    <span class="text-sm font-semibold text-slate-700">{{ h.action }}</span>
                    <span class="text-xs text-slate-400">{{ new Date(h.createdAt).toLocaleString() }}</span>
                  </div>
                  <p class="text-xs text-slate-500">{{ h.notes }}</p>
                </div>
              </div>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="showHistory = false">Close</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>
