<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '../composables/useToast.ts'
import { useConfirm } from '../composables/useConfirm.ts'
import { useAuthStore } from '../stores/auth.ts'
import {
  getBillingSubscription, getBillingPlans, getBillingHistory,
  requestRenewal, confirmRenewal, requestPlanChange, confirmPlanChange, cancelPlanChange
} from '../services/billingService.ts'

defineOptions({ name: 'BillingView' })

const route  = useRoute()
const router = useRouter()
const { toast } = useToast()
const { confirmDialog } = useConfirm()
const auth = useAuthStore()

const sub     = ref<any>(null)
const plans   = ref<any[]>([])
const history = ref<any[]>([])
const loading = ref(true)
const cycle   = ref<'Monthly' | 'Annually'>('Monthly')
const showHistory = ref(false)
const showPlanModal = ref(false)
const selectedPlan = ref<any>(null)
const processing = ref(false)

async function load() {
  loading.value = true
  try {
    const [s, p, h] = await Promise.all([
      getBillingSubscription(),
      getBillingPlans(),
      getBillingHistory()
    ])
    sub.value     = s
    plans.value   = p
    history.value = h
  } catch {
    toast('Failed to load billing information.', 'error')
  } finally {
    loading.value = false
  }
}

// Handle PayMongo return URL params
onMounted(async () => {
  const action = route.query.action as string
  const subId  = Number(route.query.subId)
  const c      = route.query.cycle as string

  if (route.query.payment === 'success' && action && subId) {
    try {
      if (action === 'renewal') {
        await confirmRenewal(subId, c || 'Monthly')
        toast('Subscription renewed successfully!', 'success')
        await auth.fetchProfile()
      } else if (action === 'planchange') {
        const newPlanId = Number(route.query.newPlanId)
        await confirmPlanChange(subId, newPlanId, c || 'Monthly')
        toast('Plan upgrade confirmed! Change will apply at end of billing period.', 'success')
      }
    } catch {
      toast('Payment processed but confirmation failed. Please contact support.', 'error')
    }
    // Clear query params
    router.replace({ path: '/dashboard/billing' })
  } else if (route.query.payment === 'cancelled') {
    toast('Payment cancelled.', 'error')
    router.replace({ path: '/dashboard/billing' })
  }

  await load()
})

const isExpired = computed(() =>
  sub.value && ['Expired', 'Suspended', 'Cancelled'].includes(sub.value.status)
)

const statusCls = computed(() => {
  if (!sub.value) return 'ps-tag-slate'
  const map: Record<string, string> = {
    Active: 'ps-tag-green', Trial: 'ps-tag-blue', Pending: 'ps-tag-amber',
    Expired: 'ps-tag-red', Suspended: 'ps-tag-orange', Cancelled: 'ps-tag-slate'
  }
  return map[sub.value.status] ?? 'ps-tag-slate'
})

const remainingPct = computed(() => {
  if (!sub.value || isExpired.value) return 0
  const total = daysBetween(sub.value.startDate, sub.value.endDate)
  return total > 0 ? Math.min(100, Math.round((sub.value.remainingDays / total) * 100)) : 0
})

function daysBetween(a: string, b: string) {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000))
}

function fmtDate(d: string) {
  return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
}

function annualPrice(p: any) {
  return Number((p.price * 12 * 0.93).toFixed(2))
}

function displayPrice(p: any) {
  return cycle.value === 'Annually' ? annualPrice(p) : p.price
}

const features = [
  { key: 'hasInventory',     label: 'Inventory Management', icon: 'ph-package' },
  { key: 'hasCashier',       label: 'POS / Cashier',        icon: 'ph-cash-register' },
  { key: 'hasSales',         label: 'Sales & History',      icon: 'ph-receipt' },
  { key: 'hasReports',       label: 'Analytics & Reports',  icon: 'ph-chart-bar' },
  { key: 'hasPurchasing',    label: 'Purchasing / Suppliers',icon: 'ph-shopping-cart-simple' },
  { key: 'hasForecasting',   label: 'Demand Forecasting',   icon: 'ph-chart-line-up' },
  { key: 'hasMultiBranch',   label: 'Multi-Branch Support', icon: 'ph-git-branch' },
  { key: 'hasUserManagement',label: 'User Management',      icon: 'ph-users' },
]

