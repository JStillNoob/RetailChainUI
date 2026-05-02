<script setup lang="ts">
import { useConfirm } from '../../composables/useConfirm'
import { ref, computed, onMounted } from 'vue'
import { getPlans, createPlan, deletePlan, getSubscriptions } from '../../services/superadmin.ts'

defineOptions({ name: 'SubscriptionsView' })

const { confirmDialog } = useConfirm()
const plans         = ref<any[]>([])
const subscriptions = ref<any[]>([])
const loading       = ref(true)
const showCreate    = ref(false)
const statusFilter  = ref('')
const form = ref({ planName: '', price: '', billingCycle: 'Monthly', features: '' })

async function load() {
  loading.value = true
  try {
    const [p, s] = await Promise.all([getPlans(), getSubscriptions(statusFilter.value || undefined)])
    plans.value = p; subscriptions.value = s
  } finally { loading.value = false }
}
onMounted(load)

async function submitPlan() {
  await createPlan({ ...form.value, price: parseFloat(form.value.price) })
  showCreate.value = false
  form.value = { planName: '', price: '', billingCycle: 'Monthly', features: '' }
  await load()
}
async function removePlan(id: number) {
  if (!await confirmDialog('Delete this plan?')) return
  await deletePlan(id); await load()
}

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

// Pagination for subscriptions table
const subsPage       = ref(1)
const subsPageSize   = ref(10)
const subsTotalPages = computed(() => Math.max(1, Math.ceil(subscriptions.value.length / subsPageSize.value)))
const subsPaged      = computed(() => subscriptions.value.slice((subsPage.value - 1) * subsPageSize.value, subsPage.value * subsPageSize.value))
function subsGoTo(p: number) { if (p >= 1 && p <= subsTotalPages.value) subsPage.value = p }
</script>

<template>
  <div class="flex flex-col gap-6">

    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-title">Subscriptions &amp; Billing</h1>
        <p class="ps-page-sub">Plans and active customer subscriptions.</p>
      </div>
      <button class="ps-btn ps-btn-primary" @click="showCreate = true">
        <i class="ph ph-plus"></i> New Plan
      </button>
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
            <th>Plan</th>
            <th>Price</th>
            <th>Cycle</th>
            <th>Active Subscribers</th>
            <th style="width: 50px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in plans" :key="p.planId">
            <td class="font-bold text-slate-800">{{ p.planName }}</td>
            <td class="font-semibold text-slate-700">₱{{ Number(p.price).toLocaleString() }}</td>
            <td class="text-slate-500">{{ p.billingCycle }}</td>
            <td><span class="ps-tag ps-tag-green">{{ p.activeCount }}</span></td>
            <td>
              <button @click="removePlan(p.planId)"
                class="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all">
                <i class="ph ph-trash"></i>
              </button>
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
          <div class="ps-table-subtitle">{{ subscriptions.length }} subscription{{ subscriptions.length !== 1 ? 's' : '' }}</div>
        </div>
        <div class="flex items-center gap-3">
          <select v-model="statusFilter" @change="load" class="ps-pg-size" style="padding: 9px 14px;">
            <option value="">All</option>
            <option>Active</option>
            <option>Expired</option>
          </select>
          <button class="ps-btn ps-btn-dark"><i class="ph ph-download-simple"></i> Export</button>
        </div>
      </div>
      <table v-if="!loading" class="ps-table">
        <thead>
          <tr>
            <th>Tenant</th>
            <th>Plan</th>
            <th>Price</th>
            <th>Start</th>
            <th>End</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in subsPaged" :key="s.subscriptionId">
            <td class="font-semibold text-slate-800">{{ s.tenantName }}</td>
            <td class="text-slate-700">{{ s.planName }}</td>
            <td class="font-semibold text-slate-800">₱{{ Number(s.price).toLocaleString() }}</td>
            <td class="text-slate-500">{{ fmtDate(s.startDate) }}</td>
            <td class="text-slate-500">{{ fmtDate(s.endDate) }}</td>
            <td><span :class="['ps-tag', s.status === 'Active' ? 'ps-tag-green' : 'ps-tag-slate']">{{ s.status }}</span></td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="!loading && subscriptions.length > 0" class="ps-pagination">
        <button class="ps-pg-btn" :disabled="subsPage === 1" @click="subsGoTo(1)"><i class="ph ph-caret-double-left"></i></button>
        <button class="ps-pg-btn" :disabled="subsPage === 1" @click="subsGoTo(subsPage - 1)"><i class="ph ph-caret-left"></i></button>
        <button v-for="p in subsTotalPages" :key="p" :class="['ps-pg-btn', p === subsPage && 'ps-pg-btn--active']" @click="subsGoTo(p)">{{ p }}</button>
        <button class="ps-pg-btn" :disabled="subsPage === subsTotalPages" @click="subsGoTo(subsPage + 1)"><i class="ph ph-caret-right"></i></button>
        <button class="ps-pg-btn" :disabled="subsPage === subsTotalPages" @click="subsGoTo(subsTotalPages)"><i class="ph ph-caret-double-right"></i></button>
        <span class="ps-pg-info">Showing {{ (subsPage - 1) * subsPageSize + 1 }}–{{ Math.min(subsPage * subsPageSize, subscriptions.length) }} of {{ subscriptions.length }} subscriptions</span>
        <select v-model="subsPageSize" class="ps-pg-size" @change="subsPage = 1">
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
        </select>
      </div>
    </div>
    <Teleport to="body">
      <Transition name="ps-modal">
        <div v-if="showCreate" class="ps-modal-backdrop" @click.self="showCreate = false">
          <div class="ps-modal-card" style="max-width: 560px">
            <div class="ps-modal-header">
              <h3 class="ps-modal-title">Create Subscription Plan</h3>
              <button class="ps-modal-close" @click="showCreate = false" aria-label="Close">
                <i class="ph ph-x"></i>
              </button>
            </div>
            <div class="ps-modal-body">
              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="ps-label">Plan Name</label>
                  <input v-model="form.planName" placeholder="e.g. Starter" class="ps-input" />
                </div>
                <div>
                  <label class="ps-label">Price (PHP)</label>
                  <input v-model="form.price" type="number" placeholder="999.00" class="ps-input" />
                </div>
                <div>
                  <label class="ps-label">Billing Cycle</label>
                  <select v-model="form.billingCycle" class="ps-input">
                    <option>Monthly</option><option>Quarterly</option><option>Annually</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="ps-label">Features (one per line)</label>
                <textarea v-model="form.features" rows="4" placeholder="Unlimited products&#10;POS access…" class="ps-input"></textarea>
              </div>
            </div>
            <div class="ps-modal-footer">
              <button class="ps-btn ps-btn-outline" @click="showCreate = false">Cancel</button>
              <button class="ps-btn ps-btn-primary" @click="submitPlan">Create Plan</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