async function handleRenew() {
  if (!await confirmDialog(`Renew ${sub.value.plan.planName}?`)) return
  processing.value = true
  try {
    const res = await requestRenewal(cycle.value)
    if (res.checkoutUrl) {
      window.location.href = res.checkoutUrl
    } else {
      toast(res.message || 'Renewed.', 'success')
      await load()
      await auth.fetchProfile()
    }
  } catch (e: any) {
    toast(e.response?.data?.message ?? 'Failed to initiate renewal.', 'error')
  } finally { processing.value = false }
}

async function handlePlanChange() {
  if (!selectedPlan.value) return
  if (!await confirmDialog(
    selectedPlan.value.price > (sub.value?.plan?.price ?? 0)
      ? `Upgrade to ${selectedPlan.value.planName}? Payment is required.`
      : `Downgrade to ${selectedPlan.value.planName}? Change will apply at end of billing period.`
  )) return

  processing.value = true
  try {
    const res = await requestPlanChange(selectedPlan.value.planId, cycle.value)
    if (res.checkoutUrl) {
      window.location.href = res.checkoutUrl
    } else {
      toast(res.message || 'Plan change scheduled.', 'success')
      showPlanModal.value = false
      await load()
    }
  } catch (e: any) {
    toast(e.response?.data?.message ?? 'Failed to request plan change.', 'error')
  } finally { processing.value = false }
}

async function handleCancelChange() {
  if (!await confirmDialog('Cancel the pending plan change?')) return
  try {
    await cancelPlanChange()
    toast('Plan change cancelled.', 'success')
    await load()
  } catch { toast('Failed to cancel plan change.', 'error') }
}

const historyIcons: Record<string, string> = {
  Created: 'ph-plus-circle', Renewed: 'ph-arrow-clockwise',
  Expired: 'ph-warning', Suspended: 'ph-pause-circle', Cancelled: 'ph-x-circle',
  Reactivated: 'ph-check-circle', PlanChanged: 'ph-arrows-left-right',
  PlanChangeRequested: 'ph-clock', PlanChangeCancelled: 'ph-x',
  RenewalRequested: 'ph-credit-card', PlanChangeConfirmed: 'ph-check',
}
const historyClr: Record<string, string> = {
  Created: 'text-blue-500', Renewed: 'text-green-500', Expired: 'text-red-500',
  Suspended: 'text-amber-500', Cancelled: 'text-slate-400', Reactivated: 'text-green-600',
  PlanChanged: 'text-indigo-500', PlanChangeRequested: 'text-amber-500',
  PlanChangeCancelled: 'text-slate-400', RenewalRequested: 'text-blue-400',
  PlanChangeConfirmed: 'text-green-500',
}
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Header -->
    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Billing &amp; Subscription</h1>
        <p class="ps-page-sub">Manage your plan, renewal, and billing history.</p>
      </div>
      <button v-if="!loading && sub" class="ps-btn ps-btn-outline" @click="showHistory = !showHistory">
        <i class="ph ph-clock-clockwise"></i> {{ showHistory ? 'Hide' : 'View' }} History
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="grid gap-6 lg:grid-cols-3">
      <div v-for="i in 3" :key="i" class="ps-card p-6">
        <div class="space-y-3">
          <div class="h-5 bg-slate-100 rounded-lg animate-pulse w-2/3"></div>
          <div class="h-8 bg-slate-100 rounded-lg animate-pulse"></div>
          <div class="h-4 bg-slate-100 rounded-lg animate-pulse w-1/2"></div>
        </div>
      </div>
    </div>

    <template v-else-if="sub">

      <!-- Expired / Suspended banner -->
      <div v-if="isExpired"
        class="flex items-start gap-4 p-5 rounded-2xl border"
        :class="sub.status === 'Suspended' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'">
        <i class="ph-fill ph-warning-circle text-3xl mt-0.5"
           :class="sub.status === 'Suspended' ? 'text-amber-500' : 'text-red-500'"></i>
        <div class="flex-1">
          <p class="font-bold text-slate-800 text-sm">
            {{ sub.status === 'Suspended' ? 'Subscription Suspended' : 'Subscription Expired' }}
          </p>
          <p class="text-sm text-slate-600 mt-0.5">
            Your <strong>{{ sub.plan.planName }}</strong> expired on <strong>{{ fmtDate(sub.endDate) }}</strong>.
            Access to system features is temporarily locked until renewal.
          </p>
        </div>
        <button class="ps-btn ps-btn-primary flex-shrink-0" @click="handleRenew" :disabled="processing">
          <i class="ph ph-arrow-clockwise"></i> Renew Now
        </button>
      </div>

      <!-- Main grid -->
      <div class="grid gap-6 lg:grid-cols-3">

        <!-- Subscription card -->
        <div class="ps-card p-6 flex flex-col gap-5 lg:col-span-2">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Current Plan</p>
              <h2 class="text-2xl font-black text-slate-800">{{ sub.plan.planName }}</h2>
            </div>
            <span :class="['ps-tag text-sm px-3 py-1', statusCls]">{{ sub.status }}</span>
          </div>

          <!-- Pricing row -->
          <div class="flex items-end gap-1">
            <span class="text-3xl font-black text-slate-800">
              {{ sub.plan.price === 0 ? 'Free' : `₱${Number(sub.plan.price).toLocaleString()}` }}
            </span>
            <span v-if="sub.plan.price > 0" class="text-slate-400 text-sm mb-1">/ {{ sub.plan.billingCycle }}</span>
          </div>

          <!-- Dates + progress -->
          <div>
            <div class="flex justify-between text-xs text-slate-500 mb-2">
              <span>Start: {{ fmtDate(sub.startDate) }}</span>
              <span>Expires: {{ fmtDate(sub.endDate) }}</span>
            </div>
            <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div class="h-2 rounded-full transition-all duration-500"
                :class="remainingPct > 20 ? 'bg-emerald-400' : 'bg-red-400'"
                :style="{ width: remainingPct + '%' }"></div>
            </div>
            <p class="text-xs text-slate-500 mt-1.5">
              <template v-if="isExpired">Subscription has ended.</template>
              <template v-else>
                <strong>{{ sub.remainingDays }}</strong> day{{ sub.remainingDays !== 1 ? 's' : '' }} remaining
              </template>
            </p>
          </div>

          <!-- Pending change notice -->
          <div v-if="sub.pendingChange"
            class="flex items-center gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-sm">
            <i class="ph-fill ph-clock text-amber-500"></i>
            <div class="flex-1">
              <strong>Plan change scheduled:</strong> switching to
              <strong>{{ sub.pendingChange.newPlan.planName }}</strong>
              (₱{{ Number(sub.pendingChange.newPlan.price).toLocaleString() }}) on {{ fmtDate(sub.endDate) }}.
            </div>
            <button class="text-xs text-red-500 hover:underline font-semibold" @click="handleCancelChange">
              Cancel
            </button>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 flex-wrap pt-1">
            <button v-if="!isExpired" class="ps-btn ps-btn-primary"
              @click="handleRenew" :disabled="processing">
              <i class="ph ph-arrow-clockwise"></i> Renew / Extend
            </button>
            <button class="ps-btn ps-btn-outline" @click="showPlanModal = true" :disabled="processing">
              <i class="ph ph-arrows-left-right"></i> Change Plan
            </button>
          </div>
        </div>

        <!-- Features card -->
        <div class="ps-card p-6">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Plan Features</p>
          <div class="flex flex-col gap-2.5">
            <div v-for="f in features" :key="f.key"
              class="flex items-center gap-2.5 text-sm">
              <span class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                :class="sub.plan[f.key] ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-300'">
                <i :class="['ph-fill', f.key === 'hasInventory' ? 'ph-check' : 'ph-x', sub.plan[f.key] ? '' : 'opacity-60']"
                   class="text-xs"></i>
              </span>
              <span :class="sub.plan[f.key] ? 'text-slate-700' : 'text-slate-400 line-through'">{{ f.label }}</span>
            </div>
            <div class="flex items-center gap-2.5 text-sm mt-1">
              <span class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-slate-100 text-slate-500">
                <i class="ph-fill ph-stack text-xs"></i>
              </span>
              <span class="text-slate-600">
                Products: <strong>{{ sub.plan.maxProducts != null ? sub.plan.maxProducts.toLocaleString() : 'Unlimited' }}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- History -->
      <div v-if="showHistory" class="ps-card overflow-hidden">
        <div class="ps-table-toolbar">
          <div>
            <div class="ps-table-title">Subscription History</div>
            <div class="ps-table-subtitle">{{ history.length }} events</div>
          </div>
        </div>
        <div v-if="history.length === 0" class="flex items-center gap-3 p-6 text-slate-400 text-sm">
          <i class="ph ph-clock text-xl"></i> No history yet.
        </div>
        <div v-else class="divide-y divide-slate-100">
          <div v-for="h in history" :key="h.historyId"
            class="flex items-start gap-3 px-5 py-3.5">
            <i :class="['text-lg mt-0.5', historyIcons[h.action] ?? 'ph-circle', historyClr[h.action] ?? 'text-slate-400']"></i>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-slate-700">{{ h.action }}</p>
              <p class="text-xs text-slate-400 mt-0.5 truncate">{{ h.notes }}</p>
            </div>
            <span class="text-xs text-slate-400 whitespace-nowrap">{{ new Date(h.createdAt).toLocaleString() }}</span>
          </div>
        </div>
      </div>

    </template>

    <!-- No subscription state -->
    <div v-else-if="!loading"
      class="ps-card flex flex-col items-center gap-3 py-16 text-slate-400">
      <i class="ph-fill ph-credit-card text-5xl text-slate-200"></i>
      <p class="text-sm">No subscription found. Contact your administrator.</p>
    </div>

    <!-- Plan comparison modal -->
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showPlanModal" class="ps-modal-backdrop" @click.self="showPlanModal = false">
          <div class="ps-modal-card" style="max-width: 780px">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">Choose a Plan</h3>
              <button class="ps-modal-close" @click="showPlanModal = false"><i class="ph ph-x"></i></button>
            </div>
            <div class="ps-modal-body">

              <!-- Billing cycle toggle -->
              <div class="flex items-center justify-center gap-3 mb-6">
                <button :class="['ps-btn text-sm', cycle === 'Monthly' ? 'ps-btn-primary' : 'ps-btn-outline']"
                  @click="cycle = 'Monthly'">Monthly</button>
                <button :class="['ps-btn text-sm', cycle === 'Annually' ? 'ps-btn-primary' : 'ps-btn-outline']"
                  @click="cycle = 'Annually'">Annual <span class="text-xs ml-1 opacity-75">7% off</span></button>
              </div>

              <div class="grid gap-4 sm:grid-cols-3">
                <div v-for="p in plans" :key="p.planId"
                  class="rounded-2xl border-2 p-5 cursor-pointer transition-all"
                  :class="selectedPlan?.planId === p.planId
                    ? 'border-indigo-500 bg-indigo-50'
                    : sub?.plan?.planId === p.planId
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'"
                  @click="selectedPlan = p">
                  <div class="flex items-center justify-between mb-3">
                    <p class="font-bold text-slate-800">{{ p.planName }}</p>
                    <span v-if="sub?.plan?.planId === p.planId"
                      class="ps-tag ps-tag-green text-xs">Current</span>
                  </div>
                  <p class="text-2xl font-black text-slate-800 mb-1">
                    {{ p.price === 0 ? 'Free' : `₱${displayPrice(p).toLocaleString()}` }}
                    <span v-if="p.price > 0" class="text-sm font-medium text-slate-400">
                      /{{ cycle === 'Annually' ? 'yr' : 'mo' }}
                    </span>
                  </p>
                  <p v-if="cycle === 'Annually' && p.price > 0" class="text-xs text-emerald-600 font-semibold mb-3">
                    Save ₱{{ (p.price * 12 - annualPrice(p)).toLocaleString(undefined, { maximumFractionDigits: 0 }) }}/yr
                  </p>
                  <ul class="space-y-1.5 mt-3">
                    <li v-for="f in features" :key="f.key" class="flex items-center gap-2 text-xs">
                      <i :class="p[f.key] ? 'ph-fill ph-check-circle text-emerald-500' : 'ph ph-x-circle text-slate-300'"></i>
                      <span :class="p[f.key] ? 'text-slate-600' : 'text-slate-300'">{{ f.label }}</span>
                    </li>
                    <li class="flex items-center gap-2 text-xs">
                      <i class="ph-fill ph-stack text-slate-400"></i>
                      <span class="text-slate-600">{{ p.maxProducts != null ? `${p.maxProducts} products` : 'Unlimited products' }}</span>
                    </li>
                  </ul>
                </div>
              </div>

            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="showPlanModal = false">Cancel</button>
              <button class="ps-btn ps-btn-primary"
                :disabled="!selectedPlan || selectedPlan.planId === sub?.plan?.planId || processing"
                @click="handlePlanChange">
                <i v-if="processing" class="ph ph-spinner animate-spin"></i>
                {{ selectedPlan && selectedPlan.price > (sub?.plan?.price ?? 0) ? 'Upgrade Plan' : 'Schedule Downgrade' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>
